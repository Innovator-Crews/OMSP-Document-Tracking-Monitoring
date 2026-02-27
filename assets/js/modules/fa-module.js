/**
 * ============================================================
 * OMSP Document Tracking / Monitoring
 * FA Module - Financial Assistance CRUD operations
 * ============================================================
 * FA is PRIVATE per Board Member:
 * - Secretary can only create/view FA for their assigned BMs
 * - Board Member can only view their own FA
 * - SysAdmin can view all FA
 * ============================================================
 */

const FAModule = {
  /* --------------------------------------------------------
   * CREATE / NEW FA
   * -------------------------------------------------------- */

  /**
   * Initialize the New Financial Assistance form
   */
  initNewForm() {
    const user = Auth.requireAuth();
    if (!user) return;

    // Only secretary can create FA
    if (user.role !== 'secretary') {
      Notifications.error('Only secretaries can create FA records.');
      Auth.goToDashboard();
      return;
    }

    this.populateBMDropdown();
    this.populateCategoryDropdown();
    this.attachFormHandlers();

    // Check if BM is pre-selected from URL
    const bmId = Utils.getUrlParam('bm');
    if (bmId) {
      const bmSelect = document.getElementById('fa-bm');
      if (bmSelect) {
        bmSelect.value = bmId;
        bmSelect.dispatchEvent(new Event('change'));
      }
    }
  },

  /**
   * Populate Board Member dropdown (only assigned BMs for secretary)
   */
  populateBMDropdown() {
    const select = document.getElementById('fa-bm');
    if (!select) return;

    const assignedBMs = Auth.getAssignedBMs();
    select.innerHTML = '<option value="">Select Board Member</option>';

    assignedBMs.forEach(bm => {
      const user = Storage.getById(KEYS.USERS, bm.user_id, 'user_id');
      const option = document.createElement('option');
      option.value = bm.bm_id;
      option.textContent = `${user ? user.full_name : 'Unknown'} — ${bm.district_name}`;
      select.appendChild(option);
    });

    // On BM change, show budget info
    select.addEventListener('change', () => {
      this.updateBudgetDisplay(select.value);
    });
  },

  /**
   * Populate FA category dropdown
   */
  populateCategoryDropdown() {
    const select = document.getElementById('fa-category');
    if (!select) return;

    const categories = Storage.query(KEYS.FA_CATEGORIES, {});
    select.innerHTML = '<option value="">Select Category</option>';

    // Permanent categories first
    const permanent = categories.filter(c => c.is_permanent);
    const custom = categories.filter(c => !c.is_permanent);

    if (permanent.length) {
      const group = document.createElement('optgroup');
      group.label = 'Standard Categories';
      permanent.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        group.appendChild(opt);
      });
      select.appendChild(group);
    }

    if (custom.length) {
      const group = document.createElement('optgroup');
      group.label = 'Custom Categories';
      custom.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        group.appendChild(opt);
      });
      select.appendChild(group);
    }

    // Add "Other" option for custom entry
    const otherOpt = document.createElement('option');
    otherOpt.value = '_custom';
    otherOpt.textContent = '+ Other (type your own)';
    select.appendChild(otherOpt);

    select.addEventListener('change', () => {
      const customField = document.getElementById('fa-category-custom');
      if (customField) {
        customField.style.display = select.value === '_custom' ? 'block' : 'none';
      }
    });
  },

  /**
   * Update budget display when BM is selected
   */
  updateBudgetDisplay(bmId) {
    const budgetSection = document.getElementById('budget-info');
    if (!budgetSection || !bmId) {
      if (budgetSection) budgetSection.style.display = 'none';
      return;
    }

    const budget = Storage.getCurrentBudget(bmId);
    budgetSection.style.display = 'block';

    const pct = Utils.percentage(budget.used_amount, budget.total_budget);
    budgetSection.innerHTML = `
      <div class="banner banner-${pct > 90 ? 'critical' : pct > 70 ? 'warning' : 'info'}">
        <div class="banner-content">
          <strong>${Utils.formatMonth(budget.year_month)} Budget</strong>
          <div class="mt-xs">
            Total: ${Utils.formatCurrency(budget.total_budget)} |
            Used: ${Utils.formatCurrency(budget.used_amount)} |
            <strong>Remaining: ${Utils.formatCurrency(budget.remaining_amount)}</strong>
          </div>
          <div class="progress-bar progress-sm mt-xs">
            <div class="progress-fill ${pct > 90 ? 'progress-danger' : pct > 70 ? 'progress-warning' : 'progress-primary'}" style="width:${pct}%"></div>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Attach form event handlers
   */
  attachFormHandlers() {
    const form = document.getElementById('fa-form');
    if (!form) return;

    // Beneficiary name search with duplicate check
    const nameInput = document.getElementById('fa-patient-name');
    if (nameInput) {
      nameInput.addEventListener('input', Utils.debounce(() => {
        this.checkDuplicate(nameInput.value);
      }, 500));
    }

    // Amount validation
    const amountInput = document.getElementById('fa-amount');
    if (amountInput) {
      amountInput.addEventListener('input', () => {
        const bmId = document.getElementById('fa-bm')?.value;
        if (bmId) {
          const budget = Storage.getCurrentBudget(bmId);
          const amount = parseFloat(amountInput.value) || 0;
          const warningEl = document.getElementById('budget-warning');
          if (warningEl) {
            if (amount > budget.remaining_amount) {
              warningEl.style.display = 'block';
              warningEl.innerHTML = `<div class="banner banner-danger"><div class="banner-content">⚠️ Amount exceeds remaining budget (${Utils.formatCurrency(budget.remaining_amount)})</div></div>`;
            } else {
              warningEl.style.display = 'none';
            }
          }
        }
      });
    }

    // Wait duration options
    const durationBtns = document.querySelectorAll('[data-duration]');
    durationBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        durationBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const customInput = document.getElementById('fa-duration-custom');
        if (customInput) {
          customInput.style.display = btn.dataset.duration === 'custom' ? 'block' : 'none';
        }
      });
    });

    // Skip waiting period
    const skipCheckbox = document.getElementById('fa-skip-waiting');
    if (skipCheckbox) {
      skipCheckbox.addEventListener('change', () => {
        const skipSection = document.getElementById('skip-reason-section');
        if (skipSection) skipSection.style.display = skipCheckbox.checked ? 'block' : 'none';
      });
    }

    // Form submit
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.submitNewFA(form);
    });
  },

  /**
   * Check for duplicate/frequent beneficiary
   */
  checkDuplicate(name) {
    const resultEl = document.getElementById('duplicate-warning');
    if (!resultEl || !name || name.length < 3) {
      if (resultEl) resultEl.style.display = 'none';
      return;
    }

    const beneficiaries = Storage.getAll(KEYS.BENEFICIARIES);
    const matches = beneficiaries.filter(b =>
      b.full_name.toLowerCase().includes(name.toLowerCase())
    );

    if (matches.length === 0) {
      resultEl.style.display = 'none';
      return;
    }

    resultEl.style.display = 'block';
    resultEl.innerHTML = matches.map(b => {
      const freq = Storage.getFrequencyLevel(b.beneficiary_id);
      return `
        <div class="duplicate-item" data-id="${b.beneficiary_id}">
          <div class="duplicate-info">
            <strong>${Utils.escapeHtml(b.full_name)}</strong>
            <span class="text-muted">${Utils.escapeHtml(b.municipality || '')}</span>
          </div>
          <span class="badge ${Utils.getFrequencyClass(freq.level)}">${freq.level} (${freq.total}x)</span>
          <button type="button" class="btn btn-sm btn-secondary" onclick="FAModule.selectBeneficiary('${b.beneficiary_id}')">Select</button>
        </div>
      `;
    }).join('');
  },

  /**
   * Select an existing beneficiary
   */
  selectBeneficiary(beneficiaryId) {
    const ben = Storage.getById(KEYS.BENEFICIARIES, beneficiaryId, 'beneficiary_id');
    if (!ben) return;

    document.getElementById('fa-patient-name').value = ben.full_name;
    document.getElementById('fa-beneficiary-id').value = ben.beneficiary_id;

    // Auto-fill address if available
    const addressEl = document.getElementById('fa-address');
    if (addressEl && ben.address) addressEl.value = ben.address;

    // Check cooling period
    this.checkCoolingPeriod(beneficiaryId);

    // Check cross-BM info
    this.checkCrossBM(beneficiaryId);

    // Hide duplicate warning
    const dupeEl = document.getElementById('duplicate-warning');
    if (dupeEl) dupeEl.style.display = 'none';

    Notifications.info(`Selected: ${ben.full_name}`);
  },

  /**
   * Check if beneficiary is still in cooling/waiting period
   */
  checkCoolingPeriod(beneficiaryId) {
    const bmId = document.getElementById('fa-bm')?.value;
    if (!bmId) return;

    const lastFA = Storage.getAll(KEYS.FA_RECORDS)
      .filter(r => r.beneficiary_id === beneficiaryId && r.bm_id === bmId && !r.is_archived)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

    const coolingEl = document.getElementById('cooling-period-check');
    if (!coolingEl) return;

    if (lastFA && lastFA.next_available_date && !Utils.isPast(lastFA.next_available_date)) {
      const daysLeft = Utils.daysUntil(lastFA.next_available_date);
      coolingEl.style.display = 'block';
      coolingEl.innerHTML = `
        <div class="cooling-period cooling-ineligible">
          <div class="cooling-icon">⏳</div>
          <div class="cooling-content">
            <h4>Cooling Period Active</h4>
            <p>This beneficiary is not yet eligible for another FA from this BM.</p>
            <p><strong>Next available: ${Utils.formatDate(lastFA.next_available_date)}</strong> (${daysLeft} days remaining)</p>
            <p>Last FA: ${Utils.formatCurrency(lastFA.amount_approved)} on ${Utils.formatDate(lastFA.created_at)}</p>
          </div>
        </div>
      `;

      // Show skip option
      const skipSection = document.getElementById('skip-waiting-section');
      if (skipSection) skipSection.style.display = 'block';
    } else {
      coolingEl.style.display = 'none';
      const skipSection = document.getElementById('skip-waiting-section');
      if (skipSection) skipSection.style.display = 'none';
    }
  },

  /**
   * Check cross-BM assistance info for a beneficiary
   */
  checkCrossBM(beneficiaryId) {
    const bmId = document.getElementById('fa-bm')?.value;
    if (!bmId || !beneficiaryId) return;

    // Get or create the cross-BM alert container
    let alertEl = document.getElementById('cross-bm-alert');
    if (!alertEl) {
      alertEl = document.createElement('div');
      alertEl.id = 'cross-bm-alert';
      alertEl.style.display = 'none';
      const coolingEl = document.getElementById('cooling-period-check');
      if (coolingEl) {
        coolingEl.parentNode.insertBefore(alertEl, coolingEl.nextSibling);
      }
    }

    const crossInfo = Storage.getCrossBMInfo(beneficiaryId, bmId);
    if (crossInfo.bm_count > 0) {
      alertEl.style.display = 'block';
      alertEl.innerHTML = `
        <div class="banner banner-warning mb-sm">
          <div class="banner-content">
            <strong>${Icons.get('alert-triangle', 14)} Cross-BM Alert:</strong> This beneficiary has received assistance from <strong>${crossInfo.bm_count} other Board Member${crossInfo.bm_count > 1 ? 's' : ''}</strong>.
            <div class="mt-xs text-sm">
              ${crossInfo.details.map(d => `<div>• <strong>${Utils.escapeHtml(d.name)}</strong> (${d.district}): ${d.fa_count} FA (${Utils.formatCurrency(d.fa_total)}), ${d.pa_count} PA (${Utils.formatCurrency(d.pa_total)})</div>`).join('')}
            </div>
          </div>
        </div>
      `;
    } else {
      alertEl.style.display = 'none';
    }
  },

  /**
   * Submit new FA record
   */
  submitNewFA(form) {
    const user = Auth.getCurrentUser();
    const formData = {
      bm_id: form.querySelector('#fa-bm')?.value,
      patient_name: form.querySelector('#fa-patient-name')?.value?.trim(),
      category_id: form.querySelector('#fa-category')?.value,
      category_custom: form.querySelector('#fa-category-custom')?.value?.trim(),
      amount: form.querySelector('#fa-amount')?.value,
      address: form.querySelector('#fa-address')?.value?.trim(),
      beneficiary_id: form.querySelector('#fa-beneficiary-id')?.value || null
    };

    // Validation
    const rules = {
      bm_id: [{ type: 'required', message: 'Please select a Board Member.' }],
      patient_name: [{ type: 'required', message: 'Patient name is required.' }],
      category_id: [{ type: 'required', message: 'Please select a category.' }],
      amount: [
        { type: 'required' },
        { type: 'amount', options: { min: 1 } }
      ]
    };

    if (!Validators.validateAndDisplay(formData, rules, form)) return;

    // Check budget
    const amount = parseFloat(formData.amount);
    const budgetResult = Storage.deductFromBudget(formData.bm_id, amount);
    if (!budgetResult.success) {
      Notifications.error(budgetResult.error);
      return;
    }

    // Create or find beneficiary
    let beneficiaryId = formData.beneficiary_id;
    if (!beneficiaryId) {
      const newBen = {
        beneficiary_id: Storage.generateId('ben'),
        full_name: formData.patient_name,
        address: formData.address || '',
        date_of_birth: null,
        barangay: '',
        municipality: '',
        contact_number: '',
        created_at: new Date().toISOString()
      };
      Storage.add(KEYS.BENEFICIARIES, newBen);
      beneficiaryId = newBen.beneficiary_id;
    }

    // Get wait duration
    const activeDuration = form.querySelector('[data-duration].active');
    let waitMonths = 3;
    let customDuration = null;
    if (activeDuration) {
      if (activeDuration.dataset.duration === 'custom') {
        customDuration = parseInt(form.querySelector('#fa-duration-custom-value')?.value) || 3;
        waitMonths = customDuration;
      } else {
        waitMonths = parseInt(activeDuration.dataset.duration) || 3;
      }
    }

    // Skip waiting
    const skipWaiting = form.querySelector('#fa-skip-waiting')?.checked || false;
    const skipReason = form.querySelector('#fa-skip-reason')?.value?.trim() || null;
    const skipBMNoted = form.querySelector('#fa-skip-bm-noted')?.checked || false;

    // Determine category
    let caseTypeId = formData.category_id;
    let caseTypeCustom = null;
    if (caseTypeId === '_custom') {
      caseTypeId = null;
      caseTypeCustom = formData.category_custom;
    }

    // Create FA record
    const faRecord = {
      fa_id: Storage.generateId('fa'),
      beneficiary_id: beneficiaryId,
      patient_name: formData.patient_name,
      case_type_id: caseTypeId,
      case_type_custom: caseTypeCustom,
      status: 'Ongoing',
      amount_requested: amount,
      amount_approved: amount,
      bm_id: formData.bm_id,
      cooldown_months: waitMonths,
      wait_duration_months: waitMonths,
      wait_duration_custom: customDuration,
      date_requested: form.querySelector('#fa-date-requested')?.value || null,
      next_available_date: skipWaiting ? null : Utils.addMonths(new Date(), waitMonths),
      skip_waiting_period: skipWaiting,
      skip_reason: skipReason,
      skip_bm_noted: skipBMNoted,
      remarks: form.querySelector('#fa-remarks')?.value?.trim() || null,
      encoded_by: user.user_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_archived: false,
      archived_at: null
    };

    Storage.add(KEYS.FA_RECORDS, faRecord);

    // Update frequency
    Storage.updateFrequency(beneficiaryId, 'fa', amount, formData.bm_id);

    // Log activity
    const categoryName = caseTypeCustom || (Storage.getById(KEYS.FA_CATEGORIES, caseTypeId, 'id')?.name || 'Unknown');
    ActivityLogger.log(
      `Created FA for ${formData.patient_name}`,
      'create', 'fa', faRecord.fa_id,
      `${categoryName} — ${Utils.formatCurrency(amount)}`
    );

    Notifications.success(`FA record created for ${formData.patient_name}`);

    // Redirect to FA list
    setTimeout(() => {
      window.location.href = `fa-list.html?bm=${formData.bm_id}`;
    }, 1000);
  },

  /* --------------------------------------------------------
   * LIST / VIEW FA RECORDS
   * -------------------------------------------------------- */

  /**
   * Initialize FA list page
   */
  initList() {
    const user = Auth.requireAuth();
    if (!user) return;

    this.currentPage = 1;
    this.pageSize = 10;
    this.currentBM = Utils.getUrlParam('bm') || '';
    this.currentStatus = '';
    this.currentSearch = '';

    this.setupFilters();
    this.loadRecords();
  },

  /**
   * Setup filter controls
   */
  setupFilters() {
    const user = Auth.getCurrentUser();

    // BM filter (only for secretary/sysadmin)
    const bmFilter = document.getElementById('filter-bm');
    if (bmFilter && (user.role === 'secretary' || user.role === 'sysadmin')) {
      const bms = user.role === 'sysadmin'
        ? Storage.getAll(KEYS.BOARD_MEMBERS).filter(b => !b.is_archived)
        : Auth.getAssignedBMs();

      bmFilter.innerHTML = '<option value="">All Board Members</option>';
      bms.forEach(bm => {
        const u = Storage.getById(KEYS.USERS, bm.user_id, 'user_id');
        const opt = document.createElement('option');
        opt.value = bm.bm_id;
        opt.textContent = u ? u.full_name : bm.district_name;
        if (bm.bm_id === this.currentBM) opt.selected = true;
        bmFilter.appendChild(opt);
      });

      bmFilter.addEventListener('change', () => {
        this.currentBM = bmFilter.value;
        this.currentPage = 1;
        this.loadRecords();
      });
    } else if (bmFilter && user.role === 'board_member') {
      bmFilter.style.display = 'none';
      this.currentBM = user.bm_id;
    }

    // Status filter
    const statusFilter = document.getElementById('filter-status');
    if (statusFilter) {
      statusFilter.addEventListener('change', () => {
        this.currentStatus = statusFilter.value;
        this.currentPage = 1;
        this.loadRecords();
      });
    }

    // Search
    const searchInput = document.getElementById('filter-search');
    if (searchInput) {
      searchInput.addEventListener('input', Utils.debounce(() => {
        this.currentSearch = searchInput.value.trim();
        this.currentPage = 1;
        this.loadRecords();
      }, 300));
    }
  },

  /**
   * Load and render FA records
   */
  loadRecords() {
    const user = Auth.getCurrentUser();
    let records = Storage.getAll(KEYS.FA_RECORDS).filter(r => !r.is_archived);

    // Filter by BM
    if (this.currentBM) {
      records = records.filter(r => r.bm_id === this.currentBM);
    } else if (user.role === 'secretary') {
      const assignedIds = user.assigned_bm_ids || [];
      records = records.filter(r => assignedIds.includes(r.bm_id));
    } else if (user.role === 'board_member') {
      records = records.filter(r => r.bm_id === user.bm_id);
    }

    // Filter by status
    if (this.currentStatus) {
      records = records.filter(r => r.status === this.currentStatus);
    }

    // Search
    if (this.currentSearch) {
      const q = this.currentSearch.toLowerCase();
      records = records.filter(r =>
        r.patient_name?.toLowerCase().includes(q) ||
        r.fa_id?.toLowerCase().includes(q)
      );
    }

    // Sort newest first
    records.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Paginate
    const totalPages = Math.ceil(records.length / this.pageSize);
    const paged = records.slice((this.currentPage - 1) * this.pageSize, this.currentPage * this.pageSize);

    this.renderTable(paged);
    this.renderPagination(totalPages, records.length);
  },

  /**
   * Render FA records table
   */
  renderTable(records) {
    const tbody = document.getElementById('fa-table-body');
    if (!tbody) return;

    if (records.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" class="text-center p-xl">
            <div class="empty-state">
              <div class="empty-state-icon">${Icons.render('file-text', 32)}</div>
              <h3 class="empty-state-title">No Financial Assistance Records</h3>
              <p class="empty-state-text">No financial assistance records found.</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    const bms = Storage.getAll(KEYS.BOARD_MEMBERS);
    const categories = Storage.getAll(KEYS.FA_CATEGORIES);
    const user = Auth.getCurrentUser();

    tbody.innerHTML = records.map(r => {
      const bm = bms.find(b => b.bm_id === r.bm_id);
      const bmUser = bm ? Storage.getById(KEYS.USERS, bm.user_id, 'user_id') : null;
      const cat = categories.find(c => c.id === r.case_type_id);
      const categoryName = r.case_type_custom || (cat ? cat.name : 'Unknown');

      // Frequency badge
      const freq = r.beneficiary_id ? Storage.getFrequencyLevel(r.beneficiary_id) : { level: 'normal', total: 0 };
      const freqBadge = `<span class="badge ${Utils.getFrequencyClass(freq.level)}" title="${freq.total} assists this month">${freq.level === 'normal' ? freq.total : freq.level.toUpperCase() + ' (' + freq.total + ')'}</span>`;

      // Cross-BM flag
      const crossInfo = r.beneficiary_id ? Storage.getCrossBMInfo(r.beneficiary_id, r.bm_id) : { bm_count: 0 };
      const crossBMFlag = crossInfo.bm_count > 0
        ? `<span class="badge badge-warning" title="Also assisted by: ${crossInfo.bm_names.join(', ')}">${Icons.get('alert-triangle', 12)} ${crossInfo.bm_count} other BM${crossInfo.bm_count > 1 ? 's' : ''}</span>`
        : '';

      return `
        <tr${crossInfo.bm_count > 0 ? ' class="row-flagged"' : ''}>
          <td>${Utils.formatDate(r.created_at)}</td>
          <td>
            <div class="d-flex align-center gap-xs">
              <strong>${Utils.escapeHtml(r.patient_name)}</strong>
              ${crossBMFlag}
            </div>
          </td>
          <td>${freqBadge}</td>
          <td>${bmUser ? Utils.escapeHtml(bmUser.full_name) : '—'}</td>
          <td><span class="badge badge-category-${cat?.is_permanent ? 'permanent' : 'custom'}">${Utils.escapeHtml(categoryName)}</span></td>
          <td class="text-right">${Utils.formatCurrency(r.amount_approved)}</td>
          <td><span class="badge badge-status-${Utils.getStatusClass(r.status)}">${r.status}</span></td>
          <td>${r.date_requested ? Utils.formatDate(r.date_requested) : '—'}</td>
          <td>${(() => { const cd = Utils.getCooldownStatus(r); return `<span class="badge ${cd.badgeClass}">${cd.label}</span>`; })()}</td>
          <td>
            <div class="d-flex gap-xs">
              <button class="btn btn-sm btn-ghost" onclick="FAModule.viewDetail('${r.fa_id}')" title="View">${Icons.render('eye', 16)}</button>
              <button class="btn btn-sm btn-ghost" onclick="FAModule.editStatus('${r.fa_id}')" title="Edit Status">${Icons.render('edit', 16)}</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  /**
   * Render pagination controls
   */
  renderPagination(totalPages, totalRecords) {
    const paginationEl = document.getElementById('fa-pagination');
    if (!paginationEl) return;

    const countEl = document.getElementById('fa-count');
    if (countEl) countEl.textContent = `${totalRecords} record${totalRecords !== 1 ? 's' : ''}`;

    if (totalPages <= 1) {
      paginationEl.innerHTML = '<button class="pagination-btn active" disabled>1</button>';
      return;
    }

    let html = '';
    html += `<button class="pagination-btn" ${this.currentPage <= 1 ? 'disabled' : ''} onclick="FAModule.goToPage(${this.currentPage - 1})">‹</button>`;

    for (let i = 1; i <= totalPages; i++) {
      html += `<button class="pagination-btn ${i === this.currentPage ? 'active' : ''}" onclick="FAModule.goToPage(${i})">${i}</button>`;
    }

    html += `<button class="pagination-btn" ${this.currentPage >= totalPages ? 'disabled' : ''} onclick="FAModule.goToPage(${this.currentPage + 1})">›</button>`;

    paginationEl.innerHTML = html;
  },

  goToPage(page) {
    this.currentPage = page;
    this.loadRecords();
  },

  /* --------------------------------------------------------
   * VIEW / EDIT
   * -------------------------------------------------------- */

  /**
   * View FA detail in a modal
   */
  viewDetail(faId) {
    const record = Storage.getById(KEYS.FA_RECORDS, faId, 'fa_id');
    if (!record) return;

    const bm = Storage.getAll(KEYS.BOARD_MEMBERS).find(b => b.bm_id === record.bm_id);
    const bmUser = bm ? Storage.getById(KEYS.USERS, bm.user_id, 'user_id') : null;
    const encoder = Storage.getById(KEYS.USERS, record.encoded_by, 'user_id');
    const cat = Storage.getById(KEYS.FA_CATEGORIES, record.case_type_id, 'id');
    const categoryName = record.case_type_custom || (cat ? cat.name : 'Unknown');
    const freq = record.beneficiary_id ? Storage.getFrequencyLevel(record.beneficiary_id) : null;
    const cooldown = Utils.getCooldownStatus(record);

    const html = `
      <div class="modal-overlay active" id="fa-detail-modal" onclick="this.remove()">
        <div class="modal modal-lg animate-fade-in" onclick="event.stopPropagation()">
          <div class="modal-header">
            <div>
              <h3 class="modal-title">Financial Assistance Detail</h3>
              <span class="modal-record-id">${record.fa_id}</span>
            </div>
            <button class="modal-close" onclick="document.getElementById('fa-detail-modal').remove()">&times;</button>
          </div>
          <div class="modal-body" style="padding:0">
            <div class="detail-grid">
              <div class="detail-section">Beneficiary Information</div>
              <div class="detail-item">
                <span class="detail-label">Patient Name</span>
                <span class="detail-value">${Utils.escapeHtml(record.patient_name)}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Board Member</span>
                <span class="detail-value">${Utils.escapeHtml(bmUser ? bmUser.full_name : '—')}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Category</span>
                <span class="detail-value"><span class="badge badge-category-${cat?.is_permanent ? 'permanent' : 'custom'}">${Utils.escapeHtml(categoryName)}</span></span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Status</span>
                <span class="detail-value detail-status"><span class="badge badge-status-${Utils.getStatusClass(record.status)}">${record.status}</span></span>
              </div>

              <div class="detail-section">Financial Details</div>
              <div class="detail-item">
                <span class="detail-label">Amount Approved</span>
                <span class="detail-value detail-amount">${Utils.formatCurrency(record.amount_approved)}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Date Created</span>
                <span class="detail-value">${Utils.formatDate(record.created_at, 'datetime')}</span>
              </div>
              ${record.date_requested ? `
              <div class="detail-item">
                <span class="detail-label">Date Requested</span>
                <span class="detail-value">${Utils.formatDate(record.date_requested)}</span>
              </div>
              ` : ''}

              <div class="detail-section">Cooldown Period</div>
              <div class="detail-item">
                <span class="detail-label">Cooldown Duration</span>
                <span class="detail-value">${record.cooldown_months || record.wait_duration_months || 3} months</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Next Available Date</span>
                <span class="detail-value">${record.next_available_date ? Utils.formatDate(record.next_available_date) : 'No restriction'}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Cooldown Status</span>
                <span class="detail-value"><span class="badge ${cooldown.badgeClass}">${cooldown.label}</span></span>
              </div>
              ${record.skip_waiting_period ? `
              <div class="detail-item-full">
                <span class="detail-label">Skip Reason</span>
                <span class="detail-value">${Utils.escapeHtml(record.skip_reason || '—')}</span>
              </div>
              ` : ''}
              ${freq ? `
              <div class="detail-item-full">
                <span class="detail-label">Monthly Frequency</span>
                <span class="detail-value"><span class="badge ${Utils.getFrequencyClass(freq.level)}">${freq.level} (${freq.total}x this month)</span></span>
              </div>
              ` : ''}
              ${record.remarks ? `
              <div class="detail-item-full">
                <span class="detail-label">Remarks</span>
                <span class="detail-value">${Utils.escapeHtml(record.remarks)}</span>
              </div>
              ` : ''}

              <div class="detail-section">Record Info</div>
              <div class="detail-item">
                <span class="detail-label">Encoded By</span>
                <span class="detail-value">${Utils.escapeHtml(encoder ? encoder.full_name : '—')}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Last Updated</span>
                <span class="detail-value">${Utils.formatDate(record.updated_at || record.created_at, 'datetime')}</span>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="document.getElementById('fa-detail-modal').remove()">Close</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
  },

  /**
   * Edit FA status via modal
   */
  editStatus(faId) {
    const record = Storage.getById(KEYS.FA_RECORDS, faId, 'fa_id');
    if (!record) return;

    const html = `
      <div class="modal-overlay active" id="fa-status-modal" onclick="this.remove()">
        <div class="modal modal-sm animate-fade-in" onclick="event.stopPropagation()">
          <div class="modal-header">
            <h3 class="modal-title">Update Status</h3>
            <button class="modal-close" onclick="document.getElementById('fa-status-modal').remove()">&times;</button>
          </div>
          <div class="modal-body">
            <p class="mb-md">Record: <strong>${Utils.escapeHtml(record.patient_name)}</strong></p>
            <div class="form-group">
              <label class="form-label">New Status</label>
              <select class="form-select" id="new-fa-status">
                <option value="Ongoing" ${record.status === 'Ongoing' ? 'selected' : ''}>Ongoing</option>
                <option value="Successful" ${record.status === 'Successful' ? 'selected' : ''}>Successful</option>
                <option value="Denied" ${record.status === 'Denied' ? 'selected' : ''}>Denied</option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="document.getElementById('fa-status-modal').remove()">Cancel</button>
            <button class="btn btn-primary" onclick="FAModule.saveStatus('${faId}')">Save</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
  },

  /**
   * Save updated status
   */
  saveStatus(faId) {
    const newStatus = document.getElementById('new-fa-status')?.value;
    if (!newStatus) return;

    const record = Storage.getById(KEYS.FA_RECORDS, faId, 'fa_id');
    const oldStatus = record.status;

    Storage.update(KEYS.FA_RECORDS, faId, { status: newStatus }, 'fa_id');

    // If denied, refund budget
    if (newStatus === 'Denied' && oldStatus !== 'Denied') {
      const yearMonth = record.created_at.substring(0, 7);
      Storage.refundBudget(record.bm_id, record.amount_approved, yearMonth);
    }

    ActivityLogger.log(
      `Updated FA status for ${record.patient_name}: ${oldStatus} → ${newStatus}`,
      'status_change', 'fa', faId,
      `${Utils.formatCurrency(record.amount_approved)}`
    );

    document.getElementById('fa-status-modal')?.remove();
    Notifications.success(`Status updated to ${newStatus}`);
    this.loadRecords();
  },

  /* --------------------------------------------------------
   * EXPORT
   * -------------------------------------------------------- */

  /**
   * Export current FA records to CSV
   */
  exportToCSV() {
    const user = Auth.getCurrentUser();
    let records = Storage.getAll(KEYS.FA_RECORDS).filter(r => !r.is_archived);

    if (this.currentBM) {
      records = records.filter(r => r.bm_id === this.currentBM);
    } else if (user.role === 'board_member') {
      records = records.filter(r => r.bm_id === user.bm_id);
    }

    const categories = Storage.getAll(KEYS.FA_CATEGORIES);
    const bms = Storage.getAll(KEYS.BOARD_MEMBERS);

    ExportUtils.toCSV(records, 'fa-records', {
      columns: ['fa_id', 'patient_name', 'case_type_id', 'amount_approved', 'bm_id', 'status', 'created_at'],
      headers: ['Record ID', 'Patient Name', 'Category', 'Amount', 'Board Member', 'Status', 'Date'],
      transform: {
        case_type_id: (val, item) => item.case_type_custom || (categories.find(c => c.id === val)?.name || 'Unknown'),
        amount_approved: (val) => val ? `₱${val.toLocaleString()}` : '—',
        bm_id: (val) => {
          const bm = bms.find(b => b.bm_id === val);
          const u = bm ? Storage.getById(KEYS.USERS, bm.user_id, 'user_id') : null;
          return u ? u.full_name : val;
        },
        created_at: (val) => Utils.formatDate(val)
      }
    });
  }
};
