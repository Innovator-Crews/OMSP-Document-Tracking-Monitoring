/* ==============================================
 * pa-create.js
 * PURPOSE: PA creation form controller. Handles
 * beneficiary info, category/action selection,
 * duplicate detection, and record creation.
 *
 * CONTAINS:
 *  - initPACreate()       → Main initializer
 *  - checkPADuplicate()   → Detect duplicate beneficiary
 *  - usePADuplicate(id)   → Re-use existing beneficiary
 *  - submitPA(event)      → Create PA record
 *  - loadPAForEdit(id)    → Pre-fill form for editing
 *
 * USED BY: pa-create.html
 * DEPENDS ON: auth.js, storage.js, utils.js,
 *   modal.js, toast.js, sidebar.js, header.js, banner.js
 * ============================================== */

/** Track which beneficiary is being reused (null = new) */
var reusingPABenId = null;
/** Track if we are in edit mode */
var editingPAId = null;

document.addEventListener('DOMContentLoaded', function () {
  initializeApp();
  checkAuth();

  var session = getSession();

  if (isTermReadOnly(session)) {
    showToast('Cannot create records — term has ended.', 'warning');
    setTimeout(function () { window.location.href = 'pa-list.html'; }, 1000);
    return;
  }

  renderSidebar(session);
  renderHeader(session, 'New Personal Assistance', [
    { label: 'Dashboard', href: 'dashboard.html' },
    { label: 'Personal Assistance', href: 'pa-list.html' },
    { label: 'New Record' }
  ]);
  renderTermBanner(session);
  initPACreate(session);
});

/**
 * Initialize the PA creation form.
 * Populates municipality, category, and action dropdowns.
 *
 * @param {Object} session - Current user session
 */
function initPACreate(session) {
  // Municipality dropdown
  var munSelect = document.getElementById('benMunicipality');
  MUNICIPALITIES.forEach(function (mun) {
    var opt = document.createElement('option');
    opt.value = mun;
    opt.textContent = mun;
    munSelect.appendChild(opt);
  });

  // Category dropdown
  var catSelect = document.getElementById('paCategory');
  var cats = getPACategories();
  cats.forEach(function (c) {
    var opt = document.createElement('option');
    opt.value = c.name;
    opt.textContent = c.name;
    catSelect.appendChild(opt);
  });

  // Action taken dropdown
  var actSelect = document.getElementById('paAction');
  PA_ACTIONS.forEach(function (a) {
    var opt = document.createElement('option');
    opt.value = a;
    opt.textContent = a;
    actSelect.appendChild(opt);
  });

  // Check URL for edit mode
  var params = new URLSearchParams(window.location.search);
  var editId = params.get('edit');
  if (editId) {
    loadPAForEdit(editId);
  }
}

/**
 * Check for duplicate beneficiaries on name input.
 */
function checkPADuplicate() {
  var name = document.getElementById('benFullName').value.trim();
  var mun = document.getElementById('benMunicipality').value;
  var warningEl = document.getElementById('duplicateWarning');

  if (name.length < 3) {
    warningEl.style.display = 'none';
    reusingPABenId = null;
    return;
  }

  var duplicates = findDuplicateBeneficiaries(name, mun);
  if (duplicates.length === 0) {
    warningEl.style.display = 'none';
    reusingPABenId = null;
    return;
  }

  var html = '<strong>⚠ Possible duplicates found:</strong><ul>';
  duplicates.forEach(function (d) {
    html += '<li>' + escapeHtml(d.full_name) + ' — ' + escapeHtml(d.municipality) +
      ' <button type="button" class="btn btn-ghost btn-sm" onclick="usePADuplicate(\'' + d.id + '\')">Use this</button></li>';
  });
  html += '</ul>';
  warningEl.innerHTML = html;
  warningEl.style.display = 'block';
}

/**
 * Re-use an existing beneficiary.
 *
 * @param {string} id - Existing beneficiary ID
 */
function usePADuplicate(id) {
  var ben = storageFindById(STORAGE_KEYS.BENEFICIARIES, id);
  if (!ben) return;

  reusingPABenId = id;
  document.getElementById('benFullName').value = ben.full_name;
  document.getElementById('benMunicipality').value = ben.municipality;
  document.getElementById('benBarangay').value = ben.barangay || '';
  document.getElementById('benContact').value = ben.contact_number || '';

  document.getElementById('duplicateWarning').innerHTML =
    '<strong>✓ Using existing beneficiary:</strong> ' + escapeHtml(ben.full_name);

  showToast('Existing beneficiary selected.', 'info');
}

/**
 * Submit the PA record form. Creates or reuses
 * beneficiary, creates PA record, logs activity.
 *
 * @param {Event} event - Form submit event
 */
function submitPA(event) {
  event.preventDefault();

  var session = getSession();
  var btn = document.getElementById('submitBtn');
  btn.disabled = true;
  btn.textContent = 'Submitting...';

  var name = document.getElementById('benFullName').value.trim();
  var mun = document.getElementById('benMunicipality').value;
  var barangay = document.getElementById('benBarangay').value.trim();
  var contact = document.getElementById('benContact').value.trim();
  var category = document.getElementById('paCategory').value;
  var action = document.getElementById('paAction').value;
  var notes = document.getElementById('paNotes').value.trim();

  // Determine BM ID
  var bmId = session.bmId;
  if (!bmId && session.role === 'secretary') {
    bmId = (session.assignedBMs && session.assignedBMs.length > 0) ? session.assignedBMs[0] : null;
  }
  if (!bmId && session.role === 'admin') {
    var bms = getBoardMembers();
    var active = bms.filter(function (b) { return b.status === 'active'; });
    bmId = active.length > 0 ? active[0].id : null;
  }

  if (!bmId) {
    showToast('No board member assigned. Cannot create record.', 'error');
    btn.disabled = false;
    btn.textContent = 'Submit PA Record';
    return;
  }

  // Create or reuse beneficiary
  var beneficiaryId;
  if (reusingPABenId) {
    beneficiaryId = reusingPABenId;
  } else {
    var newBen = {
      id: generateId('BEN'),
      full_name: name,
      municipality: mun,
      barangay: barangay,
      contact_number: contact,
      board_member_id: bmId,
      created_at: getNowISO()
    };
    addBeneficiary(newBen);
    beneficiaryId = newBen.id;
  }

  if (editingPAId) {
    // Update existing record
    var existing = storageFindById(STORAGE_KEYS.PERSONAL_ASSISTANCE, editingPAId);
    existing.beneficiary_id = beneficiaryId;
    existing.category = category;
    existing.action_taken = action;
    existing.notes = notes;
    existing.updated_at = getNowISO();
    storageUpdateById(STORAGE_KEYS.PERSONAL_ASSISTANCE, editingPAId, existing);

    addActivityLog({
      action: 'Updated PA record (' + category + ') for ' + name,
      entity_type: 'personal_assistance',
      entity_id: editingPAId,
      user_id: session.userId,
      performed_by: session.fullName
    });

    showToast('Personal Assistance record updated!', 'success');
  } else {
    // Create new PA record
    var paRecord = {
      id: generateId('PA'),
      beneficiary_id: beneficiaryId,
      board_member_id: bmId,
      category: category,
      action_taken: action,
      notes: notes,
      created_by: session.userId,
      created_at: getNowISO(),
      updated_at: getNowISO()
    };
    addPersonalAssistance(paRecord);

    // Update monthly frequency
    var yearMonth = getCurrentYearMonth();
    var freq = getMonthlyFrequency(beneficiaryId, yearMonth);
    if (freq) {
      freq.count = (freq.count || 0) + 1;
      freq.updated_at = getNowISO();
      storageUpdateById(STORAGE_KEYS.MONTHLY_FREQUENCY, freq.id, freq);
    } else {
      storageAdd(STORAGE_KEYS.MONTHLY_FREQUENCY, {
        id: generateId('FREQ'),
        beneficiary_id: beneficiaryId,
        board_member_id: bmId,
        year_month: yearMonth,
        count: 1,
        created_at: getNowISO(),
        updated_at: getNowISO()
      });
    }

    addActivityLog({
      action: 'Created PA record (' + category + ', ' + action + ') for ' + name,
      entity_type: 'personal_assistance',
      entity_id: paRecord.id,
      user_id: session.userId,
      performed_by: session.fullName
    });

    showToast('Personal Assistance record created!', 'success');
  }

  setTimeout(function () { window.location.href = 'pa-list.html'; }, 1000);
}

/**
 * Load an existing PA record for editing.
 *
 * @param {string} id - PA record ID to edit
 */
function loadPAForEdit(id) {
  var pa = storageFindById(STORAGE_KEYS.PERSONAL_ASSISTANCE, id);
  if (!pa) {
    showToast('Record not found.', 'error');
    return;
  }

  editingPAId = id;
  document.getElementById('pageTitle').textContent = 'Edit Personal Assistance';

  var ben = storageFindById(STORAGE_KEYS.BENEFICIARIES, pa.beneficiary_id);
  if (ben) {
    reusingPABenId = ben.id;
    document.getElementById('benFullName').value = ben.full_name;
    document.getElementById('benMunicipality').value = ben.municipality;
    document.getElementById('benBarangay').value = ben.barangay || '';
    document.getElementById('benContact').value = ben.contact_number || '';
  }

  document.getElementById('paCategory').value = pa.category;
  document.getElementById('paAction').value = pa.action_taken;
  document.getElementById('paNotes').value = pa.notes || '';

  document.getElementById('submitBtn').textContent = 'Update PA Record';
}
