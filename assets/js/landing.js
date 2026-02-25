/**
 * Landing Page – icons, navigation, mockup animation, scroll reveals
 * Extracted from index.html inline <script> for maintainability.
 */

document.addEventListener('DOMContentLoaded', () => {

  /* ================================================================
     ICON INJECTION
     ================================================================ */
  // Nav
  document.getElementById('nav-login-btn').innerHTML = Icons.render('log-in', 16) + ' Sign In';
  document.getElementById('mobile-toggle').innerHTML = Icons.render('menu', 24);

  // Hero
  document.getElementById('hero-cta-login').innerHTML = Icons.render('log-in', 20) + ' Staff / Board Member Login';
  document.getElementById('hero-cta-admin').innerHTML = Icons.render('shield', 20) + ' Admin Portal';

  // Mockup sidebar icons
  document.getElementById('mock-nav-dash').innerHTML = Icons.render('dashboard', 14) + ' Dashboard';
  document.getElementById('mock-nav-fa').innerHTML = Icons.render('file-text', 14) + ' Financial Assistance Records';
  document.getElementById('mock-nav-pa').innerHTML = Icons.render('clipboard-list', 14) + ' Personal Assistance Records';
  document.getElementById('mock-nav-search').innerHTML = Icons.render('search', 14) + ' Global Search';
  document.getElementById('mock-nav-reports').innerHTML = Icons.render('bar-chart', 14) + ' Reports';

  // Features icons
  document.getElementById('feat-label-icon').innerHTML = Icons.render('zap', 16);
  document.getElementById('feat-icon-fa').innerHTML = Icons.render('file-text', 24);
  document.getElementById('feat-icon-pa').innerHTML = Icons.render('clipboard-list', 24);
  document.getElementById('feat-icon-budget').innerHTML = Icons.render('wallet', 24);
  document.getElementById('feat-icon-search').innerHTML = Icons.render('search', 24);
  document.getElementById('feat-icon-reports').innerHTML = Icons.render('bar-chart', 24);
  document.getElementById('feat-icon-security').innerHTML = Icons.render('shield-check', 24);

  // Roles section
  document.getElementById('roles-label-icon').innerHTML = Icons.render('users', 16);
  document.getElementById('role-icon-admin').innerHTML = Icons.render('shield', 28);
  document.getElementById('role-icon-bm').innerHTML = Icons.render('user', 28);
  document.getElementById('role-icon-staff').innerHTML = Icons.render('edit', 28);

  // Role check marks
  for (let i = 1; i <= 12; i++) {
    const el = document.getElementById('role-check-' + i);
    if (el) el.innerHTML = Icons.render('check', 16);
  }

  // Team section
  document.getElementById('team-label-icon').innerHTML = Icons.render('code', 16);
  document.getElementById('team-ic-portfolio').innerHTML = Icons.render('external-link', 14) + ' Website';
  document.getElementById('team-buva-portfolio').innerHTML = Icons.render('external-link', 14) + ' Website';

  // CTA buttons
  document.getElementById('cta-staff-btn').innerHTML = Icons.render('log-in', 20) + ' Staff / Board Member';
  document.getElementById('cta-admin-btn').innerHTML = Icons.render('shield', 20) + ' System Administrator';

  // Footer
  document.getElementById('footer-logo-icon').innerHTML =
    '<img src="assets/images/SP-logo-nobg.png" alt="SP Logo" class="landing-footer-logo" />';


  /* ================================================================
     STATS-BAND ODOMETER  (one-shot, NO observer – values are static)
     ================================================================ */
  if (typeof Utils !== 'undefined' && typeof Utils.animateStatOdometers === 'function') {
    Utils.animateStatOdometers(document, '.landing-metric-value');
  }


  /* ================================================================
     NAV – scroll hide / show
     ================================================================ */
  const nav = document.getElementById('landing-nav');
  let lastScrollY = 0;
  let navHidden = false;

  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    nav.classList.toggle('scrolled', y > 20);
    if (y > lastScrollY && y > 80 && !navHidden) {
      nav.style.transform = 'translateY(-100%)';
      navHidden = true;
    } else if (y < lastScrollY && navHidden) {
      nav.style.transform = 'translateY(0)';
      navHidden = false;
    }
    lastScrollY = y;
  }, { passive: true });


  /* ================================================================
     SMOOTH SCROLL – anchor links
     ================================================================ */
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(link.getAttribute('href'));
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });


  /* ================================================================
     SCROLLSPY – highlight active nav link
     ================================================================ */
  const sectionNavLinks = Array.from(document.querySelectorAll('.landing-nav-link[href^="#"]'));
  const sectionTargets = sectionNavLinks
    .map(link => {
      const section = document.querySelector(link.getAttribute('href'));
      return section ? { link, section } : null;
    })
    .filter(Boolean);

  function setActiveSectionLink(targetId) {
    sectionNavLinks.forEach(link => {
      const isActive = link.getAttribute('href') === targetId;
      link.classList.toggle('active', isActive);
      link.setAttribute('aria-current', isActive ? 'true' : 'false');
    });
  }

  if (sectionTargets.length) {
    setActiveSectionLink('#features');
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length) setActiveSectionLink('#' + visible[0].target.id);
      },
      { root: null, rootMargin: '-40% 0px -45% 0px', threshold: [0.2, 0.4, 0.6] }
    );
    sectionTargets.forEach(({ section }) => sectionObserver.observe(section));
  }


  /* ================================================================
     MOBILE NAV TOGGLE
     ================================================================ */
  const toggle = document.getElementById('mobile-toggle');
  const links  = document.getElementById('nav-links');
  const backdrop = document.getElementById('nav-backdrop');

  function openMobileNav() {
    Object.assign(links.style, {
      display: 'flex', flexDirection: 'column', position: 'absolute',
      top: '56px', left: '0', right: '0', background: '#fff',
      padding: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
      borderRadius: '0 0 12px 12px', zIndex: '99'
    });
    backdrop.classList.add('active');
    toggle.innerHTML = Icons.render('x', 24);
  }

  function closeMobileNav() {
    links.style.display = 'none';
    backdrop.classList.remove('active');
    toggle.innerHTML = Icons.render('menu', 24);
  }

  toggle.addEventListener('click', () => {
    links.style.display === 'flex' ? closeMobileNav() : openMobileNav();
  });
  backdrop.addEventListener('click', closeMobileNav);
  links.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => { if (window.innerWidth <= 768) closeMobileNav(); });
  });


  /* ================================================================
     MOCKUP – rolling digit helpers (scoped to .landing-mockup-stat-val)
     ================================================================ */
  function createDigitTrack(startDigit) {
    const digitWrap = document.createElement('span');
    digitWrap.className = 'rolling-digit';

    const track = document.createElement('span');
    track.className = 'rolling-digit-track';

    for (let i = 0; i < 3; i++) {
      for (let d = 0; d <= 9; d++) {
        const cell = document.createElement('span');
        cell.textContent = String(d);
        track.appendChild(cell);
      }
    }

    const startIndex = 10 + startDigit;
    track.style.transform = `translateY(-${startIndex * 1.15}em)`;
    digitWrap.appendChild(track);
    return { digitWrap, track, startIndex };
  }

  function getStatValue(el) {
    const raw = el.dataset.value || el.textContent || '0';
    const value = parseInt(String(raw).replace(/\D/g, ''), 10);
    return Number.isNaN(value) ? 0 : value;
  }

  function setRollingStatValue(el, targetValue, duration) {
    if (!el) return;
    duration = duration || 560;
    const currentValue = getStatValue(el);
    const nextValue = Math.max(0, Math.round(targetValue));
    const suffix = el.dataset.suffix || '';

    if (currentValue === nextValue) { el.dataset.value = String(nextValue); return; }

    const currentStr = String(currentValue);
    const nextStr    = String(nextValue);
    const maxLen = Math.max(currentStr.length, nextStr.length);
    const fromDigits = currentStr.padStart(maxLen, '0').split('');
    const toDigits   = nextStr.padStart(maxLen, '0').split('');

    el.innerHTML = '';

    toDigits.forEach((digitChar, index) => {
      const fromDigit = parseInt(fromDigits[index], 10);
      const toDigit   = parseInt(digitChar, 10);
      if (Number.isNaN(fromDigit) || Number.isNaN(toDigit)) return;

      const { digitWrap, track, startIndex } = createDigitTrack(fromDigit);
      el.appendChild(digitWrap);

      const steps = toDigit >= fromDigit ? (toDigit - fromDigit) : (10 - fromDigit + toDigit);
      const targetIndex = startIndex + steps;

      requestAnimationFrame(() => {
        track.style.transitionDuration = `${duration + (index * 80)}ms`;
        track.style.transitionDelay    = `${index * 65}ms`;
        track.style.transform = `translateY(-${targetIndex * 1.15}em)`;
      });
    });

    if (suffix) {
      const suffixEl = document.createElement('span');
      suffixEl.className = 'rolling-suffix';
      suffixEl.textContent = suffix;
      el.appendChild(suffixEl);
    }

    el.dataset.value = String(nextValue);
  }


  /* ================================================================
     MOCKUP – initial count-up & live-feed interval
     ================================================================ */
  const mockupRows = document.querySelectorAll('.landing-mockup-row');
  const statVals   = document.querySelectorAll('.landing-mockup-stat-val');

  // Count-up from 1 to configured target
  statVals.forEach((el, index) => {
    const target = parseInt(el.getAttribute('data-target') || el.textContent, 10) || 1;
    const suffix = el.dataset.suffix || '';
    el.dataset.value = '1';
    el.textContent = '1' + suffix;
    setTimeout(() => setRollingStatValue(el, target, 780 + index * 180), 180 + index * 120);
  });


  /* ================================================================
     SCROLL-REVEAL – feature cards & story steps
     ================================================================ */
  const revealTargets = document.querySelectorAll('.landing-feature-card, .story-step, .glass-chip');

  revealTargets.forEach((el, index) => {
    el.classList.add('scroll-reveal', index % 2 === 0 ? 'reveal-left' : 'reveal-right');
    el.style.transitionDelay = `${Math.min(index, 8) * 70}ms`;
  });

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.22, rootMargin: '0px 0px -8% 0px' });

  revealTargets.forEach(el => revealObserver.observe(el));


  /* ================================================================
     MOCKUP – live-feed row animation (3 s interval)
     ================================================================ */
  const mockupNames = [
    'Cruz, J.', 'Santos, M.', 'Reyes, A.', 'Garcia, L.',
    'Torres, R.', 'Flores, D.', 'Rivera, P.', 'Mendoza, C.',
    'Lopez, K.', 'Dela Cruz, F.', 'Bautista, E.', 'Villanueva, S.'
  ];
  const mockupStatuses = [
    { text: 'Compliant', cls: 'landing-mockup-badge-success' },
    { text: 'Pending',   cls: 'landing-mockup-badge-warning' },
    { text: 'Compliant', cls: 'landing-mockup-badge-success' },
    { text: 'Approved',  cls: 'landing-mockup-badge-success' }
  ];
  let faCounter = 143;

  function animateMockupRow() {
    if (!mockupRows.length) return;
    faCounter++;
    const name   = mockupNames[Math.floor(Math.random() * mockupNames.length)];
    const status = mockupStatuses[Math.floor(Math.random() * mockupStatuses.length)];
    const faNum  = String(faCounter).padStart(4, '0');

    for (let i = mockupRows.length - 1; i > 0; i--) {
      mockupRows[i].innerHTML = mockupRows[i - 1].innerHTML;
    }

    const firstRow = mockupRows[0];
    firstRow.style.opacity = '0';
    firstRow.style.transform = 'translateY(-8px)';
    firstRow.innerHTML =
      '<span style="flex:1">FA-2025-' + faNum + ' \u2014 ' + name + '</span>' +
      '<span class="landing-mockup-badge ' + status.cls + '">' + status.text + '</span>';

    requestAnimationFrame(() => {
      firstRow.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      firstRow.style.opacity = '1';
      firstRow.style.transform = 'translateY(0)';
    });

    if (statVals[0]) setRollingStatValue(statVals[0], getStatValue(statVals[0]) + 1);
    if (statVals[1] && Math.random() > 0.6) setRollingStatValue(statVals[1], getStatValue(statVals[1]) + 1);
  }

  setInterval(animateMockupRow, 3000);
});
