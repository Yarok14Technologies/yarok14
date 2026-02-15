from flask import Flask, render_template, request, redirect, url_for
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import json, os, random, smtplib
from email.mime.text import MIMEText
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.secret_key = 'your_secret_key_here'

# Login Manager
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

# Rate Limiter
limiter = Limiter(get_remote_address, app=app)

# File path
DATA_PATH = "data/applications.json"
OTP_STORE = {}

# Static employer credentials
EMPLOYER = {
    "email": "employer@example.com",
    "password": generate_password_hash("securepassword")
}

# User session for Flask-Login
class Employer(UserMixin):
    id = "employer"

@login_manager.user_loader
def load_user(user_id):
    return Employer() if user_id == "employer" else None

# Load/save functions
def load_applications():
    with open(DATA_PATH, 'r') as f:
        return json.load(f)

def save_applications(data):
    with open(DATA_PATH, 'w') as f:
        json.dump(data, f, indent=2)

# Email sender
def send_email(recipient, subject, body):
    message = MIMEText(body)
    message['Subject'] = subject
    message['From'] = "no-reply@jobportal.com"
    message['To'] = recipient
    try:
        with smtplib.SMTP("smtp.yourmail.com", 587) as server:
            server.starttls()
            server.login("your-email@example.com", "your-password")
            server.send_message(message)
    except Exception as e:
        print("Email failed:", e)

# Routes
@app.route("/")
def home():
    return redirect("/career")

@app.route("/career", methods=["GET", "POST"])
def career():
    if request.method == "POST":
        data = load_applications()
        email = request.form["email"]
        if any(app["email"] == email for app in data["applications"]):
            return "Error: This email has already been used to apply."
        otp = str(random.randint(100000, 999999))
        OTP_STORE[email] = {
            "otp": otp,
            "form_data": request.form.to_dict()
        }
        send_email(email, "OTP Verification - Job Portal", f"Your OTP is: {otp}\nThis is a system-generated email. Do not reply.")
        return render_template("otp_verify.html", email=email)
    return render_template("careers.html")

@app.route("/verify", methods=["POST"])
def verify():
    email = request.form.get("email")
    otp_entered = request.form.get("otp")
    record = OTP_STORE.get(email)
    if record and record["otp"] == otp_entered:
        data = load_applications()
        data["applications"].append(record["form_data"])
        save_applications(data)
        OTP_STORE.pop(email, None)
        return "<h2>✅ Thanks for applying for the job at Yarok14!<br>Your application has been successfully submitted.</h2>"
    return "Invalid OTP or expired verification."

@app.route("/login", methods=["GET", "POST"])
@limiter.limit("5/minute")
def login():
    if request.method == "POST":
        email = request.form["email"]
        password = request.form["password"]
        if email == EMPLOYER["email"] and check_password_hash(EMPLOYER["password"], password):
            login_user(Employer())
            return redirect("/dashboard")
        return "Login failed: Invalid credentials."
    return render_template("login.html")

@app.route("/dashboard")
@login_required
def dashboard():
    data = load_applications()
    return render_template("dashboard.html", applications=data["applications"])

@app.route("/reject/<email>", methods=["POST"])
@login_required
def reject(email):
    data = load_applications()
    rejected_app = next((app for app in data["applications"] if app["email"] == email), None)
    data["applications"] = [app for app in data["applications"] if app["email"] != email]
    save_applications(data)

    if rejected_app:
        body = f"""Dear {rejected_app['name']},

Thank you for applying for the position of {rejected_app['position']}.
After careful review, we regret to inform you that your application was not selected.

This is a system-generated message. Please do not reply.

Sincerely,
Yarok14 Careers Team
"""
        send_email(email, "Application Status: Rejected", body)

    return redirect("/dashboard")

@app.route("/logout")
@login_required
def logout():
    logout_user()
    return redirect("/login")

# Main runner
if __name__ == "__main__":
    os.makedirs("data", exist_ok=True)
    if not os.path.exists(DATA_PATH):
        save_applications({"applications": []})
    app.run(host="0.0.0.0", port=5000, debug=True)
