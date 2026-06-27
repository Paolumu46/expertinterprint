/* ============================================================
   EXPERT INTERPRINT — interactions engine
   No build step. GSAP + ScrollTrigger + Lenis from CDN.
   ============================================================ */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = window.matchMedia('(hover: none)').matches || 'ontouchstart' in window;

  // crude capability tier for adaptive perf
  const cores = navigator.hardwareConcurrency || 4;
  const mem = navigator.deviceMemory || 4;
  window.EXPERT_TIER = (!reduceMotion && !isTouch && cores >= 4 && mem >= 4 && window.innerWidth >= 900) ? 2 : 1;

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const on = (el, ev, fn, opt) => el && el.addEventListener(ev, fn, opt);

  /* ------------------------------------------------------------
     1. Smooth scroll (Lenis) — desktop / tier-2 only
     ------------------------------------------------------------ */
  let lenis = null;
  function initLenis() {
    if (reduceMotion || isTouch || window.EXPERT_TIER < 2) return;
    if (!window.Lenis) return;
    lenis = new Lenis({ duration: 1.15, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
    function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
    if (window.ScrollTrigger) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(t => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    }
  }
  // intercept in-page anchors so Lenis handles them
  function wireAnchors() {
    $$('a[href^="#"]').forEach(a => {
      on(a, 'click', e => {
        const id = a.getAttribute('href');
        if (!id || id === '#') return;
        const el = $(id);
        if (!el) return;
        e.preventDefault();
        if (lenis) lenis.scrollTo(el, { offset: -60 });
        else el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // close mobile menu if open
        const mm = $('#mobileMenu'); if (mm) mm.classList.remove('is-open');
        const bd = $('#menuBackdrop'); if (bd) bd.classList.remove('is-open');
      });
    });
  }

  /* ------------------------------------------------------------
     2. Custom cursor (dot + ring) — non-touch only
     ------------------------------------------------------------ */
  function initCursor() {
    if (isTouch) return;
    const dot = $('#cursorDot'), ring = $('#cursorRing');
    if (!dot || !ring) return;
    let mx = 0, my = 0, rx = 0, ry = 0;
    on(window, 'mousemove', e => {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%,-50%)`;
    });
    const loop = () => {
      rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%,-50%)`;
      requestAnimationFrame(loop);
    };
    loop();
    const hoverSel = 'a, button, .tilt-card, .card, [data-magnetic], .fab, .ink-drop';
    document.addEventListener('mouseover', e => { if (e.target.closest(hoverSel)) ring.classList.add('is-hover'); });
    document.addEventListener('mouseout', e => { if (e.target.closest(hoverSel)) ring.classList.remove('is-hover'); });
  }

  /* ------------------------------------------------------------
     3. Magnetic buttons
     ------------------------------------------------------------ */
  function initMagnetic() {
    if (isTouch || reduceMotion) return;
    $$('[data-magnetic]').forEach(el => {
      const strength = parseFloat(el.dataset.magnetic) || 0.35;
      on(el, 'mousemove', e => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - (r.left + r.width / 2);
        const y = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
      });
      on(el, 'mouseleave', () => { el.style.transform = ''; });
    });
  }

  /* ------------------------------------------------------------
     4. Ink ripple on buttons
     ------------------------------------------------------------ */
  function initInkRipple() {
    $$('.btn').forEach(btn => {
      on(btn, 'click', e => {
        const r = btn.getBoundingClientRect();
        const ink = document.createElement('span');
        ink.className = 'ink';
        ink.style.left = (e.clientX - r.left) + 'px';
        ink.style.top = (e.clientY - r.top) + 'px';
        ink.style.width = ink.style.height = Math.max(r.width, r.height) + 'px';
        btn.appendChild(ink);
        setTimeout(() => ink.remove(), 650);
      });
    });
  }

  /* ------------------------------------------------------------
     5. Text split (chars) for hero / titles
     ------------------------------------------------------------ */
  function splitText(el) {
    const text = el.textContent;
    el.setAttribute('aria-label', text);
    el.textContent = '';
    const frag = document.createDocumentFragment();
    text.split('').forEach(ch => {
      const span = document.createElement('span');
      span.className = 'split-char';
      span.textContent = ch === ' ' ? '\u00A0' : ch;
      frag.appendChild(span);
    });
    el.appendChild(frag);
    return el;
  }

  /* ------------------------------------------------------------
     6. Reveal on scroll (GSAP ScrollTrigger if available, else IO)
     ------------------------------------------------------------ */
  function initReveal() {
    const hasGSAP = window.gsap && window.ScrollTrigger;
    if (hasGSAP) {
      gsap.registerPlugin(ScrollTrigger);
      // generic reveal
      $$('[data-reveal]').forEach(el => {
        gsap.fromTo(el,
          { y: el.dataset.reveal === 'blur' ? 0 : 36, opacity: 0, filter: el.dataset.reveal === 'blur' ? 'blur(14px)' : 'none' },
          { y: 0, opacity: 1, filter: 'blur(0px)', duration: 0.9, ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 85%' } }
        );
      });
      // stagger groups
      $$('[data-stagger]').forEach(group => {
        const kids = $$(group.dataset.staggerSel || ':scope > *', group);
        gsap.fromTo(kids,
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out', stagger: 0.09,
            scrollTrigger: { trigger: group, start: 'top 82%' } }
        );
      });
      // hero chars
      $$('.split-target').forEach(el => {
        splitText(el);
        gsap.fromTo(el.querySelectorAll('.split-char'),
          { yPercent: 110, opacity: 0 },
          { yPercent: 0, opacity: 1, duration: 1, ease: 'power4.out', stagger: 0.03, delay: 0.3 });
      });
      // parallax elements
      $$('[data-parallax]').forEach(el => {
        const amt = parseFloat(el.dataset.parallax) || 0.15;
        gsap.to(el, { yPercent: amt * 100, ease: 'none',
          scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
      });
    } else {
      // IntersectionObserver fallback
      const io = new IntersectionObserver(entries => {
        entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
      }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
      $$('[data-reveal], [data-stagger]').forEach(el => { io.observe(el); if (el.classList) el.classList.add('io-mode'); });
      $$('.split-target').forEach(el => { splitText(el); el.style.opacity = 1; });
    }
  }

  /* ------------------------------------------------------------
     7. Counters
     ------------------------------------------------------------ */
  function initCounters() {
    const animate = el => {
      const target = parseFloat(el.dataset.count);
      const suffix = el.dataset.suffix || '';
      const dec = (el.dataset.count.split('.')[1] || '').length;
      const dur = 1600; const start = performance.now();
      const tick = now => {
        const p = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        const val = (target * eased).toFixed(dec);
        el.textContent = (Number(val).toLocaleString()) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => { if (en.isIntersecting) { animate(en.target); io.unobserve(en.target); } });
    }, { threshold: 0.5 });
    $$('[data-count]').forEach(el => io.observe(el));
  }

  /* ------------------------------------------------------------
     8. Navbar scroll state + active link + progress bar
     ------------------------------------------------------------ */
  function initNav() {
    const nav = $('#navbar');
    const progress = $('#scrollProgress');
    const sections = $$('section[id]');
    const links = $$('#navbar .nav__link');
    const onScroll = () => {
      const y = window.scrollY;
      if (nav) nav.classList.toggle('is-scrolled', y > 30);
      if (progress) {
        const h = document.documentElement.scrollHeight - window.innerHeight;
        progress.style.width = (h > 0 ? (y / h) * 100 : 0) + '%';
      }
      // active link
      let cur = '';
      sections.forEach(s => { if (y >= s.offsetTop - 120) cur = s.id; });
      links.forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#' + cur));
    };
    on(window, 'scroll', onScroll, { passive: true });
    onScroll();

    // mobile menu
    const openBtn = $('#menuOpen'), closeBtn = $('#menuClose'), mm = $('#mobileMenu'), bd = $('#menuBackdrop');
    const openMenu = () => { mm && mm.classList.add('is-open'); bd && bd.classList.add('is-open'); };
    const closeMenu = () => { mm && mm.classList.remove('is-open'); bd && bd.classList.remove('is-open'); };
    on(openBtn, 'click', openMenu); on(closeBtn, 'click', closeMenu); on(bd, 'click', closeMenu);
  }

  /* ------------------------------------------------------------
     9. Sticky CTA (mobile)
     ------------------------------------------------------------ */
  function initStickyCta() {
    const cta = $('#stickyCta');
    if (!cta) return;
    on(window, 'scroll', () => {
      cta.classList.toggle('is-visible', window.scrollY > 620);
    }, { passive: true });
  }

  /* ------------------------------------------------------------
     10. LINE QR modal + copy
     ------------------------------------------------------------ */
  function initLineModal() {
    const modal = $('#lineModal');
    if (!modal) return;
    const LINE_ID = '@expertinterprint';
    const open = () => modal.classList.add('is-open');
    const close = () => modal.classList.remove('is-open');
    $$('[data-open-line]').forEach(b => on(b, 'click', e => { e.preventDefault(); open(); }));
    on($('#lineOverlay', modal), 'click', close);
    on($('#lineClose', modal), 'click', close);
    on(document, 'keydown', e => { if (e.key === 'Escape') close(); });
    const copy = $('#copyLineId');
    on(copy, 'click', async () => {
      try { await navigator.clipboard.writeText(LINE_ID); copy.textContent = 'คัดลอกแล้ว!'; setTimeout(() => copy.textContent = 'คัดลอก', 1500); }
      catch { alert('คัดลอกไม่สำเร็จ'); }
    });
  }

  /* ------------------------------------------------------------
     11. Tilt cards (3D hover) — desktop
     ------------------------------------------------------------ */
  function initTilt() {
    if (isTouch || reduceMotion) return;
    $$('.tilt-card').forEach(card => {
      on(card, 'mousemove', e => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `rotateY(${px * 12}deg) rotateX(${-py * 12}deg) translateZ(0)`;
      });
      on(card, 'mouseleave', () => { card.style.transform = ''; });
    });
  }

  /* ------------------------------------------------------------
     12. Horizontal-scroll drag (works gallery + portfolio)
     ------------------------------------------------------------ */
  function initHScroll() {
    $$('.hscroll').forEach(scroller => {
      let down = false, startX, startScroll;
      on(scroller, 'pointerdown', e => {
        if (e.pointerType === 'touch') return;
        down = true; startX = e.pageX; startScroll = scroller.scrollLeft;
        scroller.setPointerCapture && scroller.setPointerCapture(e.pointerId);
      });
      on(window, 'pointerup', () => down = false);
      on(scroller, 'pointermove', e => { if (down) scroller.scrollLeft = startScroll - (e.pageX - startX); });
    });
  }

  /* ------------------------------------------------------------
     13. Marquee duplication for seamless loop
     ------------------------------------------------------------ */
  function initMarquee() {
    $$('.marquee').forEach(m => {
      const track = $('.marquee__track', m);
      if (!track) return;
      track.innerHTML += track.innerHTML; // duplicate content
    });
  }

  /* ------------------------------------------------------------
     14. Production timeline activation
     ------------------------------------------------------------ */
  function initTimeline() {
    const rail = $('.timeline-rail');
    if (!rail) return;
    const steps = $$('.tl-step', rail);
    const prog = $('.timeline-progress', rail);
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) en.target.classList.add('is-active');
      });
    }, { threshold: 0.6 });
    steps.forEach(s => io.observe(s));
    // animate progress fill based on scroll within section
    const sec = rail.closest('section');
    if (sec && prog) {
      const upd = () => {
        const r = sec.getBoundingClientRect();
        const vh = window.innerHeight;
        const p = Math.min(1, Math.max(0, (vh * 0.6 - r.top) / (r.height + vh * 0.4)));
        prog.style.width = (p * 100) + '%';
      };
      on(window, 'scroll', upd, { passive: true }); upd();
    }
  }

  /* ------------------------------------------------------------
     15. Theme toggle (cosmetic / dark-only confirmation)
     ------------------------------------------------------------ */
  function initThemeToggle() {
    const btn = $('#themeToggle');
    if (!btn) return;
    on(btn, 'click', () => {
      const icon = $('i', btn);
      // premium dark is the brand experience — offer a gentle nudge
      const note = $('#themeNote');
      if (note) { note.classList.add('show'); setTimeout(() => note.classList.remove('show'), 2600); }
    });
  }

  /* ------------------------------------------------------------
     BOOT
     ------------------------------------------------------------ */
  function boot() {
    initLenis();
    wireAnchors();
    initCursor();
    initMagnetic();
    initInkRipple();
    initReveal();
    initCounters();
    initNav();
    initStickyCta();
    initLineModal();
    initTilt();
    initHScroll();
    initMarquee();
    initTimeline();
    initThemeToggle();
    document.documentElement.classList.add('js-ready');
    console.log('%cExpert Interprint', 'color:#ff6b35;font-weight:800;font-size:16px', '— premium printing experience loaded');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
