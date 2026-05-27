(function () {
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".nav");
  const navLinks = document.querySelectorAll(".nav a");
  const yearEl = document.getElementById("year");
  const modal = document.getElementById("demo-modal");
  const modalBody = document.getElementById("demo-modal-body");
  const modalTitle = document.getElementById("demo-modal-title");
  const modalBadge = document.getElementById("demo-modal-badge");
  const demoButtons = document.querySelectorAll("[data-demo]");
  const dropdownToggle = document.querySelector(".nav-dropdown-btn");
  const dropdown = document.querySelector(".nav-dropdown");
  const loginModal = document.getElementById('login-modal');
  const loginForm = document.getElementById('login-form');
  const loginBtn = document.querySelector('.nav-demo-login');

  /* ────── Login Modal ────── */
  function openLoginModal(e) {
    if (e) e.preventDefault();
    if (loginModal) {
      loginModal.hidden = false;
      document.body.classList.add('modal-open');
    }
  }

  function closeLoginModal() {
    if (loginModal) {
      loginModal.hidden = true;
      document.body.classList.remove('modal-open');
    }
  }

  function updateLoginButton(isLoggedIn) {
    if (!loginBtn) return;
    if (isLoggedIn) {
      loginBtn.textContent = 'লগআউট';
      loginBtn.removeEventListener('click', openLoginModal);
      loginBtn.addEventListener('click', logoutHandler);
    } else {
      loginBtn.textContent = 'লগইন';
      loginBtn.removeEventListener('click', logoutHandler);
      loginBtn.addEventListener('click', openLoginModal);
    }
  }

  function logoutHandler() {
    localStorage.removeItem('fakeLogin');
    updateLoginButton(false);
    alert('আপনি লগআউট হয়েছেন।');
  }

  // Handle login form submit
  if (loginForm) {
    loginForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const name = loginForm.elements['name'].value.trim();
      if (!name) { alert('অনুগ্রহ করে নাম লিখুন'); return; }
      const loginData = { loggedIn: true, user: name };
      localStorage.setItem('fakeLogin', JSON.stringify(loginData));
      updateLoginButton(true);
      closeLoginModal();
      alert(name + ' হিসেবে লগইন সফল!');
    });
  }

  // Close login modal when backdrop or close button clicked
  if (loginModal) {
    loginModal.addEventListener('click', function (e) {
      if (e.target === loginModal || e.target.hasAttribute('data-close-login')) {
        closeLoginModal();
      }
    });
  }

  // Init button state from localStorage
  const stored = JSON.parse(localStorage.getItem('fakeLogin'));
  if (stored && stored.loggedIn) {
    updateLoginButton(true);
  } else {
    updateLoginButton(false);
  }

  /* ────── Year ────── */
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  /* ────── Mobile Nav ────── */
  function closeMobileNav() {
    if (!nav || !toggle) return;
    nav.classList.remove("is-open");
    document.body.classList.remove("nav-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "মেনু খুলুন");
    if (dropdown) {
      dropdown.classList.remove("is-active");
    }
  }

  function openMobileNav() {
    if (!nav || !toggle) return;
    nav.classList.add("is-open");
    document.body.classList.add("nav-open");
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "মেনু বন্ধ করুন");
  }

  /* ────── Google Sheet & Data Fetching ────── */
  const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT6b8SEHhHrLQfWkr5Qhsioqptw0VyNfB44GDQmW9EovvmQl7VKde-U1LocNLXPZlljtxSXiTwJzmXH/pub?output=csv";
  let cachedSheetData = null;

  // Robust CSV parser supporting quotes and commas
  function parseCSV(text) {
    const lines = [];
    let row = [""];
    let insideQuote = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (insideQuote && nextChar === '"') {
          row[row.length - 1] += '"';
          i++;
        } else {
          insideQuote = !insideQuote;
        }
      } else if (char === ',' && !insideQuote) {
        row.push("");
      } else if ((char === '\r' || char === '\n') && !insideQuote) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        lines.push(row);
        row = [""];
      } else {
        row[row.length - 1] += char;
      }
    }
    if (row.length > 1 || row[0] !== "") {
      lines.push(row);
    }
    return lines;
  }

  // Parse CSV text into array of objects mapping headers to columns
  function processCSVData(csvText) {
    const lines = parseCSV(csvText);
    if (lines.length < 2) return [];

    const headers = lines[0].map(h => h.trim().toLowerCase());
    
    const featureIdx = headers.findIndex(h => h.includes("feature") || h.includes("ফিচার"));
    const titleIdx = headers.findIndex(h => h.includes("title") || h.includes("শিরোনাম"));
    const descIdx = headers.findIndex(h => h.includes("description") || h.includes("বিবরণ") || h.includes("বিস্তারিত") || h.includes("content") || h.includes("কনটেন্ট"));
    const linkIdx = headers.findIndex(h => h.includes("link") || h.includes("লিংক") || h.includes("লিঙ্ক"));
    const dateIdx = headers.findIndex(h => h.includes("date") || h.includes("তারিখ"));

    const items = [];
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i];
      if (row.length <= 1 && (row[0] || "").trim() === "") continue;

      const item = {
        feature: featureIdx !== -1 ? (row[featureIdx] || "").trim() : "",
        title: titleIdx !== -1 ? (row[titleIdx] || "").trim() : "",
        description: descIdx !== -1 ? (row[descIdx] || "").trim() : "",
        link: linkIdx !== -1 ? (row[linkIdx] || "").trim() : "",
        date: dateIdx !== -1 ? (row[dateIdx] || "").trim() : ""
      };
      items.push(item);
    }
    return items;
  }

  async function fetchSheetData() {
    if (cachedSheetData) return cachedSheetData;
    const response = await fetch(SHEET_CSV_URL);
    if (!response.ok) {
      throw new Error("নেটওয়ার্ক সংযোগ ব্যর্থ হয়েছে");
    }
    const text = await response.text();
    cachedSheetData = processCSVData(text);
    return cachedSheetData;
  }

  /* ────── Demo Modal & Renderers ────── */
  function renderLoading() {
    if (!modalBody) return;
    modalBody.innerHTML = `
      <div class="sheet-loading-spinner">
        <div class="spinner"></div>
        <span>লোডিং...</span>
      </div>
    `;
  }

  function renderEmpty(featureName) {
    if (!modalBody) return;
    modalBody.innerHTML = `
      <div class="sheet-empty-view">
        <svg style="width: 44px; height: 44px; color: var(--color-muted); opacity: 0.8;" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
        </svg>
        <p><strong>কোনো তথ্য পাওয়া যায়নি</strong></p>
        <p>"${featureName}" ফিচারের জন্য এই মুহূর্তে কোনো কন্টেন্ট বা আপডেট নেই।</p>
      </div>
    `;
  }

  function renderError(featureName) {
    if (!modalBody) return;
    modalBody.innerHTML = `
      <div class="sheet-error-view">
        <svg style="width: 44px; height: 44px; color: #dc2626;" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
        </svg>
        <h3>তথ্য লোড করতে সমস্যা হয়েছে</h3>
        <p>দয়া করে ইন্টারনেট সংযোগ পরীক্ষা করুন এবং পুনরায় চেষ্টা করুন।</p>
        <button type="button" class="btn-retry" id="btn-sheet-retry">পুনরায় চেষ্টা করুন</button>
      </div>
    `;

    const retryBtn = document.getElementById("btn-sheet-retry");
    if (retryBtn) {
      retryBtn.addEventListener("click", function() {
        cachedSheetData = null;
        openDemoModal(featureName);
      });
    }
  }

  function renderItems(items, featureName) {
    if (!modalBody) return;

    const isGallery = featureName.includes("গ্যালারি") || featureName.includes("gallery");

    if (isGallery) {
      let html = '<div class="sheet-gallery-grid">';
      items.forEach(function (item) {
        const imgSrc = item.link || "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=500&auto=format&fit=crop";
        html += `
          <div class="sheet-gallery-item">
            <div class="sheet-gallery-img-wrapper">
              <img src="${imgSrc}" alt="${item.title || 'গ্যালারি ছবি'}" onclick="window.open('${imgSrc}', '_blank')">
            </div>
            ${item.title ? `<div class="sheet-gallery-caption" title="${item.title}">${item.title}</div>` : ''}
          </div>
        `;
      });
      html += '</div>';
      modalBody.innerHTML = html;
    } else {
      let html = '<div class="sheet-card-list">';
      items.forEach(function (item) {
        const linkBtnHtml = item.link ? `
          <div class="sheet-card-link-container">
            <a href="${item.link}" target="_blank" rel="noopener noreferrer" class="sheet-card-link-btn">
              <span>লিংক দেখুন</span>
              <svg style="width: 14px; height: 14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
              </svg>
            </a>
          </div>
        ` : '';

        const dateHtml = item.date ? `<span class="sheet-card-date">${item.date}</span>` : '';

        html += `
          <div class="sheet-card">
            <div class="sheet-card-header">
              <div class="sheet-card-title">${item.title || 'আপডেট তথ্য'}</div>
              ${dateHtml}
            </div>
            ${item.description ? `<div class="sheet-card-desc">${item.description}</div>` : ''}
            ${linkBtnHtml}
          </div>
        `;
      });
      html += '</div>';
      modalBody.innerHTML = html;
    }
  }

  async function openDemoModal(featureName) {
    if (!modal) return;
    
    modal.hidden = false;
    document.body.classList.add("modal-open");

    if (modalTitle) modalTitle.textContent = featureName;
    if (modalBadge) modalBadge.textContent = "ফিচার তথ্য";

    renderLoading();

    try {
      const data = await fetchSheetData();
      const filtered = data.filter(function (item) {
        return (item.feature || "").trim().toLowerCase() === featureName.trim().toLowerCase();
      });

      if (filtered.length === 0) {
        renderEmpty(featureName);
      } else {
        renderItems(filtered, featureName);
      }
    } catch (err) {
      console.error(err);
      renderError(featureName);
    }
  }

  function closeDemoModal() {
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove("modal-open");
  }

  demoButtons.forEach(function (btn) {
    if (btn.classList.contains("nav-demo-login")) return;
    btn.addEventListener("click", function () {
      const feature = btn.getAttribute("data-demo") || "এই ফিচার";
      openDemoModal(feature);
      closeMobileNav();
    });
  });

  if (modal) {
    modal.querySelectorAll("[data-close-modal]").forEach(function (el) {
      el.addEventListener("click", closeDemoModal);
    });
  }

  // Dropdown toggle click handler (Desktop Click-to-Open)
  if (dropdownToggle && dropdown) {
    dropdownToggle.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      dropdown.classList.toggle("is-active");
    });

    // Close dropdown when clicking anywhere outside
    document.addEventListener("click", function (e) {
      if (!dropdown.contains(e.target)) {
        dropdown.classList.remove("is-active");
      }
    });
  }

  /* ────── Keyboard ────── */
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (loginModal && !loginModal.hidden) { closeLoginModal(); return; }
    if (modal && !modal.hidden) { closeDemoModal(); return; }
    closeMobileNav();
  });

  /* ────── Nav Toggle ────── */
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      if (nav.classList.contains("is-open")) {
        closeMobileNav();
      } else {
        openMobileNav();
      }
    });

    navLinks.forEach(function (link) {
      link.addEventListener("click", closeMobileNav);
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 768) {
        closeMobileNav();
      }
    });
  }
})();
