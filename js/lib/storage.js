/* ==============================================
 * storage.js
 * PURPOSE: localStorage CRUD wrapper. Every data
 * entity (users, FA records, PA records, etc.)
 * is stored as a JSON array in localStorage.
 * This file provides generic and entity-specific
 * functions to read, write, find, update, and
 * delete records without touching localStorage
 * directly from page scripts.
 *
 * CONTAINS:
 *  - Generic: getAll, save, findById, updateById, removeById
 *  - Users: getUsers, addUser, findUserByEmail
 *  - Board Members: getBMs, addBM, getBMByUserId
 *  - Secretary Assignments: getAssignments, etc.
 *  - FA Case Types: getFACaseTypes, addFACaseType
 *  - PA Categories: getPACategories, addPACategory
 *  - Beneficiaries: getBeneficiaries, addBeneficiary, findDuplicates
 *  - Financial Assistance: getFARecords, addFARecord
 *  - Personal Assistance: getPARecords, addPARecord
 *  - Monthly Budget: getBudgetLog, updateBudgetLog
 *  - Activity Logs: addActivityLog, getActivityLogs
 *  - Monthly Frequency: getMonthlyFreq, updateFreq
 *
 * USED BY: pages/*.js, auth.js, seed.js
 * DEPENDS ON: constants.js (STORAGE_KEYS)
 * ============================================== */

/* -----------------------------------------------
 * GENERIC CRUD OPERATIONS
 * Reusable functions for any localStorage key
 * ----------------------------------------------- */

/**
 * Get all records from a localStorage key
 * @param {string} key - One of STORAGE_KEYS values
 * @returns {Array} Parsed JSON array, or []
 */
function storageGetAll(key) {
  try {
    var data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Storage read error for ' + key, e);
    return [];
  }
}

/**
 * Save entire array to a localStorage key
 * @param {string} key - One of STORAGE_KEYS values
 * @param {Array} data - Array of records
 */
function storageSave(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Storage write error for ' + key, e);
  }
}

/**
 * Find a single record by its ID field
 * @param {string} key     - Storage key
 * @param {string} idField - Name of the ID property (e.g., "user_id")
 * @param {string} id      - The ID value to match
 * @returns {object|null}
 */
function storageFindById(key, idField, id) {
  var all = storageGetAll(key);
  for (var i = 0; i < all.length; i++) {
    if (all[i][idField] === id) return all[i];
  }
  return null;
}

/**
 * Add a new record to a storage key
 * @param {string} key    - Storage key
 * @param {object} record - Record to add
 */
function storageAdd(key, record) {
  var all = storageGetAll(key);
  all.push(record);
  storageSave(key, all);
}

/**
 * Update a record by its ID field (merges properties)
 * @param {string} key      - Storage key
 * @param {string} idField  - Name of ID property
 * @param {string} id       - ID value to match
 * @param {object} updates  - Properties to merge
 * @returns {boolean} true if found and updated
 */
function storageUpdateById(key, idField, id, updates) {
  var all = storageGetAll(key);
  for (var i = 0; i < all.length; i++) {
    if (all[i][idField] === id) {
      Object.assign(all[i], updates);
      storageSave(key, all);
      return true;
    }
  }
  return false;
}

/**
 * Remove a record by its ID field
 * @param {string} key     - Storage key
 * @param {string} idField - Name of ID property
 * @param {string} id      - ID value to remove
 * @returns {boolean} true if found and removed
 */
function storageRemoveById(key, idField, id) {
  var all = storageGetAll(key);
  var filtered = all.filter(function (r) { return r[idField] !== id; });
  if (filtered.length < all.length) {
    storageSave(key, filtered);
    return true;
  }
  return false;
}


/* -----------------------------------------------
 * USERS
 * ----------------------------------------------- */

function getUsers() { return storageGetAll(STORAGE_KEYS.USERS); }

function addUser(user) {
  user.user_id = user.user_id || generateId();
  user.created_at = user.created_at || getNowISO();
  storageAdd(STORAGE_KEYS.USERS, user);
  return user;
}

function findUserByEmail(email) {
  var users = getUsers();
  for (var i = 0; i < users.length; i++) {
    if (users[i].email.toLowerCase() === email.toLowerCase()) return users[i];
  }
  return null;
}

function updateUser(userId, updates) {
  return storageUpdateById(STORAGE_KEYS.USERS, 'user_id', userId, updates);
}


/* -----------------------------------------------
 * BOARD MEMBERS
 * ----------------------------------------------- */

function getBMs() { return storageGetAll(STORAGE_KEYS.BOARD_MEMBERS); }

function addBM(bm) {
  bm.bm_id = bm.bm_id || generateId();
  storageAdd(STORAGE_KEYS.BOARD_MEMBERS, bm);
  return bm;
}

function getBMByUserId(userId) {
  return storageFindById(STORAGE_KEYS.BOARD_MEMBERS, 'user_id', userId);
}

function getBMById(bmId) {
  return storageFindById(STORAGE_KEYS.BOARD_MEMBERS, 'bm_id', bmId);
}

function updateBM(bmId, updates) {
  return storageUpdateById(STORAGE_KEYS.BOARD_MEMBERS, 'bm_id', bmId, updates);
}

/**
 * Get user-friendly BM name by bm_id
 */
function getBMName(bmId) {
  var bm = getBMById(bmId);
  if (!bm) return 'Unknown';
  var user = storageFindById(STORAGE_KEYS.USERS, 'user_id', bm.user_id);
  return user ? user.full_name : 'Unknown';
}


/* -----------------------------------------------
 * SECRETARY ASSIGNMENTS
 * ----------------------------------------------- */

function getAssignments() { return storageGetAll(STORAGE_KEYS.SECRETARY_ASSIGNMENTS); }

function addAssignment(assignment) {
  assignment.assignment_id = assignment.assignment_id || generateId();
  assignment.assigned_at = getNowISO();
  storageAdd(STORAGE_KEYS.SECRETARY_ASSIGNMENTS, assignment);
  return assignment;
}

/**
 * Get all BM IDs assigned to a secretary
 */
function getAssignedBMIds(secretaryUserId) {
  var assignments = getAssignments();
  return assignments
    .filter(function (a) { return a.secretary_user_id === secretaryUserId; })
    .map(function (a) { return a.bm_id; });
}


/* -----------------------------------------------
 * FA CASE TYPES (Category Management)
 * ----------------------------------------------- */

function getFACaseTypes() { return storageGetAll(STORAGE_KEYS.FA_CASE_TYPES); }

function getActiveFACaseTypes() {
  return getFACaseTypes().filter(function (t) { return !t.is_archived; });
}

function addFACaseType(caseType) {
  caseType.type_id = caseType.type_id || generateId();
  caseType.created_at = getNowISO();
  storageAdd(STORAGE_KEYS.FA_CASE_TYPES, caseType);
  return caseType;
}

function updateFACaseType(typeId, updates) {
  return storageUpdateById(STORAGE_KEYS.FA_CASE_TYPES, 'type_id', typeId, updates);
}

/** Count FA records using a specific case type */
function countFARecordsByType(typeId) {
  var records = getFARecords();
  return records.filter(function (r) { return r.case_type_id === typeId && !r.is_archived; }).length;
}


/* -----------------------------------------------
 * PA CATEGORIES (Category Management)
 * ----------------------------------------------- */

function getPACategories() { return storageGetAll(STORAGE_KEYS.PA_CATEGORIES); }

function getActivePACategories() {
  return getPACategories().filter(function (c) { return !c.is_archived; });
}

function addPACategory(category) {
  category.category_id = category.category_id || generateId();
  category.created_at = getNowISO();
  storageAdd(STORAGE_KEYS.PA_CATEGORIES, category);
  return category;
}

function updatePACategory(catId, updates) {
  return storageUpdateById(STORAGE_KEYS.PA_CATEGORIES, 'category_id', catId, updates);
}

/** Count PA records using a specific category */
function countPARecordsByCat(catId) {
  var records = getPARecords();
  return records.filter(function (r) { return r.category_id === catId && !r.is_archived; }).length;
}


/* -----------------------------------------------
 * BENEFICIARIES
 * ----------------------------------------------- */

function getBeneficiaries() { return storageGetAll(STORAGE_KEYS.BENEFICIARIES); }

function addBeneficiary(b) {
  b.beneficiary_id = b.beneficiary_id || generateId();
  b.created_at = getNowISO();
  storageAdd(STORAGE_KEYS.BENEFICIARIES, b);
  return b;
}

function getBeneficiaryById(id) {
  return storageFindById(STORAGE_KEYS.BENEFICIARIES, 'beneficiary_id', id);
}

/**
 * Find duplicate beneficiaries by name (fuzzy match)
 * Used during FA/PA form to warn about repeat requesters
 */
function findDuplicateBeneficiaries(fullName) {
  if (!fullName || fullName.length < 3) return [];
  var search = fullName.toLowerCase().trim();
  var all = getBeneficiaries();
  return all.filter(function (b) {
    return b.full_name.toLowerCase().includes(search) ||
           search.includes(b.full_name.toLowerCase());
  });
}

/**
 * Find or create a beneficiary by exact name + DOB + barangay + municipality
 */
function findOrCreateBeneficiary(data) {
  var all = getBeneficiaries();
  var existing = all.find(function (b) {
    return b.full_name.toLowerCase() === data.full_name.toLowerCase() &&
           b.date_of_birth === data.date_of_birth &&
           b.barangay === data.barangay &&
           b.municipality === data.municipality;
  });
  if (existing) return existing;
  return addBeneficiary(data);
}


/* -----------------------------------------------
 * FINANCIAL ASSISTANCE RECORDS
 * ----------------------------------------------- */

function getFARecords() { return storageGetAll(STORAGE_KEYS.FINANCIAL_ASSISTANCE); }

function addFARecord(record) {
  record.fa_id = record.fa_id || generateId();
  record.created_at = getNowISO();
  record.updated_at = getNowISO();
  storageAdd(STORAGE_KEYS.FINANCIAL_ASSISTANCE, record);
  return record;
}

function updateFARecord(faId, updates) {
  updates.updated_at = getNowISO();
  return storageUpdateById(STORAGE_KEYS.FINANCIAL_ASSISTANCE, 'fa_id', faId, updates);
}

/** Get FA records filtered by BM ID */
function getFARecordsByBM(bmId) {
  return getFARecords().filter(function (r) { return r.bm_id === bmId; });
}


/* -----------------------------------------------
 * PERSONAL ASSISTANCE RECORDS
 * ----------------------------------------------- */

function getPARecords() { return storageGetAll(STORAGE_KEYS.PERSONAL_ASSISTANCE); }

function addPARecord(record) {
  record.pa_id = record.pa_id || generateId();
  record.created_at = getNowISO();
  record.updated_at = getNowISO();
  storageAdd(STORAGE_KEYS.PERSONAL_ASSISTANCE, record);
  return record;
}

function updatePARecord(paId, updates) {
  updates.updated_at = getNowISO();
  return storageUpdateById(STORAGE_KEYS.PERSONAL_ASSISTANCE, 'pa_id', paId, updates);
}

function getPARecordsByBM(bmId) {
  return getPARecords().filter(function (r) { return r.bm_id === bmId; });
}


/* -----------------------------------------------
 * MONTHLY BUDGET LOGS
 * ----------------------------------------------- */

function getBudgetLogs() { return storageGetAll(STORAGE_KEYS.MONTHLY_BUDGET_LOGS); }

/**
 * Get or create the current month's budget log for a BM
 * Auto-creates with default budget if it doesn't exist
 */
function getOrCreateBudgetLog(bmId) {
  var ym = getCurrentYearMonth();
  var logs = getBudgetLogs();
  var existing = logs.find(function (l) { return l.bm_id === bmId && l.year_month === ym; });
  if (existing) return existing;

  var bm = getBMById(bmId);
  var budget = bm ? bm.fa_monthly_budget : DEFAULT_FA_BUDGET;

  // Check for rollover from previous month
  var prevMonth = getPreviousYearMonth(ym);
  var prevLog = logs.find(function (l) { return l.bm_id === bmId && l.year_month === prevMonth; });
  var rollover = (prevLog && prevLog.rollover_selected) ? prevLog.remaining_amount : 0;

  var newLog = {
    log_id: generateId(),
    bm_id: bmId,
    year_month: ym,
    base_budget: budget,
    rollover_amount: rollover,
    rollover_selected: false,
    total_budget: budget + rollover,
    used_amount: 0,
    remaining_amount: budget + rollover,
    closed_at: null
  };
  storageAdd(STORAGE_KEYS.MONTHLY_BUDGET_LOGS, newLog);
  return newLog;
}

/** Helper: get previous year-month string */
function getPreviousYearMonth(ym) {
  var parts = ym.split('-');
  var y = parseInt(parts[0]);
  var m = parseInt(parts[1]) - 1;
  if (m === 0) { m = 12; y--; }
  return y + '-' + String(m).padStart(2, '0');
}

/**
 * Deduct amount from current month budget
 */
function deductFromBudget(bmId, amount) {
  var ym = getCurrentYearMonth();
  var logs = getBudgetLogs();
  for (var i = 0; i < logs.length; i++) {
    if (logs[i].bm_id === bmId && logs[i].year_month === ym) {
      logs[i].used_amount += amount;
      logs[i].remaining_amount = logs[i].total_budget - logs[i].used_amount;
      storageSave(STORAGE_KEYS.MONTHLY_BUDGET_LOGS, logs);
      return logs[i];
    }
  }
  return null;
}


/* -----------------------------------------------
 * ACTIVITY LOGS (Audit Trail)
 * ----------------------------------------------- */

function getActivityLogs() { return storageGetAll(STORAGE_KEYS.ACTIVITY_LOGS); }

/**
 * Add an entry to the audit trail
 * @param {string} userId     - Who performed the action
 * @param {string} action     - Description: "Created FA record"
 * @param {string} actionType - One of: create, edit, archive, restore, login, logout, etc.
 * @param {string} recordType - "FA", "PA", "user", "category", etc.
 * @param {string} recordId   - ID of affected record
 * @param {string} details    - Additional context
 */
function addActivityLog(userId, action, actionType, recordType, recordId, details) {
  var log = {
    log_id: generateId(),
    user_id: userId,
    action: action,
    action_type: actionType,
    record_type: recordType || '',
    record_id: recordId || '',
    details: details || '',
    created_at: getNowISO()
  };
  storageAdd(STORAGE_KEYS.ACTIVITY_LOGS, log);
  return log;
}


/* -----------------------------------------------
 * MONTHLY FREQUENCY TRACKER
 * ----------------------------------------------- */

function getMonthlyFrequency() { return storageGetAll(STORAGE_KEYS.MONTHLY_FREQUENCY); }

/**
 * Increment the request count for a beneficiary this month
 * @param {string} beneficiaryId
 * @param {string} type - "fa" or "pa"
 * @param {number} amount - Transaction amount
 */
function incrementFrequency(beneficiaryId, type, amount) {
  var ym = getCurrentYearMonth();
  var all = getMonthlyFrequency();
  var idx = -1;
  for (var i = 0; i < all.length; i++) {
    if (all[i].beneficiary_id === beneficiaryId && all[i].year_month === ym) {
      idx = i;
      break;
    }
  }
  if (idx >= 0) {
    if (type === 'fa') all[idx].fa_count++;
    if (type === 'pa') all[idx].pa_count++;
    all[idx].total_amount += (amount || 0);
  } else {
    all.push({
      freq_id: generateId(),
      beneficiary_id: beneficiaryId,
      year_month: ym,
      fa_count: type === 'fa' ? 1 : 0,
      pa_count: type === 'pa' ? 1 : 0,
      total_amount: amount || 0
    });
  }
  storageSave(STORAGE_KEYS.MONTHLY_FREQUENCY, all);
}

/**
 * Get total request count for a beneficiary this month
 */
function getBeneficiaryMonthlyCount(beneficiaryId) {
  var ym = getCurrentYearMonth();
  var all = getMonthlyFrequency();
  var entry = all.find(function (f) {
    return f.beneficiary_id === beneficiaryId && f.year_month === ym;
  });
  if (!entry) return 0;
  return entry.fa_count + entry.pa_count;
}
