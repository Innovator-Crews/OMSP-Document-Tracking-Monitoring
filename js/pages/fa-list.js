/* ==============================================
 * fa-list.js
 * PURPOSE: Financial Assistance list page controller.
 * Loads FA records, populates filter dropdowns,
 * renders a sortable data table, and handles
 * status changes and record viewing.
 *
 * CONTAINS:
 *  - initFAList()         → Main initializer
 *  - populateFilters()    → Fill dropdown options
 *  - applyFilters()       → Filter + re-render table
 *  - renderFATable(data)  → Build data table
 *  - viewFA(id)           → Show FA detail modal
 *  - changeStatus(id)     → Update FA status
 *  - deleteFA(id)         → Soft-delete with confirm
 *
 * USED BY: fa-list.html
 * DEPENDS ON: auth.js, storage.js, utils.js,
 *   table.js, modal.js, toast.js, sidebar.js,
 *   header.js, banner.js
 * ============================================== */

document.addEventListener('DOMContentLoaded', function () {
  initializeApp();
  checkAuth();

  var session = getSession();
  renderSidebar(session);
  renderHeader(session, 'Financial Assistance', [
    { label: 'Dashboard', href: 'dashboard.html' },
    { label: 'Financial Assistance' }
  ]);
  renderTermBanner(session);
  initFAList(session);
});

/**
 * Main initializer for the FA list page.
 * Hides create button if term is read-only.
 *
 * @param {Object} session - Current user session
 */
function initFAList(session) {
  // Hide create button if read-only
  if (isTermReadOnly(session)) {
    var btn = document.getElementById('createBtn');
    if (btn) btn.style.display = 'none';
  }

  populateFilters();
  applyFilters();
}

/**
 * Populate the filter dropdowns with data from storage.
 * Municipalities come from constants, case types from storage.
 */
function populateFilters() {
  // Municipality dropdown
  var munSelect = document.getElementById('filterMunicipality');
  MUNICIPALITIES.forEach(function (mun) {
    var opt = document.createElement('option');
    opt.value = mun;
    opt.textContent = mun;
    munSelect.appendChild(opt);
  });

  // Case Type dropdown
  var typeSelect = document.getElementById('filterCaseType');
  var types = getFACaseTypes();
  types.forEach(function (t) {
    var opt = document.createElement('option');
    opt.value = t.name;
    opt.textContent = t.name;
    typeSelect.appendChild(opt);
  });
}

/**
 * Apply all active filters and re-render the table.
 * Reads filter values from the DOM, filters the data,
 * then calls renderFATable.
 */
function applyFilters() {
  var session = getSession();
  var all = getFinancialAssistance();

  // Role-based filtering
  if (session.role !== 'admin') {
    var bmIds = [];
    if (session.role === 'board_member') {
      bmIds = [session.bmId];
    } else if (session.role === 'secretary') {
      bmIds = session.assignedBMs || [];
    }
    all = all.filter(function (fa) {
      return bmIds.indexOf(fa.board_member_id) !== -1;
    });
  }

  // Apply UI filters
  var status = document.getElementById('filterStatus').value;
  var municipality = document.getElementById('filterMunicipality').value;
  var caseType = document.getElementById('filterCaseType').value;
  var search = document.getElementById('filterSearch').value.toLowerCase();

  if (status) {
    all = all.filter(function (fa) { return fa.status === status; });
  }

  if (caseType) {
    all = all.filter(function (fa) { return fa.case_type === caseType; });
  }

  if (municipality) {
    all = all.filter(function (fa) {
      var ben = storageFindById(STORAGE_KEYS.BENEFICIARIES, fa.beneficiary_id);
      return ben && ben.municipality === municipality;
    });
  }

  if (search) {
    all = all.filter(function (fa) {
      var ben = storageFindById(STORAGE_KEYS.BENEFICIARIES, fa.beneficiary_id);
      var benName = ben ? ben.full_name.toLowerCase() : '';
      return benName.indexOf(search) !== -1 ||
        fa.id.toLowerCase().indexOf(search) !== -1 ||
        fa.case_type.toLowerCase().indexOf(search) !== -1;
    });
  }

  // Sort by created_at descending
  all.sort(function (a, b) { return b.created_at.localeCompare(a.created_at); });

  renderFATable(all);
}

/**
 * Render the FA data table using the table component.
 *
 * @param {Array} data - Filtered FA records
 */
function renderFATable(data) {
  var columns = [
    {
      key: 'beneficiary', label: 'Beneficiary',
      render: function (row) {
        var ben = storageFindById(STORAGE_KEYS.BENEFICIARIES, row.beneficiary_id);
        return ben ? escapeHtml(ben.full_name) : '<em>Unknown</em>';
      }
    },
    {
      key: 'case_type', label: 'Case Type',
      render: function (row) { return escapeHtml(row.case_type); }
    },
    {
      key: 'amount', label: 'Amount',
      render: function (row) { return formatCurrency(row.amount); }
    },
    {
      key: 'status', label: 'Status',
      render: function (row) {
        var cls = row.status === 'approved' ? 'badge-success' :
          row.status === 'pending' ? 'badge-warning' :
            row.status === 'released' ? 'badge-info' :
              row.status === 'completed' ? 'badge-success' :
                'badge-danger';
        return '<span class="badge ' + cls + '">' + row.status + '</span>';
      }
    },
    {
      key: 'bm', label: 'Board Member',
      render: function (row) {
        return escapeHtml(getBMName(row.board_member_id));
      }
    },
    {
      key: 'created_at', label: 'Date',
      render: function (row) { return formatDate(row.created_at); }
    },
    {
      key: 'actions', label: 'Actions',
      render: function (row) {
        return '<button class="btn btn-ghost btn-sm" onclick="viewFA(\'' + row.id + '\')">View</button>' +
          '<button class="btn btn-ghost btn-sm" onclick="changeStatus(\'' + row.id + '\')">Status</button>';
      }
    }
  ];

  renderTable('faTableContainer', {
    columns: columns,
    data: data,
    pageSize: 10,
    emptyMessage: 'No financial assistance records found.'
  });
}

/**
 * Show a modal with full FA record details.
 *
 * @param {string} id - FA record ID
 */
function viewFA(id) {
  var fa = storageFindById(STORAGE_KEYS.FINANCIAL_ASSISTANCE, id);
  if (!fa) { showToast('Record not found.', 'error'); return; }

  var ben = storageFindById(STORAGE_KEYS.BENEFICIARIES, fa.beneficiary_id);
  var benName = ben ? ben.full_name : 'Unknown';
  var benMun = ben ? ben.municipality : '';

  var body = '<table class="detail-table">' +
    '<tr><td><strong>ID</strong></td><td>' + fa.id + '</td></tr>' +
    '<tr><td><strong>Beneficiary</strong></td><td>' + escapeHtml(benName) + '</td></tr>' +
    '<tr><td><strong>Municipality</strong></td><td>' + escapeHtml(benMun) + '</td></tr>' +
    '<tr><td><strong>Case Type</strong></td><td>' + escapeHtml(fa.case_type) + '</td></tr>' +
    '<tr><td><strong>Amount</strong></td><td>' + formatCurrency(fa.amount) + '</td></tr>' +
    '<tr><td><strong>Status</strong></td><td>' + fa.status + '</td></tr>' +
    '<tr><td><strong>Board Member</strong></td><td>' + escapeHtml(getBMName(fa.board_member_id)) + '</td></tr>' +
    '<tr><td><strong>Date Created</strong></td><td>' + formatDateTime(fa.created_at) + '</td></tr>' +
    (fa.notes ? '<tr><td><strong>Notes</strong></td><td>' + escapeHtml(fa.notes) + '</td></tr>' : '') +
    '</table>';

  showModal({
    title: 'Financial Assistance Details',
    body: body,
    size: 'medium',
    buttons: [{ label: 'Close', className: 'btn btn-ghost', onClick: closeModal }]
  });
}

/**
 * Show a modal to change the FA record status.
 * Available transitions depend on current status.
 *
 * @param {string} id - FA record ID
 */
function changeStatus(id) {
  var fa = storageFindById(STORAGE_KEYS.FINANCIAL_ASSISTANCE, id);
  if (!fa) { showToast('Record not found.', 'error'); return; }

  var session = getSession();
  if (isTermReadOnly(session)) {
    showToast('Cannot modify records — term has ended.', 'warning');
    return;
  }

  // Define allowed transitions
  var transitions = {
    'pending': ['approved', 'rejected'],
    'approved': ['released', 'rejected'],
    'released': ['completed'],
    'rejected': [],
    'completed': []
  };

  var allowed = transitions[fa.status] || [];
  if (allowed.length === 0) {
    showToast('No status changes available for this record.', 'info');
    return;
  }

  var optionsHTML = allowed.map(function (s) {
    return '<option value="' + s + '">' + s.charAt(0).toUpperCase() + s.slice(1) + '</option>';
  }).join('');

  var body = '<p>Current status: <strong>' + fa.status + '</strong></p>' +
    '<div class="form-group"><label for="newStatus">New Status</label>' +
    '<select id="newStatus" class="form-select">' + optionsHTML + '</select></div>';

  showModal({
    title: 'Change FA Status',
    body: body,
    buttons: [
      { label: 'Cancel', className: 'btn btn-ghost', onClick: closeModal },
      {
        label: 'Update', className: 'btn btn-primary', onClick: function () {
          var newStatus = document.getElementById('newStatus').value;
          fa.status = newStatus;
          fa.updated_at = getNowISO();
          storageUpdateById(STORAGE_KEYS.FINANCIAL_ASSISTANCE, id, fa);

          // Log activity
          addActivityLog({
            action: 'Changed FA status to ' + newStatus,
            entity_type: 'financial_assistance',
            entity_id: id,
            user_id: session.userId,
            performed_by: session.fullName
          });

          closeModal();
          showToast('Status updated to ' + newStatus + '.', 'success');
          applyFilters(); // Re-render table
        }
      }
    ]
  });
}
