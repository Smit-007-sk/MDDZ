

    (function () {

      if (!window.gsap || !window.ScrollTrigger) return;



      var cubeEl = document.getElementById('cc-cube-el');

      var panels = gsap.utils.toArray('.cc-panel');

      var dots = gsap.utils.toArray('.cc-dot');

      var iconBtns = gsap.utils.toArray('.cc-icon-btn');

      if (!cubeEl || !panels.length) return;



      var N = panels.length; // 6



      var stops = [

        { rx: 90, ry: 0 },

        { rx: 0, ry: 0 },

        { rx: 0, ry: -90 },

        { rx: 0, ry: -180 },

        { rx: 0, ry: -270 },

        { rx: -90, ry: -270 }

      ];



      var NAMES = ['BRAND IDENTITY DESIGN', 'DIGITAL & WEB ARCHITECTURE', 'WEB DESIGN & NATIVE CODE', 'HIGH-END AI CONTEXT SYNTHESIS', 'AI MOTION & VIDEO SYNTHESIS', 'DIGITAL & VISUAL CONSULTING'];

      var NUMS = ['01', '02', '03', '04', '05', '06'];



      var miniCubeEl = document.getElementById('cc-mini-cube-el');

      var lastIdx = -1;



      function easeIO(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }



      function updateAt(progress) {

        var t = progress * (N - 1);

        var i = Math.min(Math.floor(t), N - 2);

        var f = easeIO(t - i);

        var rx = stops[i].rx + (stops[i + 1].rx - stops[i].rx) * f;

        var ry = stops[i].ry + (stops[i + 1].ry - stops[i].ry) * f;

        cubeEl.style.transform = 'rotateX(' + rx + 'deg) rotateY(' + ry + 'deg)';

        if (miniCubeEl) miniCubeEl.style.transform = 'rotateX(' + rx + 'deg) rotateY(' + ry + 'deg)';



        var si = Math.max(0, Math.min(N - 1, Math.round(progress * (N - 1))));

        if (si !== lastIdx) {

          lastIdx = si;

          panels.forEach(function (p, x) { p.classList.toggle('active', x === si); });

          dots.forEach(function (d, x) { d.classList.toggle('active', x === si); });

          iconBtns.forEach(function (b, x) { b.classList.toggle('active', x === si); });

        }

      }



      var proxy = { val: 0 };

      var cubeST;

      gsap.to(proxy, {

        val: 1,

        ease: 'none',

        onUpdate: function () { updateAt(proxy.val); },

        scrollTrigger: {

          id: 'cube-st',

          trigger: '.core-capabilities',

          pin: true,

          // pinType: 'transform' causes double translate jitter on Lenis + old Safari; let ScrollTrigger decide

          

          start: 'top top',

          end: function () {

            return '+=' + Math.max(window.innerHeight * 3.8, (N - 1) * window.innerHeight * 0.72);

          },

          scrub: 0.9,

          anticipatePin: 1,

          invalidateOnRefresh: true,

          onRefreshInit: function () { updateAt(0); },

          onRefresh: function (self) { updateAt(self.progress || 0); },

          onToggle: function (self) { cubeST = self; },

          onScrubComplete: function () { },

        }

      });



      // store reference after ScrollTrigger is created

      ScrollTrigger.addEventListener('refresh', function () {

        cubeST = ScrollTrigger.getById('cube-st');

      });



      updateAt(0);



      iconBtns.forEach(function (btn, idx) {

        btn.addEventListener('click', function () {

          var st = cubeST || ScrollTrigger.getById('cube-st');

          if (!st) {

            st = ScrollTrigger.getAll().find(function (t) {

              return t.vars && t.vars.id === 'cube-st';

            });

          }

          if (st) {

            var targetProgress = idx / (N - 1);

            var targetScroll = st.start + targetProgress * (st.end - st.start);

            if (window._lenis) {

              window._lenis.scrollTo(targetScroll, { duration: 1.2, force: true });

            } else {

              window.scrollTo({ top: targetScroll, behavior: 'smooth' });

            }

          }

        });

      });

    }());

  