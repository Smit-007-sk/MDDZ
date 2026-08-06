/**
 * =============================================================
 * SECTION-2 — Cinematic Scroll Showcase (SCS)
 * 8-Phase GSAP + ScrollTrigger Animation
 * File: section-2/section-2.js
 *
 * Phases:
 *   1  (0%–20%)   Scroll-controlled image sequence
 *   2  (20%–28%)  Box exits  (opacity + scale + blur)
 *   3  (28%–45%)  360° rotating entrance (scroll-linked)
 *   4  (45%–49%)  Rotation settles, box locks to center
 *   5  (49%–62%)  Pinned — auto 1s/image slideshow
 *   6  (62%–75%)  Second 360° scroll rotation
 *   7  (75%–92%)  Scale up to fill viewport
 *   8  (92%–100%) Fade out — reveal next section
 *
 * Dependencies: GSAP 3.12+ & ScrollTrigger (loaded before this file)
 * =============================================================
 */

(function initScrollCinemaScene() {
  'use strict';

  /* ─── Guard: wait for GSAP + ScrollTrigger ─────────────────── */
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    document.addEventListener('DOMContentLoaded', function retry() {
      if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
        document.removeEventListener('DOMContentLoaded', retry);
        boot();
      }
    });
    return;
  }

  /* ─── Run after DOM is ready ────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  /* ═══════════════════════════════════════════════════════════════
     BOOT — entry point after DOM + GSAP are ready
     ═══════════════════════════════════════════════════════════════ */
  function boot() {
    /* ── Element refs ─────────────────────────────────────────── */
    const section    = document.getElementById('scs-section');
    const pin        = document.getElementById('scs-pin');
    const wrapper    = document.getElementById('scs-wrapper');
    const frame      = document.getElementById('scs-frame');
    const label      = document.getElementById('scs-label');
    const counter    = document.getElementById('scs-counter');
    const nextReveal = document.getElementById('scs-next-reveal');
    const imgs       = Array.from(document.querySelectorAll('#scs-frame .scs-img'));

    /* Guard: section must exist */
    if (!section || !wrapper || !frame || imgs.length === 0) {
      console.warn('[SCS] Required elements not found — animation skipped.');
      return;
    }

    const IMG_COUNT = imgs.length;

    /* ─── Register plugin (safe to call multiple times) ──────── */
    gsap.registerPlugin(ScrollTrigger);

    /* ═══════════════════════════════════════════════════════════
       IMAGE MANAGEMENT
       ═══════════════════════════════════════════════════════════ */
    let _activeIdx = 0;

    /**
     * Preload all images using JS Image() objects.
     * Returns a Promise that resolves when ALL images have loaded
     * (or timed out after 8s to prevent blocking on slow networks).
     */
    function preloadImages() {
      const TIMEOUT = 8000;
      const promises = imgs.map(imgEl => new Promise(resolve => {
        if (imgEl.complete && imgEl.naturalWidth > 0) { resolve(); return; }
        const timer = setTimeout(resolve, TIMEOUT);
        imgEl.addEventListener('load',  () => { clearTimeout(timer); resolve(); }, { once: true });
        imgEl.addEventListener('error', () => { clearTimeout(timer); resolve(); }, { once: true });
        // Trigger load if src not yet fetched
        if (!imgEl.src || imgEl.src === window.location.href) imgEl.src = imgEl.dataset.src || imgEl.src;
      }));
      return Promise.all(promises);
    }

    /**
     * Crossfade to image at index idx.
     * Wraps around using modulo. No-ops if already active.
     */
    function setImage(idx) {
      const next = ((idx % IMG_COUNT) + IMG_COUNT) % IMG_COUNT;
      if (next === _activeIdx) return;
      imgs[_activeIdx].classList.remove('scs-active');
      imgs[next].classList.add('scs-active');
      _activeIdx = next;
      if (counter) {
        const n = String(next + 1).padStart(2, '0');
        const t = String(IMG_COUNT).padStart(2, '0');
        counter.textContent = `${n} / ${t}`;
      }
    }

    /** Reset to image 0 without crossfade (instant) */
    function resetImage() {
      imgs.forEach(img => img.classList.remove('scs-active'));
      imgs[0].classList.add('scs-active');
      _activeIdx = 0;
      if (counter) counter.textContent = `01 / ${String(IMG_COUNT).padStart(2, '0')}`;
    }

    /* ═══════════════════════════════════════════════════════════
       SLIDESHOW SINGLETON (Phase 5)
       Single setInterval — prevents duplicate timers on re-entry
       ═══════════════════════════════════════════════════════════ */
    const slideshow = {
      _timer:  null,
      _active: false,

      start() {
        if (this._active) return;           // already running — do nothing
        this._active = true;
        this._timer = setInterval(() => {
          setImage(_activeIdx + 1);
        }, 1000);
      },

      stop() {
        if (!this._active) return;          // not running — do nothing
        clearInterval(this._timer);
        this._timer  = null;
        this._active = false;
      },

      isActive() { return this._active; },
    };

    /* ═══════════════════════════════════════════════════════════
       HELPERS
       ═══════════════════════════════════════════════════════════ */

    /**
     * Compute the scale needed for #scs-frame to fill the viewport.
     * Adds 5% overshoot so no background leaks through.
     */
    function getMaxScale() {
      const fw = frame.offsetWidth  || 480;
      const fh = frame.offsetHeight || 360;
      const vw = Math.max(window.innerWidth,  1);
      const vh = Math.max(window.innerHeight, 1);
      return Math.max(vw / fw, vh / fh) * 1.06;
    }

    /* Show/hide the Phase 1 UX label */
    function setLabel(visible) {
      if (visible) {
        wrapper.classList.add('scs-label-on');
      } else {
        wrapper.classList.remove('scs-label-on');
      }
    }

    /* ═══════════════════════════════════════════════════════════
       PHASE 1 IMAGE SWITCHING via onUpdate
       Called on every ScrollTrigger tick while main ST is active.
       Only acts during Phase 1 (progress 0 → P1_END).
       ═══════════════════════════════════════════════════════════ */
    /* Phase boundaries as fractions of total timeline (0 → 1) */
    const P1_END = 0.20;  // 20%

    function handleScrollUpdate(self) {
      const p = self.progress;
      if (p <= P1_END) {
        /* Map Phase 1 scroll progress → image index */
        const localPr = p / P1_END;                               // 0 → 1
        const idx = Math.min(
          Math.floor(localPr * IMG_COUNT),
          IMG_COUNT - 1
        );
        setImage(idx);
        /* Show label when box is visible */
        setLabel(p > 0.01);
      } else {
        setLabel(false);
      }
    }

    /* ═══════════════════════════════════════════════════════════
       MAIN ANIMATION BUILDER
       Called by gsap.matchMedia() for each breakpoint.
       Returns a cleanup function.
       ═══════════════════════════════════════════════════════════ */
    function buildAnimation(scrollTravel) {
      /* Kill any existing SCS ScrollTriggers before rebuilding */
      ScrollTrigger.getById('scs-main')?.kill();
      ScrollTrigger.getById('scs-slideshow')?.kill();
      slideshow.stop();

      /* Set section height to match desired scroll travel */
      section.style.height = scrollTravel + 'px';

      /* Reset wrapper to initial hidden state */
      gsap.set(wrapper, {
        opacity:   0,
        scale:     1,
        rotationZ: 0,
        xPercent:  -50,
        yPercent:  -50,
        filter:    'blur(0px)',
        clearProps: 'transform',   // clear previous matchMedia transforms
      });
      /* Re-apply centering after clearProps */
      gsap.set(wrapper, { xPercent: -50, yPercent: -50 });

      gsap.set(nextReveal, { opacity: 0 });
      resetImage();

      /* ── Compute max scale for Phase 7 ──────────────────────── */
      const maxScale = getMaxScale();

      /* ── Phase duration units (total = 7.0) ─────────────────── */
      /* Each "unit" = scrollTravel/7000 * 1000ms of scrub time    */
      const DUR = {
        p1_hold:   2.80, // Phase 1: hold while images switch
        p1_in:     0.20, // Phase 1: fade-in at start
        p2:        0.56, // Phase 2: box exits
        p3:        1.19, // Phase 3: rotating entrance
        p4:        0.10, // Phase 4: settle rotation
        p5_hold:   0.91, // Phase 5: slideshow (hold)
        p6:        0.91, // Phase 6: second rotation
        p7:        1.19, // Phase 7: scale up
        p8:        0.56, // Phase 8: fade out + reveal
      };

      /* ── Build main timeline ─────────────────────────────────── */
      const tl = gsap.timeline({
        scrollTrigger: {
          id:           'scs-main',
          trigger:      section,
          start:        'top top',
          end:          `+=${scrollTravel}`,
          scrub:        1,          // 1s lag for cinematic feel
          pin:          pin,        // GSAP pins #scs-pin
          anticipatePin: 1,
          onUpdate:     handleScrollUpdate,
          onLeave:      () => { slideshow.stop(); setLabel(false); },
          onLeaveBack:  () => {
            slideshow.stop();
            setLabel(false);
            gsap.set(wrapper, { opacity: 0 });
            resetImage();
          },
        },
      });

      /* ── PHASE 1: box fades in, images switch via onUpdate ───── */
      tl.addLabel('phase1_start', 0)
        .fromTo(wrapper,
          { opacity: 0, scale: 0.95 },
          { opacity: 1, scale: 1, duration: DUR.p1_in, ease: 'power2.out' }
        )
        /* Hold here — image switching happens in onUpdate */
        .to(wrapper, { duration: DUR.p1_hold })
        .addLabel('phase1_end');

      /* ── PHASE 2: box exits with opacity + scale + blur ─────── */
      tl.to(wrapper, {
          opacity: 0,
          scale:   0.86,
          filter:  'blur(12px)',
          duration: DUR.p2,
          ease:    'power2.in',
        })
        .addLabel('phase2_end');

      /* ── PHASE 3: rotating entrance 0° → 360° ───────────────── */
      tl.fromTo(wrapper,
          { opacity: 0, rotationZ: 0,   scale: 0.65, filter: 'blur(0px)' },
          { opacity: 1, rotationZ: 360, scale: 1,    filter: 'blur(0px)',
            duration: DUR.p3,
            ease: 'power2.inOut',
          }
        )
        .addLabel('phase3_end');

      /* ── PHASE 4: settle rotation to exactly 0° ─────────────── */
      tl.to(wrapper, {
          rotationZ: 0,
          duration:  DUR.p4,
          ease:      'power1.out',
        })
        .addLabel('phase4_end');

      /* ── PHASE 5: box pinned, slideshow runs ─────────────────── */
      /* Hold here — slideshow controlled by separate ScrollTrigger */
      tl.to(wrapper, { duration: DUR.p5_hold })
        .addLabel('phase5_end');

      /* ── PHASE 6: second 360° rotation (scroll-linked) ───────── */
      tl.to(wrapper, {
          rotationZ: 360,
          duration:  DUR.p6,
          ease:      'none',     // linear — directly proportional to scroll
        })
        .addLabel('phase6_end');

      /* ── PHASE 7: scale up to fill viewport ─────────────────── */
      tl.to(wrapper, {
          rotationZ: 0,                  // normalize rotation
          scale:     maxScale,
          duration:  DUR.p7,
          ease:      'power2.inOut',
        })
        .addLabel('phase7_end');

      /* ── PHASE 8: fade out wrapper + fade in next-reveal ─────── */
      tl.to(wrapper, {
          opacity:  0,
          duration: DUR.p8,
          ease:     'power2.in',
        }, 'phase7_end')
        .to(nextReveal, {
          opacity:  1,
          duration: DUR.p8,
          ease:     'power2.in',
        }, 'phase7_end')
        .addLabel('phase8_end');

      /* ── Slideshow ScrollTrigger (Phase 5 only) ──────────────── */
      /* Uses its own ST so enter/leave work correctly at boundaries */
      ScrollTrigger.create({
        id:       'scs-slideshow',
        trigger:  section,
        /* Phase 5 starts after phases 1+2+3+4 travel is consumed.
           We calculate as fraction of total scrollTravel.          */
        start:    () => {
          const st = ScrollTrigger.getById('scs-main');
          if (!st) return 'top top';
          const totalDuration = DUR.p1_in + DUR.p1_hold + DUR.p2 + DUR.p3 + DUR.p4;
          const fullDur = totalDuration + DUR.p5_hold + DUR.p6 + DUR.p7 + DUR.p8;
          const startFrac = totalDuration / fullDur;
          return `top+=${Math.round(scrollTravel * startFrac)} top`;
        },
        end:      () => {
          const totalDuration = DUR.p1_in + DUR.p1_hold + DUR.p2 + DUR.p3 + DUR.p4;
          const fullDur = totalDuration + DUR.p5_hold + DUR.p6 + DUR.p7 + DUR.p8;
          const endFrac = (totalDuration + DUR.p5_hold) / fullDur;
          return `top+=${Math.round(scrollTravel * endFrac)} top`;
        },
        onEnter:      () => { slideshow.stop(); slideshow.start(); },
        onLeave:      () => slideshow.stop(),
        onEnterBack:  () => { slideshow.stop(); slideshow.start(); },
        onLeaveBack:  () => slideshow.stop(),
      });

      /* Return cleanup */
      return function cleanup() {
        slideshow.stop();
        ScrollTrigger.getById('scs-main')?.kill();
        ScrollTrigger.getById('scs-slideshow')?.kill();
        section.style.height = '';
        gsap.set(wrapper, { clearProps: 'all' });
        gsap.set(nextReveal, { clearProps: 'all' });
      };
    }

    /* ═══════════════════════════════════════════════════════════
       RESPONSIVE via gsap.matchMedia()
       Adjusts scroll travel and box size per breakpoint.
       ═══════════════════════════════════════════════════════════ */
    const mm = gsap.matchMedia();
    let cleanupFn = null;

    function run(scrollTravel) {
      if (cleanupFn) { cleanupFn(); cleanupFn = null; }
      /* Wait one rAF so pinspacer layout is computed correctly */
      requestAnimationFrame(() => {
        cleanupFn = buildAnimation(scrollTravel);
      });
    }

    /* Desktop — full 7000px experience */
    mm.add('(min-width: 1025px)', () => {
      run(7000);
      return () => { if (cleanupFn) { cleanupFn(); cleanupFn = null; } };
    });

    /* Tablet — slightly shorter */
    mm.add('(min-width: 769px) and (max-width: 1024px)', () => {
      run(6000);
      return () => { if (cleanupFn) { cleanupFn(); cleanupFn = null; } };
    });

    /* Mobile — compressed experience */
    mm.add('(max-width: 768px)', () => {
      run(4800);
      return () => { if (cleanupFn) { cleanupFn(); cleanupFn = null; } };
    });

    /* ═══════════════════════════════════════════════════════════
       RESIZE — debounced refresh
       ═══════════════════════════════════════════════════════════ */
    let _resizeTimer = null;
    window.addEventListener('resize', function onResize() {
      clearTimeout(_resizeTimer);
      _resizeTimer = setTimeout(function () {
        ScrollTrigger.refresh(true);
      }, 250);
    }, { passive: true });

  } /* end boot() */

  /* ═══════════════════════════════════════════════════════════════
     PRELOAD THEN BOOT
     Images start loading immediately; animation inits after DOM ready.
     ═══════════════════════════════════════════════════════════════ */

})(); /* end IIFE */
