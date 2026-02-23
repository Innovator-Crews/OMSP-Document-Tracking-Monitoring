/* ==============================================
 * categories.js
 * PURPOSE: Categories management page controller.
 * Admin-only page for managing FA Case Types and
 * PA Categories. Includes add, edit, delete with
 * referential integrity protection.
 *
 * CONTAINS:
 *  - initCategories()   → Main initializer
 *  - switchTab(tab)     → Toggle FA / PA tabs
 *  - renderFATypes()    → List FA case types
 *  - renderPACats()     → List PA categories
 *  - showAddFA/PA()     → Modal to add new item
 *  - editFAType/PACat() → Modal to edit item
 *  - deleteFAType/PACat() → Delete with protection
 *
 * USED BY: categories.html
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
  renderHeader(session, 'Manage Categories', [
    { label: 'Dashboard', href: 'dashboard.html' },
    { label: 'Categories' }
  ]);
  renderTermBanner(session);
  initCategories();
});

/**
 * Initialize both lists on page load.
 */
function initCategories() {
  renderFATypes();
  renderPACats();
}

/**
 * Switch between the FA Case Types and PA Categories tabs.
 *
 * @param {string} tab - 'fa' or 'pa'
 */
function switchTab(tab) {
  document.getElementById('faPanel').style.display = tab === 'fa' ? 'block' : 'none';
  document.getElementById('paPanel').style.display = tab === 'pa' ? 'block' : 'none';

  // Update tab button active states
  var tabs = document.querySelectorAll('.tab');
  tabs[0].classList.toggle('active', tab === 'fa');
  tabs[1].classList.toggle('active', tab === 'pa');
}

/* ── FA Case Types ──────────────────────────── */

/**
 * Render the list of FA Case Types with record
 * counts and action buttons.
 */
function renderFATypes() {
  var container = document.getElementById('faTypesList');
  var types = getFACaseTypes();

  if (types.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No case types defined yet.</p></div>';
    return;
  }

  var html = '<div class="category-list">';
  types.forEach(function (t) {
    var count = countFARecordsByType(t.name);
    html += '<div class="category-item">' +
      '<div class="category-info">' +
      '<strong>' + escapeHtml(t.name) + '</strong>' +
      '<span class="badge badge-secondary">' + count + ' records</span>' +
      '</div>' +
      '<div class="category-actions">' +
      '<button class="btn btn-ghost btn-sm" onclick="editFAType(\'' + t.id + '\')">Edit</button>' +
      '<button class="btn btn-danger btn-sm" onclick="deleteFAType(\'' + t.id + '\')">Delete</button>' +
      '</div></div>';
  });
  html += '</div>';
  container.innerHTML = html;
}

/**
 * Show a modal to add a new FA Case Type.
 */
function showAddFA() {
  var body = '<div class="form-group">' +
    '<label for="newFAName">Case Type Name *</label>' +
    '<input type="text" id="newFAName" class="form-input" placeholder="e.g. Dental Assistance" />' +
    '</div>';

  showModal({
    title: 'Add FA Case Type',
    body: body,
    buttons: [
      { label: 'Cancel', className: 'btn btn-ghost', onClick: closeModal },
      {
        label: 'Add', className: 'btn btn-primary', onClick: function () {
          var name = document.getElementById('newFAName').value.trim();
          if (!name) { showToast('Please enter a name.', 'warning'); return; }

          // Check for duplicates
          var existing = getFACaseTypes();
          var dup = existing.find(function (t) { return t.name.toLowerCase() === name.toLowerCase(); });
          if (dup) { showToast('This case type already exists.', 'warning'); return; }

          addFACaseType({
            id: generateId('FATYPE'),
            name: name,
            created_at: getNowISO()
          });

          closeModal();
          showToast('Case type added.', 'success');
          renderFATypes();
        }
      }
    ]
  });
}

/**
 * Show a modal to edit an FA Case Type.
 *
 * @param {string} id - Case type ID
 */
function editFAType(id) {
  var type = storageFindById(STORAGE_KEYS.FA_CASE_TYPES, id);
  if (!type) return;

  var body = '<div class="form-group">' +
    '<label for="editFAName">Case Type Name *</label>' +
    '<input type="text" id="editFAName" class="form-input" value="' + escapeHtml(type.name) + '" />' +
    '</div>';

  showModal({
    title: 'Edit FA Case Type',
    body: body,
    buttons: [
      { label: 'Cancel', className: 'btn btn-ghost', onClick: closeModal },
      {
        label: 'Save', className: 'btn btn-primary', onClick: function () {
          var name = document.getElementById('editFAName').value.trim();
          if (!name) { showToast('Please enter a name.', 'warning'); return; }

          type.name = name;
          type.updated_at = getNowISO();
          storageUpdateById(STORAGE_KEYS.FA_CASE_TYPES, id, type);

          closeModal();
          showToast('Case type updated.', 'success');
          renderFATypes();
        }
      }
    ]
  });
}

/**
 * Delete an FA Case Type with referential protection.
 * Blocks deletion if any FA records use this type.
 *
 * @param {string} id - Case type ID
 */
function deleteFAType(id) {
  var type = storageFindById(STORAGE_KEYS.FA_CASE_TYPES, id);
  if (!type) return;

  var count = countFARecordsByType(type.name);
  if (count > 0) {
    showAlert('Cannot delete "' + type.name + '" because it is used by ' + count + ' FA record(s).');
    return;
  }

  showConfirm(
    'Delete "' + type.name + '"? This action cannot be undone.',
    function () {
      storageRemoveById(STORAGE_KEYS.FA_CASE_TYPES, id);
      showToast('Case type deleted.', 'success');
      renderFATypes();
    }
  );
}

/* ── PA Categories ──────────────────────────── */

/**
 * Render the list of PA Categories with record
 * counts and action buttons.
 */
function renderPACats() {
  var container = document.getElementById('paCatsList');
  var cats = getPACategories();

  if (cats.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No categories defined yet.</p></div>';
    return;
  }

  var html = '<div class="category-list">';
  cats.forEach(function (c) {
    var count = countPARecordsByCat(c.name);
    html += '<div class="category-item">' +
      '<div class="category-info">' +
      '<strong>' + escapeHtml(c.name) + '</strong>' +
      '<span class="badge badge-secondary">' + count + ' records</span>' +
      '</div>' +
      '<div class="category-actions">' +
      '<button class="btn btn-ghost btn-sm" onclick="editPACat(\'' + c.id + '\')">Edit</button>' +
      '<button class="btn btn-danger btn-sm" onclick="deletePACat(\'' + c.id + '\')">Delete</button>' +
      '</div></div>';
  });
  html += '</div>';
  container.innerHTML = html;
}

/**
 * Show a modal to add a new PA Category.
 */
function showAddPA() {
  var body = '<div class="form-group">' +
    '<label for="newPAName">Category Name *</label>' +
    '<input type="text" id="newPAName" class="form-input" placeholder="e.g. Transportation" />' +
    '</div>';

  showModal({
    title: 'Add PA Category',
    body: body,
    buttons: [
      { label: 'Cancel', className: 'btn btn-ghost', onClick: closeModal },
      {
        label: 'Add', className: 'btn btn-primary', onClick: function () {
          var name = document.getElementById('newPAName').value.trim();
          if (!name) { showToast('Please enter a name.', 'warning'); return; }

          var existing = getPACategories();
          var dup = existing.find(function (c) { return c.name.toLowerCase() === name.toLowerCase(); });
          if (dup) { showToast('This category already exists.', 'warning'); return; }

          addPACategory({
            id: generateId('PACAT'),
            name: name,
            created_at: getNowISO()
          });

          closeModal();
          showToast('Category added.', 'success');
          renderPACats();
        }
      }
    ]
  });
}

/**
 * Show a modal to edit a PA Category.
 *
 * @param {string} id - Category ID
 */
function editPACat(id) {
  var cat = storageFindById(STORAGE_KEYS.PA_CATEGORIES, id);
  if (!cat) return;

  var body = '<div class="form-group">' +
    '<label for="editPAName">Category Name *</label>' +
    '<input type="text" id="editPAName" class="form-input" value="' + escapeHtml(cat.name) + '" />' +
    '</div>';

  showModal({
    title: 'Edit PA Category',
    body: body,
    buttons: [
      { label: 'Cancel', className: 'btn btn-ghost', onClick: closeModal },
      {
        label: 'Save', className: 'btn btn-primary', onClick: function () {
          var name = document.getElementById('editPAName').value.trim();
          if (!name) { showToast('Please enter a name.', 'warning'); return; }

          cat.name = name;
          cat.updated_at = getNowISO();
          storageUpdateById(STORAGE_KEYS.PA_CATEGORIES, id, cat);

          closeModal();
          showToast('Category updated.', 'success');
          renderPACats();
        }
      }
    ]
  });
}

/**
 * Delete a PA Category with referential protection.
 *
 * @param {string} id - Category ID
 */
function deletePACat(id) {
  var cat = storageFindById(STORAGE_KEYS.PA_CATEGORIES, id);
  if (!cat) return;

  var count = countPARecordsByCat(cat.name);
  if (count > 0) {
    showAlert('Cannot delete "' + cat.name + '" because it is used by ' + count + ' PA record(s).');
    return;
  }

  showConfirm(
    'Delete "' + cat.name + '"? This action cannot be undone.',
    function () {
      storageRemoveById(STORAGE_KEYS.PA_CATEGORIES, id);
      showToast('Category deleted.', 'success');
      renderPACats();
    }
  );
}
