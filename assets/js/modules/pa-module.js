/**
 * ============================================================
 * OMSP Document Tracking / Monitoring
 * PA Module - Personal Assistance (from BM's own pocket)
 * ============================================================
 * PA is TRANSPARENT:
 * - All secretaries can see all PA records
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

    // PA can be created for any active BM (transparent)
    const bms = Storage.getAll(KEYS.BOARD_MEMBERS).filter(b => !b.is_archived);
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

    balanceEl.style.display = 'block';
    balanceEl.innerHTML = `
      <div class="banner banner-info">
        <div class="banner-content">
          <strong>PA Balance (BM's Own Money)</strong>
          <div class="mt-xs">Current balance: <strong>${Utils.formatCurrency(bm.pa_balance)}</strong></div>
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

    Notifications.info(`Selected: ${ben.full_name}`);
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
      skip_waiting_period: skipWaiting,
      skip_reason: skipReason,
      skip_bm_noted: skipBMNoted,
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
        const bms = Storage.getAll(KEYS.BOARD_MEMBERS).filter(b => !b.is_archived);
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

    // PA is transparent for secretaries - they see all
    if (this.currentBM) {
      records = records.filter(r => r.bm_id === this.currentBM);
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
          <td colspan="6" class="text-center p-xl">
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

      return `
        <tr>
          <td><strong>${Utils.escapeHtml(r.client_name)}</strong></td>
          <td>${Utils.escapeHtml(categoryName)}</td>
          <td class="text-right">${Utils.formatCurrency(r.amount_provided)}</td>
          <td>${bmUser ? Utils.escapeHtml(bmUser.full_name) : '—'}</td>
          <td>${Utils.formatDate(r.created_at)}</td>
          <td>
            <button class="btn btn-sm btn-ghost" onclick="PAModule.viewDetail('${r.pa_id}')" title="View">${Icons.render('eye', 16)}</button>
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
      paginationEl.innerHTML = '';
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
      <div class="modal-overlay active" id="pa-detail-modal">
        <div class="modal animate-fade-in">
          <div class="modal-header">
            <h3 class="modal-title">Personal Assistance Record Detail</h3>
            <button class="modal-close" onclick="document.getElementById('pa-detail-modal').remove()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">Record ID</span>
                <span class="detail-value">${record.pa_id}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Client Name</span>
                <span class="detail-value">${Utils.escapeHtml(record.client_name)}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Address</span>
                <span class="detail-value">${Utils.escapeHtml(record.address || '—')}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Category</span>
                <span class="detail-value">${Utils.escapeHtml(categoryName)}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Amount Provided</span>
                <span class="detail-value text-primary font-semibold">${Utils.formatCurrency(record.amount_provided)}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Board Member</span>
                <span class="detail-value">${Utils.escapeHtml(bmUser ? bmUser.full_name : '—')}</span>
              </div>
              <div class="detail-item" style="grid-column: 1 / -1">
                <span class="detail-label">Event/Purpose</span>
                <span class="detail-value">${Utils.escapeHtml(record.event_purpose || '—')}</span>
              </div>
              <div class="detail-item" style="grid-column: 1 / -1">
                <span class="detail-label">Action Taken</span>
                <span class="detail-value">${Utils.escapeHtml(record.action_taken || '—')}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Encoded By</span>
                <span class="detail-value">${Utils.escapeHtml(encoder ? encoder.full_name : '—')}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Created</span>
                <span class="detail-value">${Utils.formatDate(record.created_at, 'datetime')}</span>
              </div>
              ${record.office_note ? `
              <div class="detail-item" style="grid-column: 1 / -1">
                <span class="detail-label">Office Note</span>
                <span class="detail-value">${Utils.escapeHtml(record.office_note)}</span>
              </div>
              ` : ''}
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

  exportToCSV() {
    const user = Auth.getCurrentUser();
    let records = Storage.getAll(KEYS.PA_RECORDS).filter(r => !r.is_archived);

    if (this.currentBM) {
      records = records.filter(r => r.bm_id === this.currentBM);
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
