/* ==============================================
 * admin-logs.js
 * PURPOSE: Activity logs page controller. Admin-
 * only page that displays a filterable, paginated
 * table of all system activity logs.
 *
 * CONTAINS:
 *  - initAdminLogs()      → Main initializer
 *  - populateLogFilters() → Fill user dropdown
 *  - applyLogFilters()    → Filter + re-render
 *  - renderLogsTable(data)→ Build data table
 *  - clearLogs()          → Clear all logs
 *
 * USED BY: admin-logs.html
 * DEPENDS ON: auth.js, storage.js, utils.js,
 *   table.js, modal.js, toast.js, sidebar.js,
 *   header.js
 * ============================================== */

document.addEventListener('DOMContentLoaded', function () {
  initializeApp();
  checkAuth();

  var session = getSession();

  if (session.role !== 'admin') {
    showToast('Access denied. Admin only.', 'error');
    setTimeout(function () { window.location.href = 'dashboard.html'; }, 1000);
    return;
  }

  renderSidebar(session);
  renderHeader(session, 'Activity Logs', [
    { label: 'Dashboard', href: 'dashboard.html' },
    { label: 'Activity Logs' }
  ]);
  renderTermBanner(session);
  initAdminLogs();
});

/**
 * Initialize the logs page.
 */
function initAdminLogs() {
  populateLogFilters();
  applyLogFilters();
}

/**
 * Populate the user filter dropdown with all users.
 */
function populateLogFilters() {
  var select = document.getElementById('filterUser');
  var users = getUsers();

  users.forEach(function (u) {
    var opt = document.createElement('option');
    opt.value = u.id;
    opt.textContent = u.full_name + ' (' + u.role + ')';
    select.appendChild(opt);
  });
}

/**
 * Apply filters and re-render the logs table.
 */
function applyLogFilters() {
  var all = getActivityLogs();

  var userId = document.getElementById('filterUser').value;
  var entityType = document.getElementById('filterEntityType').value;
  var search = document.getElementById('filterLogSearch').value.toLowerCase();

  if (userId) {
    all = all.filter(function (log) { return log.user_id === userId; });
  }

  if (entityType) {
    all = all.filter(function (log) { return log.entity_type === entityType; });
  }

  if (search) {
    all = all.filter(function (log) {
      return (log.action && log.action.toLowerCase().indexOf(search) !== -1) ||
        (log.performed_by && log.performed_by.toLowerCase().indexOf(search) !== -1) ||
        (log.entity_id && log.entity_id.toLowerCase().indexOf(search) !== -1);
    });
  }

  // Sort by timestamp descending (newest first)
  all.sort(function (a, b) { return b.timestamp.localeCompare(a.timestamp); });

  renderLogsTable(all);
}

/**
 * Render the activity logs data table.
 *
 * @param {Array} data - Filtered activity logs
 */
function renderLogsTable(data) {
  var columns = [
    {
      key: 'timestamp', label: 'Time',
      render: function (row) { return formatDateTime(row.timestamp); }
    },
    {
      key: 'performed_by', label: 'User',
      render: function (row) { return escapeHtml(row.performed_by || 'System'); }
    },
    {
      key: 'action', label: 'Action',
      render: function (row) { return escapeHtml(row.action); }
    },
    {
      key: 'entity_type', label: 'Entity',
      render: function (row) {
        var label = (row.entity_type || '').replace(/_/g, ' ');
        return '<span class="badge badge-secondary">' + label + '</span>';
      }
    },
    {
      key: 'entity_id', label: 'Entity ID',
      render: function (row) {
        return row.entity_id ? '<code>' + escapeHtml(truncate(row.entity_id, 20)) + '</code>' : '—';
      }
    }
  ];

  renderTable('logsTableContainer', {
    columns: columns,
    data: data,
    pageSize: 15,
    emptyMessage: 'No activity logs recorded yet.'
  });
}

/**
 * Clear all activity logs after confirmation.
 */
function clearLogs() {
  showConfirm(
    'Are you sure you want to clear ALL activity logs? This cannot be undone.',
    function () {
      storageSave(STORAGE_KEYS.ACTIVITY_LOGS, []);
      showToast('All activity logs cleared.', 'success');
      applyLogFilters();
    }
  );
}
