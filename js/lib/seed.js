/* ==============================================
 * seed.js
 * PURPOSE: Initialize localStorage with default
 * data on first visit. Creates the SysAdmin account,
 * sample Board Members, FA case types, PA categories,
 * and a sample Secretary. Runs once — controlled by
 * the INITIALIZED flag in localStorage.
 *
 * CONTAINS:
 *  - initializeApp() → Main initializer (call on every page load)
 *  - seedUsers()     → Creates SysAdmin + sample BMs
 *  - seedCategories() → Inserts permanent FA/PA categories
 *  - seedSampleData() → Adds demo beneficiaries/records
 *
 * USED BY: Every HTML page calls initializeApp() on load
 * DEPENDS ON: constants.js, utils.js, storage.js
 * ============================================== */

/**
 * Main entry point: check if app has been initialized.
 * If not, seed all default data into localStorage.
 * Safe to call multiple times — only seeds once.
 */
function initializeApp() {
  if (localStorage.getItem(STORAGE_KEYS.INITIALIZED)) return;

  console.log('OMSP: First-time initialization — seeding default data...');

  seedUsers();
  seedCategories();
  seedSampleData();

  localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
  console.log('OMSP: Initialization complete.');
}

/**
 * Create default user accounts:
 * - 1 SysAdmin
 * - 3 Sample Board Members (District 1, 2, 3)
 * - 1 Sample Secretary (assigned to BM District 1)
 */
function seedUsers() {
  // SysAdmin
  var admin = addUser({
    user_id: 'admin-001',
    email: 'admin@omsp.gov.ph',
    password: 'admin123',
    full_name: 'System Administrator',
    role: 'sysadmin',
    is_active: true,
    is_temp_account: false,
    last_login: null
  });

  // Board Members
  var bm1User = addUser({
    user_id: 'bm-user-001',
    email: 'cruz@omsp.gov.ph',
    password: 'bm123',
    full_name: 'Juan Dela Cruz',
    role: 'board_member',
    is_active: true,
    is_temp_account: false,
    last_login: null
  });

  var bm2User = addUser({
    user_id: 'bm-user-002',
    email: 'santos@omsp.gov.ph',
    password: 'bm123',
    full_name: 'Maria Santos',
    role: 'board_member',
    is_active: true,
    is_temp_account: false,
    last_login: null
  });

  var bm3User = addUser({
    user_id: 'bm-user-003',
    email: 'reyes@omsp.gov.ph',
    password: 'bm123',
    full_name: 'Pedro Reyes',
    role: 'board_member',
    is_active: true,
    is_temp_account: false,
    last_login: null
  });

  // Board Member profiles with terms
  addBM({
    bm_id: 'bm-001',
    user_id: 'bm-user-001',
    district_name: 'District 1',
    current_term_number: 1,
    term_start: '2025-07-01',
    term_end: '2028-06-30',
    fa_monthly_budget: 70000,
    is_active: true,
    archive_requested: false,
    archive_requested_at: null,
    is_archived: false,
    archived_at: null,
    archived_by: null
  });

  addBM({
    bm_id: 'bm-002',
    user_id: 'bm-user-002',
    district_name: 'District 2',
    current_term_number: 1,
    term_start: '2025-07-01',
    term_end: '2028-06-30',
    fa_monthly_budget: 70000,
    is_active: true,
    archive_requested: false,
    archive_requested_at: null,
    is_archived: false,
    archived_at: null,
    archived_by: null
  });

  addBM({
    bm_id: 'bm-003',
    user_id: 'bm-user-003',
    district_name: 'District 3',
    current_term_number: 1,
    term_start: '2025-07-01',
    term_end: '2028-06-30',
    fa_monthly_budget: 70000,
    is_active: true,
    archive_requested: false,
    archive_requested_at: null,
    is_archived: false,
    archived_at: null,
    archived_by: null
  });

  // Secretary (assigned to BM District 1)
  var sec = addUser({
    user_id: 'sec-user-001',
    email: 'secretary1@omsp.gov.ph',
    password: 'sec123',
    full_name: 'Ana Garcia',
    role: 'secretary',
    is_active: true,
    is_temp_account: true,
    last_login: null
  });

  addAssignment({
    secretary_user_id: 'sec-user-001',
    bm_id: 'bm-001',
    can_add_allowance: false,
    can_make_permanent_category: false
  });
}

/**
 * Insert permanent (default) FA case types and PA categories
 * These cannot be deleted — is_permanent = true
 */
function seedCategories() {
  // FA Case Types (permanent defaults)
  var faTypes = ['Medical', 'Hospital Bill', 'Lab / Therapy', 'Burial'];
  faTypes.forEach(function (name) {
    addFACaseType({
      type_name: name,
      is_default: true,
      is_permanent: true,
      created_by: 'admin-001',
      is_archived: false,
      archived_at: null,
      archived_by: null
    });
  });

  // PA Categories (permanent defaults)
  var paCategories = ['Personal', 'Hospital Bill', 'Medical', 'Others'];
  paCategories.forEach(function (name) {
    addPACategory({
      category_name: name,
      is_default: true,
      is_permanent: true,
      created_by: 'admin-001',
      is_archived: false,
      archived_at: null,
      archived_by: null
    });
  });
}

/**
 * Insert a few sample beneficiaries and records for demo purposes
 */
function seedSampleData() {
  // Sample beneficiaries
  addBeneficiary({
    beneficiary_id: 'ben-001',
    full_name: 'Roberto Gonzales',
    date_of_birth: '1985-03-15',
    barangay: 'Poblacion',
    municipality: 'Balanga City',
    contact_number: '09171234567',
    address: 'Poblacion, Balanga City, Bataan'
  });

  addBeneficiary({
    beneficiary_id: 'ben-002',
    full_name: 'Elena Mendoza',
    date_of_birth: '1990-08-22',
    barangay: 'San Jose',
    municipality: 'Orani',
    contact_number: '09189876543',
    address: 'San Jose, Orani, Bataan'
  });

  addBeneficiary({
    beneficiary_id: 'ben-003',
    full_name: 'Carlos Aquino',
    date_of_birth: '1978-12-01',
    barangay: 'Bagong Silang',
    municipality: 'Hermosa',
    contact_number: '09201112233',
    address: 'Bagong Silang, Hermosa, Bataan'
  });

  // Sample FA records
  var faTypes = getFACaseTypes();
  var medicalType = faTypes.find(function(t) { return t.type_name === 'Medical'; });
  var hospitalType = faTypes.find(function(t) { return t.type_name === 'Hospital Bill'; });

  if (medicalType) {
    addFARecord({
      beneficiary_id: 'ben-001',
      patient_name: 'Roberto Gonzales',
      case_type_id: medicalType.type_id,
      case_type_custom: '',
      status: 'Successful',
      amount_requested: 5000,
      amount_approved: 5000,
      bm_id: 'bm-001',
      wait_duration_months: 3,
      wait_duration_custom: '',
      next_available_date: addMonths(getTodayISO(), 3),
      skip_waiting_period: false,
      skip_reason: '',
      skip_bm_noted: false,
      encoded_by: 'sec-user-001',
      is_archived: false,
      archived_at: null
    });
  }

  if (hospitalType) {
    addFARecord({
      beneficiary_id: 'ben-002',
      patient_name: 'Elena Mendoza',
      case_type_id: hospitalType.type_id,
      case_type_custom: '',
      status: 'Ongoing',
      amount_requested: 15000,
      amount_approved: 0,
      bm_id: 'bm-001',
      wait_duration_months: 6,
      wait_duration_custom: '',
      next_available_date: addMonths(getTodayISO(), 6),
      skip_waiting_period: false,
      skip_reason: '',
      skip_bm_noted: false,
      encoded_by: 'sec-user-001',
      is_archived: false,
      archived_at: null
    });
  }

  // Sample PA record
  var paCategories = getPACategories();
  var personalCat = paCategories.find(function(c) { return c.category_name === 'Personal'; });
  if (personalCat) {
    addPARecord({
      beneficiary_id: 'ben-003',
      client_name: 'Carlos Aquino',
      address: 'Bagong Silang, Hermosa, Bataan',
      event_purpose: 'Financial aid for school supplies',
      category_id: personalCat.category_id,
      action_taken: 'Provided assistance',
      amount_provided: 2000,
      running_balance: 0,
      skip_waiting_period: false,
      skip_reason: '',
      skip_bm_noted: false,
      bm_id: 'bm-001',
      encoded_by: 'sec-user-001',
      office_note: '',
      flagged_for_review: false,
      is_archived: false
    });
  }

  // Initialize budget log for BM-001
  getOrCreateBudgetLog('bm-001');

  // Deduct sample FA amounts from budget
  deductFromBudget('bm-001', 5000);

  // Log initialization
  addActivityLog('admin-001', 'System initialized with seed data', 'create', 'system', '', 'First-time app setup');
}
