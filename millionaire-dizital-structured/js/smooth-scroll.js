/**
 * MDZ Smooth Scroll Manager
 * Centralized, buttery-smooth scrolling engine powered by Lenis and GSAP.
 */
(function (global) {
  'use strict';

  function initSmoothScroll() {
    if (typeof global.Lenis === 'undefined') {
      return null;
    }

    // Destroy existing instance if any
    if (global._lenis && typeof global._lenis.destroy === 'function') {
      try {
        global._lenis.destroy();
      } catch (e) {}
    }

    var prefersReducedMotion = global.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var lenis = new global.Lenis({
      duration: prefersReducedMotion ? 0.01 : 1.2,
      easing: function (t) {
        return Math.min(1, 1.001 - Math.pow(2, -10 * t));
      },
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: !prefersReducedMotion,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.8,
      infinite: false,
      syncTouch: false,
      autoResize: true,
    });

    global._lenis = lenis;

    // Connect Lenis to GSAP ScrollTrigger
    if (global.ScrollTrigger) {
      lenis.on('scroll', global.ScrollTrigger.update);
    }

    // Connect Lenis to GSAP Ticker for 60fps/120fps/144fps frame-accurate updates
    if (global.gsap && global.gsap.ticker) {
      if (global._lenisTickerCb) {
        global.gsap.ticker.remove(global._lenisTickerCb);
      }
      global._lenisTickerCb = function (time) {
        lenis.raf(time * 1000);
      };
      global.gsap.ticker.add(global._lenisTickerCb);
      global.gsap.ticker.lagSmoothing(0);
    } else {
      var rafId = 0;
      function raf(time) {
        lenis.raf(time);
        rafId = global.requestAnimationFrame(raf);
      }
      rafId = global.requestAnimationFrame(raf);
      lenis._rafId = rafId;
    }

    // Refresh ScrollTrigger after assets and fonts load
    if (global.ScrollTrigger) {
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(function () {
          global.ScrollTrigger.refresh();
        }).catch(function () {});
      }
      global.addEventListener('load', function () {
        global.ScrollTrigger.refresh();
      }, { once: true });
    }

    return lenis;
  }

  // Handle visibility changes to prevent velocity glitches when switching tabs
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && global._lenis) {
      try {
        global._lenis.scrollTo(global._lenis.scroll, { immediate: true, force: true });
      } catch (e) {}
    }
  });

  // Handle smooth internal anchor links
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var href = a.getAttribute('href');
    if (!href || href === '#' || href.length < 2) return;
    var target = document.querySelector(href);
    if (!target) return;
    e.preventDefault();
    if (global._lenis && typeof global._lenis.scrollTo === 'function') {
      global._lenis.scrollTo(target, { duration: 1.2, offset: 0 });
    } else {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, { passive: false });

  // Auto-init on DOMContentLoaded or immediately if DOM already loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initSmoothScroll();
    });
  } else {
    initSmoothScroll();
  }

  global.initSmoothScroll = initSmoothScroll;
})(window);
