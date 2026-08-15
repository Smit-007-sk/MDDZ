

    (function () {

      if (!window.matchMedia('(max-width: 768px)').matches) return;



      var carousel = document.querySelector('.cc-mobile-carousel');

      if (carousel) {

        var bg = document.createElement('div');

        bg.className = 'cc-mobile-bg-ticker';

        bg.setAttribute('aria-hidden', 'true');

        var SMILE_SRC = 'images/about/box/smile.svg';

        var CAP_NAMES = ['BRAND', 'WEB PLANNING', 'WEB DESIGN', 'AI VISUALS', 'AI MOTION', 'DIGITAL'];

        var activeLabel = CAP_NAMES[0];

        var ROWS = 12, UNITS_PER_HALF = 5;

        var rows = [];

        for (var r = 0; r < ROWS; r++) {

          var row = document.createElement('div'); row.className = 'cc-mbt-row';

          var inner = document.createElement('div'); inner.className = 'cc-mbt-inner';

          for (var u = 0; u < UNITS_PER_HALF * 2; u++) {

            var sp = document.createElement('span'); sp.className = 'cc-mbt-item'; sp.textContent = activeLabel; inner.appendChild(sp);

            var im = document.createElement('img'); im.className = 'cc-mbt-smile'; im.src = SMILE_SRC; im.alt = ''; inner.appendChild(im);

          }

          row.appendChild(inner); bg.appendChild(row);

          rows.push({ inner: inner });

        }

        carousel.insertBefore(bg, carousel.firstChild);

        window._updateMbtLabel = function (idx) {

          var label = CAP_NAMES[idx] || CAP_NAMES[0];

          rows.forEach(function (obj) {

            obj.inner.querySelectorAll('.cc-mbt-item').forEach(function (s) { s.textContent = label; });

          });

        };

      }



      var track = document.getElementById('cc-carousel-track');

      if (!track) return;

      var cards = track.querySelectorAll('.cc-carousel-card');

      var descs = document.querySelectorAll('.cc-mobile-desc');

      var numVal = document.querySelector('.cc-mobile-num-val');



      function updateActive(i) {

        descs.forEach(function (d) { d.classList.toggle('active', parseInt(d.dataset.i) === i); });

        if (numVal) numVal.textContent = String(i + 1);

        if (window._updateMbtLabel) window._updateMbtLabel(i);

      }



      var observer = new IntersectionObserver(function (entries) {

        entries.forEach(function (entry) {

          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {

            updateActive(parseInt(entry.target.dataset.i));

          }

        });

      }, { root: track, threshold: 0.5 });



      cards.forEach(function (card) { observer.observe(card); });

      updateActive(0);

    }());

  