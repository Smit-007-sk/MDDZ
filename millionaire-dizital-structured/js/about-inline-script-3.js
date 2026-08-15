

    (function () {

      'use strict';

      if (!window.gsap || !window.ScrollTrigger) return;

      var gsap = window.gsap;

      var ST = window.ScrollTrigger;



      var items = document.querySelectorAll('.awp-grid .awp-item-1, .awp-grid .awp-item-2, .awp-grid .awp-item-3, .awp-grid .awp-item-4');

      if (!items.length) return;



      items.forEach(function (item) {

        var lens = item.querySelector('.awp-lens-1, .awp-lens-2, .awp-lens-3, .awp-lens-4');

        var img = lens ? lens.querySelector('img') : null;

        var info = item.querySelector('.project-info');



        // 1. Entrance: clip-path reveal from top

        if (lens) {

          gsap.set(lens, { clipPath: 'inset(100% 0% 0% 0%)' });

          gsap.to(lens, {

            clipPath: 'inset(0% 0% 0% 0%)',

            duration: 0.7,

            ease: 'expo.out',

            scrollTrigger: {

              trigger: item,

              start: 'top 88%',

              toggleActions: 'play none none reverse'

            }

          });

        }



        // 2. Image parallax (subtle movement on scroll)

        if (img) {

          gsap.fromTo(img, {

            scale: 1.18

          }, {

            scale: 1,

            ease: 'none',

            scrollTrigger: {

              trigger: item,

              start: 'top bottom',

              end: 'bottom top',

              scrub: 1.2

            }

          });

        }



        // 3. Project info fade-up

        if (info) {

          gsap.set(info, { autoAlpha: 0, y: 24 });

          gsap.to(info, {

            autoAlpha: 1,

            y: 0,

            duration: 0.5,

            ease: 'power2.out',

            scrollTrigger: {

              trigger: item,

              start: 'top 82%',

              toggleActions: 'play none none reverse'

            }

          });

        }

      });



      ST.refresh();

    }());

  