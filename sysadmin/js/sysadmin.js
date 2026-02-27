/**
 * ============================================================
 * OMSP Document Tracking / Monitoring
 * SysAdmin Module — Board Member & Staff Management (Full CRUD)
 * ============================================================
 * Handles: Add / Edit / Deactivate for BMs and Staff
 *          Secretary-to-BM assignment management
 *          Term badges, re-elected badges
 * ============================================================
 */

const SysAdminModule = {

  // ─── Board Member Management ─────────────────────────────
  initBMManagement() {
    const container = document.getElementById('bm-management-content');
    if (!container) return;

    const bms = Storage.getAll(KEYS.BOARD_MEMBERS);
    const active = bms.filter(b => !b.is_archived && b.is_active);
    const inactive = bms.filter(b => !b.is_archived && !b.is_active);
    const archived = bms.filter(b => b.is_archived);

    let html = `
      <div class="mgmt-header">
        <div>
          <div class="mgmt-header-title">Board Member Management</div>
          <div class="mgmt-header-subtitle">Manage board member accounts, terms, and secretary assignments</div>
        </div>
        <button class="btn btn-outline btn-sm" onclick="SysAdminModule.exportBMsToCSV()">
          ${typeof Icons !== 'undefined' ? Icons.render('download', 16) : ''} Export CSV
        </button>
        <button class="btn btn-primary" onclick="SysAdminModule.showAddBMModal()">
          ${typeof Icons !== 'undefined' ? Icons.render('plus-circle', 16) : '+'} Add Board Member
        </button>
      </div>

      <div class="grid-3-col gap-md mb-lg">
        <div class="stat-card stat-card-blue">
          <div class="stat-icon stat-icon-blue">${typeof Icons !== 'undefined' ? Icons.render('users', 22) : ''}</div>
          <div class="stat-label">Active Board Members</div>
          <div class="stat-value">${active.length}</div>
        </div>
        <div class="stat-card stat-card-amber">
          <div class="stat-icon stat-icon-amber">${typeof Icons !== 'undefined' ? Icons.render('clock', 22) : ''}</div>
          <div class="stat-label">Pending Archive</div>
          <div class="stat-value">${active.filter(b => b.archive_status === 'pending').length}</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:var(--neutral-100);color:var(--neutral-500)">${typeof Icons !== 'undefined' ? Icons.render('archive', 22) : ''}</div>
          <div class="stat-label">Archived</div>
          <div class="stat-value">${archived.length}</div>
        </div>
      </div>

      <h3 class="mb-md">Active Board Members</h3>
      <div class="table-container mb-lg">
        <table class="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>District</th>
              <th>Term</th>
              <th>Term Period</th>
              <th>Secretaries</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${active.length === 0 ? '<tr><td colspan="7" class="text-center text-muted py-lg">No active board members</td></tr>' : active.map(bm => {
              const user = Storage.getById(KEYS.USERS, bm.user_id, 'user_id');
              const bmInfo = Storage.getBMWithTermInfo(bm.bm_id);
              const secretaries = Storage.getSecretariesForBM(bm.bm_id);
              const secNames = secretaries.map(s => s.user ? s.user.full_name : 'Unknown');
              return `
                <tr>
                  <td>
                    <strong>${user ? Utils.escapeHtml(user.full_name) : 'Unknown'}</strong>
                    ${bmInfo && bmInfo.is_reelected ? '<span class="badge badge-accent ml-xs" title="Re-elected">Re-elected</span>' : ''}
                  </td>
                  <td>${Utils.escapeHtml(bm.district_name)}</td>
                  <td><span class="badge badge-info">${bmInfo ? bmInfo.term_badge : '1st Term'}</span></td>
                  <td>${Utils.formatDate(bm.term_start)} — ${Utils.formatDate(bm.term_end)}</td>
                  <td>${secNames.length > 0 ? secNames.map(n => `<span class="badge badge-info mr-xs">${Utils.escapeHtml(n)}</span>`).join('') : '<span class="text-muted text-sm">None assigned</span>'}</td>
                  <td>
                    <span class="badge badge-success">Active</span>
                    ${bm.archive_status === 'pending' ? '<span class="badge badge-warning ml-xs">Archive Pending</span>' : ''}
                  </td>
                  <td>
                    <div class="d-flex gap-xs">
                      <button class="btn btn-ghost btn-sm" onclick="SysAdminModule.showEditBMModal('${bm.bm_id}')" title="Edit">
                        ${typeof Icons !== 'undefined' ? Icons.render('edit', 14) : 'Edit'}
                      </button>
                      <button class="btn btn-ghost btn-sm text-danger" onclick="SysAdminModule.deactivateBM('${bm.bm_id}')" title="Deactivate">
                        ${typeof Icons !== 'undefined' ? Icons.render('x-circle', 14) : 'Deactivate'}
                      </button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;

    // Inactive BMs
    if (inactive.length > 0) {
      html += `
        <details class="mt-md mb-lg">
          <summary class="text-muted" style="cursor:pointer; font-weight:600;">Deactivated Board Members (${inactive.length})</summary>
          <div class="table-container mt-sm">
            <table class="data-table">
              <thead><tr><th>Name</th><th>District</th><th>Actions</th></tr></thead>
              <tbody>
                ${inactive.map(bm => {
                  const user = Storage.getById(KEYS.USERS, bm.user_id, 'user_id');
                  return `<tr>
                    <td>${user ? Utils.escapeHtml(user.full_name) : 'Unknown'}</td>
                    <td>${Utils.escapeHtml(bm.district_name)}</td>
                    <td><button class="btn btn-ghost btn-sm" onclick="SysAdminModule.reactivateBM('${bm.bm_id}')">Reactivate</button></td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </details>
      `;
    }

    // Archived BMs
    if (archived.length > 0) {
      html += `
        <details class="mt-md">
          <summary class="text-muted" style="cursor:pointer; font-weight:600;">Archived Board Members (${archived.length})</summary>
          <div class="table-container mt-sm">
            <table class="data-table">
              <thead><tr><th>Name</th><th>District</th><th>Term</th></tr></thead>
              <tbody>
                ${archived.map(bm => {
                  const user = Storage.getById(KEYS.USERS, bm.user_id, 'user_id');
                  return `<tr><td>${user ? Utils.escapeHtml(user.full_name) : 'Unknown'}</td><td>${Utils.escapeHtml(bm.district_name)}</td><td>${Utils.formatDate(bm.term_start)} — ${Utils.formatDate(bm.term_end)}</td></tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </details>
      `;
    }

    container.innerHTML = html;
  },

  // ─── Add Board Member Modal ──────────────────────────────
  showAddBMModal() {
    const today = new Date().toISOString().slice(0, 10);
    const threeYears = new Date();
    threeYears.setFullYear(threeYears.getFullYear() + 3);
    const endDefault = threeYears.toISOString().slice(0, 10);

    const container = document.getElementById('modal-container');
    container.innerHTML = `
      <div class="modal-overlay active" id="bm-modal-overlay">
        <div class="modal animate-fade-in" style="max-width:560px;">
          <div class="modal-header">
            <h3 class="modal-title">${Icons.render('plus-circle', 20)} Add Board Member</h3>
            <button class="modal-close" onclick="SysAdminModule.closeBMModal()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group mb-md">
              <label class="form-label">Full Name <span class="text-danger">*</span></label>
              <input type="text" class="form-input" id="bm-full-name" placeholder="e.g., Juan Dela Cruz" required />
            </div>
            <div class="form-group mb-md">
              <label class="form-label">Email <span class="text-danger">*</span></label>
              <input type="email" class="form-input" id="bm-email" placeholder="e.g., juan@omsp.gov.ph" required />
            </div>
            <div class="form-group mb-md">
              <label class="form-label">Password</label>
              <input type="text" class="form-input" id="bm-password" value="bm123" />
              <span class="form-hint">Default: bm123. Can be changed later.</span>
            </div>
            <div class="form-group mb-md">
              <label class="form-label">District <span class="text-danger">*</span></label>
              <input type="text" class="form-input" id="bm-district" placeholder="e.g., District 4 - Hermosa" required />
            </div>
            <div class="d-flex gap-md">
              <div class="form-group mb-md" style="flex:1;">
                <label class="form-label">Term Start</label>
                <input type="date" class="form-input" id="bm-term-start" value="${today}" />
              </div>
              <div class="form-group mb-md" style="flex:1;">
                <label class="form-label">Term End</label>
                <input type="date" class="form-input" id="bm-term-end" value="${endDefault}" />
              </div>
            </div>
            <div class="form-group mb-md">
              <label class="form-label">FA Monthly Budget (₱)</label>
              <input type="number" class="form-input" id="bm-fa-budget" value="70000" min="0" step="1000" />
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" onclick="SysAdminModule.closeBMModal()">Cancel</button>
            <button class="btn btn-primary" onclick="SysAdminModule.submitAddBM()">
              ${Icons.render('plus-circle', 16)} Add Board Member
            </button>
          </div>
        </div>
      </div>
    `;
    document.getElementById('bm-full-name').focus();
  },

  closeBMModal() {
    const overlay = document.getElementById('bm-modal-overlay');
    if (overlay) overlay.remove();
  },

  submitAddBM() {
    const fullName = document.getElementById('bm-full-name').value.trim();
    const email = document.getElementById('bm-email').value.trim();
    const password = document.getElementById('bm-password').value.trim();
    const district = document.getElementById('bm-district').value.trim();
    const termStart = document.getElementById('bm-term-start').value;
    const termEnd = document.getElementById('bm-term-end').value;
    const faBudget = parseFloat(document.getElementById('bm-fa-budget').value) || 70000;

    // Validation
    if (!fullName || !email || !district) {
      Notifications.toast('Please fill in all required fields.', 'error');
      return;
    }

    // Check duplicate email
    const existingUser = Storage.getAll(KEYS.USERS).find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existingUser) {
      Notifications.toast('A user with this email already exists.', 'error');
      return;
    }

    const result = Storage.createBoardMember({
      full_name: fullName,
      email: email,
      password: password || 'bm123',
      district_name: district,
      term_start: termStart,
      term_end: termEnd,
      fa_monthly_budget: faBudget
    });

    // Log activity
    ActivityLogger.log(`Added board member: ${fullName}`, 'create', 'board_member', result.boardMember.bm_id, `District: ${district}, Email: ${email}`);

    Notifications.toast(`Board member "${fullName}" added successfully!`, 'success');
    this.closeBMModal();
    this.initBMManagement();
  },

  // ─── Edit Board Member Modal ─────────────────────────────
  showEditBMModal(bmId) {
    const bm = Storage.getById(KEYS.BOARD_MEMBERS, bmId, 'bm_id');
    if (!bm) return;
    const user = Storage.getById(KEYS.USERS, bm.user_id, 'user_id');
    if (!user) return;

    const secretaries = Storage.getSecretariesForBM(bmId);
    const allSecretaries = Storage.getAll(KEYS.USERS).filter(u => u.role === 'secretary' && u.is_active);
    const assignedIds = secretaries.map(s => s.assignment ? s.assignment.secretary_user_id : null);

    const container = document.getElementById('modal-container');
    container.innerHTML = `
      <div class="modal-overlay active" id="bm-modal-overlay">
        <div class="modal animate-fade-in" style="max-width:600px;">
          <div class="modal-header">
            <h3 class="modal-title">${Icons.render('edit', 20)} Edit Board Member</h3>
            <button class="modal-close" onclick="SysAdminModule.closeBMModal()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group mb-md">
              <label class="form-label">Full Name <span class="text-danger">*</span></label>
              <input type="text" class="form-input" id="bm-edit-name" value="${Utils.escapeHtml(user.full_name)}" />
            </div>
            <div class="form-group mb-md">
              <label class="form-label">Email</label>
              <input type="email" class="form-input" id="bm-edit-email" value="${Utils.escapeHtml(user.email)}" />
            </div>
            <div class="form-group mb-md">
              <label class="form-label">District <span class="text-danger">*</span></label>
              <input type="text" class="form-input" id="bm-edit-district" value="${Utils.escapeHtml(bm.district_name)}" />
            </div>
            <div class="d-flex gap-md">
              <div class="form-group mb-md" style="flex:1;">
                <label class="form-label">Term Start</label>
                <input type="date" class="form-input" id="bm-edit-term-start" value="${bm.term_start}" />
              </div>
              <div class="form-group mb-md" style="flex:1;">
                <label class="form-label">Term End</label>
                <input type="date" class="form-input" id="bm-edit-term-end" value="${bm.term_end}" />
              </div>
            </div>
            <div class="form-group mb-md">
              <label class="form-label">FA Monthly Budget (₱)</label>
              <input type="number" class="form-input" id="bm-edit-budget" value="${bm.fa_monthly_budget}" min="0" step="1000" />
            </div>

            <hr class="my-md" />
            <h4 class="mb-sm">Secretary Assignments</h4>
            <div class="mb-sm">
              ${secretaries.length > 0 ? secretaries.map(s => `
                <div class="d-flex align-center gap-sm mb-xs" style="padding: 6px 0;">
                  <span class="badge badge-info">${s.user ? Utils.escapeHtml(s.user.full_name) : 'Unknown'}</span>
                  <button class="btn btn-ghost btn-sm text-danger" onclick="SysAdminModule.removeSecretaryAssignment('${s.assignment.assignment_id}', '${bmId}')" title="Remove">
                    ${Icons.render('x', 14)}
                  </button>
                </div>
              `).join('') : '<p class="text-muted text-sm">No secretaries assigned</p>'}
            </div>
            <div class="d-flex gap-sm">
              <select class="form-select" id="bm-assign-secretary" style="flex:1;">
                <option value="">— Assign a secretary —</option>
                ${allSecretaries.filter(s => !assignedIds.includes(s.user_id)).map(s => 
                  `<option value="${s.user_id}">${Utils.escapeHtml(s.full_name)} (${Utils.escapeHtml(s.email)})</option>`
                ).join('')}
              </select>
              <button class="btn btn-outline btn-sm" onclick="SysAdminModule.assignSecretaryFromEdit('${bmId}')">
                ${Icons.render('plus', 14)} Assign
              </button>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" onclick="SysAdminModule.closeBMModal()">Cancel</button>
            <button class="btn btn-primary" onclick="SysAdminModule.submitEditBM('${bmId}')">
              ${Icons.render('check', 16)} Save Changes
            </button>
          </div>
        </div>
      </div>
    `;
  },

  submitEditBM(bmId) {
    const name = document.getElementById('bm-edit-name').value.trim();
    const email = document.getElementById('bm-edit-email').value.trim();
    const district = document.getElementById('bm-edit-district').value.trim();
    const termStart = document.getElementById('bm-edit-term-start').value;
    const termEnd = document.getElementById('bm-edit-term-end').value;
    const budget = parseFloat(document.getElementById('bm-edit-budget').value) || 70000;

    if (!name || !district) {
      Notifications.toast('Name and district are required.', 'error');
      return;
    }

    const bm = Storage.getById(KEYS.BOARD_MEMBERS, bmId, 'bm_id');

    // Update user record
    Storage.update(KEYS.USERS, bm.user_id, { full_name: name, email: email }, 'user_id');

    // Update BM record
    Storage.update(KEYS.BOARD_MEMBERS, bmId, {
      district_name: district,
      term_start: termStart,
      term_end: termEnd,
      fa_monthly_budget: budget
    }, 'bm_id');

    // Update budget if changed
    if (budget !== bm.fa_monthly_budget) {
      Storage.updateFABaseBudget(bmId, budget);
    }

    // Log activity
    ActivityLogger.log(`Edited board member: ${name}`, 'update', 'board_member', bmId, `District: ${district}`);

    Notifications.toast('Board member updated successfully!', 'success');
    this.closeBMModal();
    this.initBMManagement();
  },

  // ─── Secretary assignment from edit modal ────────────────
  assignSecretaryFromEdit(bmId) {
    const select = document.getElementById('bm-assign-secretary');
    const secretaryUserId = select.value;
    if (!secretaryUserId) {
      Notifications.toast('Please select a secretary to assign.', 'warning');
      return;
    }

    Storage.assignSecretary(secretaryUserId, bmId);

    const secUser = Storage.getById(KEYS.USERS, secretaryUserId, 'user_id');
    ActivityLogger.log(`Assigned secretary ${secUser ? secUser.full_name : secretaryUserId} to BM`, 'update', 'assignment', bmId, `Secretary: ${secUser ? secUser.full_name : secretaryUserId}`);

    Notifications.toast('Secretary assigned!', 'success');
    // Re-open the edit modal to show updated assignments
    this.showEditBMModal(bmId);
  },

  removeSecretaryAssignment(assignmentId, bmId) {
    Notifications.confirm({
      title: 'Remove Assignment',
      message: 'Remove this secretary assignment? The secretary will lose access to this BM\'s records.',
      type: 'danger',
      confirmText: 'Remove',
      onConfirm: () => {
        Storage.removeAssignment(assignmentId);
        ActivityLogger.log('Removed secretary assignment', 'delete', 'assignment', assignmentId, `BM: ${bmId}`);

        Notifications.toast('Assignment removed.', 'success');
        this.showEditBMModal(bmId);
      }
    });
  },

  // ─── Deactivate / Reactivate BM ─────────────────────────
  deactivateBM(bmId) {
    const bm = Storage.getById(KEYS.BOARD_MEMBERS, bmId, 'bm_id');
    const user = bm ? Storage.getById(KEYS.USERS, bm.user_id, 'user_id') : null;
    const name = user ? user.full_name : 'Unknown';

    Notifications.confirm({
      title: 'Deactivate Board Member',
      message: `Deactivate "${Utils.escapeHtml(name)}"? Their account will be disabled but records preserved.`,
      type: 'danger',
      confirmText: 'Deactivate',
      onConfirm: () => {
        Storage.update(KEYS.BOARD_MEMBERS, bmId, { is_active: false }, 'bm_id');
        Storage.update(KEYS.USERS, bm.user_id, { is_active: false }, 'user_id');
        ActivityLogger.log(`Deactivated board member: ${name}`, 'update', 'board_member', bmId, 'Account deactivated');

        Notifications.toast(`${name} has been deactivated.`, 'success');
        this.initBMManagement();
      }
    });
  },

  reactivateBM(bmId) {
    const bm = Storage.getById(KEYS.BOARD_MEMBERS, bmId, 'bm_id');
    if (!bm) return;

    Storage.update(KEYS.BOARD_MEMBERS, bmId, { is_active: true }, 'bm_id');
    Storage.update(KEYS.USERS, bm.user_id, { is_active: true }, 'user_id');

    const user = Storage.getById(KEYS.USERS, bm.user_id, 'user_id');
    ActivityLogger.log(`Reactivated board member: ${user ? user.full_name : 'Unknown'}`, 'update', 'board_member', bmId, 'Account reactivated');

    Notifications.toast('Board member reactivated.', 'success');
    this.initBMManagement();
  },

  // ─── Staff Management ────────────────────────────────────
  initStaffManagement() {
    const container = document.getElementById('staff-management-content');
    if (!container) return;

    const users = Storage.getAll(KEYS.USERS).filter(u => u.role === 'secretary');
    const activeStaff = users.filter(u => u.is_active !== false);
    const inactiveStaff = users.filter(u => u.is_active === false);
    const assignments = Storage.getAll(KEYS.SECRETARY_ASSIGNMENTS);

    let html = `
      <div class="mgmt-header">
        <div>
          <div class="mgmt-header-title">Staff Management</div>
          <div class="mgmt-header-subtitle">Manage secretary accounts and board member assignments</div>
        </div>
        <button class="btn btn-outline btn-sm" onclick="SysAdminModule.exportStaffToCSV()">
          ${typeof Icons !== 'undefined' ? Icons.render('download', 16) : ''} Export CSV
        </button>
        <button class="btn btn-primary" onclick="SysAdminModule.showAddStaffModal()">
          ${typeof Icons !== 'undefined' ? Icons.render('plus-circle', 16) : '+'} Add Staff
        </button>
      </div>

      <div class="grid-3-col gap-md mb-lg">
        <div class="stat-card stat-card-blue">
          <div class="stat-icon stat-icon-blue">${typeof Icons !== 'undefined' ? Icons.render('user', 22) : ''}</div>
          <div class="stat-label">Active Staff</div>
          <div class="stat-value">${activeStaff.length}</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:var(--neutral-100);color:var(--neutral-500)">${typeof Icons !== 'undefined' ? Icons.render('user-x', 22) : ''}</div>
          <div class="stat-label">Deactivated</div>
          <div class="stat-value">${inactiveStaff.length}</div>
        </div>
        <div class="stat-card stat-card-amber">
          <div class="stat-icon stat-icon-amber">${typeof Icons !== 'undefined' ? Icons.render('link', 22) : ''}</div>
          <div class="stat-label">Total Assignments</div>
          <div class="stat-value">${assignments.length}</div>
        </div>
      </div>

      <h3 class="mb-md">Active Staff</h3>
      <div class="table-container mb-lg">
        <table class="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Position</th>
              <th>Assigned Board Members</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${activeStaff.length === 0 ? '<tr><td colspan="5" class="text-center text-muted py-lg">No active staff</td></tr>' : activeStaff.map(u => {
              const userAssignments = assignments.filter(a => a.secretary_user_id === u.user_id);
              const bmBadges = userAssignments.map(a => {
                const bm = Storage.getById(KEYS.BOARD_MEMBERS, a.bm_id, 'bm_id');
                const bmUser = bm ? Storage.getById(KEYS.USERS, bm.user_id, 'user_id') : null;
                return bmUser ? `<span class="badge badge-info mr-xs">${Utils.escapeHtml(bmUser.full_name)}</span>` : '';
              }).join('');
              return `
                <tr>
                  <td><strong>${Utils.escapeHtml(u.full_name)}</strong></td>
                  <td>${Utils.escapeHtml(u.email)}</td>
                  <td>${Utils.escapeHtml(u.position || 'Secretary')}</td>
                  <td>${bmBadges || '<span class="text-muted text-sm">None</span>'}</td>
                  <td>
                    <div class="d-flex gap-xs">
                      <button class="btn btn-ghost btn-sm" onclick="SysAdminModule.showEditStaffModal('${u.user_id}')" title="Edit">
                        ${typeof Icons !== 'undefined' ? Icons.render('edit', 14) : 'Edit'}
                      </button>
                      <button class="btn btn-ghost btn-sm text-danger" onclick="SysAdminModule.deactivateStaff('${u.user_id}')" title="Deactivate">
                        ${typeof Icons !== 'undefined' ? Icons.render('x-circle', 14) : 'X'}
                      </button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;

    // Inactive staff
    if (inactiveStaff.length > 0) {
      html += `
        <details class="mt-md">
          <summary class="text-muted" style="cursor:pointer; font-weight:600;">Deactivated Staff (${inactiveStaff.length})</summary>
          <div class="table-container mt-sm">
            <table class="data-table">
              <thead><tr><th>Name</th><th>Email</th><th>Actions</th></tr></thead>
              <tbody>
                ${inactiveStaff.map(u => `
                  <tr>
                    <td>${Utils.escapeHtml(u.full_name)}</td>
                    <td>${Utils.escapeHtml(u.email)}</td>
                    <td><button class="btn btn-ghost btn-sm" onclick="SysAdminModule.reactivateStaff('${u.user_id}')">Reactivate</button></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </details>
      `;
    }

    container.innerHTML = html;
  },

  // ─── Add Staff Modal ─────────────────────────────────────
  showAddStaffModal() {
    const bms = Storage.getAll(KEYS.BOARD_MEMBERS).filter(b => !b.is_archived && b.is_active);
    const users = Storage.getAll(KEYS.USERS);

    const container = document.getElementById('modal-container');
    container.innerHTML = `
      <div class="modal-overlay active" id="staff-modal-overlay">
        <div class="modal animate-fade-in" style="max-width:520px;">
          <div class="modal-header">
            <h3 class="modal-title">${Icons.render('plus-circle', 20)} Add Staff</h3>
            <button class="modal-close" onclick="SysAdminModule.closeStaffModal()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group mb-md">
              <label class="form-label">Full Name <span class="text-danger">*</span></label>
              <input type="text" class="form-input" id="staff-full-name" placeholder="e.g., Maria Cruz" required />
            </div>
            <div class="form-group mb-md">
              <label class="form-label">Email <span class="text-danger">*</span></label>
              <input type="email" class="form-input" id="staff-email" placeholder="e.g., maria@omsp.gov.ph" required />
            </div>
            <div class="form-group mb-md">
              <label class="form-label">Password</label>
              <input type="text" class="form-input" id="staff-password" value="sec123" />
              <span class="form-hint">Default: sec123</span>
            </div>
            <div class="form-group mb-md">
              <label class="form-label">Position</label>
              <input type="text" class="form-input" id="staff-position" value="Secretary" />
            </div>
            <div class="form-group mb-md">
              <label class="form-label">Assign to Board Member (optional)</label>
              <select class="form-select" id="staff-assign-bm">
                <option value="">— No assignment —</option>
                ${bms.map(bm => {
                  const bmUser = users.find(u => u.user_id === bm.user_id);
                  return `<option value="${bm.bm_id}">${bmUser ? Utils.escapeHtml(bmUser.full_name) : 'Unknown'} — ${Utils.escapeHtml(bm.district_name)}</option>`;
                }).join('')}
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" onclick="SysAdminModule.closeStaffModal()">Cancel</button>
            <button class="btn btn-primary" onclick="SysAdminModule.submitAddStaff()">
              ${Icons.render('plus-circle', 16)} Add Staff
            </button>
          </div>
        </div>
      </div>
    `;
    document.getElementById('staff-full-name').focus();
  },

  closeStaffModal() {
    const overlay = document.getElementById('staff-modal-overlay');
    if (overlay) overlay.remove();
  },

  submitAddStaff() {
    const fullName = document.getElementById('staff-full-name').value.trim();
    const email = document.getElementById('staff-email').value.trim();
    const password = document.getElementById('staff-password').value.trim();
    const position = document.getElementById('staff-position').value.trim();
    const assignBm = document.getElementById('staff-assign-bm').value;

    if (!fullName || !email) {
      Notifications.toast('Please fill in name and email.', 'error');
      return;
    }

    // Check duplicate email
    const existingUser = Storage.getAll(KEYS.USERS).find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existingUser) {
      Notifications.toast('A user with this email already exists.', 'error');
      return;
    }

    const result = Storage.createStaffUser({
      full_name: fullName,
      email: email,
      password: password || 'sec123',
      position: position || 'Secretary'
    });

    // Assign to BM if selected
    if (assignBm) {
      Storage.assignSecretary(result.user.user_id, assignBm);
    }

    ActivityLogger.log(`Added staff: ${fullName}`, 'create', 'staff', result.user.user_id, `Email: ${email}, Position: ${position}${assignBm ? ', Assigned to BM' : ''}`);

    Notifications.toast(`Staff "${fullName}" added successfully!`, 'success');
    this.closeStaffModal();
    this.initStaffManagement();
  },

  // ─── Edit Staff Modal ────────────────────────────────────
  showEditStaffModal(userId) {
    const user = Storage.getById(KEYS.USERS, userId, 'user_id');
    if (!user) return;

    const assignments = Storage.getAll(KEYS.SECRETARY_ASSIGNMENTS).filter(a => a.secretary_user_id === userId);
    const allBMs = Storage.getAll(KEYS.BOARD_MEMBERS).filter(b => !b.is_archived && b.is_active);
    const allUsers = Storage.getAll(KEYS.USERS);
    const assignedBmIds = assignments.map(a => a.bm_id);

    const container = document.getElementById('modal-container');
    container.innerHTML = `
      <div class="modal-overlay active" id="staff-modal-overlay">
        <div class="modal animate-fade-in" style="max-width:560px;">
          <div class="modal-header">
            <h3 class="modal-title">${Icons.render('edit', 20)} Edit Staff</h3>
            <button class="modal-close" onclick="SysAdminModule.closeStaffModal()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group mb-md">
              <label class="form-label">Full Name <span class="text-danger">*</span></label>
              <input type="text" class="form-input" id="staff-edit-name" value="${Utils.escapeHtml(user.full_name)}" />
            </div>
            <div class="form-group mb-md">
              <label class="form-label">Email</label>
              <input type="email" class="form-input" id="staff-edit-email" value="${Utils.escapeHtml(user.email)}" />
            </div>
            <div class="form-group mb-md">
              <label class="form-label">Position</label>
              <input type="text" class="form-input" id="staff-edit-position" value="${Utils.escapeHtml(user.position || 'Secretary')}" />
            </div>

            <hr class="my-md" />
            <h4 class="mb-sm">Board Member Assignments</h4>
            <div class="mb-sm">
              ${assignments.length > 0 ? assignments.map(a => {
                const bm = Storage.getById(KEYS.BOARD_MEMBERS, a.bm_id, 'bm_id');
                const bmUser = bm ? allUsers.find(u => u.user_id === bm.user_id) : null;
                return `
                  <div class="d-flex align-center gap-sm mb-xs" style="padding: 6px 0;">
                    <span class="badge badge-info">${bmUser ? Utils.escapeHtml(bmUser.full_name) : 'Unknown'} — ${bm ? Utils.escapeHtml(bm.district_name) : ''}</span>
                    <button class="btn btn-ghost btn-sm text-danger" onclick="SysAdminModule.removeStaffAssignment('${a.assignment_id}', '${userId}')" title="Remove">
                      ${Icons.render('x', 14)}
                    </button>
                  </div>
                `;
              }).join('') : '<p class="text-muted text-sm">No board member assignments</p>'}
            </div>
            <div class="d-flex gap-sm">
              <select class="form-select" id="staff-assign-bm-edit" style="flex:1;">
                <option value="">— Assign to board member —</option>
                ${allBMs.filter(bm => !assignedBmIds.includes(bm.bm_id)).map(bm => {
                  const bmUser = allUsers.find(u => u.user_id === bm.user_id);
                  return `<option value="${bm.bm_id}">${bmUser ? Utils.escapeHtml(bmUser.full_name) : 'Unknown'} — ${Utils.escapeHtml(bm.district_name)}</option>`;
                }).join('')}
              </select>
              <button class="btn btn-outline btn-sm" onclick="SysAdminModule.assignBMFromStaffEdit('${userId}')">
                ${Icons.render('plus', 14)} Assign
              </button>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" onclick="SysAdminModule.closeStaffModal()">Cancel</button>
            <button class="btn btn-primary" onclick="SysAdminModule.submitEditStaff('${userId}')">
              ${Icons.render('check', 16)} Save Changes
            </button>
          </div>
        </div>
      </div>
    `;
  },

  submitEditStaff(userId) {
    const name = document.getElementById('staff-edit-name').value.trim();
    const email = document.getElementById('staff-edit-email').value.trim();
    const position = document.getElementById('staff-edit-position').value.trim();

    if (!name) {
      Notifications.toast('Name is required.', 'error');
      return;
    }

    Storage.update(KEYS.USERS, userId, {
      full_name: name,
      email: email,
      position: position || 'Secretary'
    }, 'user_id');

    ActivityLogger.log(`Edited staff: ${name}`, 'update', 'staff', userId, `Email: ${email}, Position: ${position}`);

    Notifications.toast('Staff updated successfully!', 'success');
    this.closeStaffModal();
    this.initStaffManagement();
  },

  assignBMFromStaffEdit(userId) {
    const select = document.getElementById('staff-assign-bm-edit');
    const bmId = select.value;
    if (!bmId) {
      Notifications.toast('Please select a board member.', 'warning');
      return;
    }

    Storage.assignSecretary(userId, bmId);

    ActivityLogger.log('Created secretary assignment', 'create', 'assignment', bmId, `Secretary: ${userId}`);

    Notifications.toast('Board member assigned!', 'success');
    this.showEditStaffModal(userId);
  },

  removeStaffAssignment(assignmentId, userId) {
    Notifications.confirm({
      title: 'Remove Assignment',
      message: 'Remove this board member assignment?',
      type: 'danger',
      confirmText: 'Remove',
      onConfirm: () => {
        Storage.removeAssignment(assignmentId);
        ActivityLogger.log('Removed secretary assignment', 'delete', 'assignment', assignmentId, `Staff: ${userId}`);

        Notifications.toast('Assignment removed.', 'success');
        this.showEditStaffModal(userId);
      }
    });
  },

  // ─── Deactivate / Reactivate Staff ──────────────────────
  deactivateStaff(userId) {
    const user = Storage.getById(KEYS.USERS, userId, 'user_id');
    const name = user ? user.full_name : 'Unknown';

    Notifications.confirm({
      title: 'Deactivate Staff',
      message: `Deactivate "${Utils.escapeHtml(name)}"? Their account will be disabled.`,
      type: 'danger',
      confirmText: 'Deactivate',
      onConfirm: () => {
        Storage.update(KEYS.USERS, userId, { is_active: false }, 'user_id');
        ActivityLogger.log(`Deactivated staff: ${name}`, 'update', 'staff', userId, 'Account deactivated');

        Notifications.toast(`${name} has been deactivated.`, 'success');
        this.initStaffManagement();
      }
    });
  },

  reactivateStaff(userId) {
    Storage.update(KEYS.USERS, userId, { is_active: true }, 'user_id');

    const user = Storage.getById(KEYS.USERS, userId, 'user_id');
    ActivityLogger.log(`Reactivated staff: ${user ? user.full_name : 'Unknown'}`, 'update', 'staff', userId, 'Account reactivated');

    Notifications.toast('Staff reactivated.', 'success');
    this.initStaffManagement();
  },

  /* --------------------------------------------------------
   * CSV EXPORT
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
        monthly_budget: bm.fa_monthly_budget || 0
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
        is_temp: u.is_temp_account ? 'Yes' : 'No',
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
