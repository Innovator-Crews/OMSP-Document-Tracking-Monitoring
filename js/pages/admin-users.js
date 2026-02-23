/* ==============================================
 * admin-users.js
 * PURPOSE: Admin user management page controller.
 * Create, edit, deactivate Board Members and
 * Secretaries. Assign secretaries to BMs and
 * set term start/end dates.
 *
 * CONTAINS:
 *  - initAdminUsers()       → Main initializer
 *  - switchUserTab(tab)     → Toggle BM/Sec/All tabs
 *  - renderBMList()         → List board members
 *  - renderSecList()        → List secretaries
 *  - renderAllUsers()       → List all users
 *  - showAddBM()            → Modal to create BM
 *  - showAddSecretary()     → Modal to create secretary
 *  - editUser(id)           → Modal to edit user
 *  - toggleUserStatus(id)   → Activate/deactivate
 *  - assignSecretary(bmId)  → Assign sec to BM
 *
 * USED BY: admin-users.html
 * DEPENDS ON: auth.js, storage.js, utils.js,
 *   modal.js, toast.js, sidebar.js, header.js
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
  renderHeader(session, 'User Management', [
    { label: 'Dashboard', href: 'dashboard.html' },
    { label: 'User Management' }
  ]);
  renderTermBanner(session);
  initAdminUsers();
});

/**
 * Initialize all user lists on page load.
 */
function initAdminUsers() {
  renderBMList();
  renderSecList();
  renderAllUsers();
}

/**
 * Switch between Board Members, Secretaries, and All tabs.
 *
 * @param {string} tab - 'bm', 'sec', or 'all'
 */
function switchUserTab(tab) {
  document.getElementById('bmPanel').style.display = tab === 'bm' ? 'block' : 'none';
  document.getElementById('secPanel').style.display = tab === 'sec' ? 'block' : 'none';
  document.getElementById('allPanel').style.display = tab === 'all' ? 'block' : 'none';

  var tabs = document.querySelectorAll('.tab');
  tabs[0].classList.toggle('active', tab === 'bm');
  tabs[1].classList.toggle('active', tab === 'sec');
  tabs[2].classList.toggle('active', tab === 'all');
}

/* ── Board Members ──────────────────────────── */

/**
 * Render the Board Members list with term info,
 * status, and action buttons.
 */
function renderBMList() {
  var container = document.getElementById('bmList');
  var bms = getBoardMembers();

  if (bms.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No board members yet.</p></div>';
    return;
  }

  var html = '';
  bms.forEach(function (bm) {
    var user = storageFindById(STORAGE_KEYS.USERS, bm.user_id);
    var userName = user ? user.full_name : 'Unknown';
    var statusCls = bm.status === 'active' ? 'badge-success' : 'badge-danger';

    // Get assigned secretary
    var assignments = getSecretaryAssignments();
    var secAssignment = assignments.find(function (a) { return a.board_member_id === bm.id; });
    var secName = 'None';
    if (secAssignment) {
      var secUser = storageFindById(STORAGE_KEYS.USERS, secAssignment.secretary_user_id);
      secName = secUser ? secUser.full_name : 'Unknown';
    }

    html += '<div class="card" style="margin-bottom: var(--space-md);">' +
      '<div class="card-header">' +
      '<h3>' + escapeHtml(userName) + '</h3>' +
      '<span class="badge ' + statusCls + '">' + bm.status + '</span>' +
      '</div>' +
      '<div class="card-body">' +
      '<div class="form-row">' +
      '<div><strong>District:</strong> ' + escapeHtml(bm.district || 'N/A') + '</div>' +
      '<div><strong>Secretary:</strong> ' + escapeHtml(secName) + '</div>' +
      '</div>' +
      '<div class="form-row">' +
      '<div><strong>Term Start:</strong> ' + (bm.term_start ? formatDate(bm.term_start) : 'Not set') + '</div>' +
      '<div><strong>Term End:</strong> ' + (bm.term_end ? formatDate(bm.term_end) : 'Not set') + '</div>' +
      '</div>' +
      '<div class="form-actions" style="margin-top: var(--space-sm);">' +
      '<button class="btn btn-ghost btn-sm" onclick="editBM(\'' + bm.id + '\')">Edit</button>' +
      '<button class="btn btn-ghost btn-sm" onclick="assignSecretary(\'' + bm.id + '\')">Assign Secretary</button>' +
      '<button class="btn btn-' + (bm.status === 'active' ? 'danger' : 'success') + ' btn-sm" onclick="toggleBMStatus(\'' + bm.id + '\')">' +
      (bm.status === 'active' ? 'Deactivate' : 'Activate') + '</button>' +
      '</div></div></div>';
  });

  container.innerHTML = html;
}

/**
 * Show a modal to add a new Board Member. Creates
 * both a User record and a BoardMember record.
 */
function showAddBM() {
  var body = '<div class="form-group">' +
    '<label for="bmName">Full Name *</label>' +
    '<input type="text" id="bmName" class="form-input" placeholder="Full Name" />' +
    '</div>' +
    '<div class="form-group">' +
    '<label for="bmEmail">Email *</label>' +
    '<input type="email" id="bmEmail" class="form-input" placeholder="email@omsp.gov.ph" />' +
    '</div>' +
    '<div class="form-group">' +
    '<label for="bmPassword">Password *</label>' +
    '<input type="text" id="bmPassword" class="form-input" value="bm123" />' +
    '</div>' +
    '<div class="form-group">' +
    '<label for="bmDistrict">District *</label>' +
    '<input type="text" id="bmDistrict" class="form-input" placeholder="e.g. District 1" />' +
    '</div>' +
    '<div class="form-row">' +
    '<div class="form-group">' +
    '<label for="bmTermStart">Term Start</label>' +
    '<input type="date" id="bmTermStart" class="form-input" />' +
    '</div>' +
    '<div class="form-group">' +
    '<label for="bmTermEnd">Term End</label>' +
    '<input type="date" id="bmTermEnd" class="form-input" />' +
    '</div></div>';

  showModal({
    title: 'Add Board Member',
    body: body,
    size: 'medium',
    buttons: [
      { label: 'Cancel', className: 'btn btn-ghost', onClick: closeModal },
      {
        label: 'Create', className: 'btn btn-primary', onClick: function () {
          var name = document.getElementById('bmName').value.trim();
          var email = document.getElementById('bmEmail').value.trim();
          var password = document.getElementById('bmPassword').value;
          var district = document.getElementById('bmDistrict').value.trim();
          var termStart = document.getElementById('bmTermStart').value;
          var termEnd = document.getElementById('bmTermEnd').value;

          if (!name || !email || !password || !district) {
            showToast('Please fill all required fields.', 'warning');
            return;
          }

          // Check for duplicate email
          var users = getUsers();
          if (users.find(function (u) { return u.email === email; })) {
            showToast('Email already exists.', 'error');
            return;
          }

          // Create user
          var userId = generateId('USR');
          addUser({
            id: userId,
            email: email,
            password: password,
            full_name: name,
            role: 'board_member',
            is_active: true,
            created_at: getNowISO()
          });

          // Create BM record
          var bmId = generateId('BM');
          addBoardMember({
            id: bmId,
            user_id: userId,
            district: district,
            term_start: termStart || null,
            term_end: termEnd || null,
            status: 'active',
            archived: false,
            created_at: getNowISO()
          });

          // Log
          var session = getSession();
          addActivityLog({
            action: 'Created Board Member: ' + name + ' (' + district + ')',
            entity_type: 'board_member',
            entity_id: bmId,
            user_id: session.userId,
            performed_by: session.fullName
          });

          closeModal();
          showToast('Board Member created.', 'success');
          initAdminUsers();
        }
      }
    ]
  });
}

/**
 * Edit a Board Member's details via modal.
 *
 * @param {string} bmId - Board Member ID
 */
function editBM(bmId) {
  var bm = storageFindById(STORAGE_KEYS.BOARD_MEMBERS, bmId);
  if (!bm) return;
  var user = storageFindById(STORAGE_KEYS.USERS, bm.user_id);
  if (!user) return;

  var body = '<div class="form-group">' +
    '<label for="editBMName">Full Name</label>' +
    '<input type="text" id="editBMName" class="form-input" value="' + escapeHtml(user.full_name) + '" />' +
    '</div>' +
    '<div class="form-group">' +
    '<label for="editBMDistrict">District</label>' +
    '<input type="text" id="editBMDistrict" class="form-input" value="' + escapeHtml(bm.district || '') + '" />' +
    '</div>' +
    '<div class="form-row">' +
    '<div class="form-group">' +
    '<label for="editBMTermStart">Term Start</label>' +
    '<input type="date" id="editBMTermStart" class="form-input" value="' + (bm.term_start || '') + '" />' +
    '</div>' +
    '<div class="form-group">' +
    '<label for="editBMTermEnd">Term End</label>' +
    '<input type="date" id="editBMTermEnd" class="form-input" value="' + (bm.term_end || '') + '" />' +
    '</div></div>';

  showModal({
    title: 'Edit Board Member',
    body: body,
    buttons: [
      { label: 'Cancel', className: 'btn btn-ghost', onClick: closeModal },
      {
        label: 'Save', className: 'btn btn-primary', onClick: function () {
          user.full_name = document.getElementById('editBMName').value.trim() || user.full_name;
          user.updated_at = getNowISO();
          storageUpdateById(STORAGE_KEYS.USERS, user.id, user);

          bm.district = document.getElementById('editBMDistrict').value.trim() || bm.district;
          bm.term_start = document.getElementById('editBMTermStart').value || bm.term_start;
          bm.term_end = document.getElementById('editBMTermEnd').value || bm.term_end;
          bm.updated_at = getNowISO();
          storageUpdateById(STORAGE_KEYS.BOARD_MEMBERS, bmId, bm);

          closeModal();
          showToast('Board Member updated.', 'success');
          initAdminUsers();
        }
      }
    ]
  });
}

/**
 * Toggle Board Member active/inactive status.
 *
 * @param {string} bmId - Board Member ID
 */
function toggleBMStatus(bmId) {
  var bm = storageFindById(STORAGE_KEYS.BOARD_MEMBERS, bmId);
  if (!bm) return;

  var newStatus = bm.status === 'active' ? 'inactive' : 'active';
  showConfirm(
    (newStatus === 'inactive' ? 'Deactivate' : 'Activate') + ' this board member?',
    function () {
      bm.status = newStatus;
      bm.updated_at = getNowISO();
      storageUpdateById(STORAGE_KEYS.BOARD_MEMBERS, bmId, bm);

      // Also toggle user active status
      var user = storageFindById(STORAGE_KEYS.USERS, bm.user_id);
      if (user) {
        user.is_active = newStatus === 'active';
        user.updated_at = getNowISO();
        storageUpdateById(STORAGE_KEYS.USERS, user.id, user);
      }

      showToast('Board Member ' + newStatus + '.', 'success');
      initAdminUsers();
    }
  );
}

/**
 * Show modal to assign a secretary to a BM.
 * Lists available secretary users.
 *
 * @param {string} bmId - Board Member ID
 */
function assignSecretary(bmId) {
  var users = getUsers();
  var secretaries = users.filter(function (u) {
    return u.role === 'secretary' && u.is_active;
  });

  if (secretaries.length === 0) {
    showAlert('No active secretaries available. Create a secretary first.');
    return;
  }

  var optionsHTML = secretaries.map(function (s) {
    return '<option value="' + s.id + '">' + escapeHtml(s.full_name) + ' (' + s.email + ')</option>';
  }).join('');

  var body = '<div class="form-group">' +
    '<label for="secSelect">Select Secretary</label>' +
    '<select id="secSelect" class="form-select">' + optionsHTML + '</select>' +
    '</div>';

  showModal({
    title: 'Assign Secretary',
    body: body,
    buttons: [
      { label: 'Cancel', className: 'btn btn-ghost', onClick: closeModal },
      {
        label: 'Assign', className: 'btn btn-primary', onClick: function () {
          var secUserId = document.getElementById('secSelect').value;

          // Remove any existing assignment for this BM
          var assignments = getSecretaryAssignments();
          var existing = assignments.find(function (a) { return a.board_member_id === bmId; });
          if (existing) {
            storageRemoveById(STORAGE_KEYS.SECRETARY_ASSIGNMENTS, existing.id);
          }

          // Create new assignment
          addSecretaryAssignment({
            id: generateId('SECASGN'),
            secretary_user_id: secUserId,
            board_member_id: bmId,
            created_at: getNowISO()
          });

          var session = getSession();
          addActivityLog({
            action: 'Assigned secretary to Board Member',
            entity_type: 'secretary_assignment',
            entity_id: bmId,
            user_id: session.userId,
            performed_by: session.fullName
          });

          closeModal();
          showToast('Secretary assigned.', 'success');
          initAdminUsers();
        }
      }
    ]
  });
}

/* ── Secretaries ────────────────────────────── */

/**
 * Render the list of secretary users.
 */
function renderSecList() {
  var container = document.getElementById('secList');
  var users = getUsers();
  var secretaries = users.filter(function (u) { return u.role === 'secretary'; });

  if (secretaries.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No secretaries yet.</p></div>';
    return;
  }

  var html = '';
  secretaries.forEach(function (sec) {
    var statusCls = sec.is_active ? 'badge-success' : 'badge-danger';

    // Find assigned BMs
    var assignments = getSecretaryAssignments();
    var assignedBMs = assignments.filter(function (a) { return a.secretary_user_id === sec.id; });
    var bmNames = assignedBMs.map(function (a) { return getBMName(a.board_member_id); }).join(', ') || 'None';

    html += '<div class="card" style="margin-bottom: var(--space-md);">' +
      '<div class="card-header">' +
      '<h3>' + escapeHtml(sec.full_name) + '</h3>' +
      '<span class="badge ' + statusCls + '">' + (sec.is_active ? 'Active' : 'Inactive') + '</span>' +
      '</div>' +
      '<div class="card-body">' +
      '<div><strong>Email:</strong> ' + escapeHtml(sec.email) + '</div>' +
      '<div><strong>Assigned BMs:</strong> ' + escapeHtml(bmNames) + '</div>' +
      '<div class="form-actions" style="margin-top: var(--space-sm);">' +
      '<button class="btn btn-ghost btn-sm" onclick="editSecretary(\'' + sec.id + '\')">Edit</button>' +
      '<button class="btn btn-' + (sec.is_active ? 'danger' : 'success') + ' btn-sm" onclick="toggleSecStatus(\'' + sec.id + '\')">' +
      (sec.is_active ? 'Deactivate' : 'Activate') + '</button>' +
      '</div></div></div>';
  });

  container.innerHTML = html;
}

/**
 * Show modal to add a new secretary user.
 */
function showAddSecretary() {
  var body = '<div class="form-group">' +
    '<label for="secName">Full Name *</label>' +
    '<input type="text" id="secName" class="form-input" placeholder="Full Name" />' +
    '</div>' +
    '<div class="form-group">' +
    '<label for="secEmail">Email *</label>' +
    '<input type="email" id="secEmail" class="form-input" placeholder="email@omsp.gov.ph" />' +
    '</div>' +
    '<div class="form-group">' +
    '<label for="secPassword">Password *</label>' +
    '<input type="text" id="secPassword" class="form-input" value="sec123" />' +
    '</div>';

  showModal({
    title: 'Add Secretary',
    body: body,
    buttons: [
      { label: 'Cancel', className: 'btn btn-ghost', onClick: closeModal },
      {
        label: 'Create', className: 'btn btn-primary', onClick: function () {
          var name = document.getElementById('secName').value.trim();
          var email = document.getElementById('secEmail').value.trim();
          var password = document.getElementById('secPassword').value;

          if (!name || !email || !password) {
            showToast('Please fill all required fields.', 'warning');
            return;
          }

          var users = getUsers();
          if (users.find(function (u) { return u.email === email; })) {
            showToast('Email already exists.', 'error');
            return;
          }

          addUser({
            id: generateId('USR'),
            email: email,
            password: password,
            full_name: name,
            role: 'secretary',
            is_active: true,
            created_at: getNowISO()
          });

          var session = getSession();
          addActivityLog({
            action: 'Created Secretary: ' + name,
            entity_type: 'user',
            entity_id: name,
            user_id: session.userId,
            performed_by: session.fullName
          });

          closeModal();
          showToast('Secretary created.', 'success');
          initAdminUsers();
        }
      }
    ]
  });
}

/**
 * Edit a secretary's details.
 *
 * @param {string} userId - Secretary user ID
 */
function editSecretary(userId) {
  var user = storageFindById(STORAGE_KEYS.USERS, userId);
  if (!user) return;

  var body = '<div class="form-group">' +
    '<label for="editSecName">Full Name</label>' +
    '<input type="text" id="editSecName" class="form-input" value="' + escapeHtml(user.full_name) + '" />' +
    '</div>' +
    '<div class="form-group">' +
    '<label for="editSecEmail">Email</label>' +
    '<input type="email" id="editSecEmail" class="form-input" value="' + escapeHtml(user.email) + '" />' +
    '</div>';

  showModal({
    title: 'Edit Secretary',
    body: body,
    buttons: [
      { label: 'Cancel', className: 'btn btn-ghost', onClick: closeModal },
      {
        label: 'Save', className: 'btn btn-primary', onClick: function () {
          user.full_name = document.getElementById('editSecName').value.trim() || user.full_name;
          user.email = document.getElementById('editSecEmail').value.trim() || user.email;
          user.updated_at = getNowISO();
          storageUpdateById(STORAGE_KEYS.USERS, userId, user);

          closeModal();
          showToast('Secretary updated.', 'success');
          initAdminUsers();
        }
      }
    ]
  });
}

/**
 * Toggle secretary active/inactive status.
 *
 * @param {string} userId - Secretary user ID
 */
function toggleSecStatus(userId) {
  var user = storageFindById(STORAGE_KEYS.USERS, userId);
  if (!user) return;

  var newActive = !user.is_active;
  showConfirm(
    (newActive ? 'Activate' : 'Deactivate') + ' this secretary?',
    function () {
      user.is_active = newActive;
      user.updated_at = getNowISO();
      storageUpdateById(STORAGE_KEYS.USERS, userId, user);
      showToast('Secretary ' + (newActive ? 'activated' : 'deactivated') + '.', 'success');
      initAdminUsers();
    }
  );
}

/* ── All Users ──────────────────────────────── */

/**
 * Render a combined table of all system users.
 */
function renderAllUsers() {
  var container = document.getElementById('allUsersList');
  var users = getUsers();

  var columns = [
    {
      key: 'full_name', label: 'Name',
      render: function (row) { return escapeHtml(row.full_name); }
    },
    {
      key: 'email', label: 'Email',
      render: function (row) { return escapeHtml(row.email); }
    },
    {
      key: 'role', label: 'Role',
      render: function (row) {
        var label = row.role === 'admin' ? 'Admin' :
          row.role === 'board_member' ? 'Board Member' : 'Secretary';
        return '<span class="badge badge-secondary">' + label + '</span>';
      }
    },
    {
      key: 'is_active', label: 'Status',
      render: function (row) {
        return '<span class="badge ' + (row.is_active ? 'badge-success' : 'badge-danger') + '">' +
          (row.is_active ? 'Active' : 'Inactive') + '</span>';
      }
    },
    {
      key: 'created_at', label: 'Created',
      render: function (row) { return formatDate(row.created_at); }
    }
  ];

  renderTable('allUsersList', {
    columns: columns,
    data: users,
    pageSize: 20,
    emptyMessage: 'No users found.'
  });
}
