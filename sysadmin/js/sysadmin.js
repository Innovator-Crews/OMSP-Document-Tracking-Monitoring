/**
 * ============================================================
 * OMSP Document Tracking / Monitoring
 * SysAdmin Module — Board Member & Staff Management (Full CRUD)
 * ============================================================
 * Handles sysadmin-only pages: BM management, staff management
 * Features: Add, Edit, Toggle active, View details, Assignments
 */

const SysAdminModule = {

  // ═══════════════════════════════════════════════════════════
  // BOARD MEMBER MANAGEMENT
  // ═══════════════════════════════════════════════════════════

  initBMManagement() {
    const container = document.getElementById('bm-management-content');
    if (!container) return;
    this.renderBMPage(container);
  },

  renderBMPage(container) {
    const bms = Storage.getAll(KEYS.BOARD_MEMBERS);
    const active = bms.filter(b => !b.is_archived && b.is_active);
    const inactive = bms.filter(b => !b.is_archived && !b.is_active);
    const archived = bms.filter(b => b.is_archived);

    let html = `
      <!-- Header with Add button -->
      <div class="mgmt-header mb-lg">
        <div>
          <div class="mgmt-header-title">Board Member Management</div>
          <div class="mgmt-header-subtitle">Manage all board member accounts, terms, and budgets</div>
        </div>
        <div class="d-flex gap-sm">
          <button class="btn btn-outline btn-sm" onclick="SysAdminModule.exportBMsToCSV()">
            ${Icons.render('download', 16)} Export CSV
          </button>
          <button class="btn btn-primary" onclick="SysAdminModule.showAddBMModal()">
            ${Icons.render('plus', 16)} Add Board Member
          </button>
        </div>
      </div>

      <!-- Stat cards -->
      <div class="grid-3-col gap-md mb-lg">
        <div class="stat-card stat-card-blue">
          <div class="stat-icon stat-icon-blue">${Icons.render('users', 22)}</div>
          <div class="stat-label">Active Board Members</div>
          <div class="stat-value">${active.length}</div>
        </div>
        <div class="stat-card stat-card-amber">
          <div class="stat-icon stat-icon-amber">${Icons.render('clock', 22)}</div>
          <div class="stat-label">Pending Archive</div>
          <div class="stat-value">${active.filter(b => b.archive_status === 'pending').length}</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:var(--neutral-100);color:var(--neutral-500)">${Icons.render('archive', 22)}</div>
          <div class="stat-label">Archived</div>
          <div class="stat-value">${archived.length}</div>
        </div>
      </div>

      <!-- Active BMs -->
      <h3 class="mb-md">Active Board Members</h3>
      ${active.length > 0 ? `
      <div class="bm-card-grid mb-lg">
        ${active.map(bm => this._renderBMCard(bm)).join('')}
      </div>
      ` : `<div class="empty-state-container mb-lg"><p class="text-muted">No active board members. Click "Add Board Member" to create one.</p></div>`}

      <!-- Inactive BMs -->
      ${inactive.length > 0 ? `
      <details class="mt-md mb-lg">
        <summary class="text-muted" style="cursor:pointer; font-weight:600;">${Icons.render('user-x', 16)} Inactive Board Members (${inactive.length})</summary>
        <div class="bm-card-grid mt-md">
          ${inactive.map(bm => this._renderBMCard(bm, true)).join('')}
        </div>
      </details>
      ` : ''}

      <!-- Archived BMs -->
      ${archived.length > 0 ? `
      <details class="mt-md">
        <summary class="text-muted" style="cursor:pointer; font-weight:600;">${Icons.render('archive', 16)} Archived Board Members (${archived.length})</summary>
        <div class="bm-card-grid mt-md">
          ${archived.map(bm => this._renderBMCard(bm, false, true)).join('')}
        </div>
      </details>
      ` : ''}
    `;

    container.innerHTML = html;
  },

  _renderBMCard(bm, isInactive = false, isArchived = false) {
    const user = Storage.getById(KEYS.USERS, bm.user_id, 'user_id');
    const name = user ? Utils.escapeHtml(user.full_name) : 'Unknown';
    const initials = user ? Utils.getInitials(user.full_name) : '?';
    const faRecords = Storage.getAll(KEYS.FA_RECORDS).filter(r => r.bm_id === bm.bm_id && !r.is_archived).length;
    const paRecords = Storage.getAll(KEYS.PA_RECORDS).filter(r => r.bm_id === bm.bm_id && !r.is_archived).length;
    const assignments = Storage.getAll(KEYS.SECRETARY_ASSIGNMENTS).filter(a => a.bm_id === bm.bm_id);
    const staffNames = assignments.map(a => {
      const staffUser = Storage.getById(KEYS.USERS, a.secretary_user_id, 'user_id');
      return staffUser ? Utils.escapeHtml(staffUser.full_name) : 'Unknown';
    });

    const statusBadge = isArchived
      ? '<span class="badge badge-neutral">Archived</span>'
      : isInactive
        ? '<span class="badge badge-danger">Inactive</span>'
        : bm.archive_status === 'pending'
          ? '<span class="badge badge-warning">Pending Archive</span>'
          : '<span class="badge badge-success">Active</span>';

    const daysRemaining = !isArchived ? Math.ceil((new Date(bm.term_end) - new Date()) / (1000 * 60 * 60 * 24)) : 0;

    return `
      <div class="bm-card ${isArchived ? 'archive-approved' : ''} ${bm.archive_status === 'pending' ? 'archive-pending' : ''}">
        <div class="bm-card-header">
          <div class="bm-card-avatar">${initials}</div>
          <div class="bm-card-info">
            <div class="bm-card-name">${name}</div>
            <div class="bm-card-district">${Utils.escapeHtml(bm.district_name)}</div>
          </div>
          ${statusBadge}
        </div>

        <div class="bm-card-term">
          ${Icons.render('calendar', 12)}
          <span>Term ${bm.current_term_number}: ${Utils.formatDate(bm.term_start)} — ${Utils.formatDate(bm.term_end)}</span>
          ${!isArchived && daysRemaining > 0 ? `<span class="badge badge-info ml-auto" style="font-size:10px;">${daysRemaining}d left</span>` : ''}
        </div>

        <div style="display:flex; gap:var(--space-3); margin-top:var(--space-3); font-size:var(--text-xs); color:var(--neutral-500);">
          <span>${Icons.render('file-text', 12)} ${faRecords} FA</span>
          <span>${Icons.render('clipboard-list', 12)} ${paRecords} PA</span>
          <span>${Icons.render('wallet', 12)} ₱${Utils.formatNumber(bm.fa_monthly_budget)}/mo</span>
        </div>

        <div style="margin-top:var(--space-2); font-size:var(--text-xs); color:var(--neutral-500);">
          ${Icons.render('user', 12)} Staff: ${staffNames.length > 0 ? staffNames.join(', ') : '<span class="text-muted">None assigned</span>'}
        </div>

        <div class="bm-card-footer">
          <div style="display:flex;gap:var(--space-2);flex-wrap:wrap;">
            ${!isArchived ? `
              <button class="btn btn-ghost btn-sm" onclick="SysAdminModule.showEditBMModal('${bm.bm_id}')" title="Edit">
                ${Icons.render('edit', 14)} Edit
              </button>
              <button class="btn btn-ghost btn-sm" onclick="SysAdminModule.showBMDetails('${bm.bm_id}')" title="View Details">
                ${Icons.render('eye', 14)} View
              </button>
              <button class="btn ${bm.is_active ? 'btn-ghost' : 'btn-success'} btn-sm" onclick="SysAdminModule.toggleBMActive('${bm.bm_id}')" title="${bm.is_active ? 'Deactivate' : 'Activate'}">
                ${Icons.render(bm.is_active ? 'user-x' : 'user-check', 14)} ${bm.is_active ? 'Deactivate' : 'Activate'}
              </button>
            ` : `
              <button class="btn btn-primary btn-sm" onclick="SysAdminModule.showReelectModal('${bm.bm_id}')" title="Start New Term / Re-elect">
                ${Icons.render('refresh-cw', 14)} Re-elect / New Term
              </button>
              <button class="btn btn-ghost btn-sm" onclick="SysAdminModule.showBMDetails('${bm.bm_id}')" title="View Details">
                ${Icons.render('eye', 14)} View
              </button>
            `}
          </div>
        </div>
      </div>
    `;
  },

  // ─── ADD BOARD MEMBER MODAL ──────────────────────────────
  showAddBMModal() {
    const container = document.getElementById('modal-container');
    const today = new Date().toISOString().slice(0, 10);
    const threeYearsLater = new Date();
    threeYearsLater.setFullYear(threeYearsLater.getFullYear() + 3);
    const endDefault = threeYearsLater.toISOString().slice(0, 10);

    container.innerHTML = `
      <div class="modal-overlay active" id="bm-modal-overlay">
        <div class="modal" style="max-width: 560px;">
          <div class="modal-header">
            <h3 class="modal-title">${Icons.render('user-plus', 20)} Add Board Member</h3>
            <button class="modal-close" onclick="SysAdminModule.closeBMModal()">&times;</button>
          </div>
          <div class="modal-body">
            <div id="bm-modal-error" class="banner banner-danger hidden mb-md"></div>

            <div class="form-group mb-md">
              <label class="form-label">Full Name *</label>
              <input type="text" class="form-input" id="bm-full-name" placeholder="e.g., Juan Dela Cruz" required />
            </div>

            <div class="d-flex gap-md">
              <div class="form-group mb-md" style="flex:1;">
                <label class="form-label">Government Email *</label>
                <input type="email" class="form-input" id="bm-email" placeholder="e.g., jdelacruz@bataan.gov.ph" required />
              </div>
              <div class="form-group mb-md" style="flex:1;">
                <label class="form-label">Temporary Password *</label>
                <input type="text" class="form-input" id="bm-password" placeholder="Enter temp password" required />
              </div>
            </div>

            <div class="form-group mb-md">
              <label class="form-label">District *</label>
              <input type="text" class="form-input" id="bm-district" placeholder="e.g., District 1 - Balanga City" required />
            </div>

            <div class="d-flex gap-md">
              <div class="form-group mb-md" style="flex:1;">
                <label class="form-label">Term Start Date *</label>
                <input type="date" class="form-input" id="bm-term-start" value="${today}" required />
              </div>
              <div class="form-group mb-md" style="flex:1;">
                <label class="form-label">Term End Date *</label>
                <input type="date" class="form-input" id="bm-term-end" value="${endDefault}" required />
              </div>
            </div>

            <div class="form-group mb-md">
              <label class="form-label">FA Monthly Budget (₱)</label>
              <input type="number" class="form-input" id="bm-fa-budget" value="70000" min="0" step="1000" />
              <small class="text-muted">Default: ₱70,000. The board member can adjust this later.</small>
            </div>

            <div class="banner banner-info mb-sm">
              <div class="banner-content">
                <small>${Icons.render('info', 14)} A user account will be created with the email and temporary password above. The board member will be prompted to change their password on first login.</small>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" onclick="SysAdminModule.closeBMModal()">Cancel</button>
            <button class="btn btn-primary" onclick="SysAdminModule.saveBM()">
              ${Icons.render('check', 16)} Create Board Member
            </button>
          </div>
        </div>
      </div>
    `;
  },

  closeBMModal() {
    const overlay = document.getElementById('bm-modal-overlay');
    if (overlay) overlay.remove();
  },

  saveBM() {
    const fullName = document.getElementById('bm-full-name').value.trim();
    const email = document.getElementById('bm-email').value.trim();
    const password = document.getElementById('bm-password').value.trim();
    const district = document.getElementById('bm-district').value.trim();
    const termStart = document.getElementById('bm-term-start').value;
    const termEnd = document.getElementById('bm-term-end').value;
    const faBudget = parseInt(document.getElementById('bm-fa-budget').value) || 70000;
    const errorEl = document.getElementById('bm-modal-error');

    // Validation
    if (!fullName || !email || !password || !district || !termStart || !termEnd) {
      errorEl.textContent = 'All required fields must be filled.';
      errorEl.classList.remove('hidden');
      return;
    }
    if (new Date(termEnd) <= new Date(termStart)) {
      errorEl.textContent = 'Term end date must be after start date.';
      errorEl.classList.remove('hidden');
      return;
    }
    // Check duplicate email
    const existingUser = Storage.getAll(KEYS.USERS).find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existingUser) {
      errorEl.textContent = 'A user with this email already exists.';
      errorEl.classList.remove('hidden');
      return;
    }

    const now = new Date().toISOString();
    const userId = Storage.generateId('usr');
    const bmId = Storage.generateId('bm');

    // Create user account
    const newUser = {
      user_id: userId,
      email: email,
      password: password,
      full_name: fullName,
      role: 'board_member',
      is_active: true,
      is_temp_account: true, // Will be prompted to change password
      created_at: now,
      last_login: null
    };
    Storage.add(KEYS.USERS, newUser);

    // Create BM profile
    const newBM = {
      bm_id: bmId,
      user_id: userId,
      district_name: district,
      current_term_number: 1,
      term_start: termStart,
      term_end: termEnd,
      fa_monthly_budget: faBudget,
      pa_balance: 0,
      is_active: true,
      archive_requested: false,
      archive_requested_at: null,
      archive_status: 'none',
      is_archived: false,
      archived_at: null,
      archived_by: null
    };
    Storage.add(KEYS.BOARD_MEMBERS, newBM);

    // Create initial monthly FA budget
    const yearMonth = Utils.getCurrentYearMonth();
    const budgetEntry = {
      log_id: Storage.generateId('budg'),
      bm_id: bmId,
      year_month: yearMonth,
      base_budget: faBudget,
      rollover_amount: 0,
      rollover_selected: false,
      total_budget: faBudget,
      used_amount: 0,
      remaining_amount: faBudget,
      closed_at: null
    };
    Storage.add(KEYS.MONTHLY_BUDGETS, budgetEntry);

    // Log activity
    ActivityLogger.log(`Created board member account: ${fullName}`, 'create', 'user', userId, `District: ${district}, Email: ${email}`);

    // Close modal and refresh
    this.closeBMModal();
    Notifications.toast(`Board member "${fullName}" created successfully.`, 'success');
    this.initBMManagement();
  },

  // ─── EDIT BOARD MEMBER MODAL ─────────────────────────────
  showEditBMModal(bmId) {
    const bm = Storage.getById(KEYS.BOARD_MEMBERS, bmId, 'bm_id');
    if (!bm) return;
    const user = Storage.getById(KEYS.USERS, bm.user_id, 'user_id');
    if (!user) return;

    const container = document.getElementById('modal-container');
    container.innerHTML = `
      <div class="modal-overlay active" id="bm-modal-overlay">
        <div class="modal" style="max-width: 560px;">
          <div class="modal-header">
            <h3 class="modal-title">${Icons.render('edit', 20)} Edit Board Member</h3>
            <button class="modal-close" onclick="SysAdminModule.closeBMModal()">&times;</button>
          </div>
          <div class="modal-body">
            <div id="bm-modal-error" class="banner banner-danger hidden mb-md"></div>

            <div class="form-group mb-md">
              <label class="form-label">Full Name *</label>
              <input type="text" class="form-input" id="bm-full-name" value="${Utils.escapeHtml(user.full_name)}" required />
            </div>

            <div class="d-flex gap-md">
              <div class="form-group mb-md" style="flex:1;">
                <label class="form-label">Government Email *</label>
                <input type="email" class="form-input" id="bm-email" value="${Utils.escapeHtml(user.email)}" required />
              </div>
              <div class="form-group mb-md" style="flex:1;">
                <label class="form-label">Reset Password</label>
                <input type="text" class="form-input" id="bm-password" placeholder="Leave blank to keep current" />
              </div>
            </div>

            <div class="form-group mb-md">
              <label class="form-label">District *</label>
              <input type="text" class="form-input" id="bm-district" value="${Utils.escapeHtml(bm.district_name)}" required />
            </div>

            <div class="d-flex gap-md">
              <div class="form-group mb-md" style="flex:1;">
                <label class="form-label">Term Start Date *</label>
                <input type="date" class="form-input" id="bm-term-start" value="${bm.term_start}" required />
              </div>
              <div class="form-group mb-md" style="flex:1;">
                <label class="form-label">Term End Date *</label>
                <input type="date" class="form-input" id="bm-term-end" value="${bm.term_end}" required />
              </div>
            </div>

            <div class="form-group mb-md">
              <label class="form-label">FA Monthly Budget (₱)</label>
              <input type="number" class="form-input" id="bm-fa-budget" value="${bm.fa_monthly_budget}" min="0" step="1000" />
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" onclick="SysAdminModule.closeBMModal()">Cancel</button>
            <button class="btn btn-primary" onclick="SysAdminModule.updateBM('${bmId}')">
              ${Icons.render('check', 16)} Save Changes
            </button>
          </div>
        </div>
      </div>
    `;
  },

  updateBM(bmId) {
    const bm = Storage.getById(KEYS.BOARD_MEMBERS, bmId, 'bm_id');
    if (!bm) return;

    const fullName = document.getElementById('bm-full-name').value.trim();
    const email = document.getElementById('bm-email').value.trim();
    const password = document.getElementById('bm-password').value.trim();
    const district = document.getElementById('bm-district').value.trim();
    const termStart = document.getElementById('bm-term-start').value;
    const termEnd = document.getElementById('bm-term-end').value;
    const faBudget = parseInt(document.getElementById('bm-fa-budget').value) || 70000;
    const errorEl = document.getElementById('bm-modal-error');

    if (!fullName || !email || !district || !termStart || !termEnd) {
      errorEl.textContent = 'All required fields must be filled.';
      errorEl.classList.remove('hidden');
      return;
    }
    if (new Date(termEnd) <= new Date(termStart)) {
      errorEl.textContent = 'Term end date must be after start date.';
      errorEl.classList.remove('hidden');
      return;
    }
    // Check duplicate email (exclude current user)
    const existingUser = Storage.getAll(KEYS.USERS).find(u => u.email.toLowerCase() === email.toLowerCase() && u.user_id !== bm.user_id);
    if (existingUser) {
      errorEl.textContent = 'Another user with this email already exists.';
      errorEl.classList.remove('hidden');
      return;
    }

    // Update user account
    const userUpdates = { full_name: fullName, email: email };
    if (password) {
      userUpdates.password = password;
      userUpdates.is_temp_account = true; // Force password change on next login
    }
    Storage.update(KEYS.USERS, bm.user_id, userUpdates, 'user_id');

    // Update BM profile
    Storage.update(KEYS.BOARD_MEMBERS, bmId, {
      district_name: district,
      term_start: termStart,
      term_end: termEnd,
      fa_monthly_budget: faBudget
    }, 'bm_id');

    ActivityLogger.log(`Updated board member: ${fullName}`, 'edit', 'user', bm.user_id, `District: ${district}`);

    this.closeBMModal();
    Notifications.toast(`Board member "${fullName}" updated.`, 'success');
    this.initBMManagement();
  },

  // ─── TOGGLE ACTIVE / INACTIVE ────────────────────────────
  async toggleBMActive(bmId) {
    const bm = Storage.getById(KEYS.BOARD_MEMBERS, bmId, 'bm_id');
    if (!bm) return;
    const user = Storage.getById(KEYS.USERS, bm.user_id, 'user_id');
    const name = user ? user.full_name : 'Unknown';
    const newState = !bm.is_active;

    const confirmed = await Notifications.confirm({
      title: newState ? 'Activate Board Member' : 'Deactivate Board Member',
      message: newState
        ? `Are you sure you want to activate "${name}"? They will be able to log in and access the system.`
        : `Are you sure you want to deactivate "${name}"? They will not be able to log in until reactivated. Existing records will be preserved.`,
      confirmText: newState ? 'Activate' : 'Deactivate',
      type: newState ? 'primary' : 'danger'
    });

    if (!confirmed) return;

    Storage.update(KEYS.BOARD_MEMBERS, bmId, { is_active: newState }, 'bm_id');
    Storage.update(KEYS.USERS, bm.user_id, { is_active: newState }, 'user_id');

    ActivityLogger.log(`${newState ? 'Activated' : 'Deactivated'} board member: ${name}`, 'edit', 'user', bm.user_id, null);

    Notifications.toast(`Board member "${name}" ${newState ? 'activated' : 'deactivated'}.`, newState ? 'success' : 'info');
    this.initBMManagement();
  },

  // ─── VIEW BM DETAILS ─────────────────────────────────────
  showBMDetails(bmId) {
    const bm = Storage.getById(KEYS.BOARD_MEMBERS, bmId, 'bm_id');
    if (!bm) return;
    const user = Storage.getById(KEYS.USERS, bm.user_id, 'user_id');
    const name = user ? Utils.escapeHtml(user.full_name) : 'Unknown';
    const email = user ? Utils.escapeHtml(user.email) : '—';

    const faRecords = Storage.getAll(KEYS.FA_RECORDS).filter(r => r.bm_id === bmId);
    const paRecords = Storage.getAll(KEYS.PA_RECORDS).filter(r => r.bm_id === bmId);
    const activeFa = faRecords.filter(r => !r.is_archived);
    const activePa = paRecords.filter(r => !r.is_archived);

    const assignments = Storage.getAll(KEYS.SECRETARY_ASSIGNMENTS).filter(a => a.bm_id === bmId);
    const staffList = assignments.map(a => {
      const staffUser = Storage.getById(KEYS.USERS, a.secretary_user_id, 'user_id');
      return staffUser ? Utils.escapeHtml(staffUser.full_name) + ' (' + Utils.escapeHtml(staffUser.email) + ')' : 'Unknown';
    });

    // Budget info
    const budgets = Storage.getAll(KEYS.MONTHLY_BUDGETS).filter(b => b.bm_id === bmId);
    const currentBudget = budgets.find(b => b.year_month === Utils.getCurrentYearMonth());
    const totalUsed = budgets.reduce((s, b) => s + b.used_amount, 0);

    const container = document.getElementById('modal-container');
    container.innerHTML = `
      <div class="modal-overlay active" id="bm-modal-overlay">
        <div class="modal" style="max-width: 600px;">
          <div class="modal-header">
            <h3 class="modal-title">${Icons.render('user', 20)} ${name}</h3>
            <button class="modal-close" onclick="SysAdminModule.closeBMModal()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="grid-2-col gap-md mb-md">
              <div>
                <div class="text-xs text-muted text-uppercase mb-xs">Email</div>
                <div class="text-sm">${email}</div>
              </div>
              <div>
                <div class="text-xs text-muted text-uppercase mb-xs">District</div>
                <div class="text-sm">${Utils.escapeHtml(bm.district_name)}</div>
              </div>
              <div>
                <div class="text-xs text-muted text-uppercase mb-xs">Term</div>
                <div class="text-sm">${Utils.ordinal(bm.current_term_number)} — ${Utils.formatDate(bm.term_start)} to ${Utils.formatDate(bm.term_end)}</div>
              </div>
              <div>
                <div class="text-xs text-muted text-uppercase mb-xs">Status</div>
                <div class="text-sm">${bm.is_archived ? '<span class="badge badge-neutral">Archived</span>' : bm.is_active ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-danger">Inactive</span>'}</div>
              </div>
            </div>

            <hr style="border:none;border-top:1px solid var(--neutral-200);margin:var(--space-4) 0;" />

            <div class="grid-3-col gap-md mb-md">
              <div class="stat-card" style="padding:var(--space-3);">
                <div class="stat-label" style="font-size:11px;">FA Records</div>
                <div class="stat-value" style="font-size:var(--text-xl);"> ${activeFa.length}</div>
              </div>
              <div class="stat-card" style="padding:var(--space-3);">
                <div class="stat-label" style="font-size:11px;">PA Records</div>
                <div class="stat-value" style="font-size:var(--text-xl);">${activePa.length}</div>
              </div>
              <div class="stat-card" style="padding:var(--space-3);">
                <div class="stat-label" style="font-size:11px;">Budget Used</div>
                <div class="stat-value" style="font-size:var(--text-xl);">₱${Utils.formatNumber(totalUsed)}</div>
              </div>
            </div>

            ${currentBudget ? `
            <div class="mb-md">
              <div class="text-xs text-muted text-uppercase mb-xs">Current Month Budget</div>
              <div style="background:var(--neutral-50);border-radius:var(--radius-md);padding:var(--space-3);">
                <div style="display:flex;justify-content:space-between;font-size:var(--text-sm);margin-bottom:var(--space-2);">
                  <span>₱${Utils.formatNumber(currentBudget.used_amount)} used of ₱${Utils.formatNumber(currentBudget.total_budget)}</span>
                  <span>₱${Utils.formatNumber(currentBudget.remaining_amount)} remaining</span>
                </div>
                <div style="background:var(--neutral-200);border-radius:var(--radius-full);height:8px;overflow:hidden;">
                  <div style="background:${currentBudget.remaining_amount / currentBudget.total_budget < 0.2 ? 'var(--danger-500)' : currentBudget.remaining_amount / currentBudget.total_budget < 0.5 ? 'var(--accent-500)' : 'var(--primary-500)'};height:100%;width:${Math.round((currentBudget.used_amount / currentBudget.total_budget) * 100)}%;border-radius:var(--radius-full);transition:width 0.3s;"></div>
                </div>
              </div>
            </div>
            ` : ''}

            <div>
              <div class="text-xs text-muted text-uppercase mb-xs">Assigned Staff (${staffList.length})</div>
              ${staffList.length > 0 ? staffList.map(s => `<div class="text-sm mb-xs">${Icons.render('user', 12)} ${s}</div>`).join('') : '<div class="text-sm text-muted">No staff assigned</div>'}
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" onclick="SysAdminModule.closeBMModal()">Close</button>
          </div>
        </div>
      </div>
    `;
  },

  // ─── RE-ELECT / START NEW TERM MODAL ─────────────────────
  showReelectModal(bmId) {
    const bm = Storage.getById(KEYS.BOARD_MEMBERS, bmId, 'bm_id');
    if (!bm) return;
    const user = Storage.getById(KEYS.USERS, bm.user_id, 'user_id');
    const name = user ? Utils.escapeHtml(user.full_name) : 'Unknown';
    const nextTerm = bm.current_term_number + 1;

    const today = new Date().toISOString().slice(0, 10);
    const threeYearsLater = new Date();
    threeYearsLater.setFullYear(threeYearsLater.getFullYear() + 3);
    const endDefault = threeYearsLater.toISOString().slice(0, 10);

    const container = document.getElementById('modal-container');
    container.innerHTML = `
      <div class="modal-overlay active" id="bm-modal-overlay">
        <div class="modal" style="max-width: 560px;">
          <div class="modal-header">
            <h3 class="modal-title">${Icons.render('refresh-cw', 20)} Re-elect — Start ${Utils.ordinal(nextTerm)} Term</h3>
            <button class="modal-close" onclick="SysAdminModule.closeBMModal()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="banner banner-info mb-md">
              <div class="banner-content">
                <small>${Icons.render('info', 14)} This will reactivate <strong>${name}</strong> for a new term. Previous term records remain archived. You can update details like district if they changed.</small>
              </div>
            </div>

            <div id="bm-modal-error" class="banner banner-danger hidden mb-md"></div>

            <div class="form-group mb-md">
              <label class="form-label">Full Name</label>
              <input type="text" class="form-input" id="reelect-name" value="${name}" required />
            </div>

            <div class="form-group mb-md">
              <label class="form-label">District (update if changed)</label>
              <input type="text" class="form-input" id="reelect-district" value="${Utils.escapeHtml(bm.district_name)}" required />
            </div>

            <div class="d-flex gap-md">
              <div class="form-group mb-md" style="flex:1;">
                <label class="form-label">Term Number</label>
                <input type="text" class="form-input" value="${Utils.ordinal(nextTerm)} Term" disabled />
              </div>
              <div class="form-group mb-md" style="flex:1;">
                <label class="form-label">FA Monthly Budget (₱)</label>
                <input type="number" class="form-input" id="reelect-budget" value="70000" min="0" step="1000" />
              </div>
            </div>

            <div class="d-flex gap-md">
              <div class="form-group mb-md" style="flex:1;">
                <label class="form-label">New Term Start Date</label>
                <input type="date" class="form-input" id="reelect-start" value="${today}" required />
              </div>
              <div class="form-group mb-md" style="flex:1;">
                <label class="form-label">New Term End Date</label>
                <input type="date" class="form-input" id="reelect-end" value="${endDefault}" required />
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" onclick="SysAdminModule.closeBMModal()">Cancel</button>
            <button class="btn btn-primary" onclick="SysAdminModule.confirmReelect('${bmId}')">
              ${Icons.render('plus-circle', 16)} Start New Term
            </button>
          </div>
        </div>
      </div>
    `;
  },

  confirmReelect(bmId) {
    const bm = Storage.getById(KEYS.BOARD_MEMBERS, bmId, 'bm_id');
    if (!bm) return;

    const newName = document.getElementById('reelect-name').value.trim();
    const newDistrict = document.getElementById('reelect-district').value.trim();
    const termStart = document.getElementById('reelect-start').value;
    const termEnd = document.getElementById('reelect-end').value;
    const faBudget = parseInt(document.getElementById('reelect-budget').value) || 70000;
    const errorEl = document.getElementById('bm-modal-error');

    if (!newName || !newDistrict || !termStart || !termEnd) {
      errorEl.textContent = 'All fields are required.';
      errorEl.classList.remove('hidden');
      return;
    }
    if (new Date(termEnd) <= new Date(termStart)) {
      errorEl.textContent = 'End date must be after start date.';
      errorEl.classList.remove('hidden');
      return;
    }

    const nextTerm = bm.current_term_number + 1;
    const now = new Date().toISOString();
    const adminUser = Auth.getCurrentUser();

    // Update BM record for new term
    Storage.update(KEYS.BOARD_MEMBERS, bmId, {
      current_term_number: nextTerm,
      term_start: termStart,
      term_end: termEnd,
      fa_monthly_budget: faBudget,
      pa_balance: 0,
      is_active: true,
      is_archived: false,
      archive_requested: false,
      archive_requested_at: null,
      archive_status: 'none',
      archived_at: null,
      archived_by: null
    }, 'bm_id');

    // Update user account if name changed
    if (newName) {
      Storage.update(KEYS.USERS, bm.user_id, { full_name: newName, is_active: true }, 'user_id');
    }

    // Update district if changed
    if (newDistrict) {
      Storage.update(KEYS.BOARD_MEMBERS, bmId, { district_name: newDistrict }, 'bm_id');
    }

    // Create initial monthly budget for new term
    const yearMonth = Utils.getCurrentYearMonth();
    const budgetEntry = {
      log_id: Storage.generateId('budg'),
      bm_id: bmId,
      year_month: yearMonth,
      base_budget: faBudget,
      rollover_amount: 0,
      rollover_selected: false,
      total_budget: faBudget,
      used_amount: 0,
      remaining_amount: faBudget,
      closed_at: null
    };
    Storage.add(KEYS.MONTHLY_BUDGETS, budgetEntry);

    ActivityLogger.log(`Started ${Utils.ordinal(nextTerm)} term for ${newName}`, 'create', 'term', bmId, `District: ${newDistrict}`);

    this.closeBMModal();
    Notifications.toast(`${Utils.ordinal(nextTerm)} term started for "${newName}".`, 'success');
    this.initBMManagement();
  },

  // ═══════════════════════════════════════════════════════════
  // STAFF MANAGEMENT
  // ═══════════════════════════════════════════════════════════

  initStaffManagement() {
    const container = document.getElementById('staff-management-content');
    if (!container) return;
    this.renderStaffPage(container);
  },

  renderStaffPage(container) {
    const allUsers = Storage.getAll(KEYS.USERS).filter(u => u.role === 'secretary');
    const activeStaff = allUsers.filter(u => u.is_active && !u.is_archived);
    const inactiveStaff = allUsers.filter(u => !u.is_active || u.is_archived);
    const assignments = Storage.getAll(KEYS.SECRETARY_ASSIGNMENTS);

    let html = `
      <!-- Header with Add button -->
      <div class="mgmt-header mb-lg">
        <div>
          <div class="mgmt-header-title">Staff Management</div>
          <div class="mgmt-header-subtitle">Manage secretary/staff accounts and their board member assignments</div>
        </div>
        <div class="d-flex gap-sm">
          <button class="btn btn-outline btn-sm" onclick="SysAdminModule.exportStaffToCSV()">
            ${Icons.render('download', 16)} Export CSV
          </button>
          <button class="btn btn-primary" onclick="SysAdminModule.showAddStaffModal()">
            ${Icons.render('plus', 16)} Add Staff
          </button>
        </div>
      </div>

      <!-- Stat cards -->
      <div class="grid-3-col gap-md mb-lg">
        <div class="stat-card stat-card-blue">
          <div class="stat-icon stat-icon-blue">${Icons.render('user', 22)}</div>
          <div class="stat-label">Active Staff</div>
          <div class="stat-value">${activeStaff.length}</div>
        </div>
        <div class="stat-card stat-card-amber">
          <div class="stat-icon stat-icon-amber">${Icons.render('user-x', 22)}</div>
          <div class="stat-label">Inactive</div>
          <div class="stat-value">${inactiveStaff.length}</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:var(--neutral-100);color:var(--neutral-500)">${Icons.render('link', 22)}</div>
          <div class="stat-label">Total Assignments</div>
          <div class="stat-value">${assignments.length}</div>
        </div>
      </div>

      <!-- Active Staff Table -->
      <h3 class="mb-md">Active Staff</h3>
      ${activeStaff.length > 0 ? `
      <div class="table-container mb-lg">
        <table class="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Assigned Board Members</th>
              <th>Temp Account</th>
              <th style="width:220px;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${activeStaff.map(u => {
              const userAssignments = assignments.filter(a => a.secretary_user_id === u.user_id);
              const bmBadges = userAssignments.map(a => {
                const bm = Storage.getById(KEYS.BOARD_MEMBERS, a.bm_id, 'bm_id');
                const bmUser = bm ? Storage.getById(KEYS.USERS, bm.user_id, 'user_id') : null;
                const bmName = bmUser ? Utils.escapeHtml(bmUser.full_name) : 'Unknown';
                return `<span class="badge badge-info mr-xs mb-xs">${bmName}</span>`;
              });
              return `
                <tr>
                  <td><strong>${Utils.escapeHtml(u.full_name)}</strong></td>
                  <td>${Utils.escapeHtml(u.email)}</td>
                  <td>${bmBadges.join('') || '<span class="text-muted">None</span>'}</td>
                  <td>${u.is_temp_account ? '<span class="badge badge-warning">Temp</span>' : '<span class="badge badge-success">Set</span>'}</td>
                  <td>
                    <div style="display:flex;gap:var(--space-1);flex-wrap:wrap;">
                      <button class="btn btn-ghost btn-sm" onclick="SysAdminModule.showEditStaffModal('${u.user_id}')" title="Edit">
                        ${Icons.render('edit', 14)}
                      </button>
                      <button class="btn btn-ghost btn-sm" onclick="SysAdminModule.showAssignmentModal('${u.user_id}')" title="Manage Assignments">
                        ${Icons.render('link', 14)}
                      </button>
                      <button class="btn btn-ghost btn-sm" onclick="SysAdminModule.resetStaffPassword('${u.user_id}')" title="Reset Password">
                        ${Icons.render('key', 14)}
                      </button>
                      <button class="btn btn-ghost btn-sm" onclick="SysAdminModule.toggleStaffActive('${u.user_id}')" title="Deactivate">
                        ${Icons.render('user-x', 14)}
                      </button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
      ` : `<div class="empty-state-container mb-lg"><p class="text-muted">No active staff. Click "Add Staff" to create one.</p></div>`}

      <!-- Inactive Staff -->
      ${inactiveStaff.length > 0 ? `
      <details class="mt-md">
        <summary class="text-muted" style="cursor:pointer; font-weight:600;">${Icons.render('user-x', 16)} Inactive Staff (${inactiveStaff.length})</summary>
        <div class="table-container mt-md">
          <table class="data-table">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Actions</th></tr>
            </thead>
            <tbody>
              ${inactiveStaff.map(u => `
                <tr>
                  <td>${Utils.escapeHtml(u.full_name)}</td>
                  <td>${Utils.escapeHtml(u.email)}</td>
                  <td>
                    <button class="btn btn-success btn-sm" onclick="SysAdminModule.toggleStaffActive('${u.user_id}')">
                      ${Icons.render('user-check', 14)} Reactivate
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </details>
      ` : ''}
    `;

    container.innerHTML = html;
  },

  // ─── ADD STAFF MODAL ─────────────────────────────────────
  showAddStaffModal() {
    const bms = Storage.getAll(KEYS.BOARD_MEMBERS).filter(b => !b.is_archived && b.is_active);

    const container = document.getElementById('modal-container');
    container.innerHTML = `
      <div class="modal-overlay active" id="staff-modal-overlay">
        <div class="modal" style="max-width: 560px;">
          <div class="modal-header">
            <h3 class="modal-title">${Icons.render('user-plus', 20)} Add Staff</h3>
            <button class="modal-close" onclick="SysAdminModule.closeStaffModal()">&times;</button>
          </div>
          <div class="modal-body">
            <div id="staff-modal-error" class="banner banner-danger hidden mb-md"></div>

            <div class="form-group mb-md">
              <label class="form-label">Full Name *</label>
              <input type="text" class="form-input" id="staff-full-name" placeholder="e.g., Maria Santos" required />
            </div>

            <div class="d-flex gap-md">
              <div class="form-group mb-md" style="flex:1;">
                <label class="form-label">Government Email *</label>
                <input type="email" class="form-input" id="staff-email" placeholder="e.g., msantos@bataan.gov.ph" required />
              </div>
              <div class="form-group mb-md" style="flex:1;">
                <label class="form-label">Temporary Password *</label>
                <input type="text" class="form-input" id="staff-password" placeholder="Enter temp password" required />
              </div>
            </div>

            <div class="form-group mb-md">
              <label class="form-label">Assign to Board Member(s)</label>
              <div class="staff-bm-checkboxes" style="max-height:180px;overflow-y:auto;border:1px solid var(--neutral-200);border-radius:var(--radius-md);padding:var(--space-3);">
                ${bms.length > 0 ? bms.map(bm => {
                  const bmUser = Storage.getById(KEYS.USERS, bm.user_id, 'user_id');
                  const bmName = bmUser ? Utils.escapeHtml(bmUser.full_name) : 'Unknown';
                  return `
                    <label style="display:flex;align-items:center;gap:var(--space-2);padding:var(--space-2) 0;cursor:pointer;font-size:var(--text-sm);">
                      <input type="checkbox" class="staff-bm-check" value="${bm.bm_id}" />
                      ${bmName} <span class="text-muted">(${Utils.escapeHtml(bm.district_name)})</span>
                    </label>
                  `;
                }).join('') : '<span class="text-muted">No active board members available.</span>'}
              </div>
            </div>

            <div class="form-group mb-md">
              <label class="form-label">Permissions</label>
              <div style="border:1px solid var(--neutral-200);border-radius:var(--radius-md);padding:var(--space-3);">
                <label style="display:flex;align-items:center;gap:var(--space-2);padding:var(--space-2) 0;cursor:pointer;font-size:var(--text-sm);">
                  <input type="checkbox" id="staff-perm-allowance" />
                  <div>
                    <strong>Can Add PA Budget</strong>
                    <div class="text-xs text-muted">Allow staff to add PA budget entries for assigned board members (normally BM-only)</div>
                  </div>
                </label>
                <label style="display:flex;align-items:center;gap:var(--space-2);padding:var(--space-2) 0;cursor:pointer;font-size:var(--text-sm);">
                  <input type="checkbox" id="staff-perm-category" />
                  <div>
                    <strong>Can Make Permanent Category</strong>
                    <div class="text-xs text-muted">Allow staff to mark custom categories as permanent (normally sysadmin-only)</div>
                  </div>
                </label>
              </div>
            </div>

            <div class="banner banner-info mb-sm">
              <div class="banner-content">
                <small>${Icons.render('info', 14)} The staff member will be prompted to change their password on first login.</small>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" onclick="SysAdminModule.closeStaffModal()">Cancel</button>
            <button class="btn btn-primary" onclick="SysAdminModule.saveStaff()">
              ${Icons.render('check', 16)} Create Staff Account
            </button>
          </div>
        </div>
      </div>
    `;
  },

  closeStaffModal() {
    const overlay = document.getElementById('staff-modal-overlay');
    if (overlay) overlay.remove();
  },

  saveStaff() {
    const fullName = document.getElementById('staff-full-name').value.trim();
    const email = document.getElementById('staff-email').value.trim();
    const password = document.getElementById('staff-password').value.trim();
    const canAddAllowance = document.getElementById('staff-perm-allowance').checked;
    const canMakePermanent = document.getElementById('staff-perm-category').checked;
    const errorEl = document.getElementById('staff-modal-error');

    const selectedBMs = [...document.querySelectorAll('.staff-bm-check:checked')].map(cb => cb.value);

    if (!fullName || !email || !password) {
      errorEl.textContent = 'Name, email, and password are required.';
      errorEl.classList.remove('hidden');
      return;
    }

    // Check duplicate email
    const existingUser = Storage.getAll(KEYS.USERS).find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existingUser) {
      errorEl.textContent = 'A user with this email already exists.';
      errorEl.classList.remove('hidden');
      return;
    }

    const now = new Date().toISOString();
    const userId = Storage.generateId('usr');

    // Create user account
    const newUser = {
      user_id: userId,
      email: email,
      password: password,
      full_name: fullName,
      role: 'secretary',
      is_active: true,
      is_temp_account: true,
      created_at: now,
      last_login: null
    };
    Storage.add(KEYS.USERS, newUser);

    // Create assignments
    selectedBMs.forEach(bmId => {
      const assignment = {
        assignment_id: Storage.generateId('asgn'),
        secretary_user_id: userId,
        bm_id: bmId,
        can_add_allowance: canAddAllowance,
        can_make_permanent_category: canMakePermanent,
        assigned_at: now
      };
      Storage.add(KEYS.SECRETARY_ASSIGNMENTS, assignment);
    });

    ActivityLogger.log(`Created staff account: ${fullName}`, 'create', 'user', userId, `Email: ${email}, Assigned to ${selectedBMs.length} BM(s)`);

    this.closeStaffModal();
    Notifications.toast(`Staff "${fullName}" created successfully.`, 'success');
    this.initStaffManagement();
  },

  // ─── EDIT STAFF MODAL ────────────────────────────────────
  showEditStaffModal(userId) {
    const user = Storage.getById(KEYS.USERS, userId, 'user_id');
    if (!user) return;

    const container = document.getElementById('modal-container');
    container.innerHTML = `
      <div class="modal-overlay active" id="staff-modal-overlay">
        <div class="modal" style="max-width: 480px;">
          <div class="modal-header">
            <h3 class="modal-title">${Icons.render('edit', 20)} Edit Staff</h3>
            <button class="modal-close" onclick="SysAdminModule.closeStaffModal()">&times;</button>
          </div>
          <div class="modal-body">
            <div id="staff-modal-error" class="banner banner-danger hidden mb-md"></div>

            <div class="form-group mb-md">
              <label class="form-label">Full Name *</label>
              <input type="text" class="form-input" id="staff-full-name" value="${Utils.escapeHtml(user.full_name)}" required />
            </div>

            <div class="form-group mb-md">
              <label class="form-label">Government Email *</label>
              <input type="email" class="form-input" id="staff-email" value="${Utils.escapeHtml(user.email)}" required />
            </div>

            <div class="form-group mb-md">
              <label class="form-label">Reset Password</label>
              <input type="text" class="form-input" id="staff-password" placeholder="Leave blank to keep current" />
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" onclick="SysAdminModule.closeStaffModal()">Cancel</button>
            <button class="btn btn-primary" onclick="SysAdminModule.updateStaff('${userId}')">
              ${Icons.render('check', 16)} Save Changes
            </button>
          </div>
        </div>
      </div>
    `;
  },

  updateStaff(userId) {
    const fullName = document.getElementById('staff-full-name').value.trim();
    const email = document.getElementById('staff-email').value.trim();
    const password = document.getElementById('staff-password').value.trim();
    const errorEl = document.getElementById('staff-modal-error');

    if (!fullName || !email) {
      errorEl.textContent = 'Name and email are required.';
      errorEl.classList.remove('hidden');
      return;
    }

    // Check duplicate email
    const existingUser = Storage.getAll(KEYS.USERS).find(u => u.email.toLowerCase() === email.toLowerCase() && u.user_id !== userId);
    if (existingUser) {
      errorEl.textContent = 'Another user with this email already exists.';
      errorEl.classList.remove('hidden');
      return;
    }

    const updates = { full_name: fullName, email: email };
    if (password) {
      updates.password = password;
      updates.is_temp_account = true;
    }
    Storage.update(KEYS.USERS, userId, updates, 'user_id');

    ActivityLogger.log(`Updated staff account: ${fullName}`, 'edit', 'user', userId, `Email: ${email}`);

    this.closeStaffModal();
    Notifications.toast(`Staff "${fullName}" updated.`, 'success');
    this.initStaffManagement();
  },

  // ─── ASSIGNMENT MODAL ────────────────────────────────────
  showAssignmentModal(userId) {
    const user = Storage.getById(KEYS.USERS, userId, 'user_id');
    if (!user) return;

    const bms = Storage.getAll(KEYS.BOARD_MEMBERS).filter(b => !b.is_archived && b.is_active);
    const currentAssignments = Storage.getAll(KEYS.SECRETARY_ASSIGNMENTS).filter(a => a.secretary_user_id === userId);
    const assignedBmIds = currentAssignments.map(a => a.bm_id);

    // Get permission flags from first assignment (consistent across assignments)
    const firstAssignment = currentAssignments[0];
    const canAddAllowance = firstAssignment ? firstAssignment.can_add_allowance : false;
    const canMakePermanent = firstAssignment ? firstAssignment.can_make_permanent_category : false;

    const container = document.getElementById('modal-container');
    container.innerHTML = `
      <div class="modal-overlay active" id="staff-modal-overlay">
        <div class="modal" style="max-width: 520px;">
          <div class="modal-header">
            <h3 class="modal-title">${Icons.render('link', 20)} Manage Assignments — ${Utils.escapeHtml(user.full_name)}</h3>
            <button class="modal-close" onclick="SysAdminModule.closeStaffModal()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group mb-md">
              <label class="form-label">Assign to Board Member(s)</label>
              <div class="staff-bm-checkboxes" style="max-height:220px;overflow-y:auto;border:1px solid var(--neutral-200);border-radius:var(--radius-md);padding:var(--space-3);">
                ${bms.map(bm => {
                  const bmUser = Storage.getById(KEYS.USERS, bm.user_id, 'user_id');
                  const bmName = bmUser ? Utils.escapeHtml(bmUser.full_name) : 'Unknown';
                  const isAssigned = assignedBmIds.includes(bm.bm_id);
                  return `
                    <label style="display:flex;align-items:center;gap:var(--space-2);padding:var(--space-2) 0;cursor:pointer;font-size:var(--text-sm);">
                      <input type="checkbox" class="assign-bm-check" value="${bm.bm_id}" ${isAssigned ? 'checked' : ''} />
                      ${bmName} <span class="text-muted">(${Utils.escapeHtml(bm.district_name)})</span>
                    </label>
                  `;
                }).join('')}
              </div>
            </div>

            <div class="form-group mb-md">
              <label class="form-label">Permissions</label>
              <div style="border:1px solid var(--neutral-200);border-radius:var(--radius-md);padding:var(--space-3);">
                <label style="display:flex;align-items:center;gap:var(--space-2);padding:var(--space-2) 0;cursor:pointer;font-size:var(--text-sm);">
                  <input type="checkbox" id="assign-perm-allowance" ${canAddAllowance ? 'checked' : ''} />
                  <div>
                    <strong>Can Add PA Budget</strong>
                    <div class="text-xs text-muted">Allow adding PA budget entries for assigned board members</div>
                  </div>
                </label>
                <label style="display:flex;align-items:center;gap:var(--space-2);padding:var(--space-2) 0;cursor:pointer;font-size:var(--text-sm);">
                  <input type="checkbox" id="assign-perm-category" ${canMakePermanent ? 'checked' : ''} />
                  <div>
                    <strong>Can Make Permanent Category</strong>
                    <div class="text-xs text-muted">Allow marking custom categories as permanent</div>
                  </div>
                </label>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" onclick="SysAdminModule.closeStaffModal()">Cancel</button>
            <button class="btn btn-primary" onclick="SysAdminModule.saveAssignments('${userId}')">
              ${Icons.render('check', 16)} Save Assignments
            </button>
          </div>
        </div>
      </div>
    `;
  },

  saveAssignments(userId) {
    const newBmIds = [...document.querySelectorAll('.assign-bm-check:checked')].map(cb => cb.value);
    const canAddAllowance = document.getElementById('assign-perm-allowance').checked;
    const canMakePermanent = document.getElementById('assign-perm-category').checked;
    const now = new Date().toISOString();

    // Remove all existing assignments for this user
    let allAssignments = Storage.getAll(KEYS.SECRETARY_ASSIGNMENTS);
    allAssignments = allAssignments.filter(a => a.secretary_user_id !== userId);

    // Create new assignments
    newBmIds.forEach(bmId => {
      allAssignments.push({
        assignment_id: Storage.generateId('asgn'),
        secretary_user_id: userId,
        bm_id: bmId,
        can_add_allowance: canAddAllowance,
        can_make_permanent_category: canMakePermanent,
        assigned_at: now
      });
    });

    Storage.set(KEYS.SECRETARY_ASSIGNMENTS, allAssignments);

    const user = Storage.getById(KEYS.USERS, userId, 'user_id');
    ActivityLogger.log(`Updated assignments for ${user ? user.full_name : 'staff'}`, 'edit', 'user', userId, `Assigned to ${newBmIds.length} BM(s)`);

    this.closeStaffModal();
    Notifications.toast('Assignments updated.', 'success');
    this.initStaffManagement();
  },

  // ─── RESET STAFF PASSWORD ────────────────────────────────
  async resetStaffPassword(userId) {
    const user = Storage.getById(KEYS.USERS, userId, 'user_id');
    if (!user) return;

    const confirmed = await Notifications.confirm({
      title: 'Reset Password',
      message: `Reset password for "${user.full_name}"? A new temporary password will be generated. You will need to share it with the staff member.`,
      confirmText: 'Reset Password',
      type: 'warning'
    });

    if (!confirmed) return;

    const tempPassword = 'temp' + Math.random().toString(36).slice(2, 8);
    Storage.update(KEYS.USERS, userId, { password: tempPassword, is_temp_account: true }, 'user_id');

    ActivityLogger.log(`Reset password for ${user.full_name}`, 'edit', 'user', userId, null);

    // Show the new password in a modal for copy
    const container = document.getElementById('modal-container');
    container.innerHTML = `
      <div class="modal-overlay active" id="staff-modal-overlay">
        <div class="modal modal-sm">
          <div class="modal-header">
            <h3 class="modal-title">${Icons.render('key', 20)} Password Reset</h3>
            <button class="modal-close" onclick="SysAdminModule.closeStaffModal()">&times;</button>
          </div>
          <div class="modal-body">
            <p class="mb-md">New temporary password for <strong>${Utils.escapeHtml(user.full_name)}</strong>:</p>
            <div style="display:flex;align-items:center;gap:var(--space-2);background:var(--neutral-50);padding:var(--space-3);border-radius:var(--radius-md);border:1px solid var(--neutral-200);font-family:monospace;font-size:var(--text-lg);">
              <span id="reset-pw-display">${tempPassword}</span>
              <button class="btn btn-ghost btn-sm" onclick="navigator.clipboard.writeText('${tempPassword}');Notifications.toast('Password copied!','success');" title="Copy">
                ${Icons.render('copy', 16)}
              </button>
            </div>
            <p class="text-sm text-muted mt-md">The staff will be prompted to change this password on their next login.</p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-primary" onclick="SysAdminModule.closeStaffModal()">Done</button>
          </div>
        </div>
      </div>
    `;
  },

  // ─── TOGGLE STAFF ACTIVE / INACTIVE ──────────────────────
  async toggleStaffActive(userId) {
    const user = Storage.getById(KEYS.USERS, userId, 'user_id');
    if (!user) return;
    const newState = !user.is_active;

    const confirmed = await Notifications.confirm({
      title: newState ? 'Reactivate Staff' : 'Deactivate Staff',
      message: newState
        ? `Reactivate "${user.full_name}"? They will be able to log in again.`
        : `Deactivate "${user.full_name}"? They will not be able to log in until reactivated. Their assignments will be preserved.`,
      confirmText: newState ? 'Reactivate' : 'Deactivate',
      type: newState ? 'primary' : 'danger'
    });

    if (!confirmed) return;

    Storage.update(KEYS.USERS, userId, { is_active: newState }, 'user_id');

    ActivityLogger.log(`${newState ? 'Reactivated' : 'Deactivated'} staff: ${user.full_name}`, 'edit', 'user', userId, null);

    Notifications.toast(`Staff "${user.full_name}" ${newState ? 'reactivated' : 'deactivated'}.`, newState ? 'success' : 'info');
    this.initStaffManagement();
  },

  /* --------------------------------------------------------
   * CSV EXPORTS
   * -------------------------------------------------------- */
  exportBMsToCSV() {
    const bms = Storage.getAll(KEYS.BOARD_MEMBERS);
    const data = bms.map(bm => {
      const user = Storage.getById(KEYS.USERS, bm.user_id, 'user_id');
      return {
        bm_id: bm.bm_id,
        full_name: user ? user.full_name : 'Unknown',
        email: user ? user.email : '',
        district_name: bm.district_name,
        current_term_number: bm.current_term_number,
        term_start: bm.term_start,
        term_end: bm.term_end,
        is_active: bm.is_active ? 'Yes' : 'No',
        is_archived: bm.is_archived ? 'Yes' : 'No',
        archive_status: bm.archive_status || 'none',
        monthly_budget: bm.monthly_budget || 0
      };
    });
    ExportUtils.toCSV(data, 'board-members', {
      columns: ['bm_id', 'full_name', 'email', 'district_name', 'current_term_number', 'term_start', 'term_end', 'is_active', 'is_archived', 'archive_status', 'monthly_budget'],
      headers: ['BM ID', 'Full Name', 'Email', 'District', 'Term #', 'Term Start', 'Term End', 'Active', 'Archived', 'Archive Status', 'Monthly Budget']
    });
  },

  exportStaffToCSV() {
    const allUsers = Storage.getAll(KEYS.USERS).filter(u => u.role === 'secretary');
    const assignments = Storage.getAll(KEYS.SECRETARY_ASSIGNMENTS);
    const data = allUsers.map(u => {
      const userAssignments = assignments.filter(a => a.secretary_user_id === u.user_id);
      const bmNames = userAssignments.map(a => {
        const bm = Storage.getById(KEYS.BOARD_MEMBERS, a.bm_id, 'bm_id');
        const bmUser = bm ? Storage.getById(KEYS.USERS, bm.user_id, 'user_id') : null;
        return bmUser ? bmUser.full_name : 'Unknown';
      });
      return {
        user_id: u.user_id,
        full_name: u.full_name,
        email: u.email,
        is_active: u.is_active ? 'Yes' : 'No',
        is_temp: u.is_temp_password ? 'Yes' : 'No',
        assigned_bms: bmNames.join('; ') || 'None',
        created_at: u.created_at || ''
      };
    });
    ExportUtils.toCSV(data, 'staff-accounts', {
      columns: ['user_id', 'full_name', 'email', 'is_active', 'is_temp', 'assigned_bms', 'created_at'],
      headers: ['User ID', 'Full Name', 'Email', 'Active', 'Temp Password', 'Assigned Board Members', 'Created At']
    });
  }
};
