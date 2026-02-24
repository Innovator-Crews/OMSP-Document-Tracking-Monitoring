/**
 * ============================================================
 * OMSP Document Tracking / Monitoring
 * Storage Module - localStorage wrapper with CRUD operations
 * ============================================================
 * Provides all data persistence operations:
 * - Generic get/set/remove for localStorage
 * - CRUD operations (create, read, update, soft-delete, restore)
 * - ID generation
 * - Query/filter capabilities
 * - Default data seeding
 * ============================================================
 */

const KEYS = {
  USERS: 'bataan_sp_users',
  BOARD_MEMBERS: 'bataan_sp_board_members',
  SECRETARY_ASSIGNMENTS: 'bataan_sp_secretary_assignments',
  BENEFICIARIES: 'bataan_sp_beneficiaries',
  FA_RECORDS: 'bataan_sp_fa_records',
  PA_RECORDS: 'bataan_sp_pa_records',
  FA_CATEGORIES: 'bataan_sp_fa_categories',
  PA_CATEGORIES: 'bataan_sp_pa_categories',
  MONTHLY_BUDGETS: 'bataan_sp_monthly_budgets',
  PA_BUDGETS: 'bataan_sp_pa_budgets',
  ACTIVITY_LOGS: 'bataan_sp_activity_logs',
  MONTHLY_FREQUENCY: 'bataan_sp_monthly_frequency',
  CURRENT_USER: 'bataan_sp_current_user',
  SETTINGS: 'bataan_sp_settings'
};

const Storage = {
  /* --------------------------------------------------------
   * GENERIC OPERATIONS
   * -------------------------------------------------------- */

  /**
   * Get parsed data from localStorage
   * @param {string} key - localStorage key
   * @returns {any} Parsed data or null
   */
  get(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error(`Storage.get error for key "${key}":`, e);
      return null;
    }
  },

  /**
   * Save data to localStorage
   * @param {string} key - localStorage key
   * @param {any} data - Data to store
   */
  set(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error(`Storage.set error for key "${key}":`, e);
      if (e.name === 'QuotaExceededError') {
        Notifications.toast('Storage is full. Please clear some data.', 'error');
      }
    }
  },

  /**
   * Remove a key from localStorage
   * @param {string} key - localStorage key
   */
  remove(key) {
    localStorage.removeItem(key);
  },

  /**
   * Generate a unique ID with optional prefix
   * @param {string} prefix - ID prefix (e.g., 'fa', 'pa', 'usr')
   * @returns {string} Unique ID like "fa_a1b2c3d4"
   */
  generateId(prefix = 'id') {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let id = '';
    for (let i = 0; i < 8; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `${prefix}_${id}`;
  },

  /* --------------------------------------------------------
   * CRUD OPERATIONS
   * -------------------------------------------------------- */

  /**
   * Get all records from a collection
   * @param {string} key - localStorage key
   * @returns {Array} Array of records
   */
  getAll(key) {
    return this.get(key) || [];
  },

  /**
   * Find a single record by its ID
   * @param {string} key - localStorage key
   * @param {string} id - Record ID value
   * @param {string} idField - Name of the ID field (default auto-detect)
   * @returns {Object|null} Found record or null
   */
  getById(key, id, idField) {
    const records = this.getAll(key);
    if (!idField) {
      // Auto-detect ID field from first record
      if (records.length > 0) {
        const fields = Object.keys(records[0]);
        idField = fields.find(f => f.endsWith('_id')) || fields[0];
      } else {
        return null;
      }
    }
    return records.find(r => r[idField] === id) || null;
  },

  /**
   * Add a new record to a collection
   * @param {string} key - localStorage key
   * @param {Object} record - Record to add
   * @returns {Object} The added record
   */
  add(key, record) {
    const records = this.getAll(key);
    records.push(record);
    this.set(key, records);
    return record;
  },

  /**
   * Update an existing record
   * @param {string} key - localStorage key
   * @param {string} id - Record ID
   * @param {Object} updates - Fields to update
   * @param {string} idField - Name of the ID field
   * @returns {boolean} Success
   */
  update(key, id, updates, idField) {
    const records = this.getAll(key);
    if (!idField && records.length > 0) {
      const fields = Object.keys(records[0]);
      idField = fields.find(f => f.endsWith('_id')) || fields[0];
    }
    const index = records.findIndex(r => r[idField] === id);
    if (index === -1) return false;

    records[index] = { ...records[index], ...updates, updated_at: new Date().toISOString() };
    this.set(key, records);
    return true;
  },

  /**
   * Soft-delete a record (set is_archived = true)
   * @param {string} key - localStorage key
   * @param {string} id - Record ID
   * @param {string} idField - ID field name
   * @param {string} userId - Who performed the archive
   * @returns {boolean} Success
   */
  softDelete(key, id, idField, userId) {
    return this.update(key, id, {
      is_archived: true,
      archived_at: new Date().toISOString(),
      archived_by: userId
    }, idField);
  },

  /**
   * Restore a soft-deleted record
   * @param {string} key - localStorage key
   * @param {string} id - Record ID
   * @param {string} idField - ID field name
   * @returns {boolean} Success
   */
  restore(key, id, idField) {
    return this.update(key, id, {
      is_archived: false,
      archived_at: null,
      archived_by: null
    }, idField);
  },

  /**
   * Permanently remove a record
   * @param {string} key - localStorage key
   * @param {string} id - Record ID
   * @param {string} idField - ID field name
   * @returns {boolean} Success
   */
  hardDelete(key, id, idField) {
    const records = this.getAll(key);
    if (!idField && records.length > 0) {
      const fields = Object.keys(records[0]);
      idField = fields.find(f => f.endsWith('_id')) || fields[0];
    }
    const filtered = records.filter(r => r[idField] !== id);
    if (filtered.length === records.length) return false;
    this.set(key, filtered);
    return true;
  },

  /**
   * Query/filter records by criteria
   * @param {string} key - localStorage key
   * @param {Object} filters - Key-value pairs to match
   * @param {Object} options - { includeArchived, sortBy, sortDir, limit }
   * @returns {Array} Filtered records
   */
  query(key, filters = {}, options = {}) {
    let records = this.getAll(key);

    // Filter out archived unless requested
    if (!options.includeArchived) {
      records = records.filter(r => !r.is_archived);
    }

    // Apply filters
    Object.entries(filters).forEach(([field, value]) => {
      if (value === undefined || value === null || value === '') return;
      records = records.filter(r => {
        const fieldVal = r[field];
        if (typeof value === 'string' && typeof fieldVal === 'string') {
          return fieldVal.toLowerCase().includes(value.toLowerCase());
        }
        return fieldVal === value;
      });
    });

    // Sort
    if (options.sortBy) {
      const dir = options.sortDir === 'asc' ? 1 : -1;
      records.sort((a, b) => {
        const aVal = a[options.sortBy] || '';
        const bVal = b[options.sortBy] || '';
        if (typeof aVal === 'string') return aVal.localeCompare(bVal) * dir;
        return (aVal - bVal) * dir;
      });
    }

    // Limit
    if (options.limit) {
      records = records.slice(0, options.limit);
    }

    return records;
  },

  /* --------------------------------------------------------
   * BUDGET OPERATIONS
   * -------------------------------------------------------- */

  /**
   * Get current month's budget for a Board Member
   * @param {string} bmId - Board Member ID
   * @returns {Object} Budget record
   */
  getCurrentBudget(bmId) {
    const yearMonth = Utils.getCurrentYearMonth();
    const budgets = this.getAll(KEYS.MONTHLY_BUDGETS);
    let budget = budgets.find(b => b.bm_id === bmId && b.year_month === yearMonth);

    if (!budget) {
      // Create new month budget
      const bm = this.getById(KEYS.BOARD_MEMBERS, bmId, 'bm_id');
      const baseBudget = bm ? bm.fa_monthly_budget : 70000;

      // Check rollover from last month
      let rollover = 0;
      const lastMonth = Utils.getPreviousYearMonth(yearMonth);
      const lastBudget = budgets.find(b => b.bm_id === bmId && b.year_month === lastMonth);
      if (lastBudget && lastBudget.rollover_selected) {
        rollover = lastBudget.remaining_amount || 0;
      }

      budget = {
        log_id: this.generateId('budg'),
        bm_id: bmId,
        year_month: yearMonth,
        base_budget: baseBudget,
        rollover_amount: rollover,
        rollover_selected: false,
        total_budget: baseBudget + rollover,
        used_amount: 0,
        remaining_amount: baseBudget + rollover,
        closed_at: null
      };
      this.add(KEYS.MONTHLY_BUDGETS, budget);
    }

    return budget;
  },

  /**
   * Deduct amount from BM's current month budget
   * @param {string} bmId - Board Member ID
   * @param {number} amount - Amount to deduct
   * @returns {{ success: boolean, budget: Object, error?: string }}
   */
  deductFromBudget(bmId, amount) {
    const budget = this.getCurrentBudget(bmId);
    if (amount > budget.remaining_amount) {
      return {
        success: false,
        budget,
        error: `Insufficient budget. Remaining: ₱${Utils.formatCurrency(budget.remaining_amount)}, Requested: ₱${Utils.formatCurrency(amount)}`
      };
    }

    const updates = {
      used_amount: budget.used_amount + amount,
      remaining_amount: budget.remaining_amount - amount
    };

    this.update(KEYS.MONTHLY_BUDGETS, budget.log_id, updates, 'log_id');
    return { success: true, budget: { ...budget, ...updates } };
  },

  /**
   * Refund amount back to budget (e.g., when FA denied)
   * @param {string} bmId - Board Member ID
   * @param {number} amount - Amount to refund
   * @param {string} yearMonth - Budget month
   */
  refundBudget(bmId, amount, yearMonth) {
    const budgets = this.getAll(KEYS.MONTHLY_BUDGETS);
    const budget = budgets.find(b => b.bm_id === bmId && b.year_month === yearMonth);
    if (budget) {
      this.update(KEYS.MONTHLY_BUDGETS, budget.log_id, {
        used_amount: Math.max(0, budget.used_amount - amount),
        remaining_amount: budget.remaining_amount + amount
      }, 'log_id');
    }
  },

  /**
   * Get budget history for a BM
   * @param {string} bmId - Board Member ID
   * @returns {Array} Budget records sorted by month desc
   */
  getBudgetHistory(bmId) {
    return this.getAll(KEYS.MONTHLY_BUDGETS)
      .filter(b => b.bm_id === bmId)
      .sort((a, b) => b.year_month.localeCompare(a.year_month));
  },

  /**
   * Set rollover preference for current month
   * @param {string} bmId - Board Member ID
   * @param {boolean} selected - Whether to roll over remaining
   */
  setRollover(bmId, selected) {
    const budget = this.getCurrentBudget(bmId);
    this.update(KEYS.MONTHLY_BUDGETS, budget.log_id, { rollover_selected: selected }, 'log_id');
  },

  /* --------------------------------------------------------
   * PA BUDGET OPERATIONS  (pool-based, not monthly)
   * -------------------------------------------------------- */

  /**
   * Get all PA budget entries for a Board Member
   * @param {string} bmId - Board Member ID
   * @returns {Array} PA budget entries sorted by created_at desc
   */
  getPABudgets(bmId) {
    return this.getAll(KEYS.PA_BUDGETS)
      .filter(b => b.bm_id === bmId && !b.is_deleted)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  /**
   * Get total PA budget pool for a BM
   * @param {string} bmId - Board Member ID
   * @returns {{ total_pool: number, total_used: number, remaining: number, entries: Array }}
   */
  getPABudgetSummary(bmId) {
    const entries = this.getPABudgets(bmId);
    const totalPool = entries.reduce((s, e) => s + e.amount, 0);
    const paRecords = this.query(KEYS.PA_RECORDS, { bm_id: bmId });
    const totalUsed = paRecords.reduce((s, r) => s + (r.amount_provided || 0), 0);
    return {
      total_pool: totalPool,
      total_used: totalUsed,
      remaining: totalPool - totalUsed,
      entries
    };
  },

  /**
   * Add a PA budget entry
   * @param {string} bmId - Board Member ID
   * @param {number} amount - Budget amount to add
   * @param {string} description - Description / note
   * @param {string} addedBy - User ID who added
   * @returns {Object} Created entry
   */
  addPABudget(bmId, amount, description, addedBy) {
    const entry = {
      pa_budget_id: this.generateId('pab'),
      bm_id: bmId,
      amount: parseFloat(amount),
      description: description || '',
      added_by: addedBy,
      is_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.add(KEYS.PA_BUDGETS, entry);
    return entry;
  },

  /**
   * Update a PA budget entry
   * @param {string} entryId - PA budget entry ID
   * @param {number} amount - New amount
   * @param {string} description - New description
   * @returns {boolean} Success
   */
  updatePABudget(entryId, amount, description) {
    return this.update(KEYS.PA_BUDGETS, entryId, {
      amount: parseFloat(amount),
      description: description || ''
    }, 'pa_budget_id');
  },

  /**
   * Remove a PA budget entry (soft delete)
   * @param {string} entryId - PA budget entry ID
   * @returns {boolean} Success
   */
  removePABudget(entryId) {
    return this.update(KEYS.PA_BUDGETS, entryId, { is_deleted: true }, 'pa_budget_id');
  },

  /**
   * Deduct from PA budget pool
   * @param {string} bmId - Board Member ID
   * @param {number} amount - Amount to deduct
   * @returns {{ success: boolean, summary: Object, error?: string }}
   */
  deductFromPABudget(bmId, amount) {
    const summary = this.getPABudgetSummary(bmId);
    if (amount > summary.remaining) {
      return {
        success: false,
        summary,
        error: `Insufficient PA budget. Remaining: ${Utils.formatCurrency(summary.remaining)}, Requested: ${Utils.formatCurrency(amount)}`
      };
    }
    return { success: true, summary };
  },

  /**
   * Update FA monthly base budget amount
   * @param {string} bmId - Board Member ID
   * @param {number} newBase - New base budget amount
   */
  updateFABaseBudget(bmId, newBase) {
    const budget = this.getCurrentBudget(bmId);
    const diff = newBase - budget.base_budget;
    this.update(KEYS.MONTHLY_BUDGETS, budget.log_id, {
      base_budget: newBase,
      total_budget: budget.total_budget + diff,
      remaining_amount: budget.remaining_amount + diff
    }, 'log_id');
    // Also update the BM record's fa_monthly_budget
    this.update(KEYS.BOARD_MEMBERS, bmId, { fa_monthly_budget: newBase }, 'bm_id');
  },

  /* --------------------------------------------------------
   * FREQUENCY TRACKING
   * -------------------------------------------------------- */

  /**
   * Update frequency counter for a beneficiary
   * @param {string} beneficiaryId - Beneficiary ID
   * @param {string} type - 'fa' or 'pa'
   * @param {number} amount - Amount of assistance
   * @param {string} bmId - Board Member who provided
   */
  updateFrequency(beneficiaryId, type, amount, bmId) {
    const yearMonth = Utils.getCurrentYearMonth();
    const freqs = this.getAll(KEYS.MONTHLY_FREQUENCY);
    let freq = freqs.find(f => f.beneficiary_id === beneficiaryId && f.year_month === yearMonth);

    if (freq) {
      const updates = {
        total_amount: freq.total_amount + amount
      };
      if (type === 'fa') updates.fa_count = freq.fa_count + 1;
      if (type === 'pa') updates.pa_count = freq.pa_count + 1;
      if (bmId && !freq.bm_ids.includes(bmId)) {
        updates.bm_ids = [...freq.bm_ids, bmId];
      }
      this.update(KEYS.MONTHLY_FREQUENCY, freq.freq_id, updates, 'freq_id');
    } else {
      this.add(KEYS.MONTHLY_FREQUENCY, {
        freq_id: this.generateId('freq'),
        beneficiary_id: beneficiaryId,
        year_month: yearMonth,
        fa_count: type === 'fa' ? 1 : 0,
        pa_count: type === 'pa' ? 1 : 0,
        total_amount: amount,
        bm_ids: bmId ? [bmId] : []
      });
    }
  },

  /**
   * Get frequency level for a beneficiary this month
   * @param {string} beneficiaryId - Beneficiary ID
   * @returns {{ level: string, total: number, fa_count: number, pa_count: number, bm_count: number }}
   */
  getFrequencyLevel(beneficiaryId) {
    const yearMonth = Utils.getCurrentYearMonth();
    const freq = this.getAll(KEYS.MONTHLY_FREQUENCY)
      .find(f => f.beneficiary_id === beneficiaryId && f.year_month === yearMonth);

    if (!freq) {
      return { level: 'normal', total: 0, fa_count: 0, pa_count: 0, bm_count: 0 };
    }

    const total = freq.fa_count + freq.pa_count;
    const settings = this.get(KEYS.SETTINGS) || {};
    const thresholds = settings.frequency_thresholds || { normal: { max: 2 }, monitor: { max: 4 } };

    let level = 'normal';
    if (total >= 5) level = 'high';
    else if (total >= 3) level = 'monitor';

    return {
      level,
      total,
      fa_count: freq.fa_count,
      pa_count: freq.pa_count,
      bm_count: (freq.bm_ids || []).length,
      total_amount: freq.total_amount
    };
  },

  /* --------------------------------------------------------
   * INITIALIZATION & SEEDING
   * -------------------------------------------------------- */

  /**
   * Initialize the application with default data if empty
   */
  init() {
    if (!this.get(KEYS.USERS)) {
      this.seedDefaultData();
    }
    // Ensure settings exist
    if (!this.get(KEYS.SETTINGS)) {
      this.set(KEYS.SETTINGS, {
        default_fa_budget: 70000,
        term_warning_days: [90, 30, 7],
        frequency_thresholds: {
          normal: { min: 0, max: 2 },
          monitor: { min: 3, max: 4 },
          high: { min: 5, max: 999 }
        },
        default_wait_months: 3,
        allow_rollover: true
      });
    }
  },

  /**
   * Seed default demo data for the MVP
   */
  seedDefaultData() {
    const now = new Date().toISOString();

    // --- USERS ---
    const users = [
      {
        user_id: 'usr_admin01',
        email: 'admin@omsp.gov.ph',
        password: 'admin123',
        full_name: 'System Administrator',
        role: 'sysadmin',
        is_active: true,
        is_temp_account: false,
        created_at: now,
        last_login: null
      },
      {
        user_id: 'usr_bm01',
        email: 'cruz@omsp.gov.ph',
        password: 'bm123',
        full_name: 'Juan Dela Cruz',
        role: 'board_member',
        is_active: true,
        is_temp_account: false,
        created_at: now,
        last_login: null
      },
      {
        user_id: 'usr_bm02',
        email: 'santos@omsp.gov.ph',
        password: 'bm123',
        full_name: 'Maria Santos',
        role: 'board_member',
        is_active: true,
        is_temp_account: false,
        created_at: now,
        last_login: null
      },
      {
        user_id: 'usr_bm03',
        email: 'reyes@omsp.gov.ph',
        password: 'bm123',
        full_name: 'Pedro Reyes',
        role: 'board_member',
        is_active: true,
        is_temp_account: false,
        created_at: now,
        last_login: null
      },
      {
        user_id: 'usr_sec01',
        email: 'secretary1@omsp.gov.ph',
        password: 'sec123',
        full_name: 'Ana Garcia',
        role: 'secretary',
        is_active: true,
        is_temp_account: false,
        created_at: now,
        last_login: null
      },
      {
        user_id: 'usr_sec02',
        email: 'secretary2@omsp.gov.ph',
        password: 'sec123',
        full_name: 'Jose Rivera',
        role: 'secretary',
        is_active: true,
        is_temp_account: false,
        created_at: now,
        last_login: null
      }
    ];
    this.set(KEYS.USERS, users);

    // --- BOARD MEMBERS ---
    const boardMembers = [
      {
        bm_id: 'bm_001',
        user_id: 'usr_bm01',
        district_name: 'District 1 - Balanga City',
        current_term_number: 1,
        term_start: '2025-01-01',
        term_end: '2028-06-30',
        fa_monthly_budget: 70000,
        pa_balance: 50000,
        is_active: true,
        archive_requested: false,
        archive_requested_at: null,
        archive_status: 'none',
        is_archived: false,
        archived_at: null,
        archived_by: null
      },
      {
        bm_id: 'bm_002',
        user_id: 'usr_bm02',
        district_name: 'District 2 - Dinalupihan',
        current_term_number: 1,
        term_start: '2025-01-01',
        term_end: '2028-06-30',
        fa_monthly_budget: 70000,
        pa_balance: 30000,
        is_active: true,
        archive_requested: false,
        archive_requested_at: null,
        archive_status: 'none',
        is_archived: false,
        archived_at: null,
        archived_by: null
      },
      {
        bm_id: 'bm_003',
        user_id: 'usr_bm03',
        district_name: 'District 3 - Orani',
        current_term_number: 1,
        term_start: '2025-01-01',
        term_end: '2028-06-30',
        fa_monthly_budget: 70000,
        pa_balance: 0,
        is_active: true,
        archive_requested: false,
        archive_requested_at: null,
        archive_status: 'none',
        is_archived: false,
        archived_at: null,
        archived_by: null
      }
    ];
    this.set(KEYS.BOARD_MEMBERS, boardMembers);

    // --- SECRETARY ASSIGNMENTS ---
    const assignments = [
      {
        assignment_id: 'asgn_001',
        secretary_user_id: 'usr_sec01',
        bm_id: 'bm_001',
        can_add_allowance: false,
        can_make_permanent_category: false,
        assigned_at: now
      },
      {
        assignment_id: 'asgn_002',
        secretary_user_id: 'usr_sec02',
        bm_id: 'bm_002',
        can_add_allowance: false,
        can_make_permanent_category: false,
        assigned_at: now
      }
    ];
    this.set(KEYS.SECRETARY_ASSIGNMENTS, assignments);

    // --- FA CATEGORIES (Default permanent) ---
    const faCategories = [
      { id: 'facat_001', name: 'Medical', is_default: true, is_permanent: true, created_by: 'usr_admin01', created_at: now, is_archived: false, archived_at: null, archived_by: null },
      { id: 'facat_002', name: 'Hospital Bill', is_default: true, is_permanent: true, created_by: 'usr_admin01', created_at: now, is_archived: false, archived_at: null, archived_by: null },
      { id: 'facat_003', name: 'Lab / Therapy', is_default: true, is_permanent: true, created_by: 'usr_admin01', created_at: now, is_archived: false, archived_at: null, archived_by: null },
      { id: 'facat_004', name: 'Burial', is_default: true, is_permanent: true, created_by: 'usr_admin01', created_at: now, is_archived: false, archived_at: null, archived_by: null }
    ];
    this.set(KEYS.FA_CATEGORIES, faCategories);

    // --- PA CATEGORIES (Default permanent) ---
    const paCategories = [
      { id: 'pacat_001', name: 'Personal', is_default: true, is_permanent: true, created_by: 'usr_admin01', created_at: now, is_archived: false, archived_at: null, archived_by: null },
      { id: 'pacat_002', name: 'Hospital Bill', is_default: true, is_permanent: true, created_by: 'usr_admin01', created_at: now, is_archived: false, archived_at: null, archived_by: null },
      { id: 'pacat_003', name: 'Medical', is_default: true, is_permanent: true, created_by: 'usr_admin01', created_at: now, is_archived: false, archived_at: null, archived_by: null },
      { id: 'pacat_004', name: 'Others', is_default: true, is_permanent: true, created_by: 'usr_admin01', created_at: now, is_archived: false, archived_at: null, archived_by: null }
    ];
    this.set(KEYS.PA_CATEGORIES, paCategories);

    // --- SAMPLE BENEFICIARIES ---
    const beneficiaries = [
      {
        beneficiary_id: 'ben_001',
        full_name: 'Roberto Mendoza',
        date_of_birth: '1978-03-15',
        barangay: 'Poblacion',
        municipality: 'Balanga City',
        contact_number: '09171234567',
        address: '123 Rizal St, Poblacion, Balanga City',
        created_at: now
      },
      {
        beneficiary_id: 'ben_002',
        full_name: 'Carmen Villanueva',
        date_of_birth: '1985-07-22',
        barangay: 'San Jose',
        municipality: 'Dinalupihan',
        contact_number: '09189876543',
        address: '456 Mabini Ave, San Jose, Dinalupihan',
        created_at: now
      },
      {
        beneficiary_id: 'ben_003',
        full_name: 'Fernando Aquino',
        date_of_birth: '1990-11-08',
        barangay: 'Tuyo',
        municipality: 'Balanga City',
        contact_number: '09201112233',
        address: '789 Bonifacio St, Tuyo, Balanga City',
        created_at: now
      }
    ];
    this.set(KEYS.BENEFICIARIES, beneficiaries);

    // --- SAMPLE FA RECORDS ---
    const faRecords = [
      {
        fa_id: 'fa_001',
        beneficiary_id: 'ben_001',
        patient_name: 'Roberto Mendoza',
        case_type_id: 'facat_001',
        case_type_custom: null,
        status: 'Ongoing',
        amount_requested: 5000,
        amount_approved: 5000,
        bm_id: 'bm_001',
        wait_duration_months: 3,
        wait_duration_custom: null,
        next_available_date: Utils.addMonths(new Date(), 3),
        skip_waiting_period: false,
        skip_reason: null,
        skip_bm_noted: false,
        encoded_by: 'usr_sec01',
        created_at: now,
        updated_at: now,
        is_archived: false,
        archived_at: null
      },
      {
        fa_id: 'fa_002',
        beneficiary_id: 'ben_002',
        patient_name: 'Carmen Villanueva',
        case_type_id: 'facat_002',
        case_type_custom: null,
        status: 'Successful',
        amount_requested: 10000,
        amount_approved: 10000,
        bm_id: 'bm_002',
        wait_duration_months: 6,
        wait_duration_custom: null,
        next_available_date: Utils.addMonths(new Date(), 6),
        skip_waiting_period: false,
        skip_reason: null,
        skip_bm_noted: false,
        encoded_by: 'usr_sec02',
        created_at: now,
        updated_at: now,
        is_archived: false,
        archived_at: null
      }
    ];
    this.set(KEYS.FA_RECORDS, faRecords);

    // --- SAMPLE PA RECORDS ---
    const paRecords = [
      {
        pa_id: 'pa_001',
        beneficiary_id: 'ben_003',
        client_name: 'Fernando Aquino',
        address: 'Tuyo, Balanga City',
        event_purpose: 'Medical check-up assistance',
        category_id: 'pacat_003',
        action_taken: 'Provided assistance',
        amount_provided: 2000,
        bm_id: 'bm_001',
        skip_waiting_period: false,
        skip_reason: null,
        skip_bm_noted: false,
        encoded_by: 'usr_sec01',
        office_note: null,
        flagged_for_review: false,
        created_at: now,
        updated_at: now,
        is_archived: false
      }
    ];
    this.set(KEYS.PA_RECORDS, paRecords);

    // --- INITIAL BUDGETS ---
    const yearMonth = Utils.getCurrentYearMonth();
    const budgets = [
      {
        log_id: 'budg_001',
        bm_id: 'bm_001',
        year_month: yearMonth,
        base_budget: 70000,
        rollover_amount: 0,
        rollover_selected: false,
        total_budget: 70000,
        used_amount: 5000,
        remaining_amount: 65000,
        closed_at: null
      },
      {
        log_id: 'budg_002',
        bm_id: 'bm_002',
        year_month: yearMonth,
        base_budget: 70000,
        rollover_amount: 0,
        rollover_selected: false,
        total_budget: 70000,
        used_amount: 10000,
        remaining_amount: 60000,
        closed_at: null
      },
      {
        log_id: 'budg_003',
        bm_id: 'bm_003',
        year_month: yearMonth,
        base_budget: 70000,
        rollover_amount: 0,
        rollover_selected: false,
        total_budget: 70000,
        used_amount: 0,
        remaining_amount: 70000,
        closed_at: null
      }
    ];
    this.set(KEYS.MONTHLY_BUDGETS, budgets);

    // --- SAMPLE ACTIVITY LOGS ---
    const logs = [
      {
        log_id: 'log_001',
        user_id: 'usr_sec01',
        user_name: 'Ana Garcia',
        action: 'Created FA request for Roberto Mendoza',
        action_type: 'create',
        record_type: 'fa',
        record_id: 'fa_001',
        details: 'Medical - ₱5,000',
        created_at: now
      },
      {
        log_id: 'log_002',
        user_id: 'usr_sec02',
        user_name: 'Jose Rivera',
        action: 'Created FA request for Carmen Villanueva',
        action_type: 'create',
        record_type: 'fa',
        record_id: 'fa_002',
        details: 'Hospital Bill - ₱10,000',
        created_at: now
      }
    ];
    this.set(KEYS.ACTIVITY_LOGS, logs);

    // --- EMPTY COLLECTIONS ---
    this.set(KEYS.MONTHLY_FREQUENCY, []);

    // --- SEED PA BUDGETS ---
    const paBudgets = [
      {
        pa_budget_id: 'pab_001',
        bm_id: 'bm_001',
        amount: 50000,
        description: 'Initial PA budget allocation',
        added_by: 'usr_admin01',
        is_deleted: false,
        created_at: now,
        updated_at: now
      },
      {
        pa_budget_id: 'pab_002',
        bm_id: 'bm_002',
        amount: 30000,
        description: 'Initial PA budget allocation',
        added_by: 'usr_admin01',
        is_deleted: false,
        created_at: now,
        updated_at: now
      }
    ];
    this.set(KEYS.PA_BUDGETS, paBudgets);

    console.log('✅ OMSP default data seeded successfully');
  },

  /**
   * Reset all data (for testing)
   */
  resetAll() {
    Object.values(KEYS).forEach(key => this.remove(key));
    this.seedDefaultData();
  }
};
