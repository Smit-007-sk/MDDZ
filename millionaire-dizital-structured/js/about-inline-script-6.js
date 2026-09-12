

    (function () {
      'use strict';
      function init() {
        var gsapRef = window.gsap || (typeof gsap !== 'undefined' ? gsap : null);
        var STRef = window.ScrollTrigger || (typeof ScrollTrigger !== 'undefined' ? ScrollTrigger : null);
        var rows = Array.prototype.slice.call(document.querySelectorAll('.roster-client-row'));
        var noMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!rows.length) return;
        if (gsapRef && STRef && gsapRef.registerPlugin) gsapRef.registerPlugin(STRef);

        rows.forEach(function (row) {
          if (gsapRef && STRef && !noMotion) {
            gsapRef.fromTo(row,
              { opacity: 0, y: 28 },
              {
                opacity: 1, y: 0, duration: 1.2, ease: 'expo.out',
                scrollTrigger: { trigger: row, start: 'top 96%', toggleActions: 'play none none reverse' }
              }
            );
          } else {
            row.style.opacity = '1';
            row.style.transform = 'none';
          }
        });
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
      } else {
        init();
      }
    }());

  