

    (function () {

      const footer = document.getElementById('site-footer');

      if (!footer || !window.gsap) return;



      const contactInfo = footer.querySelector('.footer-contact-info');

      const addrDiv     = footer.querySelector('.footer-main-content > div > div[style]');

      const navLinks    = footer.querySelector('.footer-nav-links');

      const thumb       = footer.querySelector('.footer-video-thumb');



      const contactEmail = contactInfo ? contactInfo.querySelector('a') : null;

      const contactPhone = contactInfo ? contactInfo.querySelector('span') : null;



      if (contactEmail) {

        const ew = document.createElement('div');

        ew.style.overflow = 'hidden';

        contactEmail.parentNode.insertBefore(ew, contactEmail);

        ew.appendChild(contactEmail);

        gsap.set(contactEmail, { y: '105%' });

      }

      if (contactPhone) {

        const pw = document.createElement('div');

        pw.style.cssText = 'overflow:hidden;display:block;';

        contactPhone.parentNode.insertBefore(pw, contactPhone);

        pw.appendChild(contactPhone);

        gsap.set(contactPhone, { display: 'inline-block', y: '105%' });

      }



      const navAnchors = navLinks ? [...navLinks.querySelectorAll('a')] : [];

      navAnchors.forEach(a => {

        const wrap = document.createElement('span');

        wrap.className = 'frev-wrap';

        a.parentNode.insertBefore(wrap, a);

        wrap.appendChild(a);

      });

      gsap.set(navAnchors, { y: '120%' });



      let videoCover = null;

      if (thumb) {

        videoCover = document.createElement('div');

        videoCover.className = 'footer-video-cover';

        thumb.appendChild(videoCover);

      }



      const tl = gsap.timeline({

        scrollTrigger: { trigger: footer, start: 'top 82%' }

      });



      if (contactEmail) tl.to(contactEmail, { y: '0%', duration: 1.2, ease: 'power4.out' }, 0);

      if (contactPhone) tl.to(contactPhone, { y: '0%', duration: 0.9, ease: 'power3.out' }, 0.2);

      if (addrDiv)      tl.from(addrDiv,    { y: 14, opacity: 0, duration: 0.8, ease: 'power3.out' }, 0.35);

      if (navAnchors.length) tl.to(navAnchors, { y: '0%', duration: 0.85, stagger: 0.07, ease: 'power4.out' }, 0.48);

      if (videoCover) {

        tl.fromTo(videoCover,

          { scaleX: 1 },

          { scaleX: 0, duration: 0.85, ease: 'power4.inOut', transformOrigin: 'right center' },

          0.1

        );

      }

    })();

  