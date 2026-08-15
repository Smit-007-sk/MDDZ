

        (function () {

          // 🎯  ancestor 。 display:none 

          //    ( .mobile-cube-section  video),

          //    、。

          function isVideoRenderable(video) {

            if (!video || !video.isConnected) return false;

            try {

              if (typeof video.checkVisibility === 'function') {

                return video.checkVisibility({ checkOpacity: false, checkVisibilityCSS: true });

              }

              var node = video;

              while (node && node !== document.body) {

                var s = window.getComputedStyle(node);

                if (s.display === 'none') return false;

                node = node.parentElement;

              }

            } catch (_) { }

            return true;

          }



          function hydrateVideo(video) {

            if (!video || video.dataset.videoHydrated === 'true') return;

            // ( CSS ), viewport 

            if (!isVideoRenderable(video)) return;

            video.dataset.videoHydrated = 'true';



            video.querySelectorAll('source[data-src]').forEach(function (source) {

              source.src = source.dataset.src;

            });

            if (video.dataset.src) video.src = video.dataset.src;



            video.load();

            if (video.autoplay || video.hasAttribute('autoplay')) {

              var tryPlay = function () { video.play().catch(function () { }); };

              if (video.readyState >= 2) tryPlay();

              else video.addEventListener('canplay', tryPlay, { once: true });

            }

          }



          function hydrateDeferredImage(img) {

            if (!img || img.dataset.imageHydrated === 'true') return;

            var nextSrc = img.dataset.deferSrc;

            if (!nextSrc) return;

            img.dataset.imageHydrated = 'true';

            img.src = nextSrc;

            img.removeAttribute('data-defer-src');

          }



          function isPriorityVideo(video) {

            if (!video) return false;

            if (video.dataset.lazyPriority === 'high') return true;

            return false;

          }



          document.addEventListener('DOMContentLoaded', function () {

            var videos = Array.prototype.slice.call(document.querySelectorAll('video[data-lazy-video]'));

            var scrollDeferredImages = Array.prototype.slice.call(document.querySelectorAll('img[data-defer-src]'));



            var priorityVideos = [];

            var deferredVideos = [];

            var scrollDeferredVideos = [];



            videos.forEach(function (video) {

              if (video.dataset.lazyOnScroll === 'true') {

                scrollDeferredVideos.push(video);

                return;

              }

              if (isPriorityVideo(video)) priorityVideos.push(video);

              else deferredVideos.push(video);

            });



            priorityVideos.forEach(function (video) {

              requestAnimationFrame(function () { hydrateVideo(video); });

            });



            var requestScrollMediaIdle = window.requestIdleCallback

              ? window.requestIdleCallback.bind(window)

              : function (callback) { return setTimeout(callback, 1200); };



            function hydrateScrollMedia() {

              // 🎯  hydrate： GPU , long task。

              var videoQueue = scrollDeferredVideos.slice();

              var imageQueue = scrollDeferredImages.slice();

              scrollDeferredVideos.length = 0;

              scrollDeferredImages.length = 0;



              function pump() {

                if (videoQueue.length) {

                  hydrateVideo(videoQueue.shift());

                }

                for (var i = 0; i < 2 && imageQueue.length; i++) {

                  hydrateDeferredImage(imageQueue.shift());

                }

                if (videoQueue.length || imageQueue.length) {

                  requestAnimationFrame(pump);

                }

              }



              requestAnimationFrame(pump);

            }



            if (scrollDeferredVideos.length || scrollDeferredImages.length) {

              var didHydrateScrollMedia = false;

              var activateScrollMedia = function () {

                if (didHydrateScrollMedia) return;

                didHydrateScrollMedia = true;

                window.removeEventListener('scroll', activateOnScroll);

                window.removeEventListener('keydown', activateOnKey);

                requestAnimationFrame(hydrateScrollMedia);

              };

              var activateOnScroll = function () {

                var scrollY = window._lenis ? window._lenis.scroll : window.scrollY;

                if (scrollY <= 8) return;

                activateScrollMedia();

              };

              var activateOnKey = function (event) {

                if (!/^(ArrowDown|PageDown|Space|End)$/.test(event.code || '')) return;

                activateScrollMedia();

              };



              // 🎯  requestAnimationFrame  activate( lazy),

              //     load+2.5s preheat —  hero 。

              //     load + 5s, hero ;

              //     /  / ,。

              document.addEventListener('mdz:activate-scroll-media', activateScrollMedia, { once: true });

              window.addEventListener('wheel', activateScrollMedia, { passive: true, once: true });

              window.addEventListener('touchstart', activateScrollMedia, { passive: true, once: true });

              window.addEventListener('keydown', activateOnKey);

              window.addEventListener('scroll', activateOnScroll, { passive: true });

              requestAnimationFrame(activateOnScroll);



              // ：loader  5s（ hero ）， activate。

              // ／／，。

              var autoActivateDelay = 5000;

              var autoActivateTimer = setTimeout(function () {

                document.dispatchEvent(new Event('mdz:activate-scroll-media'));

              }, autoActivateDelay);

              document.addEventListener('mdz:activate-scroll-media', function () {

                clearTimeout(autoActivateTimer);

              }, { once: true });

            }



            if (deferredVideos.length && 'IntersectionObserver' in window) {

              var observer = new IntersectionObserver(function (entries) {

                entries.forEach(function (entry) {

                  if (!entry.isIntersecting) return;

                  hydrateVideo(entry.target);

                  observer.unobserve(entry.target);

                });

              }, { rootMargin: '280px 0px 420px 0px' });



              deferredVideos.forEach(function (video) { observer.observe(video); });

            } else if (deferredVideos.length) {

              setTimeout(function () {

                deferredVideos.forEach(hydrateVideo);

              }, 1200);

            }

          });

        })();

      