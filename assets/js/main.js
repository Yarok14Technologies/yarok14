/**
 * YAROK14 TECHNOLOGIES — main.js
 * Industrial-grade shared JS module · Version 2.0 · © 2026
 *
 * Functions exported (called from HTML via window or direct call):
 *   toggleNav()          — mobile navbar open/close
 *   stickyNavbar()       — adds .scrolled class on scroll
 *   scrollProgress()     — animates #read-progress bar
 *   scrollToTop()        — injects & manages scroll-to-top button
 *   heroSlider()         — fades through hero image array
 *   filterPosts()        — insights page filter button logic
 *   animateCounters()    — counts up .stat-num values on scroll
 *   lazyLoadImages()     — IntersectionObserver lazy-load
 *   smoothScrolling()    — handles anchor <a href="#..."> clicks
 *   themeToggle()        — (stub) wires up a theme-toggle button if present
 *   highlightTOC()       — highlights active TOC link on scroll
 */

/* ================================================================
   GUARD: prevent double-init if script tag appears twice
================================================================ */
if (window.__yarok14_main_loaded) {
  // already loaded — skip
} else {
  window.__yarok14_main_loaded = true;

  // ── Run after DOM is ready ──────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}

function init() {
  stickyNavbar();
  scrollProgress();
  scrollToTop();
  lazyLoadImages();
  smoothScrolling();
  filterPosts();
  animateCounters();
  highlightTOC();
  heroSlider();
  themeToggle();
}

/* ================================================================
   1. MOBILE NAV TOGGLE
   Called inline from HTML: onclick="toggleNav()"
================================================================ */
function toggleNav() {
  var links = document.getElementById('navLinks');
  if (links) links.classList.toggle('open');
}
// Expose globally for inline onclick handlers
window.toggleNav = toggleNav;

/* ================================================================
   2. STICKY NAVBAR — adds .scrolled class after 10px
================================================================ */
function stickyNavbar() {
  var navbar = document.querySelector('.navbar');
  if (!navbar) return;

  function onScroll() {
    if (window.scrollY > 10) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // run once on load
}

/* ================================================================
   3. SCROLL PROGRESS BAR (#read-progress)
   Only active when the element exists (article pages)
================================================================ */
function scrollProgress() {
  var bar = document.getElementById('read-progress');
  if (!bar) return;

  function updateBar() {
    var scrollTop  = window.scrollY;
    var docHeight  = document.documentElement.scrollHeight - window.innerHeight;
    var pct        = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    bar.style.width = Math.min(pct, 100) + '%';
  }

  window.addEventListener('scroll', updateBar, { passive: true });
  updateBar();
}

/* ================================================================
   4. SCROLL-TO-TOP BUTTON
   Injects a #scroll-top-btn into the page, shows after 400px
================================================================ */
function scrollToTop() {
  // Only inject once
  if (document.getElementById('scroll-top-btn')) return;

  var btn = document.createElement('button');
  btn.id = 'scroll-top-btn';
  btn.setAttribute('aria-label', 'Scroll to top');
  btn.innerHTML = '↑';
  document.body.appendChild(btn);

  window.addEventListener('scroll', function () {
    if (window.scrollY > 400) {
      btn.classList.add('visible');
    } else {
      btn.classList.remove('visible');
    }
  }, { passive: true });

  btn.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ================================================================
   5. HERO SLIDER
   Looks for data-hero-images attribute on #yarokHero / #yarokHeroImage,
   falls back to index.html and careers.html arrays defined inline.
   The per-page inline scripts keep their own array — this function
   wires the generic case for future pages.
================================================================ */
function heroSlider() {
  // Attempt generic data-attribute driven slider
  var imgs = [
    document.getElementById('yarokHero'),
    document.getElementById('yarokHeroImage')
  ].filter(Boolean);

  imgs.forEach(function (hero) {
    var raw = hero.getAttribute('data-hero-images');
    if (!raw) return;

    try {
      var sources = JSON.parse(raw);
      if (!Array.isArray(sources) || sources.length < 2) return;

      var current = 0;
      var interval = parseInt(hero.getAttribute('data-hero-interval') || '3000', 10);

      setInterval(function () {
        hero.style.opacity = '0';
        setTimeout(function () {
          current = (current + 1) % sources.length;
          hero.src = sources[current];
          hero.style.opacity = '1';
        }, 400);
      }, interval);
    } catch (e) {
      // malformed JSON — silently skip
    }
  });
}

/* ================================================================
   6. FILTER POSTS (Insights page)
   Reads data-category on article/post-card elements;
   falls back to visual-only toggle when no data attributes exist.
================================================================ */
function filterPosts() {
  var buttons = document.querySelectorAll('.filter-btn');
  if (!buttons.length) return;

  buttons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      // Update active state
      buttons.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');

      var category = btn.textContent.trim();

      // If cards have data-category attributes, filter them
      var cards = document.querySelectorAll('[data-category]');
      if (!cards.length) return; // visual-only mode

      cards.forEach(function (card) {
        if (category === 'All') {
          card.style.display = '';
        } else {
          var cats = card.getAttribute('data-category') || '';
          card.style.display = cats.indexOf(category) > -1 ? '' : 'none';
        }
      });
    });
  });
}

/* ================================================================
   7. ANIMATE COUNTERS
   Counts up any .stat-num element that has a numeric value.
   Triggers once when the element enters the viewport.
================================================================ */
function animateCounters() {
  var items = document.querySelectorAll('.stat-num');
  if (!items.length) return;

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);
      var el   = entry.target;
      var raw  = el.textContent.trim();

      // Extract leading number, preserve suffix (e.g. "198B", "40%", "16nm+")
      var match = raw.match(/^(\d+\.?\d*)(.*)/);
      if (!match) return;

      var target   = parseFloat(match[1]);
      var suffix   = match[2] || '';
      var duration = 1200;
      var start    = null;

      function step(ts) {
        if (!start) start = ts;
        var progress = Math.min((ts - start) / duration, 1);
        var eased    = 1 - Math.pow(1 - progress, 3); // ease-out-cubic
        var current  = Math.round(eased * target);
        el.textContent = current + suffix;
        if (progress < 1) requestAnimationFrame(step);
      }

      requestAnimationFrame(step);
    });
  }, { threshold: 0.5 });

  items.forEach(function (el) { observer.observe(el); });
}

/* ================================================================
   8. LAZY LOAD IMAGES
   Adds .fade-in to <img> tags, reveals on intersection.
================================================================ */
function lazyLoadImages() {
  if (!('IntersectionObserver' in window)) return;

  var images = document.querySelectorAll('img[loading="lazy"]');
  if (!images.length) return;

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      var img = entry.target;
      if (img.dataset.src) img.src = img.dataset.src;
      img.classList.add('visible');
      observer.unobserve(img);
    });
  }, { rootMargin: '100px' });

  images.forEach(function (img) {
    img.classList.add('fade-in');
    observer.observe(img);
  });
}

/* ================================================================
   9. SMOOTH SCROLLING for anchor links
================================================================ */
function smoothScrolling() {
  document.addEventListener('click', function (e) {
    var link = e.target.closest('a[href^="#"]');
    if (!link) return;

    var id = link.getAttribute('href');
    if (id === '#') return;

    var target = document.querySelector(id);
    if (!target) return;

    e.preventDefault();
    var navH   = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h') || '72', 10);
    var offset = target.getBoundingClientRect().top + window.scrollY - navH - 16;

    window.scrollTo({ top: offset, behavior: 'smooth' });

    // Close mobile nav if open
    var navLinks = document.getElementById('navLinks');
    if (navLinks) navLinks.classList.remove('open');
  });
}

/* ================================================================
   10. THEME TOGGLE (stub — wires up #theme-toggle if present)
================================================================ */
function themeToggle() {
  var btn = document.getElementById('theme-toggle');
  if (!btn) return;

  // Restore saved preference
  var saved = localStorage.getItem('y14-theme');
  if (saved === 'light') document.documentElement.setAttribute('data-theme', 'light');

  btn.addEventListener('click', function () {
    var current = document.documentElement.getAttribute('data-theme');
    var next    = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('y14-theme', next);
  });
}

/* ================================================================
   11. HIGHLIGHT ACTIVE TOC LINK on scroll
================================================================ */
function highlightTOC() {
  var tocLinks = document.querySelectorAll('.toc-list a[href^="#"]');
  if (!tocLinks.length) return;

  var headings = [];
  tocLinks.forEach(function (a) {
    var id = a.getAttribute('href').slice(1);
    var el = document.getElementById(id);
    if (el) headings.push({ el: el, link: a });
  });

  var navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h') || '72', 10);

  function onScroll() {
    var scrollY = window.scrollY + navH + 32;
    var active  = null;

    for (var i = 0; i < headings.length; i++) {
      if (headings[i].el.offsetTop <= scrollY) {
        active = headings[i].link;
      }
    }

    tocLinks.forEach(function (a) { a.classList.remove('active'); });
    if (active) active.classList.add('active');
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}
