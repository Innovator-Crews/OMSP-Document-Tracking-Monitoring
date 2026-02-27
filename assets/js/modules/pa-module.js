/**
 * ============================================================
 * OMSP Document Tracking / Monitoring
 * PA Module - Personal Assistance (from BM's own pocket)
 * ============================================================
 * PA VISIBILITY:
 * - Secretaries can see PA for their assigned BMs only
 * - Board Members see only their own PA
 * - SysAdmin can see all PA
 * ============================================================
 */

const PAModule = {
  /* --------------------------------------------------------
   * CREATE / NEW PA
   * -------------------------------------------------------- */

  initNewForm() {
    const user = Auth.requireAuth();
    if (!user) return;
    if (user.role !== 'secretary') {
      Notifications.error('Only secretaries can create PA records.');
      Auth.goToDashboard();
      return;
    }

    this.populateBMDropdown();
    this.populateCategoryDropdown();
    this.attachFormHandlers();

    const bmId = Utils.getUrlParam('bm');
    if (bmId) {
      const bmSelect = document.getElementById('pa-bm');
      if (bmSelect) {
        bmSelect.value = bmId;
        bmSelect.dispatchEvent(new Event('change'));
      }
    }
  },

  populateBMDropdown() {
    const select = document.getElementById('pa-bm');
    if (!select) return;

    // PA can only be created for assigned BMs
    const bms = Auth.getAssignedBMs();
    select.innerHTML = '<option value="">Select Board Member</option>';

    bms.forEach(bm => {
      const user = Storage.getById(KEYS.USERS, bm.user_id, 'user_id');
      const option = document.createElement('option');
      option.value = bm.bm_id;
      option.textContent = `${user ? user.full_name : 'Unknown'} — ${bm.district_name}`;
      select.appendChild(option);
    });

    select.addEventListener('change', () => {
      this.updatePABalanceDisplay(select.value);
    });
  },

  populateCategoryDropdown() {
    const select = document.getElementById('pa-category');
    if (!select) return;

    const categories = Storage.query(KEYS.PA_CATEGORIES, {});
    select.innerHTML = '<option value="">Select Category</option>';

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

    const otherOpt = document.createElement('option');
    otherOpt.value = '_custom';
    otherOpt.textContent = '+ Other (type your own)';
    select.appendChild(otherOpt);

    select.addEventListener('change', () => {
      const customField = document.getElementById('pa-category-custom');
      if (customField) customField.style.display = select.value === '_custom' ? 'block' : 'none';
    });
  },

  updatePABalanceDisplay(bmId) {
    const balanceEl = document.getElementById('pa-balance-info');
    if (!balanceEl || !bmId) {
      if (balanceEl) balanceEl.style.display = 'none';
      return;
    }

    const bm = Storage.getById(KEYS.BOARD_MEMBERS, bmId, 'bm_id');
    if (!bm) return;

    const summary = Storage.getPABudgetSummary(bmId);
    const balance = summary ? (summary.remaining || 0) : (bm.pa_balance || 0);

    balanceEl.style.display = 'block';
    balanceEl.innerHTML = `
      <div class="banner banner-info">
        <div class="banner-content">
          <strong>PA Balance (BM's Own Money)</strong>
          <div class="mt-xs">Current balance: <strong>${Utils.formatCurrency(balance)}</strong></div>
          <div class="text-sm text-muted">Note: PA has no monthly limit — this reflects the BM's personal allocation</div>
        </div>
      </div>
    `;
  },

  attachFormHandlers() {
    const form = document.getElementById('pa-form');
    if (!form) return;

    // Client name search
    const nameInput = document.getElementById('pa-client-name');
    if (nameInput) {
      nameInput.addEventListener('input', Utils.debounce(() => {
        this.checkExistingBeneficiary(nameInput.value);
      }, 500));
    }

    // Cooldown duration buttons
    const durationBtns = document.querySelectorAll('[data-duration]');
    durationBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        durationBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const customInput = document.getElementById('pa-duration-custom-value');
        if (customInput) {
          customInput.style.display = btn.dataset.duration === 'custom' ? 'block' : 'none';
        }
      });
    });

    // Skip waiting section
    const skipCheckbox = document.getElementById('pa-skip-waiting');
    if (skipCheckbox) {
      skipCheckbox.addEventListener('change', () => {
        const section = document.getElementById('pa-skip-reason-section');
        if (section) section.style.display = skipCheckbox.checked ? 'block' : 'none';
      });
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.submitNewPA(form);
    });
  },

  checkExistingBeneficiary(name) {
    const resultEl = document.getElementById('pa-duplicate-warning');
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
            <span class="text-muted">${Utils.escapeHtml(b.address || '')}</span>
          </div>
          <span class="badge ${Utils.getFrequencyClass(freq.level)}">${freq.level} (${freq.total}x)</span>
          <button type="button" class="btn btn-sm btn-secondary" onclick="PAModule.selectBeneficiary('${b.beneficiary_id}')">Select</button>
        </div>
      `;
    }).join('');
  },

  selectBeneficiary(beneficiaryId) {
    const ben = Storage.getById(KEYS.BENEFICIARIES, beneficiaryId, 'beneficiary_id');
    if (!ben) return;

    document.getElementById('pa-client-name').value = ben.full_name;
    document.getElementById('pa-beneficiary-id').value = ben.beneficiary_id;
    const addressEl = document.getElementById('pa-address');
    if (addressEl && ben.address) addressEl.value = ben.address;

    const dupeEl = document.getElementById('pa-duplicate-warning');
    if (dupeEl) dupeEl.style.display = 'none';

    // Check cooling period & cross-BM info
    this.checkCoolingPeriod(beneficiaryId);
    this.checkCrossBM(beneficiaryId);

    Notifications.info(`Selected: ${ben.full_name}`);
  },

  /**
   * Check cooling period for a beneficiary with the selected BM
   */
  checkCoolingPeriod(beneficiaryId) {
    const bmId = document.getElementById('pa-bm')?.value;
    if (!bmId || !beneficiaryId) return;

    const lastPA = Storage.getAll(KEYS.PA_RECORDS)
      .filter(r => r.beneficiary_id === beneficiaryId && r.bm_id === bmId && !r.is_archived)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

    let coolingEl = document.getElementById('pa-cooling-period-check');
    if (!coolingEl) {
      coolingEl = document.createElement('div');
      coolingEl.id = 'pa-cooling-period-check';
      coolingEl.style.display = 'none';
      const dupeEl = document.getElementById('pa-duplicate-warning');
      if (dupeEl) {
        dupeEl.parentNode.insertBefore(coolingEl, dupeEl.nextSibling);
      }
    }

    if (lastPA && lastPA.next_available_date && !Utils.isPast(lastPA.next_available_date)) {
      const daysLeft = Utils.daysUntil(lastPA.next_available_date);
      coolingEl.style.display = 'block';
      coolingEl.innerHTML = `
        <div class="cooling-period cooling-ineligible">
          <div class="cooling-icon">⏳</div>
          <div class="cooling-content">
            <h4>Cooldown Active</h4>
            <p>This beneficiary is not yet eligible for another PA from this BM.</p>
            <p><strong>Next available: ${Utils.formatDate(lastPA.next_available_date)}</strong> (${daysLeft} days remaining)</p>
            <p>Last PA: ${Utils.formatCurrency(lastPA.amount_provided)} on ${Utils.formatDate(lastPA.created_at)}</p>
          </div>
        </div>
      `;

      const skipSection = document.getElementById('pa-skip-reason-section')?.closest('.form-group')?.previousElementSibling;
    } else {
      coolingEl.style.display = 'none';
    }
  },

  /**
   * Check cross-BM assistance info for a beneficiary
   */
  checkCrossBM(beneficiaryId) {
    const bmId = document.getElementById('pa-bm')?.value;
    if (!bmId || !beneficiaryId) return;

    let alertEl = document.getElementById('cross-bm-alert');
    if (!alertEl) {
      alertEl = document.createElement('div');
      alertEl.id = 'cross-bm-alert';
      alertEl.style.display = 'none';
      const dupeEl = document.getElementById('pa-duplicate-warning');
      if (dupeEl) {
        dupeEl.parentNode.insertBefore(alertEl, dupeEl.nextSibling);
      }
    }

    const crossInfo = Storage.getCrossBMInfo(beneficiaryId, bmId);
    if (crossInfo.bm_count > 0) {
      alertEl.style.display = 'block';
      alertEl.innerHTML = `
        <div class="banner banner-warning mb-sm">
          <div class="banner-content">
            <strong>${Icons.render('alert-triangle', 14)} Cross-BM Alert:</strong> This beneficiary has received assistance from <strong>${crossInfo.bm_count} other Board Member${crossInfo.bm_count > 1 ? 's' : ''}</strong>.
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

  submitNewPA(form) {
    const user = Auth.getCurrentUser();
    const formData = {
      bm_id: form.querySelector('#pa-bm')?.value,
      client_name: form.querySelector('#pa-client-name')?.value?.trim(),
      address: form.querySelector('#pa-address')?.value?.trim(),
      event_purpose: form.querySelector('#pa-event-purpose')?.value?.trim(),
      category_id: form.querySelector('#pa-category')?.value,
      category_custom: form.querySelector('#pa-category-custom')?.value?.trim(),
      action_taken: form.querySelector('#pa-action-taken')?.value?.trim(),
      amount: form.querySelector('#pa-amount')?.value,
      office_note: form.querySelector('#pa-office-note')?.value?.trim() || null,
      beneficiary_id: form.querySelector('#pa-beneficiary-id')?.value || null
    };

    const rules = {
      bm_id: [{ type: 'required', message: 'Please select a Board Member.' }],
      client_name: [{ type: 'required', message: 'Client name is required.' }],
      category_id: [{ type: 'required', message: 'Please select a category.' }],
      amount: [{ type: 'required' }, { type: 'amount', options: { min: 1 } }]
    };

    if (!Validators.validateAndDisplay(formData, rules, form)) return;

    const amount = parseFloat(formData.amount);

    // Create or find beneficiary
    let beneficiaryId = formData.beneficiary_id;
    if (!beneficiaryId) {
      const newBen = {
        beneficiary_id: Storage.generateId('ben'),
        full_name: formData.client_name,
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

    // Get cooldown duration
    const activeDuration = form.querySelector('[data-duration].active');
    let cooldownMonths = 3;
    let customDuration = null;
    if (activeDuration) {
      if (activeDuration.dataset.duration === 'custom') {
        customDuration = parseInt(form.querySelector('#pa-duration-custom-value')?.value) || 3;
        cooldownMonths = customDuration;
      } else {
        cooldownMonths = parseInt(activeDuration.dataset.duration) || 3;
      }
    }

    const skipWaiting = form.querySelector('#pa-skip-waiting')?.checked || false;
    const skipReason = form.querySelector('#pa-skip-reason')?.value?.trim() || null;
    const skipBMNoted = form.querySelector('#pa-skip-bm-noted')?.checked || false;

    let categoryId = formData.category_id;
    let categoryCustom = null;
    if (categoryId === '_custom') {
      categoryId = null;
      categoryCustom = formData.category_custom;
    }

    const paRecord = {
      pa_id: Storage.generateId('pa'),
      beneficiary_id: beneficiaryId,
      client_name: formData.client_name,
      address: formData.address || '',
      event_purpose: formData.event_purpose || '',
      category_id: categoryId,
      category_custom: categoryCustom,
      action_taken: formData.action_taken || '',
      amount_provided: amount,
      bm_id: formData.bm_id,
      cooldown_months: cooldownMonths,
      wait_duration_months: cooldownMonths,
      wait_duration_custom: customDuration,
      date_requested: form.querySelector('#pa-date-requested')?.value || null,
      next_available_date: skipWaiting ? null : Utils.addMonths(new Date(), cooldownMonths),
      skip_waiting_period: skipWaiting,
      skip_reason: skipReason,
      skip_bm_noted: skipBMNoted,
      remarks: form.querySelector('#pa-remarks')?.value?.trim() || null,
      encoded_by: user.user_id,
      office_note: formData.office_note,
      flagged_for_review: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_archived: false
    };

    Storage.add(KEYS.PA_RECORDS, paRecord);

    // Update frequency
    Storage.updateFrequency(beneficiaryId, 'pa', amount, formData.bm_id);

    const categoryName = categoryCustom || (Storage.getById(KEYS.PA_CATEGORIES, categoryId, 'id')?.name || 'Unknown');
    ActivityLogger.log(
      `Created PA for ${formData.client_name}`,
      'create', 'pa', paRecord.pa_id,
      `${categoryName} — ${Utils.formatCurrency(amount)}`
    );

    Notifications.success(`PA record created for ${formData.client_name}`);
    setTimeout(() => {
      window.location.href = `pa-list.html?bm=${formData.bm_id}`;
    }, 1000);
  },

  /* --------------------------------------------------------
   * LIST / VIEW PA RECORDS
   * -------------------------------------------------------- */

  initList() {
    const user = Auth.requireAuth();
    if (!user) return;

    this.currentPage = 1;
    this.pageSize = 10;
    this.currentBM = Utils.getUrlParam('bm') || '';
    this.currentSearch = '';

    this.setupFilters();
    this.loadRecords();
  },

  setupFilters() {
    const user = Auth.getCurrentUser();

    const bmFilter = document.getElementById('filter-bm');
    if (bmFilter) {
      if (user.role === 'board_member') {
        bmFilter.style.display = 'none';
        this.currentBM = user.bm_id;
      } else {
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
      }
    }

    const searchInput = document.getElementById('filter-search');
    if (searchInput) {
      searchInput.addEventListener('input', Utils.debounce(() => {
        this.currentSearch = searchInput.value.trim();
        this.currentPage = 1;
        this.loadRecords();
      }, 300));
    }
  },

  loadRecords() {
    const user = Auth.getCurrentUser();
    let records = Storage.getAll(KEYS.PA_RECORDS).filter(r => !r.is_archived);

    // Filter by BM — secretary only sees assigned BMs
    if (this.currentBM) {
      records = records.filter(r => r.bm_id === this.currentBM);
    } else if (user.role === 'secretary') {
      const assignedIds = user.assigned_bm_ids || [];
      records = records.filter(r => assignedIds.includes(r.bm_id));
    } else if (user.role === 'board_member') {
      records = records.filter(r => r.bm_id === user.bm_id);
    }

    if (this.currentSearch) {
      const q = this.currentSearch.toLowerCase();
      records = records.filter(r =>
        r.client_name?.toLowerCase().includes(q) ||
        r.pa_id?.toLowerCase().includes(q) ||
        r.event_purpose?.toLowerCase().includes(q)
      );
    }

    records.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const totalPages = Math.ceil(records.length / this.pageSize);
    const paged = records.slice((this.currentPage - 1) * this.pageSize, this.currentPage * this.pageSize);

    this.renderTable(paged);
    this.renderPagination(totalPages, records.length);
  },

  renderTable(records) {
    const tbody = document.getElementById('pa-table-body');
    if (!tbody) return;

    if (records.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" class="text-center p-xl">
            <div class="empty-state">
              <div class="empty-state-icon">${Icons.render('clipboard-list', 32)}</div>
              <h3 class="empty-state-title">No Personal Assistance Records</h3>
              <p class="empty-state-text">No personal assistance records found.</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    const bms = Storage.getAll(KEYS.BOARD_MEMBERS);
    const categories = Storage.getAll(KEYS.PA_CATEGORIES);

    tbody.innerHTML = records.map(r => {
      const bm = bms.find(b => b.bm_id === r.bm_id);
      const bmUser = bm ? Storage.getById(KEYS.USERS, bm.user_id, 'user_id') : null;
      const cat = categories.find(c => c.id === r.category_id);
      const categoryName = r.category_custom || (cat ? cat.name : 'Unknown');

      // Frequency badge
      const freq = r.beneficiary_id ? Storage.getFrequencyLevel(r.beneficiary_id) : { level: 'normal', total: 0 };
      const freqBadge = `<span class="badge ${Utils.getFrequencyClass(freq.level)}" title="${freq.total} assists this month">${freq.level === 'normal' ? freq.total : freq.level.toUpperCase() + ' (' + freq.total + ')'}</span>`;

      // Cross-BM flag
      const crossInfo = r.beneficiary_id ? Storage.getCrossBMInfo(r.beneficiary_id, r.bm_id) : { bm_count: 0 };
      const crossBMFlag = crossInfo.bm_count > 0
        ? `<span class="badge badge-warning" title="Also assisted by: ${crossInfo.bm_names.join(', ')}">${Icons.render('alert-triangle', 12)} ${crossInfo.bm_count} other BM${crossInfo.bm_count > 1 ? 's' : ''}</span>`
        : '';

      return `
        <tr${crossInfo.bm_count > 0 ? ' class="row-flagged"' : ''}>
          <td>${Utils.formatDate(r.created_at)}</td>
          <td><strong>${Utils.escapeHtml(r.client_name)}</strong>${crossBMFlag ? ' ' + crossBMFlag : ''}</td>
          <td>${freqBadge}</td>
          <td>${bmUser ? Utils.escapeHtml(bmUser.full_name) : '—'}</td>
          <td>${Utils.escapeHtml(categoryName)}</td>
          <td class="text-right">${Utils.formatCurrency(r.amount_provided)}</td>
          <td>${Utils.escapeHtml(r.event_purpose || '—')}</td>
          <td>${r.date_requested ? Utils.formatDate(r.date_requested) : '—'}</td>
          <td>${(() => { const cd = Utils.getCooldownStatus(r); return `<span class="badge ${cd.badgeClass}">${cd.label}</span>`; })()}</td>
          <td>
            <button class="btn btn-sm btn-ghost" onclick="PAModule.viewDetail('${r.pa_id}')" title="View">${Icons.render('eye', 16)}</button>
            ${Auth.getCurrentUser()?.role === 'sysadmin' ? `
            <button class="btn btn-sm btn-ghost" onclick="PAModule.editRecord('${r.pa_id}')" title="Edit Record">${Icons.render('settings', 16)}</button>
            <button class="btn btn-sm btn-ghost btn-danger-ghost" onclick="PAModule.deleteRecord('${r.pa_id}')" title="Delete">${Icons.render('trash', 16)}</button>
            ` : ''}
          </td>
        </tr>
      `;
    }).join('');
  },

  renderPagination(totalPages, totalRecords) {
    const paginationEl = document.getElementById('pa-pagination');
    if (!paginationEl) return;

    const countEl = document.getElementById('pa-count');
    if (countEl) countEl.textContent = `${totalRecords} record${totalRecords !== 1 ? 's' : ''}`;

    if (totalPages <= 1) {
      paginationEl.innerHTML = '<button class="pagination-btn active" disabled>1</button>';
      return;
    }

    let html = '';
    html += `<button class="pagination-btn" ${this.currentPage <= 1 ? 'disabled' : ''} onclick="PAModule.goToPage(${this.currentPage - 1})">‹</button>`;
    for (let i = 1; i <= totalPages; i++) {
      html += `<button class="pagination-btn ${i === this.currentPage ? 'active' : ''}" onclick="PAModule.goToPage(${i})">${i}</button>`;
    }
    html += `<button class="pagination-btn" ${this.currentPage >= totalPages ? 'disabled' : ''} onclick="PAModule.goToPage(${this.currentPage + 1})">›</button>`;
    paginationEl.innerHTML = html;
  },

  goToPage(page) {
    this.currentPage = page;
    this.loadRecords();
  },

  viewDetail(paId) {
    const record = Storage.getById(KEYS.PA_RECORDS, paId, 'pa_id');
    if (!record) return;

    const bm = Storage.getAll(KEYS.BOARD_MEMBERS).find(b => b.bm_id === record.bm_id);
    const bmUser = bm ? Storage.getById(KEYS.USERS, bm.user_id, 'user_id') : null;
    const encoder = Storage.getById(KEYS.USERS, record.encoded_by, 'user_id');
    const cat = Storage.getById(KEYS.PA_CATEGORIES, record.category_id, 'id');
    const categoryName = record.category_custom || (cat ? cat.name : 'Unknown');

    const html = `
      <div class="modal-overlay active" id="pa-detail-modal" onclick="this.remove()">
        <div class="modal modal-lg animate-fade-in" onclick="event.stopPropagation()">
          <div class="modal-header">
            <div>
              <h3 class="modal-title">Personal Assistance Detail</h3>
              <span class="modal-record-id">${record.pa_id}</span>
            </div>
            <button class="modal-close" onclick="document.getElementById('pa-detail-modal').remove()">&times;</button>
          </div>
          <div class="modal-body" style="padding:0">
            <div class="detail-grid">
              <div class="detail-section">Client Information</div>
              <div class="detail-item">
                <span class="detail-label">Client Name</span>
                <span class="detail-value">${Utils.escapeHtml(record.client_name)}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Address</span>
                <span class="detail-value">${Utils.escapeHtml(record.address || '—')}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Board Member</span>
                <span class="detail-value">${Utils.escapeHtml(bmUser ? bmUser.full_name : '—')}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Category</span>
                <span class="detail-value">${Utils.escapeHtml(categoryName)}</span>
              </div>

              <div class="detail-section">Financial Details</div>
              <div class="detail-item">
                <span class="detail-label">Amount Provided</span>
                <span class="detail-value detail-amount">${Utils.formatCurrency(record.amount_provided)}</span>
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

              <div class="detail-item-full">
                <span class="detail-label">Event / Purpose</span>
                <span class="detail-value">${Utils.escapeHtml(record.event_purpose || '—')}</span>
              </div>
              <div class="detail-item-full">
                <span class="detail-label">Action Taken</span>
                <span class="detail-value">${Utils.escapeHtml(record.action_taken || '—')}</span>
              </div>
              ${record.office_note ? `
              <div class="detail-item-full">
                <span class="detail-label">Office Note</span>
                <span class="detail-value">${Utils.escapeHtml(record.office_note)}</span>
              </div>
              ` : ''}

              <div class="detail-section">Cooldown Period</div>
              <div class="detail-item">
                <span class="detail-label">Cooldown Duration</span>
                <span class="detail-value">${record.cooldown_months || record.wait_duration_months || '—'} month${(record.cooldown_months || record.wait_duration_months) > 1 ? 's' : ''}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Next Available Date</span>
                <span class="detail-value">${record.next_available_date ? Utils.formatDate(record.next_available_date) : '—'}</span>
              </div>
              ${(() => { const cooldown = Utils.getCooldownStatus(record); return cooldown.status !== 'none' ? `
              <div class="detail-item-full">
                <span class="detail-label">Cooldown Status</span>
                <span class="detail-value"><span class="badge ${cooldown.badgeClass}">${cooldown.label}</span></span>
              </div>` : ''; })()}
              ${record.skip_waiting_period ? `
              <div class="detail-item-full">
                <span class="detail-label">Skip Reason</span>
                <span class="detail-value">${Utils.escapeHtml(record.skip_reason || 'No reason provided')}</span>
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
            <button class="btn btn-secondary" onclick="document.getElementById('pa-detail-modal').remove()">Close</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
  },

  /* --------------------------------------------------------
   * SYSADMIN EDIT / DELETE
   * -------------------------------------------------------- */

  editRecord(paId) {
    const user = Auth.getCurrentUser();
    if (!user || user.role !== 'sysadmin') return;

    const record = Storage.getById(KEYS.PA_RECORDS, paId, 'pa_id');
    if (!record) return;

    const bms = Storage.getAll(KEYS.BOARD_MEMBERS).filter(b => !b.is_archived);
    const categories = Storage.getAll(KEYS.PA_CATEGORIES);

    const html = `
      <div class="modal-overlay active" id="pa-edit-modal">
        <div class="modal animate-fade-in" style="max-width:560px;">
          <div class="modal-header">
            <h3 class="modal-title">${Icons.render('edit', 20)} Edit PA Record</h3>
            <button class="modal-close" onclick="document.getElementById('pa-edit-modal').remove()">&times;</button>
          </div>
          <div class="modal-body">
            <div id="pa-edit-error" class="banner banner-danger hidden mb-md"></div>

            <div class="form-group mb-md">
              <label class="form-label">Client Name *</label>
              <input type="text" class="form-input" id="edit-pa-client" value="${Utils.escapeHtml(record.client_name)}" required />
            </div>

            <div class="form-group mb-md">
              <label class="form-label">Address</label>
              <input type="text" class="form-input" id="edit-pa-address" value="${Utils.escapeHtml(record.address || '')}" />
            </div>

            <div class="d-flex gap-md">
              <div class="form-group mb-md" style="flex:1;">
                <label class="form-label">Category</label>
                <select class="form-select" id="edit-pa-category">
                  ${categories.map(c => `<option value="${c.id}" ${c.id === record.category_id ? 'selected' : ''}>${Utils.escapeHtml(c.name)}</option>`).join('')}
                  <option value="_custom" ${record.category_custom ? 'selected' : ''}>Custom</option>
                </select>
              </div>
              <div class="form-group mb-md" style="flex:1;">
                <label class="form-label">Custom Category</label>
                <input type="text" class="form-input" id="edit-pa-category-custom" value="${Utils.escapeHtml(record.category_custom || '')}" placeholder="If custom" />
              </div>
            </div>

            <div class="d-flex gap-md">
              <div class="form-group mb-md" style="flex:1;">
                <label class="form-label">Amount Provided (₱) *</label>
                <input type="number" class="form-input" id="edit-pa-amount" value="${record.amount_provided}" min="1" step="100" required />
              </div>
              <div class="form-group mb-md" style="flex:1;">
                <label class="form-label">Board Member</label>
                <select class="form-select" id="edit-pa-bm">
                  ${bms.map(bm => {
                    const u = Storage.getById(KEYS.USERS, bm.user_id, 'user_id');
                    return `<option value="${bm.bm_id}" ${bm.bm_id === record.bm_id ? 'selected' : ''}>${u ? Utils.escapeHtml(u.full_name) : bm.district_name}</option>`;
                  }).join('')}
                </select>
              </div>
            </div>

            <div class="form-group mb-md">
              <label class="form-label">Event / Purpose</label>
              <input type="text" class="form-input" id="edit-pa-purpose" value="${Utils.escapeHtml(record.event_purpose || '')}" />
            </div>

            <div class="form-group mb-md">
              <label class="form-label">Action Taken</label>
              <input type="text" class="form-input" id="edit-pa-action" value="${Utils.escapeHtml(record.action_taken || '')}" />
            </div>

            <div class="form-group mb-md">
              <label class="form-label">Office Note</label>
              <textarea class="form-input" id="edit-pa-note" rows="2">${Utils.escapeHtml(record.office_note || '')}</textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" onclick="document.getElementById('pa-edit-modal').remove()">Cancel</button>
            <button class="btn btn-primary" onclick="PAModule.saveRecordEdit('${paId}')">
              ${Icons.render('check', 16)} Save Changes
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
  },

  saveRecordEdit(paId) {
    const clientName = document.getElementById('edit-pa-client').value.trim();
    const address = document.getElementById('edit-pa-address').value.trim();
    const categoryId = document.getElementById('edit-pa-category').value;
    const categoryCustom = document.getElementById('edit-pa-category-custom').value.trim();
    const amount = parseFloat(document.getElementById('edit-pa-amount').value);
    const bmId = document.getElementById('edit-pa-bm').value;
    const purpose = document.getElementById('edit-pa-purpose').value.trim();
    const action = document.getElementById('edit-pa-action').value.trim();
    const note = document.getElementById('edit-pa-note').value.trim();
    const errorEl = document.getElementById('pa-edit-error');

    if (!clientName || !amount) {
      errorEl.textContent = 'Client name and amount are required.';
      errorEl.classList.remove('hidden');
      return;
    }

    const updates = {
      client_name: clientName,
      address: address,
      category_id: categoryId === '_custom' ? null : categoryId,
      category_custom: categoryId === '_custom' ? categoryCustom : null,
      amount_provided: amount,
      bm_id: bmId,
      event_purpose: purpose,
      action_taken: action,
      office_note: note || null,
      updated_at: new Date().toISOString()
    };

    Storage.update(KEYS.PA_RECORDS, paId, updates, 'pa_id');

    ActivityLogger.log(
      `[Admin] Edited PA record: ${clientName}`,
      'edit', 'pa', paId,
      `Amount: ${Utils.formatCurrency(amount)}`
    );

    document.getElementById('pa-edit-modal')?.remove();
    Notifications.success('PA record updated successfully.');
    this.loadRecords();
  },

  async deleteRecord(paId) {
    const user = Auth.getCurrentUser();
    if (!user || user.role !== 'sysadmin') return;

    const record = Storage.getById(KEYS.PA_RECORDS, paId, 'pa_id');
    if (!record) return;

    const confirmed = await Notifications.confirm({
      title: 'Delete PA Record',
      message: `Permanently delete the PA record for "${record.client_name}"?\n\nAmount: ${Utils.formatCurrency(record.amount_provided)}\n\nThis action cannot be undone.`,
      confirmText: 'Delete Permanently',
      type: 'danger'
    });

    if (!confirmed) return;

    Storage.hardDelete(KEYS.PA_RECORDS, paId, 'pa_id');

    ActivityLogger.log(
      `[Admin] Deleted PA record: ${record.client_name}`,
      'delete', 'pa', paId,
      `Amount: ${Utils.formatCurrency(record.amount_provided)}`
    );

    Notifications.success(`PA record for "${record.client_name}" deleted.`);
    this.loadRecords();
  },

  exportToCSV() {
    const user = Auth.getCurrentUser();
    let records = Storage.getAll(KEYS.PA_RECORDS).filter(r => !r.is_archived);

    if (this.currentBM) {
      records = records.filter(r => r.bm_id === this.currentBM);
    } else if (user.role === 'secretary') {
      const assignedIds = user.assigned_bm_ids || [];
      records = records.filter(r => assignedIds.includes(r.bm_id));
    } else if (user.role === 'board_member') {
      records = records.filter(r => r.bm_id === user.bm_id);
    }

    const categories = Storage.getAll(KEYS.PA_CATEGORIES);
    const bms = Storage.getAll(KEYS.BOARD_MEMBERS);

    ExportUtils.toCSV(records, 'pa-records', {
      columns: ['pa_id', 'client_name', 'category_id', 'amount_provided', 'bm_id', 'event_purpose', 'created_at'],
      headers: ['Record ID', 'Client Name', 'Category', 'Amount', 'Board Member', 'Purpose', 'Date'],
      transform: {
        category_id: (val, item) => item.category_custom || (categories.find(c => c.id === val)?.name || 'Unknown'),
        amount_provided: (val) => val ? `₱${val.toLocaleString()}` : '—',
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
