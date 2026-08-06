var config = window.MDZ_ANIMATION_CONFIG || { loader: { targetMs: 2700, dismissTargetMs: 3200 } };
        var _loaderTarget = config.loader.targetMs; // ms from navigation start
        var _loaderDismissTarget = config.loader.dismissTargetMs; // release click shield shortly after loader exit

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