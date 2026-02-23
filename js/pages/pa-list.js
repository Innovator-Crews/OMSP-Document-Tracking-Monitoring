/* ==============================================
 * pa-list.js
 * PURPOSE: Personal Assistance list page controller.
 * Loads PA records, populates filter dropdowns,
 * renders a sortable data table, and handles
 * record viewing and editing.
 *
 * CONTAINS:
 *  - initPAList()           → Main initializer
 *  - populatePAFilters()    → Fill dropdown options
 *  - applyPAFilters()       → Filter + re-render table
 *  - renderPATable(data)    → Build data table
 *  - viewPA(id)             → Show PA detail modal
 *  - editPA(id)             → Navigate to edit form
 *
 * USED BY: pa-list.html
 * DEPENDS ON: auth.js, storage.js, utils.js,
 *   table.js, modal.js, toast.js, sidebar.js,
 *   header.js, banner.js
 * ============================================== */

document.addEventListener('DOMContentLoaded', function () {
  initializeApp();
  checkAuth();

  var session = getSession();
  renderSidebar(session);
  renderHeader(session, 'Personal Assistance', [
    { label: 'Dashboard', href: 'dashboard.html' },
    { label: 'Personal Assistance' }
  ]);
  renderTermBanner(session);
  initPAList(session);
});

/**
 * Main initializer for the PA list page.
 * Hides create button if term is read-only.
 *
 * @param {Object} session - Current user session
 */
function initPAList(session) {
  if (isTermReadOnly(session)) {
    var btn = document.getElementById('createBtn');
    if (btn) btn.style.display = 'none';
  }

  populatePAFilters();
  applyPAFilters();
}

/**
 * Populate the filter dropdowns with data from
 * storage and constants.
 */
function populatePAFilters() {
  // Category dropdown
  var catSelect = document.getElementById('filterCategory');
  var cats = getPACategories();
  cats.forEach(function (c) {
    var opt = document.createElement('option');
    opt.value = c.name;
    opt.textContent = c.name;
    catSelect.appendChild(opt);
  });

  // Action taken dropdown
  var actSelect = document.getElementById('filterAction');
  PA_ACTIONS.forEach(function (a) {
    var opt = document.createElement('option');
    opt.value = a;
    opt.textContent = a;
    actSelect.appendChild(opt);
  });

  // Municipality dropdown
  var munSelect = document.getElementById('filterMunicipality');
  MUNICIPALITIES.forEach(function (mun) {
    var opt = document.createElement('option');
    opt.value = mun;
    opt.textContent = mun;
    munSelect.appendChild(opt);
  });
}

/**
 * Apply all active filters and re-render the table.
 */
function applyPAFilters() {
  var session = getSession();
  var all = getPersonalAssistance();

  // Role-based filtering
  if (session.role !== 'admin') {
    var bmIds = [];
    if (session.role === 'board_member') {
      bmIds = [session.bmId];
    } else if (session.role === 'secretary') {
      bmIds = session.assignedBMs || [];
    }
    all = all.filter(function (pa) {
      return bmIds.indexOf(pa.board_member_id) !== -1;
    });
  }

  // Apply UI filters
  var category = document.getElementById('filterCategory').value;
  var action = document.getElementById('filterAction').value;
  var municipality = document.getElementById('filterMunicipality').value;
  var search = document.getElementById('filterSearch').value.toLowerCase();

  if (category) {
    all = all.filter(function (pa) { return pa.category === category; });
  }

  if (action) {
    all = all.filter(function (pa) { return pa.action_taken === action; });
  }

  if (municipality) {
    all = all.filter(function (pa) {
      var ben = storageFindById(STORAGE_KEYS.BENEFICIARIES, pa.beneficiary_id);
      return ben && ben.municipality === municipality;
    });
  }

  if (search) {
    all = all.filter(function (pa) {
      var ben = storageFindById(STORAGE_KEYS.BENEFICIARIES, pa.beneficiary_id);
      var benName = ben ? ben.full_name.toLowerCase() : '';
      return benName.indexOf(search) !== -1 ||
        pa.id.toLowerCase().indexOf(search) !== -1 ||
        pa.category.toLowerCase().indexOf(search) !== -1;
    });
  }

  // Sort by created_at descending
  all.sort(function (a, b) { return b.created_at.localeCompare(a.created_at); });

  renderPATable(all);
}

/**
 * Render the PA data table using the table component.
 *
 * @param {Array} data - Filtered PA records
 */
function renderPATable(data) {
  var columns = [
    {
      key: 'beneficiary', label: 'Beneficiary',
      render: function (row) {
        var ben = storageFindById(STORAGE_KEYS.BENEFICIARIES, row.beneficiary_id);
        return ben ? escapeHtml(ben.full_name) : '<em>Unknown</em>';
      }
    },
    {
      key: 'category', label: 'Category',
      render: function (row) { return escapeHtml(row.category); }
    },
    {
      key: 'action_taken', label: 'Action Taken',
      render: function (row) { return escapeHtml(row.action_taken); }
    },
    {
      key: 'bm', label: 'Board Member',
      render: function (row) { return escapeHtml(getBMName(row.board_member_id)); }
    },
    {
      key: 'created_at', label: 'Date',
      render: function (row) { return formatDate(row.created_at); }
    },
    {
      key: 'actions', label: 'Actions',
      render: function (row) {
        return '<button class="btn btn-ghost btn-sm" onclick="viewPA(\'' + row.id + '\')">View</button>' +
          '<button class="btn btn-ghost btn-sm" onclick="editPA(\'' + row.id + '\')">Edit</button>';
      }
    }
  ];

  renderTable('paTableContainer', {
    columns: columns,
    data: data,
    pageSize: 10,
    emptyMessage: 'No personal assistance records found.'
  });
}

/**
 * Show a modal with full PA record details.
 *
 * @param {string} id - PA record ID
 */
function viewPA(id) {
  var pa = storageFindById(STORAGE_KEYS.PERSONAL_ASSISTANCE, id);
  if (!pa) { showToast('Record not found.', 'error'); return; }

  var ben = storageFindById(STORAGE_KEYS.BENEFICIARIES, pa.beneficiary_id);
  var benName = ben ? ben.full_name : 'Unknown';
  var benMun = ben ? ben.municipality : '';

  var body = '<table class="detail-table">' +
    '<tr><td><strong>ID</strong></td><td>' + pa.id + '</td></tr>' +
    '<tr><td><strong>Beneficiary</strong></td><td>' + escapeHtml(benName) + '</td></tr>' +
    '<tr><td><strong>Municipality</strong></td><td>' + escapeHtml(benMun) + '</td></tr>' +
    '<tr><td><strong>Category</strong></td><td>' + escapeHtml(pa.category) + '</td></tr>' +
    '<tr><td><strong>Action Taken</strong></td><td>' + escapeHtml(pa.action_taken) + '</td></tr>' +
    '<tr><td><strong>Board Member</strong></td><td>' + escapeHtml(getBMName(pa.board_member_id)) + '</td></tr>' +
    '<tr><td><strong>Date Created</strong></td><td>' + formatDateTime(pa.created_at) + '</td></tr>' +
    (pa.notes ? '<tr><td><strong>Notes</strong></td><td>' + escapeHtml(pa.notes) + '</td></tr>' : '') +
    '</table>';

  showModal({
    title: 'Personal Assistance Details',
    body: body,
    size: 'medium',
    buttons: [{ label: 'Close', className: 'btn btn-ghost', onClick: closeModal }]
  });
}

/**
 * Navigate to the PA create page in edit mode.
 *
 * @param {string} id - PA record ID to edit
 */
function editPA(id) {
  window.location.href = 'pa-create.html?edit=' + id;
}
