

    (function () {

      var cols = document.querySelectorAll('.grid-column');

      if (!cols.length || !window.gsap) return;

      gsap.set(cols, { opacity: 0, scaleY: 0 });

      

      gsap.to(cols, {

        opacity: 1, scaleY: 1, duration: 1.2, stagger: 0.08,

        ease: 'power2.out', transformOrigin: 'top',

        delay: 1.0,

        onComplete: function () { cols.forEach(function (el) { el.style.willChange = 'auto'; }); }

      });

    }());

  