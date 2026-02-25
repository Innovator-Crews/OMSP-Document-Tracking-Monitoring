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
  document.getElementById('mock-nav-fa').innerHTML = Icons.render('file-text', 14) + ' Financial Assistance';
  document.getElementById('mock-nav-pa').innerHTML = Icons.render('clipboard-list', 14) + ' Personal Assistance';
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

  // Board Members section
  document.getElementById('bm-label-icon').innerHTML = Icons.render('users', 16);
  document.getElementById('bm-search-icon').innerHTML = Icons.render('search', 16);
  const bmEmptyIcon = document.getElementById('bm-empty-icon');
  if (bmEmptyIcon) bmEmptyIcon.innerHTML = Icons.render('search', 32);
  // Inject mail icon into each BM email link
  document.querySelectorAll('.landing-bm-email').forEach(link => {
    const email = link.getAttribute('href').replace('mailto:', '');
    link.innerHTML = Icons.render('mail', 12) + ' ' + email;
  });

  // Team section
  document.getElementById('team-label-icon').innerHTML = Icons.render('code', 16);
  document.getElementById('team-ic-portfolio').innerHTML = Icons.render('external-link', 14) + ' Website';
  document.getElementById('team-buva-portfolio').innerHTML = Icons.render('external-link', 14) + ' Website';

  // CTA buttons
  document.getElementById('cta-staff-btn').innerHTML = Icons.render('log-in', 20) + ' Staff / Board Member';
  document.getElementById('cta-admin-btn').innerHTML = Icons.render('shield', 20) + ' System Administrator';

  // Footer
  document.getElementById('footer-logo-icon').innerHTML =
    '<img src="assets/images/SP-favicon.png" alt="SP Logo" class="landing-footer-logo" />';
  const fcPin   = document.getElementById('footer-contact-icon-pin');
  const fcPhone = document.getElementById('footer-contact-icon-phone');
  const fcMail  = document.getElementById('footer-contact-icon-mail');
  if (fcPin)   fcPin.innerHTML   = Icons.render('map-pin', 13);
  if (fcPhone) fcPhone.innerHTML = Icons.render('phone', 13);
  if (fcMail)  fcMail.innerHTML  = Icons.render('mail', 13);


  /* ================================================================
     STATS-BAND ODOMETER  (one-shot, NO observer – values are static)
     ================================================================ */
  if (typeof Utils !== 'undefined' && typeof Utils.animateStatOdometers === 'function') {
    Utils.animateStatOdometers(document, '.landing-metric-value');
  }


  /* ================================================================
     BOARD MEMBERS – filter & search
     ================================================================ */
  const bmGrid    = document.getElementById('bm-grid');
  const bmCards   = bmGrid ? Array.from(bmGrid.querySelectorAll('.landing-bm-card')) : [];
  const bmSearch  = document.getElementById('bm-search');
  const bmPills   = document.querySelectorAll('.landing-bm-pill');
  const bmEmpty   = document.getElementById('bm-empty');
  let bmActiveDistrict = 'all';

  function filterBoardMembers() {
    const query = (bmSearch ? bmSearch.value : '').toLowerCase().trim();
    let visibleCount = 0;

    bmCards.forEach(card => {
      const district = card.getAttribute('data-district');
      const name     = (card.getAttribute('data-name') || '').toLowerCase();
      const text     = card.textContent.toLowerCase();

      const matchDistrict = bmActiveDistrict === 'all' || district === bmActiveDistrict;
      const matchSearch   = !query || name.includes(query) || text.includes(query);

      if (matchDistrict && matchSearch) {
        card.classList.remove('hide');
        visibleCount++;
      } else {
        card.classList.add('hide');
      }
    });

    if (bmEmpty) bmEmpty.style.display = visibleCount === 0 ? 'block' : 'none';
  }

  bmPills.forEach(pill => {
    pill.addEventListener('click', () => {
      bmPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      bmActiveDistrict = pill.getAttribute('data-district');
      filterBoardMembers();
    });
  });

  if (bmSearch) {
    bmSearch.addEventListener('input', filterBoardMembers);
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
     MOCKUP – smooth counting animation (no rolling digits)
     ================================================================ */
  function getStatValue(el) {
    const raw = el.dataset.value || el.textContent || '0';
    const value = parseInt(String(raw).replace(/\D/g, ''), 10);
    return Number.isNaN(value) ? 0 : value;
  }

  function smoothCountTo(el, from, to, duration) {
    if (!el) return;
    const suffix = el.dataset.suffix || '';
    const startTime = performance.now();
    duration = duration || 1200;

    function update(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic for smooth deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(from + (to - from) * eased);
      el.textContent = current + suffix;
      el.dataset.value = String(current);
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  }

  function setStatValue(el, targetValue) {
    if (!el) return;
    const currentValue = getStatValue(el);
    const nextValue = Math.max(0, Math.round(targetValue));
    if (currentValue === nextValue) return;
    smoothCountTo(el, currentValue, nextValue, 600);
  }


  /* ================================================================
     MOCKUP – initial count-up & live-feed interval
     ================================================================ */
  const mockupRows = document.querySelectorAll('.landing-mockup-row');
  const statVals   = document.querySelectorAll('.landing-mockup-stat-val');

  // Count-up from 1 to configured target with smooth animation
  statVals.forEach((el, index) => {
    const target = parseInt(el.getAttribute('data-target') || el.textContent, 10) || 1;
    const suffix = el.dataset.suffix || '';
    el.dataset.value = '1';
    el.dataset.suffix = suffix;
    el.textContent = '1' + suffix;
    setTimeout(() => smoothCountTo(el, 1, target, 1400 + index * 200), 300 + index * 150);
  });


  /* ================================================================
     SCROLL-REVEAL – feature cards & story steps
     ================================================================ */
  const revealTargets = document.querySelectorAll('.landing-feature-card, .story-step, .glass-chip, .landing-bm-card');

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

    /* Pulse glow on the mockup card */
    const mockupCard = document.querySelector('.landing-mockup-card');
    if (mockupCard) {
      mockupCard.classList.add('live-pulse');
      setTimeout(() => mockupCard.classList.remove('live-pulse'), 800);
    }

    if (statVals[0]) setStatValue(statVals[0], getStatValue(statVals[0]) + 1);
    if (statVals[1] && Math.random() > 0.6) setStatValue(statVals[1], getStatValue(statVals[1]) + 1);
  }

  setInterval(animateMockupRow, 3000);
});
