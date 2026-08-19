(() => {
  'use strict';

  /* ---------- year ---------- */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- nav: scrolled state + mobile toggle ---------- */
  const nav = document.getElementById('siteNav');
  const navToggle = document.getElementById('navToggle');
  const mobileMenu = document.getElementById('mobileMenu');

  const onScrollNav = () => {
    nav.classList.toggle('is-scrolled', window.scrollY > 12);
  };
  onScrollNav();
  window.addEventListener('scroll', onScrollNav, { passive: true });

  if (navToggle && mobileMenu) {
    navToggle.addEventListener('click', () => {
      mobileMenu.classList.toggle('is-open');
    });
    mobileMenu.querySelectorAll('a[data-nav]').forEach((a) => {
      a.addEventListener('click', () => mobileMenu.classList.remove('is-open'));
    });
  }

  /* ---------- smooth scroll for in-page links ---------- */
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const id = link.getAttribute('href');
      if (id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const navH = nav ? nav.offsetHeight : 0;
      const top = target.getBoundingClientRect().top + window.scrollY - (navH - 1);
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

  /* ---------- scrollspy: highlight active nav link ---------- */
  const navLinks = document.querySelectorAll('a[data-nav]');
  const sections = Array.from(navLinks)
    .map((l) => document.querySelector(l.getAttribute('href')))
    .filter(Boolean);

  if (sections.length) {
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = '#' + entry.target.id;
          const link = document.querySelector(`a[data-nav][href="${id}"]`);
          if (!link) return;
          if (entry.isIntersecting) {
            navLinks.forEach((l) => l.classList.remove('active'));
            link.classList.add('active');
          }
        });
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: 0 }
    );
    sections.forEach((s) => spy.observe(s));
  }

  /* ---------- reveal-on-scroll ---------- */
  const revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, i) => {
          if (entry.isIntersecting) {
            entry.target.style.transitionDelay = `${(i % 4) * 70}ms`;
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
    );
    revealEls.forEach((el) => revealObserver.observe(el));
  }

  /* ---------- hero hotspots + info panels ---------- */
  const hotspots = document.querySelectorAll('.hotspot');
  const panels = document.querySelectorAll('.info-panel');
  let activePanel = null;
  let activeHotspot = null;

  function positionPanel(panel, hotspot) {
    const rect = hotspot.getBoundingClientRect();
    const panelW = panel.offsetWidth || 320;
    const panelH = panel.offsetHeight || 220;
    const margin = 18;

    let left = rect.right + margin;
    let top = rect.top + rect.height / 2 - panelH / 2;

    // flip to the left side if it would overflow the viewport
    if (left + panelW > window.innerWidth - 16) {
      left = rect.left - panelW - margin;
    }
    // final clamp so it never leaves the left edge either
    if (left < 16) left = 16;

    top = Math.max(16, Math.min(top, window.innerHeight - panelH - 16));

    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
  }

  function closeActivePanel() {
    if (!activePanel) return;
    activePanel.classList.remove('is-open');
    if (activeHotspot) activeHotspot.classList.remove('is-active');
    activePanel = null;
    activeHotspot = null;
  }

  function openPanel(hotspot) {
    const targetId = hotspot.getAttribute('data-target');
    const panel = document.getElementById(targetId);
    if (!panel) return;

    if (activePanel === panel) {
      closeActivePanel();
      return;
    }
    closeActivePanel();

    positionPanel(panel, hotspot);
    panel.classList.add('is-open');
    hotspot.classList.add('is-active');
    activePanel = panel;
    activeHotspot = hotspot;

    // reposition once layout settles (fonts/media)
    requestAnimationFrame(() => positionPanel(panel, hotspot));
  }

  hotspots.forEach((hotspot) => {
    hotspot.addEventListener('click', (e) => {
      e.stopPropagation();
      openPanel(hotspot);
    });
  });

  panels.forEach((panel) => {
    panel.addEventListener('click', (e) => e.stopPropagation());
    const closeBtn = panel.querySelector('[data-close]');
    if (closeBtn) closeBtn.addEventListener('click', closeActivePanel);
  });

  document.addEventListener('click', closeActivePanel);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeActivePanel();
  });
  window.addEventListener('resize', () => {
    if (activePanel && activeHotspot) positionPanel(activePanel, activeHotspot);
  });
  // hotspots only live inside the hero viewport — once the page scrolls
  // away from them, close the panel rather than have it chase a
  // now off-screen anchor.
  window.addEventListener('scroll', closeActivePanel, { passive: true });

  /* ---------- cursor-follow blob over the hero stage ---------- */
  const cursorBlob = document.getElementById('cursorBlob');
  const heroStage = document.querySelector('.hero-stage');
  if (cursorBlob && heroStage && matchMedia('(hover: hover)').matches) {
    let mx = 0, my = 0, bx = 0, by = 0;
    let raf = null;

    const loop = () => {
      bx += (mx - bx) * 0.18;
      by += (my - by) * 0.18;
      cursorBlob.style.transform = `translate(${bx}px, ${by}px) translate(-50%, -50%) scale(1)`;
      raf = requestAnimationFrame(loop);
    };

    heroStage.addEventListener('mouseenter', () => {
      cursorBlob.classList.add('is-active');
      if (!raf) raf = requestAnimationFrame(loop);
    });
    heroStage.addEventListener('mouseleave', () => {
      cursorBlob.classList.remove('is-active');
      cancelAnimationFrame(raf);
      raf = null;
    });
    heroStage.addEventListener('mousemove', (e) => {
      mx = e.clientX;
      my = e.clientY;
    });
  }

  /* ---------- lightweight parallax ---------- */
  const parallaxTargets = [
    { el: document.querySelector('.hero-grid'), speed: 0.06 },
    { el: document.querySelector('.cta-bg-glow'), speed: 0.08 },
  ].filter((t) => t.el);

  if (parallaxTargets.length) {
    let ticking = false;
    const applyParallax = () => {
      const y = window.scrollY;
      parallaxTargets.forEach((t) => {
        t.el.style.transform = `translate3d(0, ${y * t.speed}px, 0)`;
      });
      ticking = false;
    };
    window.addEventListener(
      'scroll',
      () => {
        if (!ticking) {
          requestAnimationFrame(applyParallax);
          ticking = true;
        }
      },
      { passive: true }
    );
  }
})();
