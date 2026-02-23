/* ==============================================
 * search.js
 * PURPOSE: Global search page controller. Searches
 * across beneficiaries, FA records, and PA records.
 * Results are grouped by entity type and displayed
 * in expandable sections.
 *
 * CONTAINS:
 *  - initSearch()            → Main initializer
 *  - performSearch()         → Execute search query
 *  - searchBeneficiaries(q)  → Search beneficiary data
 *  - searchFA(q)             → Search FA records
 *  - searchPA(q)             → Search PA records
 *  - renderResults(results)  → Display search results
 *
 * USED BY: search.html
 * DEPENDS ON: auth.js, storage.js, utils.js,
 *   sidebar.js, header.js, toast.js
 * ============================================== */

/** Debounced search to avoid excessive calls */
var debouncedSearch = debounce(performSearchInternal, 300);

document.addEventListener('DOMContentLoaded', function () {
  initializeApp();
  checkAuth();

  var session = getSession();
  renderSidebar(session);
  renderHeader(session, 'Search', [
    { label: 'Dashboard', href: 'dashboard.html' },
    { label: 'Search' }
  ]);
  renderTermBanner(session);
  initSearch();
});

/**
 * Initialize search page. Checks for ?q= query param.
 */
function initSearch() {
  var params = new URLSearchParams(window.location.search);
  var q = params.get('q');
  if (q) {
    document.getElementById('searchInput').value = q;
    performSearchInternal();
  }
}

/**
 * Called on every input keystroke (debounced).
 */
function performSearch() {
  debouncedSearch();
}

/**
 * Execute the actual search across all entity types.
 * Filters results by the current user's role.
 */
function performSearchInternal() {
  var query = document.getElementById('searchInput').value.trim().toLowerCase();
  var container = document.getElementById('searchResults');

  if (query.length < 2) {
    container.innerHTML = '<div class="empty-state"><p>Enter at least 2 characters to search.</p></div>';
    return;
  }

  var session = getSession();
  var benResults = searchBeneficiaries(query, session);
  var faResults = searchFA(query, session);
  var paResults = searchPA(query, session);

  var totalCount = benResults.length + faResults.length + paResults.length;

  if (totalCount === 0) {
    container.innerHTML = '<div class="empty-state"><p>No results found for "' + escapeHtml(query) + '".</p></div>';
    return;
  }

  var html = '<p class="search-summary">' + totalCount + ' result(s) found</p>';

  // Beneficiaries section
  if (benResults.length > 0) {
    html += '<div class="card" style="margin-bottom: var(--space-md);">' +
      '<div class="card-header"><h3>Beneficiaries (' + benResults.length + ')</h3></div>' +
      '<div class="card-body"><div class="recent-list">';
    benResults.forEach(function (b) {
      html += '<div class="recent-item">' +
        '<div class="recent-item-main">' +
        '<strong>' + escapeHtml(b.full_name) + '</strong>' +
        '<span class="badge badge-secondary">' + escapeHtml(b.municipality) + '</span>' +
        '</div>' +
        '<div class="recent-item-sub">' +
        'ID: ' + b.id + (b.barangay ? ' · Brgy. ' + escapeHtml(b.barangay) : '') +
        (b.contact_number ? ' · ' + escapeHtml(b.contact_number) : '') +
        '</div></div>';
    });
    html += '</div></div></div>';
  }

  // FA section
  if (faResults.length > 0) {
    html += '<div class="card" style="margin-bottom: var(--space-md);">' +
      '<div class="card-header"><h3>Financial Assistance (' + faResults.length + ')</h3></div>' +
      '<div class="card-body"><div class="recent-list">';
    faResults.forEach(function (fa) {
      var ben = storageFindById(STORAGE_KEYS.BENEFICIARIES, fa.beneficiary_id);
      var benName = ben ? ben.full_name : 'Unknown';
      var statusClass = fa.status === 'approved' ? 'badge-success' :
        fa.status === 'pending' ? 'badge-warning' : 'badge-secondary';
      html += '<div class="recent-item">' +
        '<div class="recent-item-main">' +
        '<strong>' + escapeHtml(benName) + '</strong>' +
        '<span class="badge ' + statusClass + '">' + fa.status + '</span>' +
        '</div>' +
        '<div class="recent-item-sub">' +
        escapeHtml(fa.case_type) + ' · ' + formatCurrency(fa.amount) +
        ' · ' + formatDate(fa.created_at) +
        ' <a href="fa-list.html">View in list →</a>' +
        '</div></div>';
    });
    html += '</div></div></div>';
  }

  // PA section
  if (paResults.length > 0) {
    html += '<div class="card" style="margin-bottom: var(--space-md);">' +
      '<div class="card-header"><h3>Personal Assistance (' + paResults.length + ')</h3></div>' +
      '<div class="card-body"><div class="recent-list">';
    paResults.forEach(function (pa) {
      var ben = storageFindById(STORAGE_KEYS.BENEFICIARIES, pa.beneficiary_id);
      var benName = ben ? ben.full_name : 'Unknown';
      html += '<div class="recent-item">' +
        '<div class="recent-item-main">' +
        '<strong>' + escapeHtml(benName) + '</strong>' +
        '<span class="badge badge-secondary">' + escapeHtml(pa.category) + '</span>' +
        '</div>' +
        '<div class="recent-item-sub">' +
        escapeHtml(pa.action_taken) + ' · ' + formatDate(pa.created_at) +
        ' <a href="pa-list.html">View in list →</a>' +
        '</div></div>';
    });
    html += '</div></div></div>';
  }

  container.innerHTML = html;
}

/**
 * Search beneficiaries by name, municipality, barangay.
 *
 * @param {string} q       - Lowercase search query
 * @param {Object} session - Current user session
 * @returns {Array} Matching beneficiaries
 */
function searchBeneficiaries(q, session) {
  var all = getBeneficiaries();

  // Role filter
  if (session.role !== 'admin') {
    var bmIds = [];
    if (session.role === 'board_member') bmIds = [session.bmId];
    else if (session.role === 'secretary') bmIds = session.assignedBMs || [];

    all = all.filter(function (b) {
      return bmIds.indexOf(b.board_member_id) !== -1;
    });
  }

  return all.filter(function (b) {
    return b.full_name.toLowerCase().indexOf(q) !== -1 ||
      b.municipality.toLowerCase().indexOf(q) !== -1 ||
      (b.barangay && b.barangay.toLowerCase().indexOf(q) !== -1) ||
      b.id.toLowerCase().indexOf(q) !== -1;
  });
}

/**
 * Search FA records by beneficiary name, case type, ID.
 *
 * @param {string} q
 * @param {Object} session
 * @returns {Array} Matching FA records
 */
function searchFA(q, session) {
  var all = getFinancialAssistance();

  if (session.role !== 'admin') {
    var bmIds = [];
    if (session.role === 'board_member') bmIds = [session.bmId];
    else if (session.role === 'secretary') bmIds = session.assignedBMs || [];

    all = all.filter(function (fa) {
      return bmIds.indexOf(fa.board_member_id) !== -1;
    });
  }

  return all.filter(function (fa) {
    var ben = storageFindById(STORAGE_KEYS.BENEFICIARIES, fa.beneficiary_id);
    var benName = ben ? ben.full_name.toLowerCase() : '';
    return benName.indexOf(q) !== -1 ||
      fa.case_type.toLowerCase().indexOf(q) !== -1 ||
      fa.id.toLowerCase().indexOf(q) !== -1 ||
      fa.status.toLowerCase().indexOf(q) !== -1;
  });
}

/**
 * Search PA records by beneficiary name, category, action.
 *
 * @param {string} q
 * @param {Object} session
 * @returns {Array} Matching PA records
 */
function searchPA(q, session) {
  var all = getPersonalAssistance();

  if (session.role !== 'admin') {
    var bmIds = [];
    if (session.role === 'board_member') bmIds = [session.bmId];
    else if (session.role === 'secretary') bmIds = session.assignedBMs || [];

    all = all.filter(function (pa) {
      return bmIds.indexOf(pa.board_member_id) !== -1;
    });
  }

  return all.filter(function (pa) {
    var ben = storageFindById(STORAGE_KEYS.BENEFICIARIES, pa.beneficiary_id);
    var benName = ben ? ben.full_name.toLowerCase() : '';
    return benName.indexOf(q) !== -1 ||
      pa.category.toLowerCase().indexOf(q) !== -1 ||
      pa.action_taken.toLowerCase().indexOf(q) !== -1 ||
      pa.id.toLowerCase().indexOf(q) !== -1;
  });
}
