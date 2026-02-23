/* ==============================================
 * admin-archives.js
 * PURPOSE: Archives page controller. Displays
 * archived/end-of-term Board Member data in a
 * read-only view. Shows their beneficiaries,
 * FA/PA record summaries, and budget history.
 *
 * CONTAINS:
 *  - initArchives()         → Main initializer
 *  - renderArchivesList()   → List archived BMs
 *  - viewArchivedBM(bmId)   → Show detailed archive
 *
 * USED BY: admin-archives.html
 * DEPENDS ON: auth.js, storage.js, utils.js,
 *   modal.js, toast.js, sidebar.js, header.js
 * ============================================== */

document.addEventListener('DOMContentLoaded', function () {
  initializeApp();
  checkAuth();

  var session = getSession();

  // Admin-only page
  if (session.role !== 'admin') {
    showToast('Access denied. Admin only.', 'error');
    setTimeout(function () { window.location.href = 'dashboard.html'; }, 1000);
    return;
  }

  renderSidebar(session);
  renderHeader(session, 'Archives', [
    { label: 'Dashboard', href: 'dashboard.html' },
    { label: 'Archives' }
  ]);
  renderTermBanner(session);
  initArchives();
});

/**
 * Initialize the archives page.
 */
function initArchives() {
  renderArchivesList();
}

/**
 * Render the list of archived or term-ended BMs.
 * A BM is considered "archived" if archived === true
 * or if their term_end date has passed.
 */
function renderArchivesList() {
  var container = document.getElementById('archivesList');
  var bms = getBoardMembers();

  // Filter for archived or term-ended BMs
  var archivedBMs = bms.filter(function (bm) {
    if (bm.archived) return true;
    if (bm.term_end) {
      var today = new Date();
      var termEnd = new Date(bm.term_end);
      return termEnd < today;
    }
    return false;
  });

  if (archivedBMs.length === 0) {
    container.innerHTML = '<div class="empty-state">' +
      '<h3>No Archives</h3>' +
      '<p>No archived board member data yet. Archives appear when a BM\'s term ends or is manually archived.</p>' +
      '</div>';
    return;
  }

  var html = '';
  archivedBMs.forEach(function (bm) {
    var user = storageFindById(STORAGE_KEYS.USERS, bm.user_id);
    var userName = user ? user.full_name : 'Unknown';

    // Count records
    var faRecords = getFinancialAssistance().filter(function (fa) { return fa.board_member_id === bm.id; });
    var paRecords = getPersonalAssistance().filter(function (pa) { return pa.board_member_id === bm.id; });
    var beneficiaries = getBeneficiaries().filter(function (b) { return b.board_member_id === bm.id; });

    // Calculate total FA amount
    var totalFA = faRecords.reduce(function (sum, fa) { return sum + (fa.amount || 0); }, 0);

    html += '<div class="card" style="margin-bottom: var(--space-md);">' +
      '<div class="card-header">' +
      '<h3>' + escapeHtml(userName) + ' — ' + escapeHtml(bm.district || 'N/A') + '</h3>' +
      '<span class="badge badge-secondary">Archived</span>' +
      '</div>' +
      '<div class="card-body">' +
      '<div class="stat-cards-row" style="margin-bottom: var(--space-md);">' +
      '<div class="stat-card"><div class="stat-card-value">' + beneficiaries.length + '</div><div class="stat-card-label">Beneficiaries</div></div>' +
      '<div class="stat-card"><div class="stat-card-value">' + faRecords.length + '</div><div class="stat-card-label">FA Records</div></div>' +
      '<div class="stat-card"><div class="stat-card-value">' + paRecords.length + '</div><div class="stat-card-label">PA Records</div></div>' +
      '<div class="stat-card"><div class="stat-card-value">' + formatCurrency(totalFA) + '</div><div class="stat-card-label">Total FA Spent</div></div>' +
      '</div>' +
      '<div class="form-row">' +
      '<div><strong>Term:</strong> ' + (bm.term_start ? formatDate(bm.term_start) : 'N/A') +
      ' → ' + (bm.term_end ? formatDate(bm.term_end) : 'N/A') + '</div>' +
      '</div>' +
      '<div class="form-actions" style="margin-top: var(--space-sm);">' +
      '<button class="btn btn-ghost btn-sm" onclick="viewArchivedBM(\'' + bm.id + '\')">View Details</button>' +
      '</div></div></div>';
  });

  container.innerHTML = html;
}

/**
 * Show a detailed modal view of an archived BM's
 * data including beneficiaries, FA, and PA lists.
 *
 * @param {string} bmId - Board Member ID
 */
function viewArchivedBM(bmId) {
  var bm = storageFindById(STORAGE_KEYS.BOARD_MEMBERS, bmId);
  if (!bm) return;

  var user = storageFindById(STORAGE_KEYS.USERS, bm.user_id);
  var userName = user ? user.full_name : 'Unknown';

  var faRecords = getFinancialAssistance().filter(function (fa) { return fa.board_member_id === bmId; });
  var paRecords = getPersonalAssistance().filter(function (pa) { return pa.board_member_id === bmId; });
  var beneficiaries = getBeneficiaries().filter(function (b) { return b.board_member_id === bmId; });

  var body = '<h4>Beneficiaries (' + beneficiaries.length + ')</h4>';
  if (beneficiaries.length > 0) {
    body += '<table class="detail-table"><tr><th>Name</th><th>Municipality</th></tr>';
    beneficiaries.slice(0, 20).forEach(function (b) {
      body += '<tr><td>' + escapeHtml(b.full_name) + '</td><td>' + escapeHtml(b.municipality) + '</td></tr>';
    });
    if (beneficiaries.length > 20) body += '<tr><td colspan="2"><em>...and ' + (beneficiaries.length - 20) + ' more</em></td></tr>';
    body += '</table>';
  } else {
    body += '<p><em>No beneficiaries.</em></p>';
  }

  body += '<h4 style="margin-top:var(--space-md);">Financial Assistance (' + faRecords.length + ')</h4>';
  if (faRecords.length > 0) {
    body += '<table class="detail-table"><tr><th>Beneficiary</th><th>Type</th><th>Amount</th><th>Status</th></tr>';
    faRecords.slice(0, 20).forEach(function (fa) {
      var ben = storageFindById(STORAGE_KEYS.BENEFICIARIES, fa.beneficiary_id);
      body += '<tr><td>' + escapeHtml(ben ? ben.full_name : 'Unknown') + '</td>' +
        '<td>' + escapeHtml(fa.case_type) + '</td>' +
        '<td>' + formatCurrency(fa.amount) + '</td>' +
        '<td>' + fa.status + '</td></tr>';
    });
    body += '</table>';
  } else {
    body += '<p><em>No FA records.</em></p>';
  }

  body += '<h4 style="margin-top:var(--space-md);">Personal Assistance (' + paRecords.length + ')</h4>';
  if (paRecords.length > 0) {
    body += '<table class="detail-table"><tr><th>Beneficiary</th><th>Category</th><th>Action</th></tr>';
    paRecords.slice(0, 20).forEach(function (pa) {
      var ben = storageFindById(STORAGE_KEYS.BENEFICIARIES, pa.beneficiary_id);
      body += '<tr><td>' + escapeHtml(ben ? ben.full_name : 'Unknown') + '</td>' +
        '<td>' + escapeHtml(pa.category) + '</td>' +
        '<td>' + escapeHtml(pa.action_taken) + '</td></tr>';
    });
    body += '</table>';
  } else {
    body += '<p><em>No PA records.</em></p>';
  }

  showModal({
    title: 'Archive: ' + userName,
    body: body,
    size: 'large',
    buttons: [{ label: 'Close', className: 'btn btn-ghost', onClick: closeModal }]
  });
}
