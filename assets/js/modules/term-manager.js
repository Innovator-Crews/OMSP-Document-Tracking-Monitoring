/**
 * ============================================================
 * OMSP Document Tracking / Monitoring
 * Term Manager - End of Term process & archive management
 * ============================================================
 * Flow: BM requests archive → SysAdmin reviews → Approve/Deny
 * On approve: all BM data is marked as archived (soft delete)
 * ============================================================
 */

const TermManager = {
  init() {
    const user = Auth.requireAuth();
    if (!user) return;

    if (user.role === 'sysadmin') {
      // Hide BM section
      const bmSection = document.getElementById('term-info-section');
      if (bmSection) bmSection.style.display = 'none';
      this.loadPendingRequests();
      this.loadTermOverview();
    } else if (user.role === 'board_member') {
      // Hide admin sections
      const pendingEl = document.getElementById('pending-requests');
      const overviewEl = document.getElementById('term-overview');
      if (pendingEl) pendingEl.style.display = 'none';
      if (overviewEl) overviewEl.style.display = 'none';
      this.loadMyTermInfo();
    } else {
      // Secretary: hide all term sections, show info message
      const pendingEl = document.getElementById('pending-requests');
      const overviewEl = document.getElementById('term-overview');
      const bmSection = document.getElementById('term-info-section');
      if (pendingEl) pendingEl.style.display = 'none';
      if (overviewEl) overviewEl.style.display = 'none';
      if (bmSection) bmSection.innerHTML = '<div class="banner banner-info"><div class="banner-content">Term management is handled by Board Members and the System Administrator.</div></div>';
    }
  },

  /* --------------------------------------------------------
   * BM: Request Archive
   * -------------------------------------------------------- */
  loadMyTermInfo() {
    const user = Auth.getCurrentUser();
    const bm = Auth.getCurrentBMData();
    if (!bm) return;

    const infoEl = document.getElementById('term-info-section');
    if (!infoEl) return;

    const daysLeft = Utils.daysUntil(bm.term_end);
    const faCount = Storage.query(KEYS.FA_RECORDS, { bm_id: bm.bm_id }).length;
    const paCount = Storage.query(KEYS.PA_RECORDS, { bm_id: bm.bm_id }).length;

    infoEl.innerHTML = `
      <div class="card mb-lg">
        <div class="card-body">
          <h3 class="mb-md">Current Term Information</h3>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">Term Number</span>
              <span class="detail-value">${Utils.ordinal(bm.current_term_number)} Term</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Term Start</span>
              <span class="detail-value">${Utils.formatDate(bm.term_start)}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Term End</span>
              <span class="detail-value">${Utils.formatDate(bm.term_end)}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Days Remaining</span>
              <span class="detail-value ${daysLeft <= 30 ? 'text-danger' : daysLeft <= 90 ? 'text-warning' : ''}">${daysLeft > 0 ? daysLeft + ' days' : 'Term ended'}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Total Financial Assistance Records</span>
              <span class="detail-value">${faCount}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Total Personal Assistance Records</span>
              <span class="detail-value">${paCount}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Archive Status</span>
              <span class="detail-value">
                <span class="badge badge-status-${bm.archive_status === 'pending' ? 'pending' : bm.archive_status === 'approved' ? 'successful' : 'ongoing'}">${bm.archive_status === 'none' ? 'Not Requested' : Utils.capitalize(bm.archive_status)}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      ${bm.archive_status === 'none' ? `
        <div class="card">
          <div class="card-body">
            <h3 class="mb-sm">Request Archive</h3>
            <p class="text-muted mb-md">When your term ends, you can request the System Administrator to archive all your records. This will preserve your data as read-only for the new term.</p>
            <div class="banner banner-warning mb-md">
              <div class="banner-content">
                <strong>⚠️ Important:</strong> Once archived, you will not be able to add new Financial Assistance/Personal Assistance records under this term. All records will be preserved but marked as archived.
              </div>
            </div>
            <button class="btn btn-warning" onclick="TermManager.requestArchive()">Request Archive</button>
          </div>
        </div>
      ` : bm.archive_status === 'pending' ? `
        <div class="banner banner-info">
          <div class="banner-content">
            <strong>Archive Request Pending</strong> — Your archive request was submitted on ${Utils.formatDate(bm.archive_requested_at)}. Waiting for System Administrator approval.
          </div>
        </div>
      ` : ''}
    `;
  },

  async requestArchive() {
    const user = Auth.getCurrentUser();
    const bm = Auth.getCurrentBMData();
    if (!bm) return;

    const confirmed = await Notifications.confirm({
      title: 'Request Term Archive',
      message: 'This will send a request to the System Administrator to archive all your records for this term. Are you sure?',
      confirmText: 'Request Archive',
      type: 'warning'
    });

    if (!confirmed) return;

    Storage.update(KEYS.BOARD_MEMBERS, bm.bm_id, {
      archive_requested: true,
      archive_requested_at: new Date().toISOString(),
      archive_status: 'pending'
    }, 'bm_id');

    ActivityLogger.log(
      `Requested term archive`,
      'archive', 'term', bm.bm_id,
      `Term ${bm.current_term_number} — ${bm.district_name}`
    );

    Notifications.success('Archive request submitted. The System Administrator will review your request.');
    this.loadMyTermInfo();
  },

  /* --------------------------------------------------------
   * SYSADMIN: Manage Archive Requests
   * -------------------------------------------------------- */
  loadPendingRequests() {
    const container = document.getElementById('pending-requests');
    if (!container) return;

    const pending = Storage.getAll(KEYS.BOARD_MEMBERS).filter(b => b.archive_status === 'pending');

    if (pending.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">${Icons.render('archive', 32)}</div>
          <h3 class="empty-state-title">No Pending Requests</h3>
          <p class="empty-state-text">There are no pending archive requests from Board Members.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = pending.map(bm => {
      const user = Storage.getById(KEYS.USERS, bm.user_id, 'user_id');
      const faCount = Storage.query(KEYS.FA_RECORDS, { bm_id: bm.bm_id }).length;
      const paCount = Storage.query(KEYS.PA_RECORDS, { bm_id: bm.bm_id }).length;
      const budgets = Storage.getBudgetHistory(bm.bm_id);
      const totalUsed = budgets.reduce((s, b) => s + b.used_amount, 0);

      return `
        <div class="archive-request-card card mb-md">
          <div class="card-body">
            <div class="d-flex justify-between align-center mb-md">
              <div class="d-flex align-center gap-md">
                <div class="avatar avatar-lg">${Utils.getInitials(user ? user.full_name : '??')}</div>
                <div>
                  <h3 class="mb-0">${Utils.escapeHtml(user ? user.full_name : 'Unknown')}</h3>
                  <span class="text-muted">${Utils.escapeHtml(bm.district_name)}</span>
                </div>
              </div>
              <span class="badge badge-status-pending">Pending Review</span>
            </div>

            <div class="detail-grid mb-md">
              <div class="detail-item">
                <span class="detail-label">Term</span>
                <span class="detail-value">${Utils.ordinal(bm.current_term_number)}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Period</span>
                <span class="detail-value">${Utils.formatDate(bm.term_start)} — ${Utils.formatDate(bm.term_end)}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Financial Assistance Records</span>
                <span class="detail-value">${faCount}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Personal Assistance Records</span>
                <span class="detail-value">${paCount}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Total Budget Used</span>
                <span class="detail-value">${Utils.formatCurrency(totalUsed)}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Requested On</span>
                <span class="detail-value">${Utils.formatDate(bm.archive_requested_at, 'datetime')}</span>
              </div>
            </div>

            <div class="d-flex gap-sm">
              <button class="btn btn-success" onclick="TermManager.approveArchive('${bm.bm_id}')">${Icons.render('check-circle', 16)} Approve Archive</button>
              <button class="btn btn-danger" onclick="TermManager.denyArchive('${bm.bm_id}')">${Icons.render('x-circle', 16)} Deny</button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  async approveArchive(bmId) {
    const confirmed = await Notifications.confirm({
      title: 'Approve Archive',
      message: 'This will archive ALL records for this Board Member. This action marks everything as archived (read-only). Continue?',
      confirmText: 'Approve & Archive',
      type: 'danger'
    });

    if (!confirmed) return;

    const user = Auth.getCurrentUser();
    const now = new Date().toISOString();

    // Archive all FA records for this BM
    const faRecords = Storage.getAll(KEYS.FA_RECORDS).filter(r => r.bm_id === bmId && !r.is_archived);
    faRecords.forEach(r => {
      Storage.update(KEYS.FA_RECORDS, r.fa_id, {
        is_archived: true,
        archived_at: now,
        archived_by: user.user_id
      }, 'fa_id');
    });

    // Archive all PA records for this BM
    const paRecords = Storage.getAll(KEYS.PA_RECORDS).filter(r => r.bm_id === bmId && !r.is_archived);
    paRecords.forEach(r => {
      Storage.update(KEYS.PA_RECORDS, r.pa_id, {
        is_archived: true,
        archived_at: now,
        archived_by: user.user_id
      }, 'pa_id');
    });

    // Update BM record
    Storage.update(KEYS.BOARD_MEMBERS, bmId, {
      archive_status: 'approved',
      is_archived: true,
      archived_at: now,
      archived_by: user.user_id
    }, 'bm_id');

    const bmUser = Storage.getById(KEYS.BOARD_MEMBERS, bmId, 'bm_id');
    const targetUser = bmUser ? Storage.getById(KEYS.USERS, bmUser.user_id, 'user_id') : null;

    ActivityLogger.log(
      `Approved archive for ${targetUser ? targetUser.full_name : bmId}`,
      'approve', 'term', bmId,
      `Archived ${faRecords.length} Financial Assistance + ${paRecords.length} Personal Assistance records`
    );

    Notifications.success(`Archive approved. ${faRecords.length + paRecords.length} records archived.`);
    this.loadPendingRequests();
    this.loadTermOverview();
  },

  async denyArchive(bmId) {
    const confirmed = await Notifications.confirm({
      title: 'Deny Archive Request',
      message: 'Are you sure you want to deny this archive request?',
      confirmText: 'Deny',
      type: 'danger'
    });

    if (!confirmed) return;

    Storage.update(KEYS.BOARD_MEMBERS, bmId, {
      archive_status: 'denied',
      archive_requested: false
    }, 'bm_id');

    ActivityLogger.log('Denied archive request', 'deny', 'term', bmId);
    Notifications.info('Archive request denied.');
    this.loadPendingRequests();
  },

  /* --------------------------------------------------------
   * SYSADMIN: Term Overview
   * -------------------------------------------------------- */
  loadTermOverview() {
    const container = document.getElementById('term-overview');
    if (!container) return;

    const bms = Storage.getAll(KEYS.BOARD_MEMBERS);
    const active = bms.filter(b => !b.is_archived);
    const archived = bms.filter(b => b.is_archived);

    let html = '<h3 class="mb-md">Board Members Overview</h3>';

    html += '<div class="grid-3-col gap-md mb-lg">';
    html += `
      <div class="stat-card stat-card-primary">
        <div class="stat-value">${active.length}</div>
        <div class="stat-label">Active BMs</div>
      </div>
      <div class="stat-card stat-card-warning">
        <div class="stat-value">${bms.filter(b => b.archive_status === 'pending').length}</div>
        <div class="stat-label">Pending Archives</div>
      </div>
      <div class="stat-card stat-card-neutral">
        <div class="stat-value">${archived.length}</div>
        <div class="stat-label">Archived Terms</div>
      </div>
    `;
    html += '</div>';

    // Active BMs
    html += '<h4 class="mb-sm">Active Board Members</h4>';
    if (active.length === 0) {
      html += Utils.renderEmptyState('users', 'No Active Board Members', 'All board members have been archived.');
    } else {
      html += '<div class="grid-2-col gap-md">';
      active.forEach(bm => {
        const user = Storage.getById(KEYS.USERS, bm.user_id, 'user_id');
        const daysLeft = Utils.daysUntil(bm.term_end);
        html += `
          <div class="card">
            <div class="card-body">
              <div class="d-flex justify-between align-center">
                <div>
                  <h4 class="mb-0">${Utils.escapeHtml(user ? user.full_name : 'Unknown')}</h4>
                  <span class="text-muted text-sm">${Utils.escapeHtml(bm.district_name)}</span>
                </div>
                <span class="badge ${daysLeft <= 30 ? 'badge-danger' : daysLeft <= 90 ? 'badge-warning' : 'badge-success'}">${daysLeft > 0 ? daysLeft + 'd left' : 'Ended'}</span>
              </div>
              <div class="mt-sm text-sm text-muted">
                Term ${bm.current_term_number} • ${Utils.formatDate(bm.term_start)} — ${Utils.formatDate(bm.term_end)}
              </div>
            </div>
          </div>
        `;
      });
      html += '</div>';
    }

    // Archived BMs — show "Start New Term" option
    if (archived.length > 0) {
      html += '<h4 class="mb-sm mt-lg">Archived Board Members</h4>';
      html += '<div class="grid-2-col gap-md">';
      archived.forEach(bm => {
        const user = Storage.getById(KEYS.USERS, bm.user_id, 'user_id');
        html += `
          <div class="card">
            <div class="card-body">
              <div class="d-flex justify-between align-center mb-sm">
                <div>
                  <h4 class="mb-0">${Utils.escapeHtml(user ? user.full_name : 'Unknown')}</h4>
                  <span class="text-muted text-sm">${Utils.escapeHtml(bm.district_name)}</span>
                </div>
                <span class="badge badge-neutral">Archived</span>
              </div>
              <div class="text-sm text-muted mb-md">
                Completed Term ${bm.current_term_number} • ${Utils.formatDate(bm.term_start)} — ${Utils.formatDate(bm.term_end)}
                ${bm.archived_at ? '<br>Archived on ' + Utils.formatDate(bm.archived_at, 'datetime') : ''}
              </div>
              <button class="btn btn-primary btn-sm" onclick="TermManager.showNewTermModal('${bm.bm_id}')">
                ${Icons.render('plus-circle', 16)} Start New Term
              </button>
            </div>
          </div>
        `;
      });
      html += '</div>';
    }

    container.innerHTML = html;
  },

  /* --------------------------------------------------------
   * SYSADMIN: Start New Term for Archived BM
   * -------------------------------------------------------- */
  showNewTermModal(bmId) {
    const bm = Storage.getById(KEYS.BOARD_MEMBERS, bmId, 'bm_id');
    if (!bm) return;
    const user = Storage.getById(KEYS.USERS, bm.user_id, 'user_id');
    const nextTerm = bm.current_term_number + 1;

    // Default dates: today → +3 years
    const today = new Date();
    const threeYearsLater = new Date(today);
    threeYearsLater.setFullYear(threeYearsLater.getFullYear() + 3);
    const startDefault = today.toISOString().slice(0, 10);
    const endDefault = threeYearsLater.toISOString().slice(0, 10);

    const container = document.getElementById('modal-container');
    container.innerHTML = `
      <div class="modal-overlay active" id="new-term-overlay">
        <div class="modal" style="max-width: 520px;">
          <div class="modal-header">
            <h3 class="modal-title">Start ${Utils.ordinal(nextTerm)} Term</h3>
            <button class="modal-close" onclick="TermManager.closeNewTermModal()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="banner banner-info mb-md">
              <div class="banner-content">
                This will reactivate <strong>${Utils.escapeHtml(user ? user.full_name : 'Unknown')}</strong> (${Utils.escapeHtml(bm.district_name)}) for a new term. Previous term records remain archived.
              </div>
            </div>

            <div class="form-group mb-md">
              <label class="form-label">Term Number</label>
              <input type="text" class="form-input" value="${Utils.ordinal(nextTerm)} Term" disabled />
            </div>

            <div class="d-flex gap-md">
              <div class="form-group mb-md" style="flex:1;">
                <label class="form-label">Term Start Date</label>
                <input type="date" class="form-input" id="new-term-start" value="${startDefault}" required />
              </div>
              <div class="form-group mb-md" style="flex:1;">
                <label class="form-label">Term End Date</label>
                <input type="date" class="form-input" id="new-term-end" value="${endDefault}" required />
              </div>
            </div>

            <div class="form-group mb-md">
              <label class="form-label">Financial Assistance Monthly Budget (₱)</label>
              <input type="number" class="form-input" id="new-term-fa-budget" value="70000" min="0" step="1000" />
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" onclick="TermManager.closeNewTermModal()">Cancel</button>
            <button class="btn btn-primary" onclick="TermManager.confirmNewTerm('${bmId}')">
              ${Icons.render('plus-circle', 16)} Start New Term
            </button>
          </div>
        </div>
      </div>
    `;
  },

  closeNewTermModal() {
    const overlay = document.getElementById('new-term-overlay');
    if (overlay) overlay.remove();
  },

  async confirmNewTerm(bmId) {
    const bm = Storage.getById(KEYS.BOARD_MEMBERS, bmId, 'bm_id');
    if (!bm) return;

    const termStart = document.getElementById('new-term-start').value;
    const termEnd = document.getElementById('new-term-end').value;
    const faBudget = parseInt(document.getElementById('new-term-fa-budget').value) || 70000;

    if (!termStart || !termEnd) {
      Notifications.error('Please provide both start and end dates.');
      return;
    }
    if (new Date(termEnd) <= new Date(termStart)) {
      Notifications.error('End date must be after start date.');
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
      is_active: true,
      is_archived: false,
      archived_at: null,
      archived_by: null,
      archive_requested: false,
      archive_requested_at: null,
      archive_status: 'none'
    }, 'bm_id');

    // Create new monthly budget for the first month of new term
    Storage.getCurrentBudget(bmId);

    // Clear PA budgets for the new term (old ones stay archived)
    // We'll just reset pa_balance on the BM record
    Storage.update(KEYS.BOARD_MEMBERS, bmId, { pa_balance: 0 }, 'bm_id');

    // Log the activity
    const bmUser = Storage.getById(KEYS.USERS, bm.user_id, 'user_id');
    ActivityLogger.log(
      `Started ${Utils.ordinal(nextTerm)} term for ${bmUser ? bmUser.full_name : bmId}`,
      'create', 'term', bmId,
      `Term ${nextTerm}: ${termStart} — ${termEnd}, Financial Assistance Budget: ₱${faBudget.toLocaleString()}/mo`
    );

      this.closeNewTermModal();
      Notifications.success(`${Utils.ordinal(nextTerm)} term started successfully for ${bmUser ? bmUser.full_name : 'Board Member'}.`);
      this.loadPendingRequests();
      this.loadTermOverview();
    }
  };
