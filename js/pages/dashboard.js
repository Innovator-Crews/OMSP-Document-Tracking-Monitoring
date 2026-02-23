/* ==============================================
 * dashboard.js
 * PURPOSE: Dashboard page controller. Loads role-
 * specific statistics, recent records, quick
 * action buttons, and activity log.
 *
 * CONTAINS:
 *  - initDashboard()        → Main initializer
 *  - renderStatCards()       → Summary stat boxes
 *  - renderRecentFA()        → Last 5 FA records
 *  - renderRecentPA()        → Last 5 PA records
 *  - renderQuickActions()    → Role-specific action btns
 *  - renderActivityLog()     → Last 10 activity entries
 *
 * USED BY: dashboard.html
 * DEPENDS ON: auth.js, storage.js, utils.js,
 *   sidebar.js, header.js, banner.js, toast.js
 * ============================================== */

document.addEventListener('DOMContentLoaded', function () {
  initializeApp();
  checkAuth(); // Redirects to index.html if not logged in

  var session = getSession();
  renderSidebar(session);
  renderHeader(session, 'Dashboard', [{ label: 'Dashboard' }]);
  renderTermBanner(session);
  initDashboard(session);
});

/**
 * Main dashboard initializer.
 * Calls each section renderer with the current session.
 *
 * @param {Object} session - Current user session
 */
function initDashboard(session) {
  renderStatCards(session);
  renderRecentFA(session);
  renderRecentPA(session);
  renderQuickActions(session);
  renderActivityLog(session);
}

/* ── Stat Cards ─────────────────────────────── */

/**
 * Render the four summary stat cards at the top
 * of the dashboard. Data is filtered by role.
 *
 * @param {Object} session - Current user session
 */
function renderStatCards(session) {
  var container = document.getElementById('statCards');
  var beneficiaries = getFilteredBeneficiaries(session);
  var faRecords = getFilteredFA(session);
  var paRecords = getFilteredPA(session);

  // Calculate budget info for BMs
  var budgetHTML = '';
  if (session.role === 'board_member') {
    var bm = getCurrentBM();
    if (bm) {
      var yearMonth = getCurrentYearMonth();
      var log = getBudgetLog(bm.id, yearMonth);
      var remaining = log ? log.remaining_budget : DEFAULT_FA_BUDGET;
      var pct = getBudgetPercentage(remaining, DEFAULT_FA_BUDGET);
      var color = getBudgetColor(pct);
      budgetHTML = buildStatCard('Budget Remaining', formatCurrency(remaining), color, pct + '% used');
    }
  } else if (session.role === 'secretary') {
    budgetHTML = buildStatCard('Assigned BMs', session.assignedBMs ? session.assignedBMs.length : 0, 'var(--color-secondary)');
  } else {
    // Admin sees total BMs
    var bms = getBoardMembers();
    var activeBMs = bms.filter(function (b) { return b.status === 'active'; });
    budgetHTML = buildStatCard('Active Board Members', activeBMs.length, 'var(--color-secondary)');
  }

  container.innerHTML =
    buildStatCard('Total Beneficiaries', beneficiaries.length, 'var(--color-primary)') +
    buildStatCard('FA Records', faRecords.length, 'var(--color-accent)') +
    buildStatCard('PA Records', paRecords.length, 'var(--color-info)') +
    budgetHTML;
}

/**
 * Build a single stat card HTML string.
 *
 * @param {string} label     - Stat label
 * @param {string|number} value - Stat value
 * @param {string} color     - Accent color
 * @param {string} [sub]     - Optional subtitle
 * @returns {string} HTML string
 */
function buildStatCard(label, value, color, sub) {
  return '<div class="stat-card" style="border-left-color:' + color + '">' +
    '<div class="stat-card-value" style="color:' + color + '">' + value + '</div>' +
    '<div class="stat-card-label">' + label + '</div>' +
    (sub ? '<div class="stat-card-sub">' + sub + '</div>' : '') +
    '</div>';
}

/* ── Recent FA ──────────────────────────────── */

/**
 * Show the 5 most recent Financial Assistance
 * records in a simple list.
 *
 * @param {Object} session - Current user session
 */
function renderRecentFA(session) {
  var container = document.getElementById('recentFA');
  var records = getFilteredFA(session);

  // Sort by created_at descending
  records.sort(function (a, b) { return b.created_at.localeCompare(a.created_at); });
  var recent = records.slice(0, 5);

  if (recent.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No financial assistance records yet.</p></div>';
    return;
  }

  var html = '<div class="recent-list">';
  recent.forEach(function (fa) {
    var ben = storageFindById(STORAGE_KEYS.BENEFICIARIES, fa.beneficiary_id);
    var benName = ben ? ben.full_name : 'Unknown';
    var statusClass = fa.status === 'approved' ? 'badge-success' :
      fa.status === 'pending' ? 'badge-warning' :
        fa.status === 'released' ? 'badge-info' : 'badge-secondary';
    html += '<div class="recent-item">' +
      '<div class="recent-item-main">' +
      '<strong>' + escapeHtml(benName) + '</strong>' +
      '<span class="badge ' + statusClass + '">' + fa.status + '</span>' +
      '</div>' +
      '<div class="recent-item-sub">' +
      escapeHtml(fa.case_type) + ' · ' + formatCurrency(fa.amount) +
      ' · ' + formatDate(fa.created_at) +
      '</div></div>';
  });
  html += '</div>';
  container.innerHTML = html;
}

/* ── Recent PA ──────────────────────────────── */

/**
 * Show the 5 most recent Personal Assistance
 * records in a simple list.
 *
 * @param {Object} session - Current user session
 */
function renderRecentPA(session) {
  var container = document.getElementById('recentPA');
  var records = getFilteredPA(session);

  records.sort(function (a, b) { return b.created_at.localeCompare(a.created_at); });
  var recent = records.slice(0, 5);

  if (recent.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No personal assistance records yet.</p></div>';
    return;
  }

  var html = '<div class="recent-list">';
  recent.forEach(function (pa) {
    var ben = storageFindById(STORAGE_KEYS.BENEFICIARIES, pa.beneficiary_id);
    var benName = ben ? ben.full_name : 'Unknown';
    html += '<div class="recent-item">' +
      '<div class="recent-item-main">' +
      '<strong>' + escapeHtml(benName) + '</strong>' +
      '<span class="badge badge-secondary">' + escapeHtml(pa.category) + '</span>' +
      '</div>' +
      '<div class="recent-item-sub">' +
      escapeHtml(pa.action_taken) + ' · ' + formatDate(pa.created_at) +
      '</div></div>';
  });
  html += '</div>';
  container.innerHTML = html;
}

/* ── Quick Actions ──────────────────────────── */

/**
 * Render quick-action buttons based on user role.
 * Admin: manage users, categories, logs.
 * BM/Secretary: create FA, create PA.
 *
 * @param {Object} session - Current user session
 */
function renderQuickActions(session) {
  var container = document.querySelector('.quick-actions-grid');
  var html = '';
  var readOnly = isTermReadOnly(session);

  if (!readOnly) {
    html += '<a href="fa-create.html" class="btn btn-primary">+ New Financial Assistance</a>';
    html += '<a href="pa-create.html" class="btn btn-secondary">+ New Personal Assistance</a>';
  }

  html += '<a href="search.html" class="btn btn-ghost">🔍 Search Records</a>';

  if (session.role === 'admin') {
    html += '<a href="admin-users.html" class="btn btn-ghost">👥 Manage Users</a>';
    html += '<a href="categories.html" class="btn btn-ghost">📁 Manage Categories</a>';
    html += '<a href="admin-logs.html" class="btn btn-ghost">📋 Activity Logs</a>';
  }

  container.innerHTML = html;
}

/* ── Activity Log ───────────────────────────── */

/**
 * Show the 10 most recent activity log entries.
 *
 * @param {Object} session - Current user session
 */
function renderActivityLog(session) {
  var container = document.getElementById('activityLog');
  var logs = getActivityLogs();

  // Filter by role visibility
  if (session.role !== 'admin') {
    logs = logs.filter(function (log) {
      return log.user_id === session.userId;
    });
  }

  // Sort by timestamp descending
  logs.sort(function (a, b) { return b.timestamp.localeCompare(a.timestamp); });
  var recent = logs.slice(0, 10);

  if (recent.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No activity recorded yet.</p></div>';
    return;
  }

  var html = '<div class="activity-list">';
  recent.forEach(function (log) {
    html += '<div class="activity-item">' +
      '<div class="activity-item-action">' + escapeHtml(log.action) + '</div>' +
      '<div class="activity-item-meta">' +
      '<span>' + escapeHtml(log.performed_by || '') + '</span>' +
      '<span>' + formatDateTime(log.timestamp) + '</span>' +
      '</div></div>';
  });
  html += '</div>';
  container.innerHTML = html;
}

/* ── Data Helpers (role-filtered) ───────────── */

/**
 * Get beneficiaries filtered by current user role.
 * Admin: all. BM: own. Secretary: assigned BMs'.
 *
 * @param {Object} session
 * @returns {Array} Filtered beneficiaries
 */
function getFilteredBeneficiaries(session) {
  var all = getBeneficiaries();
  if (session.role === 'admin') return all;

  var bmIds = [];
  if (session.role === 'board_member') {
    bmIds = [session.bmId];
  } else if (session.role === 'secretary') {
    bmIds = session.assignedBMs || [];
  }

  return all.filter(function (b) {
    return bmIds.indexOf(b.board_member_id) !== -1;
  });
}

/**
 * Get FA records filtered by current user role.
 *
 * @param {Object} session
 * @returns {Array} Filtered FA records
 */
function getFilteredFA(session) {
  var all = getFinancialAssistance();
  if (session.role === 'admin') return all;

  var bmIds = [];
  if (session.role === 'board_member') {
    bmIds = [session.bmId];
  } else if (session.role === 'secretary') {
    bmIds = session.assignedBMs || [];
  }

  return all.filter(function (fa) {
    return bmIds.indexOf(fa.board_member_id) !== -1;
  });
}

/**
 * Get PA records filtered by current user role.
 *
 * @param {Object} session
 * @returns {Array} Filtered PA records
 */
function getFilteredPA(session) {
  var all = getPersonalAssistance();
  if (session.role === 'admin') return all;

  var bmIds = [];
  if (session.role === 'board_member') {
    bmIds = [session.bmId];
  } else if (session.role === 'secretary') {
    bmIds = session.assignedBMs || [];
  }

  return all.filter(function (pa) {
    return bmIds.indexOf(pa.board_member_id) !== -1;
  });
}
