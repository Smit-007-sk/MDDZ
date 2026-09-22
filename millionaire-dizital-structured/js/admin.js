/**
 * ==============================================================================
 * MILLIONAIRE DIZITAL — LUXURY ADMIN PANEL JAVASCRIPT CONTROLLER
 * Full Media Management, Live Upload, Per-Slot Version History & Revert Engine
 * ==============================================================================
 */

(function () {
  'use strict';

  // State
  let authToken = localStorage.getItem('mdz_admin_token') || '';
  let allSlots = [];
  let currentTab = 'all';
  let searchQuery = '';
  let activeHistorySlot = null;

  // DOM Elements
  const loginOverlay = document.getElementById('loginOverlay');
  const loginForm = document.getElementById('loginForm');
  const adminPasswordInput = document.getElementById('adminPassword');
  const loginErrorMsg = document.getElementById('loginErrorMsg');
  const loginBtn = document.getElementById('loginBtn');

  const adminApp = document.getElementById('adminApp');
  const slotsContainer = document.getElementById('slotsContainer');
  const tabButtons = document.querySelectorAll('.nav-tab-btn');
  const searchInput = document.getElementById('mediaSearchInput');
  const logoutBtn = document.getElementById('logoutBtn');
  const toastContainer = document.getElementById('toastContainer');

  // Stats Elements
  const statTotalMedia = document.getElementById('statTotalMedia');
  const statImages = document.getElementById('statImages');
  const statVideos = document.getElementById('statVideos');
  const statBackups = document.getElementById('statBackups');

  // Modal Elements
  const historyModal = document.getElementById('historyModal');
  const historyModalTitle = document.getElementById('historyModalTitle');
  const historyModalBody = document.getElementById('historyModalBody');
  const closeHistoryModalBtn = document.getElementById('closeHistoryModalBtn');

  const previewModal = document.getElementById('previewModal');
  const previewModalTitle = document.getElementById('previewModalTitle');
  const previewModalContent = document.getElementById('previewModalContent');
  const closePreviewModalBtn = document.getElementById('closePreviewModalBtn');

  const passwordModal = document.getElementById('passwordModal');
  const passwordForm = document.getElementById('passwordForm');
  const openPasswordModalBtn = document.getElementById('openPasswordModalBtn');
  const closePasswordModalBtn = document.getElementById('closePasswordModalBtn');

  // --------------------------------------------------------------------------
  // AUTHENTICATION
  // --------------------------------------------------------------------------

  async function checkAuth() {
    if (!authToken) {
      showLogin();
      return;
    }

    try {
      const res = await fetch('/api/admin/check-auth', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.authenticated) {
        hideLogin();
        loadAllData();
      } else {
        localStorage.removeItem('mdz_admin_token');
        authToken = '';
        showLogin();
      }
    } catch (err) {
      console.warn('Auth check error, falling back to login:', err);
      showLogin();
    }
  }

  function showLogin() {
    loginOverlay.style.display = 'flex';
    adminApp.style.display = 'none';
    adminPasswordInput.focus();
  }

  function hideLogin() {
    loginOverlay.style.display = 'none';
    adminApp.style.display = 'flex';
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      loginErrorMsg.style.display = 'none';
      loginBtn.textContent = 'Authenticating...';
      loginBtn.disabled = true;

      const password = adminPasswordInput.value.trim();
      try {
        const res = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password })
        });
        const data = await res.json();

        if (res.ok && data.token) {
          authToken = data.token;
          localStorage.setItem('mdz_admin_token', authToken);
          hideLogin();
          showToast('Welcome to Millionaire Dizital Admin Panel', 'success');
          loadAllData();
        } else {
          loginErrorMsg.textContent = data.error || 'Invalid administrator password';
          loginErrorMsg.style.display = 'block';
        }
      } catch (err) {
        loginErrorMsg.textContent = 'Server connection failed. Please ensure the admin server is running.';
        loginErrorMsg.style.display = 'block';
      } finally {
        loginBtn.textContent = 'Enter Dashboard';
        loginBtn.disabled = false;
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await fetch('/api/admin/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
      } catch (err) { }
      localStorage.removeItem('mdz_admin_token');
      authToken = '';
      showLogin();
      showToast('Logged out successfully', 'success');
    });
  }

  // --------------------------------------------------------------------------
  // DATA LOADING & RENDERING
  // --------------------------------------------------------------------------

  async function loadAllData() {
    await Promise.all([loadMediaSlots(), loadStats()]);
  }

  async function loadStats() {
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        const stats = await res.json();
        if (statTotalMedia) statTotalMedia.textContent = stats.total_media_files || '0';
        if (statImages) statImages.textContent = stats.total_images || '0';
        if (statVideos) statVideos.textContent = stats.total_videos || '0';
        if (statBackups) statBackups.textContent = `${stats.total_backups || '0'} (${stats.total_backup_size || '0 B'})`;
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }

  async function loadMediaSlots() {
    try {
      const res = await fetch('/api/admin/media', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (!res.ok) {
        if (res.status === 401) checkAuth();
        return;
      }
      const data = await res.json();
      allSlots = data.slots || [];
      renderSlots();
      updateTabBadges();
    } catch (err) {
      console.error('Failed to load media slots:', err);
      showToast('Failed to load media catalog', 'error');
    }
  }

  function updateTabBadges() {
    const counts = {
      all: allSlots.length,
      hero: allSlots.filter(s => s.category === 'hero').length,
      capabilities: allSlots.filter(s => s.category === 'capabilities').length,
      work: allSlots.filter(s => s.category === 'work').length,
      showcase: allSlots.filter(s => s.category === 'showcase').length,
      about: allSlots.filter(s => s.category === 'about').length,
      footer: allSlots.filter(s => s.category === 'footer').length,
      branding: allSlots.filter(s => s.category === 'branding').length
    };

    tabButtons.forEach(btn => {
      const tab = btn.dataset.tab;
      const badge = btn.querySelector('.tab-badge');
      if (badge && counts[tab] !== undefined) {
        badge.textContent = counts[tab];
      }
    });
  }

  let allSections = [];

  function renderSlots() {
    if (!slotsContainer) return;

    let filtered = allSlots;

    // Filter by Category
    if (currentTab !== 'all') {
      filtered = filtered.filter(s => s.category === currentTab);
    }

    // Filter by Search Query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.path.toLowerCase().includes(q) ||
        (s.description && s.description.toLowerCase().includes(q)) ||
        (s.section_name && s.section_name.toLowerCase().includes(q)) ||
        s.id.toLowerCase().includes(q)
      );
    }

    if (filtered.length === 0) {
      slotsContainer.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--text-muted);">
          <svg style="width: 48px; height: 48px; margin-bottom: 12px; opacity: 0.4;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <p style="font-size: 15px; font-weight: 500;">No media slots found matching your filter.</p>
        </div>
      `;
      return;
    }

    // Group by section if in "All Media" view and no active search query
    if (currentTab === 'all' && !searchQuery) {
      const sectionsMap = {};
      filtered.forEach(s => {
        const sec = s.section_name || 'Other Media';
        if (!sectionsMap[sec]) sectionsMap[sec] = [];
        sectionsMap[sec].push(s);
      });

      let html = '';
      for (const [secName, secSlots] of Object.entries(sectionsMap)) {
        html += `
          <div style="grid-column: 1 / -1; margin-top: 18px; margin-bottom: 6px; padding-bottom: 10px; border-bottom: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: space-between;">
            <div>
              <h2 style="font-size: 16px; font-weight: 700; color: var(--gold-light); text-transform: uppercase; letter-spacing: 0.08em;">
                ${secName}
              </h2>
              <span style="font-size: 12px; color: var(--text-muted);">${secSlots.length} active media items in this section</span>
            </div>
          </div>
          ${secSlots.map(slot => createSlotCardHTML(slot)).join('')}
        `;
      }
      slotsContainer.innerHTML = html;
    } else {
      slotsContainer.innerHTML = filtered.map(slot => createSlotCardHTML(slot)).join('');
    }

    attachSlotCardEvents();
  }

  function createSlotCardHTML(slot) {
    const isVideo = slot.type === 'video';
    const previewUrl = slot.preview_url || slot.path;
    const historyCount = slot.history_count || (slot.history ? slot.history.length : 0);

    let mediaPreviewTag = '';
    if (isVideo) {
      mediaPreviewTag = `
        <video muted loop playsinline onmouseover="this.play()" onmouseout="this.pause()">
          <source src="${previewUrl}" type="video/mp4">
        </video>
      `;
    } else {
      mediaPreviewTag = `
        <img src="${previewUrl}" alt="${slot.name}" loading="lazy" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'400\\' height=\\'300\\' viewBox=\\'0 0 400 300\\'%3E%3Crect width=\\'400\\' height=\\'300\\' fill=\\'%23181512\\'%3E%3C/rect%3E%3Ctext x=\\'50%25\\' y=\\'50%25\\' dominant-baseline=\\'middle\\' text-anchor=\\'middle\\' fill=\\'%236b645b\\' font-size=\\'14\\'%3ENo Image Found%3C/text%3E%3C/svg%3E'">
      `;
    }

    return `
      <div class="media-card" id="card-${slot.id}" data-slot-id="${slot.id}">
        <div class="media-preview-box">
          <div class="media-badge-group">
            <span class="media-type-badge ${isVideo ? 'type-video' : 'type-image'}">
              ${isVideo ? '🎬 VIDEO' : '🖼️ IMAGE'}
            </span>
            ${slot.exists ? '' : '<span class="media-type-badge" style="background:#e05656;">MISSING</span>'}
          </div>

          ${mediaPreviewTag}

          <div class="media-quick-actions">
            <button class="action-circle-btn preview-btn" title="View Fullscreen Preview" data-slot-id="${slot.id}">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            </button>
            <button class="action-circle-btn history-btn" title="Version History & Revert (${historyCount} versions)" data-slot-id="${slot.id}">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="1 4 1 10 7 10"></polyline>
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
              </svg>
            </button>
          </div>
        </div>

        <div class="media-card-body">
          <h3 class="media-card-title">${slot.name}</h3>
          <div class="media-card-path">${slot.path}</div>
          <p class="media-card-desc">${slot.description || ''}</p>

          <div class="media-meta-row">
            <span>Size: <strong>${slot.size_formatted || 'N/A'}</strong></span>
            <span>Modified: <strong>${slot.modified || 'Never'}</strong></span>
          </div>

          <div class="media-card-footer">
            <label class="btn btn-primary btn-sm media-upload-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              <span>Upload New</span>
              <input type="file" class="media-upload-input" data-slot-id="${slot.id}" accept="${isVideo ? 'video/mp4,video/quicktime,video/webm' : 'image/png,image/jpeg,image/webp,image/svg+xml'}">
            </label>

            <button class="btn btn-revert btn-sm history-btn" data-slot-id="${slot.id}" title="View version history and 1-click restore">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="1 4 1 10 7 10"></polyline>
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
              </svg>
              <span>History (${historyCount})</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function attachSlotCardEvents() {
    // Upload Inputs
    document.querySelectorAll('.media-upload-input').forEach(input => {
      input.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        const slotId = e.target.dataset.slotId;
        if (file && slotId) {
          await handleSlotUpload(slotId, file);
        }
        e.target.value = ''; // reset
      });
    });

    // Preview Buttons
    document.querySelectorAll('.preview-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const slotId = btn.dataset.slotId;
        const slot = allSlots.find(s => s.id === slotId);
        if (slot) openPreviewModal(slot);
      });
    });

    // History & Revert Buttons
    document.querySelectorAll('.history-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const slotId = btn.dataset.slotId;
        const slot = allSlots.find(s => s.id === slotId);
        if (slot) openHistoryModal(slot);
      });
    });
  }

  // --------------------------------------------------------------------------
  // UPLOAD HANDLER
  // --------------------------------------------------------------------------

  async function handleSlotUpload(slotId, file) {
    const card = document.getElementById(`card-${slotId}`);
    const uploadBtnLabel = card ? card.querySelector('.media-upload-label span') : null;
    const origText = uploadBtnLabel ? uploadBtnLabel.textContent : 'Upload New';

    if (uploadBtnLabel) uploadBtnLabel.textContent = 'Uploading...';

    const formData = new FormData();
    formData.append('slot_id', slotId);
    formData.append('file', file);

    try {
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` },
        body: formData
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || `Slot '${slotId}' updated successfully!`, 'success');
        await loadAllData();
      } else {
        showToast(data.error || 'Upload failed', 'error');
      }
    } catch (err) {
      console.error('Upload error:', err);
      showToast('Upload network request failed', 'error');
    } finally {
      if (uploadBtnLabel) uploadBtnLabel.textContent = origText;
    }
  }

  // --------------------------------------------------------------------------
  // REVERT / VERSION HISTORY MODAL
  // --------------------------------------------------------------------------

  async function openHistoryModal(slot) {
    activeHistorySlot = slot;
    historyModalTitle.textContent = `Version History: ${slot.name}`;
    historyModalBody.innerHTML = `
      <div style="text-align:center; padding: 30px; color: var(--text-muted);">
        Loading versions...
      </div>
    `;
    historyModal.classList.add('active');

    try {
      const res = await fetch(`/api/admin/history?slot_id=${slot.id}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();
      const history = data.history || [];

      if (history.length === 0) {
        historyModalBody.innerHTML = `
          <div class="empty-history-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 14 14"></polyline>
            </svg>
            <p style="font-size: 14px; font-weight: 500; color: var(--text-primary); margin-bottom: 4px;">
              No Previous Versions Yet
            </p>
            <p style="font-size: 12px; color: var(--text-secondary);">
              Whenever you upload a new replacement for this item, the original version will automatically be archived here with an instant 1-click restore option.
            </p>
          </div>
        `;
        return;
      }

      historyModalBody.innerHTML = `
        <div style="margin-bottom: 16px; font-size: 12px; color: var(--text-secondary);">
          Select any previous version below to instantly revert this live media asset.
        </div>
        ${history.map(item => `
          <div class="history-version-item">
            <div class="version-info-group">
              <span class="version-filename">${item.filename}</span>
              <span class="version-meta">
                Archived: ${item.modified_formatted} &bull; Size: ${item.size_formatted}
              </span>
            </div>

            <div style="display:flex; align-items:center; gap: 8px;">
              <a href="${item.rel_url}" target="_blank" class="btn btn-secondary btn-sm" title="Download / Preview Backup">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              </a>
              <button class="btn btn-primary btn-sm revert-now-btn" data-backup="${item.filename}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="1 4 1 10 7 10"></polyline>
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                </svg>
                <span>Revert to this</span>
              </button>
            </div>
          </div>
        `).join('')}
      `;

      // Attach revert click listeners
      historyModalBody.querySelectorAll('.revert-now-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const backupFile = btn.dataset.backup;
          if (confirm(`Are you sure you want to revert '${slot.name}' to version '${backupFile}'?`)) {
            await executeRevert(slot.id, backupFile);
          }
        });
      });

    } catch (err) {
      historyModalBody.innerHTML = `<div style="color:#e05656; padding:20px;">Failed to load history list.</div>`;
    }
  }

  async function executeRevert(slotId, backupFilename) {
    try {
      const res = await fetch('/api/admin/revert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          slot_id: slotId,
          backup_filename: backupFilename
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || 'Successfully reverted to selected version!', 'success');
        historyModal.classList.remove('active');
        await loadAllData();
      } else {
        showToast(data.error || 'Revert failed', 'error');
      }
    } catch (err) {
      showToast('Revert network request error', 'error');
    }
  }

  if (closeHistoryModalBtn) {
    closeHistoryModalBtn.addEventListener('click', () => {
      historyModal.classList.remove('active');
    });
  }

  // --------------------------------------------------------------------------
  // PREVIEW MODAL
  // --------------------------------------------------------------------------

  function openPreviewModal(slot) {
    previewModalTitle.textContent = slot.name;
    const isVideo = slot.type === 'video';
    const previewUrl = slot.preview_url || slot.path;

    if (isVideo) {
      previewModalContent.innerHTML = `
        <video controls autoplay loop playsinline style="width:100%; max-height:70vh; border-radius:8px; background:#000;">
          <source src="${previewUrl}" type="video/mp4">
          Your browser does not support HTML5 video.
        </video>
        <div style="margin-top:14px; font-size:12px; color:var(--text-secondary); display:flex; justify-content:space-between;">
          <span>File Path: <strong>${slot.path}</strong></span>
          <span>Size: <strong>${slot.size_formatted}</strong></span>
        </div>
      `;
    } else {
      previewModalContent.innerHTML = `
        <img src="${previewUrl}" alt="${slot.name}" style="width:100%; max-height:70vh; object-fit:contain; border-radius:8px; background:#000;">
        <div style="margin-top:14px; font-size:12px; color:var(--text-secondary); display:flex; justify-content:space-between;">
          <span>File Path: <strong>${slot.path}</strong></span>
          <span>Size: <strong>${slot.size_formatted}</strong></span>
        </div>
      `;
    }

    previewModal.classList.add('active');
  }

  if (closePreviewModalBtn) {
    closePreviewModalBtn.addEventListener('click', () => {
      previewModal.classList.remove('active');
      previewModalContent.innerHTML = '';
    });
  }

  // --------------------------------------------------------------------------
  // PASSWORD MANAGEMENT
  // --------------------------------------------------------------------------

  if (openPasswordModalBtn) {
    openPasswordModalBtn.addEventListener('click', () => {
      passwordModal.classList.add('active');
    });
  }

  if (closePasswordModalBtn) {
    closePasswordModalBtn.addEventListener('click', () => {
      passwordModal.classList.remove('active');
    });
  }

  if (passwordForm) {
    passwordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const currentPassword = document.getElementById('currPassword').value;
      const newPassword = document.getElementById('newPassword').value;
      const confirmPassword = document.getElementById('confirmPassword').value;

      if (newPassword !== confirmPassword) {
        showToast('New passwords do not match', 'error');
        return;
      }

      try {
        const res = await fetch('/api/admin/change-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            current_password: currentPassword,
            new_password: newPassword
          })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          showToast('Administrator password updated successfully!', 'success');
          passwordModal.classList.remove('active');
          passwordForm.reset();
        } else {
          showToast(data.error || 'Password update failed', 'error');
        }
      } catch (err) {
        showToast('Password change request failed', 'error');
      }
    });
  }

  // --------------------------------------------------------------------------
  // TABS & SEARCH
  // --------------------------------------------------------------------------

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTab = btn.dataset.tab;
      renderSlots();
    });
  });

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim();
      renderSlots();
    });
  }

  // --------------------------------------------------------------------------
  // TOAST NOTIFICATIONS
  // --------------------------------------------------------------------------

  function showToast(message, type = 'success') {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        ${type === 'success'
        ? '<polyline points="20 6 9 17 4 12"></polyline>'
        : '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>'
      }
      </svg>
      <span>${message}</span>
    `;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // Initialize
  checkAuth();

})();
