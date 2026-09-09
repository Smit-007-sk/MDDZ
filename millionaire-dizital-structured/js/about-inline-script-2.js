

    (function () {
      function init() {
        if (!window.gsap || !window.ScrollTrigger) {
          window.addEventListener('load', init, { once: true });
          return;
        }
        var overlay = document.querySelector('.grid-overlay');
        var trigger = document.querySelector('.core-capabilities');
        if (!overlay || !trigger) return;
        ScrollTrigger.create({
          trigger: trigger,
          start: 'top bottom',
          onEnter: function () { gsap.to(overlay, { autoAlpha: 0, duration: 0.4, ease: 'power2.out' }); },
          onLeaveBack: function () { gsap.to(overlay, { autoAlpha: 1, duration: 0.4, ease: 'power2.out' }); }
        });
      }
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
      } else {
        init();
      }
    }());

  