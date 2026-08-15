

    (function () {

      'use strict';

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



      var isTouchOnly = window.matchMedia('(hover: none), (pointer: coarse)').matches;

      if (isTouchOnly) return;



      var hoverEl = document.getElementById('roster-cursor-img');

      if (!hoverEl) return;

      var imgEl = hoverEl.querySelector('img');



      var mx = 0, my = 0, ix = 0, iy = 0, raf = null, visible = false;



      document.addEventListener('mousemove', function (e) { mx = e.clientX; my = e.clientY; }, { passive: true });



      function tick() {

        ix += (mx - ix) * 0.1;

        iy += (my - iy) * 0.1;

        hoverEl.style.transform = 'translate(' + (ix + 24) + 'px,' + (iy - 190) + 'px)';

        raf = requestAnimationFrame(tick);

      }



      function showImg(src) {

        if (imgEl && imgEl.getAttribute('src') !== src) imgEl.src = src;

        if (!visible) {

          visible = true; ix = mx; iy = my;

          hoverEl.classList.add('is-visible');

          if (!raf) raf = requestAnimationFrame(tick);

        }

      }



      function hideImg() {

        visible = false;

        hoverEl.classList.remove('is-visible');

        if (raf) { cancelAnimationFrame(raf); raf = null; }

      }



      rows.forEach(function (row) {

        row.addEventListener('mouseenter', function () {

          var src = row.getAttribute('data-img');

          if (src) showImg(src);

        });

        row.addEventListener('mouseleave', hideImg);

      });

    }());

  