/**
 * ============================================================
 * OMSP Document Tracking / Monitoring
 * Dashboard Module - Dashboard rendering for all roles
 * ============================================================
 */

const DashboardModule = {
  /**
   * Initialize dashboard based on user role
   */
  init() {
    const user = Auth.getCurrentUser();
    if (!user) return;

    switch (user.role) {
      case 'sysadmin':
        this.renderAdminDashboard(user);
        break;
      case 'board_member':
        this.renderBMDashboard(user);
        break;
      case 'secretary':
        this.renderStaffDashboard(user);
        break;
    }

    Auth.setupSidebarProfile();
    Auth.setActiveSidebarLink();
  },

  /* --------------------------------------------------------
   * SYSADMIN DASHBOARD
   * -------------------------------------------------------- */
  renderAdminDashboard(user) {
    const users = Storage.getAll(KEYS.USERS);
    const bms = Storage.getAll(KEYS.BOARD_MEMBERS).filter(b => !b.is_archived);
    const faRecords = Storage.getAll(KEYS.FA_RECORDS).filter(r => !r.is_archived);
    const paRecords = Storage.getAll(KEYS.PA_RECORDS).filter(r => !r.is_archived);
    const pendingArchives = bms.filter(b => b.archive_status === 'pending');
    const todayLogs = ActivityLogger.getToday();

    // Stats
    this.setStatValue('stat-total-bms', bms.length);
    this.setStatValue('stat-active-users', users.filter(u => u.is_active).length);
    this.setStatValue('stat-fa-records', faRecords.length);
    this.setStatValue('stat-pa-records', paRecords.length);
    this.setStatValue('stat-pending-archives', pendingArchives.length);
    this.setStatValue('stat-today-activity', todayLogs.length);

    // Total budget disbursed this month
    const budgets = Storage.getAll(KEYS.MONTHLY_BUDGETS)
      .filter(b => b.year_month === Utils.getCurrentYearMonth());
    const totalUsed = budgets.reduce((sum, b) => sum + b.used_amount, 0);
    this.setStatValue('stat-total-disbursed', Utils.formatCurrency(totalUsed));

    // Welcome banner
    const welcomeEl = document.getElementById('welcome-name');
    if (welcomeEl) welcomeEl.textContent = user.full_name;

    // Recent activity
    ActivityLogger.renderList('#recent-activity', { limit: 10 });

    // Pending archive requests
    this.renderPendingArchives('#pending-archives-list', pendingArchives);

    // Recent FA records
    this.renderRecentRecords('#recent-fa-list', faRecords.slice(-5).reverse(), 'fa');

    // BM budget overview
    this.renderBudgetOverview('#budget-overview');
  },

  /* --------------------------------------------------------
   * BOARD MEMBER DASHBOARD
   * -------------------------------------------------------- */
  renderBMDashboard(user) {
    const bm = Auth.getCurrentBMData();
    if (!bm) return;

    const budget = Storage.getCurrentBudget(bm.bm_id);
    const faRecords = Storage.query(KEYS.FA_RECORDS, { bm_id: bm.bm_id });
    const paRecords = Storage.query(KEYS.PA_RECORDS, { bm_id: bm.bm_id });

    // Welcome
    const welcomeEl = document.getElementById('welcome-name');
    if (welcomeEl) welcomeEl.textContent = user.full_name;
    const districtEl = document.getElementById('district-name');
    if (districtEl) districtEl.textContent = bm.district_name;

    // Stats
    this.setStatValue('stat-fa-budget-remaining', Utils.formatCurrency(budget.remaining_amount));
    this.setStatValue('stat-fa-budget-used', Utils.formatCurrency(budget.used_amount));
    this.setStatValue('stat-fa-count', faRecords.length);
    this.setStatValue('stat-pa-count', paRecords.length);
    this.setStatValue('stat-pa-balance', Utils.formatCurrency(bm.pa_balance));

    // Budget progress bar
    const progressEl = document.getElementById('budget-progress');
    if (progressEl) {
      const pct = Utils.percentage(budget.used_amount, budget.total_budget);
      progressEl.style.width = `${pct}%`;
      progressEl.className = `progress-fill ${pct > 90 ? 'progress-danger' : pct > 70 ? 'progress-warning' : 'progress-primary'}`;
    }
    const pctLabel = document.getElementById('budget-pct');
    if (pctLabel) pctLabel.textContent = `${Utils.percentage(budget.used_amount, budget.total_budget)}%`;

    // Term info
    const termEl = document.getElementById('term-info');
    if (termEl) {
      const daysLeft = Utils.daysUntil(bm.term_end);
      termEl.textContent = `Term ${bm.current_term_number} • ${daysLeft > 0 ? daysLeft + ' days remaining' : 'Term ended'}`;
    }

    // Recent records
    const recentFA = faRecords.slice(-5).reverse();
    this.renderRecentRecords('#recent-fa-list', recentFA, 'fa');

    const recentPA = paRecords.slice(-5).reverse();
    this.renderRecentRecords('#recent-pa-list', recentPA, 'pa');

    // My staff
    this.renderMyStaff('#my-staff-list', bm.bm_id);
  },

  /* --------------------------------------------------------
   * SECRETARY DASHBOARD
   * -------------------------------------------------------- */
  renderStaffDashboard(user) {
    const assignedBMs = Auth.getAssignedBMs();

    // Welcome
    const welcomeEl = document.getElementById('welcome-name');
    if (welcomeEl) welcomeEl.textContent = user.full_name;

    // Assigned BMs summary
    this.setStatValue('stat-assigned-bms', assignedBMs.length);

    // Total records by this secretary
    const myFA = Storage.getAll(KEYS.FA_RECORDS).filter(r => r.encoded_by === user.user_id && !r.is_archived);
    const myPA = Storage.getAll(KEYS.PA_RECORDS).filter(r => r.encoded_by === user.user_id && !r.is_archived);
    this.setStatValue('stat-my-fa-count', myFA.length);
    this.setStatValue('stat-my-pa-count', myPA.length);
    this.setStatValue('stat-total-encoded', myFA.length + myPA.length);

    // Today's records
    const today = new Date().toISOString().split('T')[0];
    const todayRecords = [...myFA, ...myPA].filter(r => r.created_at.startsWith(today));
    this.setStatValue('stat-today-records', todayRecords.length);

    // Assigned BMs cards
    this.renderAssignedBMCards('#assigned-bms-list', assignedBMs);

    // Recent records I encoded
    const allMyRecords = [...myFA.map(r => ({ ...r, type: 'FA' })), ...myPA.map(r => ({ ...r, type: 'PA' }))]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 8);
    this.renderMyRecentRecords('#my-recent-records', allMyRecords);

    // Activity feed
    ActivityLogger.renderList('#recent-activity', { user_id: user.user_id, limit: 10 });
  },

  /* --------------------------------------------------------
   * RENDER HELPERS
   * -------------------------------------------------------- */

  setStatValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  },

  renderRecentRecords(selector, records, type) {
    const el = document.querySelector(selector);
    if (!el) return;

    if (records.length === 0) {
      el.innerHTML = '<div class="empty-state-mini">No records yet</div>';
      return;
    }

    const bms = Storage.getAll(KEYS.BOARD_MEMBERS);
    const getBMName = (bmId) => {
      const bm = bms.find(b => b.bm_id === bmId);
      if (!bm) return 'Unknown';
      const user = Storage.getById(KEYS.USERS, bm.user_id, 'user_id');
      return user ? user.full_name : 'Unknown';
    };

    el.innerHTML = records.map(r => {
      const name = type === 'fa' ? r.patient_name : r.client_name;
      const amount = type === 'fa' ? r.amount_approved : r.amount_provided;
      const status = type === 'fa' ? r.status : 'Recorded';
      return `
        <div class="recent-record-item">
          <div class="record-icon record-icon-${type}">
            ${type === 'fa' ? '📋' : '📝'}
          </div>
          <div class="record-info">
            <div class="record-name">${Utils.escapeHtml(name || '—')}</div>
            <div class="record-meta">
              ${getBMName(r.bm_id)} • ${Utils.formatRelativeTime(r.created_at)}
            </div>
          </div>
          <div class="record-amount">
            <div class="amount-value">${Utils.formatCurrency(amount)}</div>
            <span class="badge badge-status-${Utils.getStatusClass(status)}">${status}</span>
          </div>
        </div>
      `;
    }).join('');
  },

  renderPendingArchives(selector, pending) {
    const el = document.querySelector(selector);
    if (!el) return;

    if (pending.length === 0) {
      el.innerHTML = '<div class="empty-state-mini">No pending archive requests</div>';
      return;
    }

    el.innerHTML = pending.map(bm => {
      const user = Storage.getById(KEYS.USERS, bm.user_id, 'user_id');
      return `
        <div class="pending-item">
          <div class="pending-info">
            <strong>${Utils.escapeHtml(user ? user.full_name : 'Unknown')}</strong>
            <span class="text-muted">${bm.district_name}</span>
          </div>
          <div class="pending-time">${Utils.formatRelativeTime(bm.archive_requested_at)}</div>
          <a href="pending-archives.html?id=${bm.bm_id}" class="btn btn-sm btn-warning">Review</a>
        </div>
      `;
    }).join('');
  },

  renderBudgetOverview(selector) {
    const el = document.querySelector(selector);
    if (!el) return;

    const bms = Storage.getAll(KEYS.BOARD_MEMBERS).filter(b => !b.is_archived);
    const yearMonth = Utils.getCurrentYearMonth();

    el.innerHTML = bms.map(bm => {
      const budget = Storage.getCurrentBudget(bm.bm_id);
      const user = Storage.getById(KEYS.USERS, bm.user_id, 'user_id');
      const pct = Utils.percentage(budget.used_amount, budget.total_budget);
      return `
        <div class="budget-mini-item">
          <div class="budget-mini-header">
            <span class="budget-mini-name">${Utils.escapeHtml(user ? user.full_name : 'Unknown')}</span>
            <span class="budget-mini-pct ${pct > 90 ? 'text-danger' : pct > 70 ? 'text-warning' : ''}">${pct}%</span>
          </div>
          <div class="progress-bar progress-sm">
            <div class="progress-fill ${pct > 90 ? 'progress-danger' : pct > 70 ? 'progress-warning' : 'progress-primary'}" style="width: ${pct}%"></div>
          </div>
          <div class="budget-mini-amounts">
            <span>${Utils.formatCurrency(budget.used_amount)} used</span>
            <span>${Utils.formatCurrency(budget.remaining_amount)} left</span>
          </div>
        </div>
      `;
    }).join('');
  },

  renderMyStaff(selector, bmId) {
    const el = document.querySelector(selector);
    if (!el) return;

    const assignments = Storage.getAll(KEYS.SECRETARY_ASSIGNMENTS)
      .filter(a => a.bm_id === bmId);

    if (assignments.length === 0) {
      el.innerHTML = '<div class="empty-state-mini">No staff assigned</div>';
      return;
    }

    el.innerHTML = assignments.map(a => {
      const user = Storage.getById(KEYS.USERS, a.secretary_user_id, 'user_id');
      return `
        <div class="staff-item">
          <div class="avatar avatar-sm">${Utils.getInitials(user ? user.full_name : '??')}</div>
          <div class="staff-info">
            <div class="staff-name">${Utils.escapeHtml(user ? user.full_name : 'Unknown')}</div>
            <div class="staff-email text-muted">${Utils.escapeHtml(user ? user.email : '')}</div>
          </div>
        </div>
      `;
    }).join('');
  },

  renderAssignedBMCards(selector, assignedBMs) {
    const el = document.querySelector(selector);
    if (!el) return;

    if (assignedBMs.length === 0) {
      el.innerHTML = '<div class="empty-state-mini">No Board Members assigned to you</div>';
      return;
    }

    el.innerHTML = assignedBMs.map(bm => {
      const user = Storage.getById(KEYS.USERS, bm.user_id, 'user_id');
      const budget = Storage.getCurrentBudget(bm.bm_id);
      const pct = Utils.percentage(budget.used_amount, budget.total_budget);
      return `
        <div class="card card-clickable" onclick="window.location.href='../pages/fa-list.html?bm=${bm.bm_id}'">
          <div class="card-body">
            <div class="d-flex align-center gap-sm mb-sm">
              <div class="avatar">${Utils.getInitials(user ? user.full_name : '??')}</div>
              <div>
                <h4 class="mb-0">${Utils.escapeHtml(user ? user.full_name : 'Unknown')}</h4>
                <span class="text-muted text-sm">${Utils.escapeHtml(bm.district_name)}</span>
              </div>
            </div>
            <div class="mt-sm">
              <div class="d-flex justify-between text-sm mb-xs">
                <span>FA Budget</span>
                <span class="${pct > 90 ? 'text-danger' : ''}">${pct}% used</span>
              </div>
              <div class="progress-bar progress-sm">
                <div class="progress-fill ${pct > 90 ? 'progress-danger' : pct > 70 ? 'progress-warning' : 'progress-primary'}" style="width: ${pct}%"></div>
              </div>
              <div class="text-sm text-muted mt-xs">${Utils.formatCurrency(budget.remaining_amount)} remaining</div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  renderMyRecentRecords(selector, records) {
    const el = document.querySelector(selector);
    if (!el) return;

    if (records.length === 0) {
      el.innerHTML = '<div class="empty-state-mini">No records encoded yet</div>';
      return;
    }

    el.innerHTML = records.map(r => {
      const name = r.type === 'FA' ? r.patient_name : r.client_name;
      const amount = r.type === 'FA' ? r.amount_approved : r.amount_provided;
      return `
        <div class="recent-record-item">
          <div class="record-icon record-icon-${r.type.toLowerCase()}">
            ${r.type === 'FA' ? '📋' : '📝'}
          </div>
          <div class="record-info">
            <div class="record-name">${Utils.escapeHtml(name || '—')}</div>
            <div class="record-meta">
              <span class="badge badge-sm ${r.type === 'FA' ? 'badge-primary' : 'badge-teal'}">${r.type}</span>
              ${Utils.formatRelativeTime(r.created_at)}
            </div>
          </div>
          <div class="record-amount">${Utils.formatCurrency(amount)}</div>
        </div>
      `;
    }).join('');
  }
};
