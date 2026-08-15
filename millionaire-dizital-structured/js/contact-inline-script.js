document.addEventListener("DOMContentLoaded", function () {
  // 1. Initialize Lenis Scroll (if not already initialized by another page script)

  let lenis = window._lenis || null;

  if (!lenis && typeof Lenis !== 'undefined') {

    lenis = new Lenis({

      duration: 1.2,

      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),

      smooth: true,

      smoothTouch: false

    });



    function raf(time) {

      lenis.raf(time);

      requestAnimationFrame(raf);

    }

    requestAnimationFrame(raf);

    window._lenis = lenis;

  }

  // 2. Simple & Robust Navbar Dropdown Toggle
  const navBtn = document.getElementById('nav-scroll-menu-btn');
  const navContainer = document.getElementById('nav_scroll_container');
  const dropdown = document.getElementById('nav-scroll-dropdown');

  if (navBtn && navContainer && dropdown) {
    navBtn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      const isOpen = navContainer.classList.toggle('is-menu-open');
      navBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      dropdown.setAttribute('aria-hidden', isOpen ? 'false' : 'true');

      if (lenis) {

        if (isOpen) {

          lenis.stop();

        } else {

          lenis.start();

        }

      }
    });
  }

  // 3. Captcha Generator
  let capVal1 = Math.floor(Math.random() * 9) + 1;
  let capVal2 = Math.floor(Math.random() * 9) + 1;
  let correctAnswer = capVal1 + capVal2;

  const capDisplay1 = document.getElementById("cap_num1");
  const capDisplay2 = document.getElementById("cap_num2");
  if (capDisplay1 && capDisplay2) {
    capDisplay1.textContent = capVal1;
    capDisplay2.textContent = capVal2;
  }

  // 4. Interactive Budget & Service Tags
  const budgetBtns = document.querySelectorAll(".budget-offer-btn");
  const budgetPriceSection = document.getElementById("budgetPriceSection");
  const budgetPriceOffers = document.getElementById("budgetPriceOffers");
  const budgetSelectedRow = document.getElementById("budgetSelectedRow");
  const budgetSelectedTags = document.getElementById("budgetSelectedTags");
  const hiddenBudgetInput = document.getElementById("f_budget");
  const hiddenPriceInput = document.getElementById("f_price");

  const priceRanges = {
    "Brand Design": ["$1,000 - $3,000", "$3,000 - $5,000", "$5,000+"],
    "Web Systems": ["$3,000 - $7,000", "$7,000 - $12,000", "$12,000+"],
    "AI Automation": ["$2,000 - $5,000", "$5,000 - $10,000", "$10,000+"],
    "Performance Marketing": ["$1,500/mo - $3,000/mo", "$3,000/mo - $5,000/mo", "$5,000+/mo"]
  };

  let selectedService = "";
  let selectedPrice = "";

  budgetBtns.forEach(btn => {
    btn.addEventListener("click", function () {
      budgetBtns.forEach(b => b.classList.remove("is-active"));
      this.classList.add("is-active");
      selectedService = this.dataset.budget;
      hiddenBudgetInput.value = selectedService;
      
      // Update Price offers
      budgetPriceOffers.innerHTML = "";
      (priceRanges[selectedService] || []).forEach(price => {
        const pBtn = document.createElement("button");
        pBtn.type = "button";
        pBtn.className = "budget-price-btn";
        pBtn.textContent = price;
        pBtn.addEventListener("click", function () {
          document.querySelectorAll(".budget-price-btn").forEach(pb => pb.classList.remove("is-active"));
          this.classList.add("is-active");
          selectedPrice = this.textContent;
          hiddenPriceInput.value = selectedPrice;
          updateSelectedTags();
        });
        budgetPriceOffers.appendChild(pBtn);
      });
      
      budgetPriceSection.classList.add("is-visible");
      updateSelectedTags();
    });
  });

  function updateSelectedTags() {
    budgetSelectedTags.innerHTML = "";
    if (selectedService) {
      budgetSelectedRow.classList.add("is-visible");
      
      const tag = document.createElement("div");
      tag.className = "budget-selected-tag";
      tag.innerHTML = `<span>${selectedService} ${selectedPrice ? "(" + selectedPrice + ")" : ""}</span>`;
      
      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "budget-tag-remove";
      removeBtn.textContent = "×";
      removeBtn.addEventListener("click", resetBudgetSelection);
      
      tag.appendChild(removeBtn);
      budgetSelectedTags.appendChild(tag);
    } else {
      budgetSelectedRow.classList.remove("is-visible");
    }
  }

  function resetBudgetSelection() {
    selectedService = "";
    selectedPrice = "";
    hiddenBudgetInput.value = "";
    hiddenPriceInput.value = "";
    budgetBtns.forEach(b => b.classList.remove("is-active"));
    budgetPriceSection.classList.remove("is-visible");
    budgetSelectedRow.classList.remove("is-visible");
    budgetSelectedTags.innerHTML = "";
  }

  // 5. Form Validation & Modal Submission
  const form = document.getElementById("contactForm");
  const nameInput = document.getElementById("f_name");
  const emailInput = document.getElementById("f_email");
  const phoneInput = document.getElementById("f_phone");
  const captchaInput = document.getElementById("f_captcha");

  const nameError = document.getElementById("name-error");
  const emailError = document.getElementById("email-error");
  const phoneError = document.getElementById("phone-error");
  const captchaError = document.getElementById("captcha-error");

  const lbOverlay = document.getElementById("lb-overlay");
  const lbClose = document.getElementById("lb-close");

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    let isValid = true;

    // Reset errors
    nameError.classList.remove("visible");
    emailError.classList.remove("visible");
    phoneError.classList.remove("visible");
    captchaError.classList.remove("visible");

    if (!nameInput.value.trim()) {
      nameError.classList.add("visible");
      isValid = false;
    }

    if (!emailInput.value.trim() || !emailInput.value.includes("@")) {
      emailError.classList.add("visible");
      isValid = false;
    }

    if (!phoneInput.value.trim()) {
      phoneError.classList.add("visible");
      isValid = false;
    }

    if (parseInt(captchaInput.value) !== correctAnswer) {
      captchaError.classList.add("visible");
      isValid = false;
    }

    if (isValid) {
      // Mock successful submission -> Show lightbox
      lbOverlay.classList.add("active");
      form.reset();
      resetBudgetSelection();
      
      // Regenerate captcha
      capVal1 = Math.floor(Math.random() * 9) + 1;
      capVal2 = Math.floor(Math.random() * 9) + 1;
      correctAnswer = capVal1 + capVal2;
      if (capDisplay1 && capDisplay2) {
        capDisplay1.textContent = capVal1;
        capDisplay2.textContent = capVal2;
      }
    }
  });

  if (lbClose) {
    lbClose.addEventListener("click", function () {
      lbOverlay.classList.remove("active");
    });
  }
});
