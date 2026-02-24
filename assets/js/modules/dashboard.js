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

    const container = document.getElementById('dashboard-content');
    if (!container) return;

    switch (user.role) {
      case 'sysadmin':
        this.renderAdminDashboard(container, user);
        break;
      case 'board_member':
        this.renderBMDashboard(container, user);
        break;
      case 'secretary':
        this.renderStaffDashboard(container, user);
        break;
    }
  },

  /* --------------------------------------------------------
   * SYSADMIN DASHBOARD
   * -------------------------------------------------------- */
  renderAdminDashboard(container, user) {
    const users = Storage.getAll(KEYS.USERS);
    const bms = Storage.getAll(KEYS.BOARD_MEMBERS).filter(b => !b.is_archived);
    const faRecords = Storage.getAll(KEYS.FA_RECORDS).filter(r => !r.is_archived);
    const paRecords = Storage.getAll(KEYS.PA_RECORDS).filter(r => !r.is_archived);
    const pendingArchives = bms.filter(b => b.archive_status === 'pending');
    const todayLogs = ActivityLogger.getToday ? ActivityLogger.getToday() : [];

    const budgets = Storage.getAll(KEYS.MONTHLY_BUDGETS)
      .filter(b => b.year_month === Utils.getCurrentYearMonth());
    const totalUsed = budgets.reduce((sum, b) => sum + b.used_amount, 0);

    container.innerHTML = `
      <div class="mb-lg">
        <h2 class="mb-xs">Welcome back, <span id="welcome-name">${Utils.escapeHtml(user.full_name)}</span></h2>
        <p class="text-muted">System Administrator Dashboard</p>
      </div>

      <div class="grid-3-col gap-md mb-lg">
        <div class="stat-card stat-card-blue">
          <div class="stat-icon stat-icon-blue">${Icons.render('users', 22)}</div>
          <div class="stat-label">Board Members</div>
          <div class="stat-value">${bms.length}</div>
        </div>
        <div class="stat-card stat-card-teal">
          <div class="stat-icon stat-icon-teal">${Icons.render('user', 22)}</div>
          <div class="stat-label">Active Users</div>
          <div class="stat-value">${users.filter(u => u.is_active).length}</div>
        </div>
        <div class="stat-card stat-card-amber">
          <div class="stat-icon stat-icon-amber">${Icons.render('wallet', 22)}</div>
          <div class="stat-label">Total Disbursed</div>
          <div class="stat-value">${Utils.formatCurrency(totalUsed)}</div>
        </div>
      </div>

      <div class="grid-3-col gap-md mb-lg">
        <div class="stat-card stat-card-blue">
          <div class="stat-icon stat-icon-blue">${Icons.render('file-text', 22)}</div>
          <div class="stat-label">FA Records</div>
          <div class="stat-value">${faRecords.length}</div>
        </div>
        <div class="stat-card stat-card-teal">
          <div class="stat-icon stat-icon-teal">${Icons.render('clipboard-list', 22)}</div>
          <div class="stat-label">PA Records</div>
          <div class="stat-value">${paRecords.length}</div>
        </div>
        <div class="stat-card stat-card-amber">
          <div class="stat-icon stat-icon-amber">${Icons.render('archive', 22)}</div>
          <div class="stat-label">Pending Archives</div>
          <div class="stat-value">${pendingArchives.length}</div>
        </div>
      </div>

      <div class="grid-2-col gap-md mb-lg">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Recent Activity</h3>
            <a href="activity-logs.html" class="section-link">View All →</a>
          </div>
          <div id="recent-activity"></div>
        </div>
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Pending Archive Requests</h3>
          </div>
          <div id="pending-archives-list"></div>
        </div>
      </div>

      <div class="grid-2-col gap-md">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Recent FA Records</h3>
            <a href="fa-list.html" class="section-link">View All →</a>
          </div>
          <div id="recent-fa-list" class="recent-records"></div>
        </div>
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">BM Budget Overview</h3>
            <a href="budget.html" class="section-link">Full Report →</a>
          </div>
          <div id="budget-overview"></div>
        </div>
      </div>
    `;

    // Populate dynamic sections
    ActivityLogger.renderList('#recent-activity', { limit: 10 });
    this.renderPendingArchives('#pending-archives-list', pendingArchives);
    this.renderRecentRecords('#recent-fa-list', faRecords.slice(-5).reverse(), 'fa');
    this.renderBudgetOverview('#budget-overview');
  },

  /* --------------------------------------------------------
   * BOARD MEMBER DASHBOARD
   * -------------------------------------------------------- */
  renderBMDashboard(container, user) {
    const bm = Auth.getCurrentBMData();
    if (!bm) {
      container.innerHTML = '<p class="text-muted">Board member data not found.</p>';
      return;
    }

    const budget = Storage.getCurrentBudget(bm.bm_id);
    const faRecords = Storage.query(KEYS.FA_RECORDS, { bm_id: bm.bm_id });
    const paRecords = Storage.query(KEYS.PA_RECORDS, { bm_id: bm.bm_id });
    const pct = Utils.percentage(budget.used_amount, budget.total_budget);
    const daysLeft = Utils.daysUntil(bm.term_end);
    const termText = daysLeft > 0 ? daysLeft + ' days remaining' : 'Term ended';

    container.innerHTML = `
      <div class="mb-lg flex justify-between items-start">
        <div>
          <h2 class="mb-xs">Welcome back, ${Utils.escapeHtml(user.full_name)}</h2>
          <p class="text-muted">${Utils.escapeHtml(bm.district_name)} · Term ${bm.current_term_number} · ${termText}</p>
        </div>
        <span class="badge badge-warning" style="flex-shrink:0;margin-top:4px;">Read Only</span>
      </div>

      <div class="grid-3-col gap-md mb-lg">
        <div class="stat-card stat-card-blue">
          <div class="stat-icon stat-icon-blue">${Icons.render('wallet', 22)}</div>
          <div class="stat-label">FA Budget Remaining</div>
          <div class="stat-value">${Utils.formatCurrency(budget.remaining_amount)}</div>
          <div class="stat-subtext">Used: ${Utils.formatCurrency(budget.used_amount)}</div>
        </div>
        <div class="stat-card stat-card-teal">
          <div class="stat-icon stat-icon-teal">${Icons.render('file-text', 22)}</div>
          <div class="stat-label">FA Records</div>
          <div class="stat-value">${faRecords.length}</div>
        </div>
        <div class="stat-card stat-card-amber">
          <div class="stat-icon stat-icon-amber">${Icons.render('clipboard-list', 22)}</div>
          <div class="stat-label">PA Records</div>
          <div class="stat-value">${paRecords.length}</div>
        </div>
      </div>

      <div class="card mb-lg">
        <div class="card-header">
          <h3 class="card-title">FA Budget Usage</h3>
          <span class="badge ${pct > 90 ? 'badge-danger' : pct > 70 ? 'badge-warning' : 'badge-success'}">${pct}% used</span>
        </div>
        <div class="progress-bar mb-xs">
          <div class="progress-fill ${pct > 90 ? 'progress-fill-red' : pct > 70 ? 'progress-fill-yellow' : 'progress-fill-blue'}" style="width:${pct}%"></div>
        </div>
        <div class="d-flex justify-between text-sm text-muted">
          <span>Used: ${Utils.formatCurrency(budget.used_amount)}</span>
          <span>Remaining: ${Utils.formatCurrency(budget.remaining_amount)}</span>
        </div>
      </div>

      <div class="grid-2-col gap-md mb-lg">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Recent FA Records</h3>
            <a href="fa-list.html" class="section-link">View All →</a>
          </div>
          <div id="recent-fa-list" class="recent-records"></div>
        </div>
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Recent PA Records</h3>
            <a href="pa-list.html" class="section-link">View All →</a>
          </div>
          <div id="recent-pa-list" class="recent-records"></div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">My Staff</h3>
        </div>
        <div id="my-staff-list"></div>
      </div>
    `;

    // Populate dynamic sections
    this.renderRecentRecords('#recent-fa-list', faRecords.slice(-5).reverse(), 'fa');
    this.renderRecentRecords('#recent-pa-list', paRecords.slice(-5).reverse(), 'pa');
    this.renderMyStaff('#my-staff-list', bm.bm_id);
  },

  /* --------------------------------------------------------
   * SECRETARY DASHBOARD
   * -------------------------------------------------------- */
  renderStaffDashboard(container, user) {
    const assignedBMs = Auth.getAssignedBMs();
    const myFA = Storage.getAll(KEYS.FA_RECORDS).filter(r => r.encoded_by === user.user_id && !r.is_archived);
    const myPA = Storage.getAll(KEYS.PA_RECORDS).filter(r => r.encoded_by === user.user_id && !r.is_archived);
    const today = new Date().toISOString().split('T')[0];
    const todayRecords = [...myFA, ...myPA].filter(r => r.created_at.startsWith(today));

    container.innerHTML = `
      <div class="mb-lg">
        <h2 class="mb-xs">Welcome back, ${Utils.escapeHtml(user.full_name)}</h2>
        <p class="text-muted">Secretary &mdash; managing records for <strong>${assignedBMs.length} assigned board member${assignedBMs.length !== 1 ? 's' : ''}</strong></p>
      </div>

      <div class="grid-4-col gap-md mb-lg">
        <div class="stat-card stat-card-blue">
          <div class="stat-icon stat-icon-blue">${Icons.render('users', 22)}</div>
          <div class="stat-label">Assigned BMs</div>
          <div class="stat-value">${assignedBMs.length}</div>
        </div>
        <div class="stat-card stat-card-teal">
          <div class="stat-icon stat-icon-teal">${Icons.render('file-text', 22)}</div>
          <div class="stat-label">My FA Records</div>
          <div class="stat-value">${myFA.length}</div>
        </div>
        <div class="stat-card stat-card-amber">
          <div class="stat-icon stat-icon-amber">${Icons.render('clipboard-list', 22)}</div>
          <div class="stat-label">My PA Records</div>
          <div class="stat-value">${myPA.length}</div>
        </div>
        <div class="stat-card stat-card-green">
          <div class="stat-icon stat-icon-green">${Icons.render('calendar', 22)}</div>
          <div class="stat-label">Today's Records</div>
          <div class="stat-value">${todayRecords.length}</div>
        </div>
      </div>

      <div class="card mb-lg">
        <div class="card-header">
          <h3 class="card-title">Assigned Board Members</h3>
        </div>
        <div id="assigned-bms-list" class="grid-2-col gap-md"></div>
      </div>

      <div class="grid-2-col gap-md">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">My Recent Records</h3>
          </div>
          <div id="my-recent-records" class="recent-records"></div>
        </div>
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Activity Feed</h3>
            <a href="activity-logs.html" class="section-link">View All →</a>
          </div>
          <div id="recent-activity"></div>
        </div>
      </div>
    `;

    // Populate dynamic sections
    this.renderAssignedBMCards('#assigned-bms-list', assignedBMs);
    const allMyRecords = [...myFA.map(r => ({ ...r, type: 'FA' })), ...myPA.map(r => ({ ...r, type: 'PA' }))]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 8);
    this.renderMyRecentRecords('#my-recent-records', allMyRecords);
    ActivityLogger.renderList('#recent-activity', { user_id: user.user_id, limit: 10 });
  },

  /* --------------------------------------------------------
   * RENDER HELPERS
   * -------------------------------------------------------- */

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
            ${type === 'fa' ? Icons.render('file-text', 18) : Icons.render('clipboard-list', 18)}
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
          <a href="term-management.html" class="btn btn-sm btn-warning">Review</a>
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
            ${r.type === 'FA' ? Icons.render('file-text', 18) : Icons.render('clipboard-list', 18)}
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
