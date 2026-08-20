

        // ── Image Sequence Loader Animation ────────────────────────
        (function() {
          var images = [
            "./images/main-images/Silver Leaf final.png",
            "./images/main-images/MTV Post 3.jpg",
            "./images/main-images/CF 1.png",
            "./images/main-images/CF Post.png",
            "./images/main-images/CF STORY.png",
            "./images/main-images/opsi.png",
            "./images/main-images/ARB X HS 1.png",
            "./images/main-images/lust emergency hoodie.png",
            "./images/main-images/Gold Neutral Modern Jewellery Instagram Post.png"
          ];
          
          // Preload images to prevent flickering
          images.forEach(function(src) {
            var img = new Image();
            img.src = src;
          });

          var imgEl = document.getElementById('loader-sequence-img');
          if (!imgEl) return;
          var index = 0;
          var interval = setInterval(function() {
            if (window._mdzLoaderDismissed) {
              clearInterval(interval);
              return;
            }
            index = (index + 1) % images.length;
            imgEl.src = images[index];
          }, 120);
        })();

        // Anchor hero reveal to page-load time using performance.now()

        // DOMContentLoaded fires AFTER all defer scripts → _heroTl is guaranteed to exist

        var _loaderTarget = 2700; // ms from navigation start

        var _loaderDismissTarget = 3200; // release click shield shortly after loader exit



        function dismissMDZLoader() {

          var el = document.getElementById('mdz-loader');

          if (!el || el.dataset.dismissed === 'true') return;

          el.dataset.dismissed = 'true';

          window._mdzLoaderDismissed = true;

          el.style.pointerEvents = 'none';

          el.style.opacity = '0';

          el.style.visibility = 'hidden';

          document.dispatchEvent(new Event('mdz:loader-dismissed'));

          window.setTimeout(function () {

            if (el && el.parentNode) el.remove();

          }, 220);

        }



        document.addEventListener('DOMContentLoaded', function () {

          var remaining = Math.max(0, _loaderTarget - performance.now());

          var dismissRemaining = Math.max(0, _loaderDismissTarget - performance.now());

          setTimeout(function () {

            if (window._heroTl) window._heroTl.play();

          }, remaining);

          setTimeout(dismissMDZLoader, dismissRemaining);

        });

        // bfcache restore: pageshow with persisted=true doesn't re-run scripts

        window.addEventListener('pageshow', function (e) {

          if (e.persisted) {

            // Force full reload to avoid stale GSAP/Lenis state from bfcache

            window.location.reload();

          }

        });

        // Hard fallback: if GSAP never loaded (CDN fail, network block), make everything visible

        setTimeout(function () {

          dismissMDZLoader();

          if (!window._heroTl) {

            // GSAP didn't load — remove all inline visibility overrides

            var style = document.createElement('style');

            style.textContent = '*{visibility:visible!important;opacity:1!important;transform:none!important;filter:none!important;clip-path:none!important}';

            document.head.appendChild(style);

          }

        }, 5500);

      