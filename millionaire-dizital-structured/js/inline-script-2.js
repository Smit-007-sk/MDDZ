

    (function () {

      var isDesktop = !!(window.matchMedia && window.matchMedia('(min-width: 768px)').matches);

      var src = isDesktop

        ? './images/home/slider1/slider01.mp4'

        : './images/home/slider1/slider01_s.mp4';

      var v = document.createElement('video');

      v.src = src;

      v.preload = 'auto';

      v.muted = true;

      v.playsInline = true;

      v.loop = true;

      v.setAttribute('aria-hidden', 'true');

      v.setAttribute('muted', '');

      v.setAttribute('playsinline', '');

      v.setAttribute('webkit-playsinline', '');

      //  autoplay ， iOS Safari / Android Chrome 

      if (!isDesktop) { v.autoplay = true; v.setAttribute('autoplay', ''); }

      //  viewport  browser （ Idle），

      v.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;object-fit:cover;opacity:0;pointer-events:none;z-index:-1';

      // <body>  documentElement;DOMContentLoaded  body 

      (document.body || document.documentElement).appendChild(v);

      v.load(); // , Range request  HTTP cache

      var playPromise = v.play();

      if (playPromise && typeof playPromise.catch === 'function') playPromise.catch(function () { });

      // 🎯  prewarm element  WebGLManager ：index=0  decode  element，

      //     <video>  demux/decode ， uTexReady=0 。

      window._prewarmVideo = { el: v, src: src };

      // prewarm  WebGLManager ； 8 。

      // 🛡️  (a)  hero （dataset.ndPromoted），

      //         (b) DOMContentLoaded （ defer scripts ），

      //    ，。

      (function scheduleCleanup() {

        window.setTimeout(function () {

          if (!(window._prewarmVideo && window._prewarmVideo.el === v)) return; // 

          if (v.dataset.ndPromoted === '1' || document.readyState === 'loading') {

            scheduleCleanup(); //  /  ready →  8 

            return;

          }

          window._prewarmVideo = null;

          if (v && v.parentNode) {

            v.removeAttribute('src');

            try { v.load(); } catch (_) { }

            v.parentNode.removeChild(v);

          }

        }, 8000);

      })();

    })();

  