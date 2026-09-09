(function () {
      function initHeroExpand() {
        if (!window.gsap || !window.ScrollTrigger) {
          window.addEventListener('load', initHeroExpand, { once: true });
          return;
        }

        gsap.config({ nullTargetWarn: false });
        if (window.ScrollTrigger && gsap.registerPlugin) gsap.registerPlugin(ScrollTrigger);

        if (window.ScrollTrigger) {
          ScrollTrigger.config({
            limitCallbacks: true,
            ignoreMobileResize: true,
          });
        }

        var videoLayer = document.getElementById('videoLayer');
        var placeholder = document.getElementById('placeholder');
        var viewport = document.getElementById('viewport');
        if (!videoLayer || !placeholder || !viewport) return;

        var vid = videoLayer.querySelector('video');

        var lenis = window._lenis || (typeof window.initSmoothScroll === 'function' ? window.initSmoothScroll() : null);
        if (lenis && !lenis.__aboutScrollTriggerBound) {
          lenis.on('scroll', window.ScrollTrigger.update);
          lenis.__aboutScrollTriggerBound = true;
        }

        function getPlaceholderState() {
          var rect = placeholder.getBoundingClientRect();
          var parentRect = viewport.getBoundingClientRect();
          return {
            top: rect.top - parentRect.top,
            left: rect.left - parentRect.left,
            width: rect.width,
            height: rect.height
          };
        }

        function syncVideoLayerToPlaceholder() {
          var state = getPlaceholderState();
          gsap.set(videoLayer, {
            top: state.top,
            left: state.left,
            width: state.width,
            height: state.height
          });
        }

        gsap.set('.g-rev', { y: '110%' });
        gsap.set('.g-fade', { opacity: 0, y: 15 });
        gsap.set('.divider-line', { scaleX: 0 });
        syncVideoLayerToPlaceholder();
        gsap.set(videoLayer, { opacity: 0, scale: 0.9 });

        var yearLeft = document.getElementById('yearLeft');
        var yearRight = document.getElementById('yearRight');
        if (yearLeft) gsap.set(yearLeft, { x: '-110%' });
        if (yearRight) gsap.set(yearRight, { x: '110%' });

        var introTl = gsap.timeline({ defaults: { ease: 'power4.out' } })
          .to('.g-rev', { y: '0%', duration: 1.2, stagger: 0.1 }, 0.2)
          .to('.divider-line', { scaleX: 1, duration: 1.5, ease: 'expo.inOut' }, 0.4)
          .to('.g-fade', { opacity: 1, y: 0, duration: 1, stagger: 0.05 }, 0.8)
          .to(videoLayer, {
            scale: 1, opacity: 1, duration: 1.5, ease: 'power3.out',
            onStart: function () { if (vid) vid.play().catch(function () { }); }
          }, 0.6);

        if (yearLeft) introTl.to(yearLeft, { x: '0%', duration: 1.4, ease: 'power3.out' }, 0.1);
        if (yearRight) introTl.to(yearRight, { x: '0%', duration: 1.4, ease: 'power3.out' }, 0.1);

        // Scroll-driven Expansion Timeline (Active on both Desktop and Mobile!)
        var scrollTl = gsap.timeline({
          scrollTrigger: {
            trigger: '.scroll-container',
            start: 'top top',
            end: 'bottom bottom',
            scrub: 1,
            anticipatePin: 1,
            pin: '#viewport',
            invalidateOnRefresh: true,
            onRefreshInit: syncVideoLayerToPlaceholder
          }
        });

        scrollTl.fromTo(videoLayer, {
          top: function () { return getPlaceholderState().top; },
          left: function () { return getPlaceholderState().left; },
          width: function () { return getPlaceholderState().width; },
          height: function () { return getPlaceholderState().height; }
        }, {
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          duration: 1,
          ease: 'power2.inOut'
        }, 0);

        // Fade out captions and divider lines as the monitor expands
        scrollTl.to('.hide-on-scroll', {
          opacity: 0,
          duration: 0.35,
          ease: 'power1.out'
        }, 0);

        window.addEventListener('resize', function () {
          syncVideoLayerToPlaceholder();
          if (window.ScrollTrigger) window.ScrollTrigger.refresh();
        }, { passive: true });

        if (window.ScrollTrigger) window.ScrollTrigger.refresh();
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initHeroExpand);
      } else {
        initHeroExpand();
      }
    })();