/* ==============================================
 * fa-create.js
 * PURPOSE: FA creation wizard controller. Handles
 * multi-step form (Beneficiary → Details → Review),
 * duplicate beneficiary detection, budget checking,
 * and record creation with budget deduction.
 *
 * CONTAINS:
 *  - initFACreate()       → Main initializer
 *  - goToStep(n)          → Navigate wizard steps
 *  - checkDuplicate()     → Detect duplicate beneficiary
 *  - useDuplicate(id)     → Re-use existing beneficiary
 *  - buildReviewSummary() → Summary before submit
 *  - submitFA()           → Create FA + deduct budget
 *
 * USED BY: fa-create.html
 * DEPENDS ON: auth.js, storage.js, utils.js,
 *   modal.js, toast.js, sidebar.js, header.js, banner.js
 * ============================================== */

/** Track which beneficiary is being reused (null = create new) */
var reusingBeneficiaryId = null;

document.addEventListener('DOMContentLoaded', function () {
  initializeApp();
  checkAuth();

  var session = getSession();

  // Block if term is read-only
  if (isTermReadOnly(session)) {
    showToast('Cannot create records — term has ended.', 'warning');
    setTimeout(function () { window.location.href = 'fa-list.html'; }, 1000);
    return;
  }

  renderSidebar(session);
  renderHeader(session, 'New Financial Assistance', [
    { label: 'Dashboard', href: 'dashboard.html' },
    { label: 'Financial Assistance', href: 'fa-list.html' },
    { label: 'New Record' }
  ]);
  renderTermBanner(session);
  initFACreate(session);
});

/**
 * Initialize the FA creation form.
 * Populates municipality and case type dropdowns,
 * shows budget info for current BM.
 *
 * @param {Object} session - Current user session
 */
function initFACreate(session) {
  // Populate municipality dropdown
  var munSelect = document.getElementById('benMunicipality');
  MUNICIPALITIES.forEach(function (mun) {
    var opt = document.createElement('option');
    opt.value = mun;
    opt.textContent = mun;
    munSelect.appendChild(opt);
  });

  // Populate case type dropdown
  var typeSelect = document.getElementById('faCaseType');
  var types = getFACaseTypes();
  types.forEach(function (t) {
    var opt = document.createElement('option');
    opt.value = t.name;
    opt.textContent = t.name;
    typeSelect.appendChild(opt);
  });

  // Show budget info
  showBudgetInfo(session);

  // Check URL for edit mode
  var params = new URLSearchParams(window.location.search);
  var editId = params.get('edit');
  if (editId) {
    loadForEdit(editId);
  }
}

/**
 * Display the current monthly budget remaining
 * for the active BM.
 *
 * @param {Object} session - Current user session
 */
function showBudgetInfo(session) {
  var container = document.getElementById('budgetInfo');
  var bmId = session.bmId;

  if (!bmId && session.role === 'secretary') {
    // Secretary: show first assigned BM's budget
    if (session.assignedBMs && session.assignedBMs.length > 0) {
      bmId = session.assignedBMs[0];
    }
  }

  if (!bmId) {
    container.style.display = 'none';
    return;
  }

  var yearMonth = getCurrentYearMonth();
  var log = getBudgetLog(bmId, yearMonth);
  var remaining = log ? log.remaining_budget : DEFAULT_FA_BUDGET;
  var pct = getBudgetPercentage(remaining, DEFAULT_FA_BUDGET);

  container.innerHTML =
    '<strong>Monthly Budget (' + yearMonth + ')</strong><br>' +
    'Remaining: <strong>' + formatCurrency(remaining) + '</strong> of ' +
    formatCurrency(DEFAULT_FA_BUDGET) + ' (' + pct + '% used)';
  container.style.display = 'block';
}

/**
 * Navigate between wizard steps. Validates the
 * current step before advancing.
 *
 * @param {number} step - Target step number (1, 2, or 3)
 */
function goToStep(step) {
  // Validate current step before advancing
  if (step === 2) {
    var name = document.getElementById('benFullName').value.trim();
    var mun = document.getElementById('benMunicipality').value;
    if (!name) { showToast('Please enter the beneficiary name.', 'warning'); return; }
    if (!mun) { showToast('Please select a municipality.', 'warning'); return; }
  }

  if (step === 3) {
    var caseType = document.getElementById('faCaseType').value;
    var amount = document.getElementById('faAmount').value;
    if (!caseType) { showToast('Please select a case type.', 'warning'); return; }
    if (!amount || parseFloat(amount) <= 0) { showToast('Please enter a valid amount.', 'warning'); return; }

    // Build review summary before showing step 3
    buildReviewSummary();
  }

  // Show/hide steps
  document.getElementById('step1').style.display = step === 1 ? 'block' : 'none';
  document.getElementById('step2').style.display = step === 2 ? 'block' : 'none';
  document.getElementById('step3').style.display = step === 3 ? 'block' : 'none';

  // Update step indicators
  for (var i = 1; i <= 3; i++) {
    var indicator = document.getElementById('step' + i + 'Indicator');
    indicator.classList.toggle('active', i === step);
    indicator.classList.toggle('completed', i < step);
  }
}

/**
 * Check for duplicate beneficiaries while user types.
 * Shows a warning box with matching records.
 */
function checkDuplicate() {
  var name = document.getElementById('benFullName').value.trim();
  var mun = document.getElementById('benMunicipality').value;
  var warningEl = document.getElementById('duplicateWarning');

  if (name.length < 3) {
    warningEl.style.display = 'none';
    reusingBeneficiaryId = null;
    return;
  }

  var duplicates = findDuplicateBeneficiaries(name, mun);
  if (duplicates.length === 0) {
    warningEl.style.display = 'none';
    reusingBeneficiaryId = null;
    return;
  }

  var html = '<strong>⚠ Possible duplicates found:</strong><ul>';
  duplicates.forEach(function (d) {
    html += '<li>' + escapeHtml(d.full_name) + ' — ' + escapeHtml(d.municipality) +
      ' <button class="btn btn-ghost btn-sm" onclick="useDuplicate(\'' + d.id + '\')">Use this</button></li>';
  });
  html += '</ul>';
  warningEl.innerHTML = html;
  warningEl.style.display = 'block';
}

/**
 * Re-use an existing beneficiary instead of creating
 * a new one. Pre-fills the form fields.
 *
 * @param {string} id - Existing beneficiary ID
 */
function useDuplicate(id) {
  var ben = storageFindById(STORAGE_KEYS.BENEFICIARIES, id);
  if (!ben) return;

  reusingBeneficiaryId = id;
  document.getElementById('benFullName').value = ben.full_name;
  document.getElementById('benMunicipality').value = ben.municipality;
  document.getElementById('benBarangay').value = ben.barangay || '';
  document.getElementById('benContact').value = ben.contact_number || '';

  document.getElementById('duplicateWarning').innerHTML =
    '<strong>✓ Using existing beneficiary:</strong> ' + escapeHtml(ben.full_name);

  showToast('Existing beneficiary selected.', 'info');
}

/**
 * Build the review summary HTML from form values.
 * Shown in Step 3 before final submission.
 */
function buildReviewSummary() {
  var container = document.getElementById('reviewSummary');
  var name = document.getElementById('benFullName').value.trim();
  var mun = document.getElementById('benMunicipality').value;
  var barangay = document.getElementById('benBarangay').value.trim();
  var contact = document.getElementById('benContact').value.trim();
  var caseType = document.getElementById('faCaseType').value;
  var amount = parseFloat(document.getElementById('faAmount').value);
  var notes = document.getElementById('faNotes').value.trim();

  container.innerHTML =
    '<table class="detail-table">' +
    '<tr><td><strong>Beneficiary</strong></td><td>' + escapeHtml(name) + (reusingBeneficiaryId ? ' <em>(existing)</em>' : ' <em>(new)</em>') + '</td></tr>' +
    '<tr><td><strong>Municipality</strong></td><td>' + escapeHtml(mun) + '</td></tr>' +
    (barangay ? '<tr><td><strong>Barangay</strong></td><td>' + escapeHtml(barangay) + '</td></tr>' : '') +
    (contact ? '<tr><td><strong>Contact</strong></td><td>' + escapeHtml(contact) + '</td></tr>' : '') +
    '<tr><td><strong>Case Type</strong></td><td>' + escapeHtml(caseType) + '</td></tr>' +
    '<tr><td><strong>Amount</strong></td><td>' + formatCurrency(amount) + '</td></tr>' +
    (notes ? '<tr><td><strong>Notes</strong></td><td>' + escapeHtml(notes) + '</td></tr>' : '') +
    '</table>';
}

/**
 * Submit the FA record. Creates or reuses beneficiary,
 * creates FA record, deducts from monthly budget,
 * logs activity, and redirects to the list page.
 */
function submitFA() {
  var session = getSession();
  var btn = document.getElementById('submitBtn');
  btn.disabled = true;
  btn.textContent = 'Submitting...';

  var name = document.getElementById('benFullName').value.trim();
  var mun = document.getElementById('benMunicipality').value;
  var barangay = document.getElementById('benBarangay').value.trim();
  var contact = document.getElementById('benContact').value.trim();
  var caseType = document.getElementById('faCaseType').value;
  var amount = parseFloat(document.getElementById('faAmount').value);
  var notes = document.getElementById('faNotes').value.trim();

  // Determine BM ID
  var bmId = session.bmId;
  if (!bmId && session.role === 'secretary') {
    bmId = (session.assignedBMs && session.assignedBMs.length > 0) ? session.assignedBMs[0] : null;
  }
  if (!bmId && session.role === 'admin') {
    // Admin creating on behalf — use first active BM
    var bms = getBoardMembers();
    var active = bms.filter(function (b) { return b.status === 'active'; });
    bmId = active.length > 0 ? active[0].id : null;
  }

  if (!bmId) {
    showToast('No board member assigned. Cannot create record.', 'error');
    btn.disabled = false;
    btn.textContent = 'Submit FA Record';
    return;
  }

  // Create or reuse beneficiary
  var beneficiaryId;
  if (reusingBeneficiaryId) {
    beneficiaryId = reusingBeneficiaryId;
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

  // Create FA record
  var faRecord = {
    id: generateId('FA'),
    beneficiary_id: beneficiaryId,
    board_member_id: bmId,
    case_type: caseType,
    amount: amount,
    status: 'pending',
    notes: notes,
    created_by: session.userId,
    created_at: getNowISO(),
    updated_at: getNowISO()
  };
  addFinancialAssistance(faRecord);

  // Deduct from monthly budget
  deductFromBudget(bmId, amount);

  // Update monthly frequency
  updateMonthlyFrequency(beneficiaryId, bmId);

  // Log activity
  addActivityLog({
    action: 'Created FA record (' + caseType + ', ' + formatCurrency(amount) + ') for ' + name,
    entity_type: 'financial_assistance',
    entity_id: faRecord.id,
    user_id: session.userId,
    performed_by: session.fullName
  });

  showToast('Financial Assistance record created successfully!', 'success');
  setTimeout(function () { window.location.href = 'fa-list.html'; }, 1000);
}

/**
 * Load an existing FA record for editing.
 * Pre-fills all form fields.
 *
 * @param {string} id - FA record ID to edit
 */
function loadForEdit(id) {
  var fa = storageFindById(STORAGE_KEYS.FINANCIAL_ASSISTANCE, id);
  if (!fa) {
    showToast('Record not found.', 'error');
    return;
  }

  document.getElementById('pageTitle').textContent = 'Edit Financial Assistance';

  var ben = storageFindById(STORAGE_KEYS.BENEFICIARIES, fa.beneficiary_id);
  if (ben) {
    reusingBeneficiaryId = ben.id;
    document.getElementById('benFullName').value = ben.full_name;
    document.getElementById('benMunicipality').value = ben.municipality;
    document.getElementById('benBarangay').value = ben.barangay || '';
    document.getElementById('benContact').value = ben.contact_number || '';
  }

  document.getElementById('faCaseType').value = fa.case_type;
  document.getElementById('faAmount').value = fa.amount;
  document.getElementById('faNotes').value = fa.notes || '';
}

/**
 * Update the monthly frequency count for a beneficiary.
 * Tracks how many times a beneficiary receives assistance
 * in a given month (used for frequency flagging).
 *
 * @param {string} beneficiaryId
 * @param {string} bmId
 */
function updateMonthlyFrequency(beneficiaryId, bmId) {
  var yearMonth = getCurrentYearMonth();
  var freq = getMonthlyFrequency(beneficiaryId, yearMonth);

  if (freq) {
    freq.count = (freq.count || 0) + 1;
    freq.updated_at = getNowISO();
    storageUpdateById(STORAGE_KEYS.MONTHLY_FREQUENCY, freq.id, freq);
  } else {
    var newFreq = {
      id: generateId('FREQ'),
      beneficiary_id: beneficiaryId,
      board_member_id: bmId,
      year_month: yearMonth,
      count: 1,
      created_at: getNowISO(),
      updated_at: getNowISO()
    };
    storageAdd(STORAGE_KEYS.MONTHLY_FREQUENCY, newFreq);
  }
}
