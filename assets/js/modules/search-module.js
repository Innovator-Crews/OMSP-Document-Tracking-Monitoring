/**
 * ============================================================
 * OMSP Document Tracking / Monitoring
 * Search Module - Global search across FA, PA, beneficiaries
 * ============================================================
 */

const SearchModule = {
  init() {
    const user = Auth.requireAuth();
    if (!user) return;

    this.setupSearch();
    Auth.setupSidebarProfile();
    Auth.setActiveSidebarLink();

    // Check for pre-filled query
    const q = Utils.getUrlParam('q');
    if (q) {
      const input = document.getElementById('global-search-input');
      if (input) {
        input.value = q;
        this.performSearch(q);
      }
    }
  },

  setupSearch() {
    const input = document.getElementById('global-search-input');
    const typeToggles = document.querySelectorAll('[data-search-type]');

    this.currentType = 'all';

    if (input) {
      input.addEventListener('input', Utils.debounce(() => {
        this.performSearch(input.value.trim());
      }, 300));

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.performSearch(input.value.trim());
        }
      });
    }

    typeToggles.forEach(btn => {
      btn.addEventListener('click', () => {
        typeToggles.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentType = btn.dataset.searchType;
        const query = document.getElementById('global-search-input')?.value?.trim();
        if (query) this.performSearch(query);
      });
    });
  },

  performSearch(query) {
    if (!query || query.length < 2) {
      this.showEmptyState('Type at least 2 characters to search');
      return;
    }

    const user = Auth.getCurrentUser();
    const q = query.toLowerCase();
    const results = [];

    // Search beneficiaries
    if (this.currentType === 'all' || this.currentType === 'beneficiary') {
      const bens = Storage.getAll(KEYS.BENEFICIARIES).filter(b =>
        b.full_name.toLowerCase().includes(q) ||
        (b.address && b.address.toLowerCase().includes(q)) ||
        (b.municipality && b.municipality.toLowerCase().includes(q)) ||
        (b.contact_number && b.contact_number.includes(q))
      );
      bens.forEach(b => results.push({ type: 'beneficiary', data: b }));
    }

    // Search FA records
    if (this.currentType === 'all' || this.currentType === 'fa') {
      let faRecords = Storage.getAll(KEYS.FA_RECORDS).filter(r => !r.is_archived);

      // Access control
      if (user.role === 'board_member') {
        faRecords = faRecords.filter(r => r.bm_id === user.bm_id);
      } else if (user.role === 'secretary') {
        const assignedIds = user.assigned_bm_ids || [];
        faRecords = faRecords.filter(r => assignedIds.includes(r.bm_id));
      }

      const faCategories = Storage.getAll(KEYS.FA_CATEGORIES);
      const faMatches = faRecords.filter(r => {
        const catName = r.case_type_custom || (faCategories.find(c => c.id === r.case_type_id)?.name || '');
        return r.patient_name?.toLowerCase().includes(q) ||
          r.fa_id?.toLowerCase().includes(q) ||
          catName.toLowerCase().includes(q);
      });
      faMatches.forEach(r => results.push({ type: 'fa', data: r }));
    }

    // Search PA records (transparent to all)
    if (this.currentType === 'all' || this.currentType === 'pa') {
      let paRecords = Storage.getAll(KEYS.PA_RECORDS).filter(r => !r.is_archived);

      if (user.role === 'board_member') {
        paRecords = paRecords.filter(r => r.bm_id === user.bm_id);
      }

      const paMatches = paRecords.filter(r =>
        r.client_name?.toLowerCase().includes(q) ||
        r.pa_id?.toLowerCase().includes(q) ||
        r.event_purpose?.toLowerCase().includes(q)
      );
      paMatches.forEach(r => results.push({ type: 'pa', data: r }));
    }

    this.renderResults(results, query);
  },

  renderResults(results, query) {
    const container = document.getElementById('search-results');
    if (!container) return;

    const countEl = document.getElementById('result-count');
    if (countEl) countEl.textContent = `${results.length} result${results.length !== 1 ? 's' : ''} for "${Utils.escapeHtml(query)}"`;

    if (results.length === 0) {
      this.showEmptyState(`No results found for "${Utils.escapeHtml(query)}"`);
      return;
    }

    container.innerHTML = results.map(r => {
      switch (r.type) {
        case 'beneficiary': return this.renderBeneficiaryResult(r.data);
        case 'fa': return this.renderFAResult(r.data);
        case 'pa': return this.renderPAResult(r.data);
        default: return '';
      }
    }).join('');
  },

  renderBeneficiaryResult(ben) {
    const freq = Storage.getFrequencyLevel(ben.beneficiary_id);
    const crossInfo = Storage.getCrossBMInfo(ben.beneficiary_id);

    // Get all records for this beneficiary
    const faRecords = Storage.getAll(KEYS.FA_RECORDS).filter(r => r.beneficiary_id === ben.beneficiary_id && !r.is_archived);
    const paRecords = Storage.getAll(KEYS.PA_RECORDS).filter(r => r.beneficiary_id === ben.beneficiary_id && !r.is_archived);
    const totalFA = faRecords.reduce((s, r) => s + (r.amount_approved || 0), 0);
    const totalPA = paRecords.reduce((s, r) => s + (r.amount_provided || 0), 0);

    const crossBMBadge = crossInfo.bm_count > 1
      ? `<span class="badge badge-warning" title="Assisted by: ${crossInfo.bm_names.join(', ')}">${Icons.render('alert-triangle', 12)} ${crossInfo.bm_count} BMs</span>`
      : '';

    return `
      <div class="result-card${crossInfo.bm_count > 1 ? ' row-flagged' : ''}" onclick="SearchModule.showBeneficiaryDetail('${ben.beneficiary_id}')">
        <div class="result-header">
          <div class="d-flex align-center gap-sm">
            <div class="avatar">${Utils.getInitials(ben.full_name)}</div>
            <div>
              <h4 class="result-name">${Utils.escapeHtml(ben.full_name)}</h4>
              <span class="text-muted text-sm">${Utils.escapeHtml(ben.municipality || ben.address || '—')}</span>
            </div>
          </div>
          <div class="d-flex gap-xs">
            ${crossBMBadge}
            <span class="badge ${Utils.getFrequencyClass(freq.level)}">${freq.level} (${freq.total}x)</span>
          </div>
        </div>
        <div class="result-meta">
          <span class="badge badge-primary">Beneficiary</span>
          <span>FA: ${faRecords.length} records (${Utils.formatCurrency(totalFA)})</span>
          <span>PA: ${paRecords.length} records (${Utils.formatCurrency(totalPA)})</span>
          ${crossInfo.bm_count > 1 ? `<span class="text-sm text-muted">BMs: ${crossInfo.bm_names.join(', ')}</span>` : ''}
        </div>
      </div>
    `;
  },

  renderFAResult(record) {
    const bm = Storage.getAll(KEYS.BOARD_MEMBERS).find(b => b.bm_id === record.bm_id);
    const bmUser = bm ? Storage.getById(KEYS.USERS, bm.user_id, 'user_id') : null;

    return `
      <div class="result-card" onclick="FAModule.viewDetail('${record.fa_id}')">
        <div class="result-header">
          <div>
            <h4 class="result-name">${Utils.escapeHtml(record.patient_name)}</h4>
            <span class="text-muted text-sm">FA: ${record.fa_id}</span>
          </div>
          <span class="badge badge-status-${Utils.getStatusClass(record.status)}">${record.status}</span>
        </div>
        <div class="result-meta">
          <span class="badge badge-primary">Financial Assistance</span>
          <span>${Utils.formatCurrency(record.amount_approved)}</span>
          <span>BM: ${Utils.escapeHtml(bmUser ? bmUser.full_name : '—')}</span>
          <span>${Utils.formatDate(record.created_at)}</span>
        </div>
      </div>
    `;
  },

  renderPAResult(record) {
    const bm = Storage.getAll(KEYS.BOARD_MEMBERS).find(b => b.bm_id === record.bm_id);
    const bmUser = bm ? Storage.getById(KEYS.USERS, bm.user_id, 'user_id') : null;

    return `
      <div class="result-card" onclick="PAModule.viewDetail('${record.pa_id}')">
        <div class="result-header">
          <div>
            <h4 class="result-name">${Utils.escapeHtml(record.client_name)}</h4>
            <span class="text-muted text-sm">PA: ${record.pa_id}</span>
          </div>
          <span class="badge badge-teal">PA</span>
        </div>
        <div class="result-meta">
          <span class="badge badge-teal">Personal Assistance</span>
          <span>${Utils.formatCurrency(record.amount_provided)}</span>
          <span>BM: ${Utils.escapeHtml(bmUser ? bmUser.full_name : '—')}</span>
          <span>${Utils.formatDate(record.created_at)}</span>
        </div>
      </div>
    `;
  },

  showBeneficiaryDetail(beneficiaryId) {
    const ben = Storage.getById(KEYS.BENEFICIARIES, beneficiaryId, 'beneficiary_id');
    if (!ben) return;

    const faRecords = Storage.getAll(KEYS.FA_RECORDS).filter(r => r.beneficiary_id === beneficiaryId && !r.is_archived);
    const paRecords = Storage.getAll(KEYS.PA_RECORDS).filter(r => r.beneficiary_id === beneficiaryId && !r.is_archived);
    const freq = Storage.getFrequencyLevel(beneficiaryId);
    const bms = Storage.getAll(KEYS.BOARD_MEMBERS);

    const allRecords = [
      ...faRecords.map(r => ({ ...r, type: 'FA', amount: r.amount_approved, name: r.patient_name })),
      ...paRecords.map(r => ({ ...r, type: 'PA', amount: r.amount_provided, name: r.client_name }))
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const totalAssistance = allRecords.reduce((s, r) => s + (r.amount || 0), 0);

    const html = `
      <div class="modal-overlay active" id="ben-detail-modal">
        <div class="modal modal-lg animate-fade-in">
          <div class="modal-header">
            <h3 class="modal-title">Beneficiary Profile</h3>
            <button class="modal-close" onclick="document.getElementById('ben-detail-modal').remove()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="d-flex align-center gap-md mb-lg">
              <div class="avatar avatar-xl">${Utils.getInitials(ben.full_name)}</div>
              <div>
                <h2 class="mb-xs">${Utils.escapeHtml(ben.full_name)}</h2>
                <p class="text-muted">${Utils.escapeHtml(ben.address || '')} ${ben.contact_number ? '• ' + ben.contact_number : ''}</p>
                <div class="d-flex gap-sm mt-xs">
                  <span class="badge ${Utils.getFrequencyClass(freq.level)}">Frequency: ${freq.level} (${freq.total}x this month)</span>
                  <span class="badge badge-info">Total: ${Utils.formatCurrency(totalAssistance)}</span>
                </div>
              </div>
            </div>

            <div class="grid-2-col gap-md mb-lg">
              <div class="stat-card stat-card-primary">
                <div class="stat-value">${faRecords.length}</div>
                <div class="stat-label">Financial Assistance Records</div>
              </div>
              <div class="stat-card stat-card-teal">
                <div class="stat-value">${paRecords.length}</div>
                <div class="stat-label">Personal Assistance Records</div>
              </div>
            </div>

            <h4 class="mb-sm">Assistance History</h4>
            <div class="history-timeline">
              ${allRecords.length === 0 ? '<p class="text-muted">No records yet</p>' : allRecords.map(r => {
                const bm = bms.find(b => b.bm_id === r.bm_id);
                const bmUser = bm ? Storage.getById(KEYS.USERS, bm.user_id, 'user_id') : null;
                return `
                  <div class="timeline-item">
                    <div class="timeline-dot ${r.type === 'FA' ? 'dot-primary' : 'dot-teal'}"></div>
                    <div class="timeline-content">
                      <div class="d-flex justify-between align-center">
                        <span class="badge ${r.type === 'FA' ? 'badge-primary' : 'badge-teal'}">${r.type}</span>
                        <span class="text-muted text-sm">${Utils.formatDate(r.created_at)}</span>
                      </div>
                      <p class="mt-xs">
                        <strong>${Utils.formatCurrency(r.amount)}</strong>
                        from ${Utils.escapeHtml(bmUser ? bmUser.full_name : '—')}
                        ${r.status ? ` • <span class="badge badge-status-${Utils.getStatusClass(r.status)}">${r.status}</span>` : ''}
                      </p>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="document.getElementById('ben-detail-modal').remove()">Close</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
  },

  showEmptyState(message) {
    const container = document.getElementById('search-results');
    if (!container) return;
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">${Icons.render('search', 32)}</div>
        <h3 class="empty-state-title">Search</h3>
        <p class="empty-state-text">${message}</p>
      </div>
    `;
  },

  /* --------------------------------------------------------
   * SEARCH ARCHIVES — searches only archived / past-term records
   * -------------------------------------------------------- */

  initArchives() {
    const user = Auth.requireAuth();
    if (!user) return;

    const container = document.getElementById('search-archives-content');
    if (!container) return;

    container.innerHTML = `
      <div class="search-bar mb-md">
        <div class="form-group" style="max-width:600px">
          <div class="d-flex gap-sm">
            <input type="text" id="archive-search-input" class="form-input" placeholder="Search archived FA / PA records by beneficiary name, ID..." autofocus />
            <button class="btn btn-primary" id="archive-search-btn">${Icons.render('search', 16)} Search</button>
          </div>
        </div>
        <div class="d-flex gap-sm mt-sm">
          <button class="btn btn-sm btn-secondary active" data-archive-type="all">All</button>
          <button class="btn btn-sm btn-secondary" data-archive-type="fa">FA Records</button>
          <button class="btn btn-sm btn-secondary" data-archive-type="pa">PA Records</button>
          <button class="btn btn-sm btn-secondary" data-archive-type="letters">Incoming Letters</button>
        </div>
      </div>
      <div id="archive-result-count" class="text-muted text-sm mb-sm"></div>
      <div id="archive-results">
        <div class="empty-state">
          <div class="empty-state-icon">${Icons.render('archive', 32)}</div>
          <h3 class="empty-state-title">Search Archives</h3>
          <p class="empty-state-text">Search through archived and past-term records</p>
        </div>
      </div>
    `;

    this._archiveType = 'all';

    const input = document.getElementById('archive-search-input');
    const searchBtn = document.getElementById('archive-search-btn');
    const typeToggles = container.querySelectorAll('[data-archive-type]');

    if (input) {
      input.addEventListener('input', Utils.debounce(() => {
        this._performArchiveSearch(input.value.trim(), user);
      }, 300));
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this._performArchiveSearch(input.value.trim(), user);
        }
      });
    }

    if (searchBtn) {
      searchBtn.addEventListener('click', () => {
        this._performArchiveSearch(input.value.trim(), user);
      });
    }

    typeToggles.forEach(btn => {
      btn.addEventListener('click', () => {
        typeToggles.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._archiveType = btn.dataset.archiveType;
        if (input.value.trim()) this._performArchiveSearch(input.value.trim(), user);
      });
    });
  },

  _performArchiveSearch(query, user) {
    const resultsEl = document.getElementById('archive-results');
    const countEl = document.getElementById('archive-result-count');
    if (!resultsEl) return;

    if (!query || query.length < 2) {
      countEl.textContent = '';
      resultsEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">${Icons.render('archive', 32)}</div>
          <h3 class="empty-state-title">Search Archives</h3>
          <p class="empty-state-text">Type at least 2 characters to search</p>
        </div>
      `;
      return;
    }

    const q = query.toLowerCase();
    const results = [];

    // Search archived FA
    if (this._archiveType === 'all' || this._archiveType === 'fa') {
      let faRecords = Storage.getAll(KEYS.FA_RECORDS).filter(r => r.is_archived);
      if (user.role === 'board_member') {
        const bms = Storage.query(KEYS.BOARD_MEMBERS, { user_id: user.user_id });
        if (bms.length) faRecords = faRecords.filter(r => r.bm_id === bms[0].bm_id);
      } else if (user.role === 'secretary') {
        const assigned = Auth.getAssignedBMs();
        const bmIds = assigned.map(b => b.bm_id);
        faRecords = faRecords.filter(r => bmIds.includes(r.bm_id));
      }
      faRecords.filter(r =>
        (r.patient_name && r.patient_name.toLowerCase().includes(q)) ||
        (r.fa_id && r.fa_id.toLowerCase().includes(q))
      ).forEach(r => results.push({ type: 'fa', data: r }));
    }

    // Search archived PA
    if (this._archiveType === 'all' || this._archiveType === 'pa') {
      let paRecords = Storage.getAll(KEYS.PA_RECORDS).filter(r => r.is_archived);
      if (user.role === 'board_member') {
        const bms = Storage.query(KEYS.BOARD_MEMBERS, { user_id: user.user_id });
        if (bms.length) paRecords = paRecords.filter(r => r.bm_id === bms[0].bm_id);
      }
      paRecords.filter(r =>
        (r.client_name && r.client_name.toLowerCase().includes(q)) ||
        (r.pa_id && r.pa_id.toLowerCase().includes(q)) ||
        (r.event_purpose && r.event_purpose.toLowerCase().includes(q))
      ).forEach(r => results.push({ type: 'pa', data: r }));
    }

    // Search archived incoming letters
    if (this._archiveType === 'all' || this._archiveType === 'letters') {
      let letters = Storage.getAll(KEYS.INCOMING_LETTERS).filter(l => l.is_archived);
      if (user.role === 'secretary') {
        const assigned = Auth.getAssignedBMs();
        const bmIds = assigned.map(b => b.bm_id);
        letters = letters.filter(l => bmIds.includes(l.bm_id));
      } else if (user.role === 'board_member') {
        const bms = Storage.query(KEYS.BOARD_MEMBERS, { user_id: user.user_id });
        if (bms.length) letters = letters.filter(l => l.bm_id === bms[0].bm_id);
      }
      letters.filter(l =>
        l.sender_name.toLowerCase().includes(q) ||
        (l.event && l.event.toLowerCase().includes(q)) ||
        (l.purpose && l.purpose.toLowerCase().includes(q))
      ).forEach(l => results.push({ type: 'letter', data: l }));
    }

    countEl.textContent = `${results.length} archived result${results.length !== 1 ? 's' : ''} for "${Utils.escapeHtml(query)}"`;

    if (results.length === 0) {
      resultsEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">${Icons.render('archive', 32)}</div>
          <h3 class="empty-state-title">No Results</h3>
          <p class="empty-state-text">No archived records match "${Utils.escapeHtml(query)}"</p>
        </div>
      `;
      return;
    }

    const bms = Storage.getAll(KEYS.BOARD_MEMBERS);
    resultsEl.innerHTML = results.map(r => {
      if (r.type === 'fa') return this._renderArchivedFA(r.data, bms);
      if (r.type === 'pa') return this._renderArchivedPA(r.data, bms);
      if (r.type === 'letter') return this._renderArchivedLetter(r.data, bms);
      return '';
    }).join('');
  },

  _renderArchivedFA(record, bms) {
    const bm = bms.find(b => b.bm_id === record.bm_id);
    const bmUser = bm ? Storage.getById(KEYS.USERS, bm.user_id, 'user_id') : null;
    return `
      <div class="result-card">
        <div class="result-header">
          <div>
            <h4 class="result-name">${Utils.escapeHtml(record.patient_name)}</h4>
            <span class="text-muted text-sm">FA: ${record.fa_id} • Archived</span>
          </div>
          <span class="badge badge-secondary">Archived FA</span>
        </div>
        <div class="result-meta">
          <span>${Utils.formatCurrency(record.amount_approved)}</span>
          <span>BM: ${Utils.escapeHtml(bmUser ? bmUser.full_name : '—')}</span>
          <span>${Utils.formatDate(record.created_at)}</span>
          ${record.archived_at ? `<span>Archived: ${Utils.formatDate(record.archived_at)}</span>` : ''}
        </div>
      </div>
    `;
  },

  _renderArchivedPA(record, bms) {
    const bm = bms.find(b => b.bm_id === record.bm_id);
    const bmUser = bm ? Storage.getById(KEYS.USERS, bm.user_id, 'user_id') : null;
    return `
      <div class="result-card">
        <div class="result-header">
          <div>
            <h4 class="result-name">${Utils.escapeHtml(record.client_name)}</h4>
            <span class="text-muted text-sm">PA: ${record.pa_id} • Archived</span>
          </div>
          <span class="badge badge-secondary">Archived PA</span>
        </div>
        <div class="result-meta">
          <span>${Utils.formatCurrency(record.amount_provided)}</span>
          <span>BM: ${Utils.escapeHtml(bmUser ? bmUser.full_name : '—')}</span>
          <span>${Utils.formatDate(record.created_at)}</span>
          ${record.archived_at ? `<span>Archived: ${Utils.formatDate(record.archived_at)}</span>` : ''}
        </div>
      </div>
    `;
  },

  _renderArchivedLetter(letter, bms) {
    const bm = bms.find(b => b.bm_id === letter.bm_id);
    const bmUser = bm ? Storage.getById(KEYS.USERS, bm.user_id, 'user_id') : null;
    const catMap = {
      'Cultural Activities': 'badge-info',
      'Solicitations': 'badge-warning',
      'Invitation Letters': 'badge-accent'
    };
    return `
      <div class="result-card">
        <div class="result-header">
          <div>
            <h4 class="result-name">${Utils.escapeHtml(letter.sender_name)}</h4>
            <span class="text-muted text-sm">${Utils.escapeHtml(letter.event || letter.purpose || '—')} • Archived</span>
          </div>
          <span class="badge ${catMap[letter.category] || 'badge-secondary'}">${Utils.escapeHtml(letter.category)}</span>
        </div>
        <div class="result-meta">
          <span>BM: ${Utils.escapeHtml(bmUser ? bmUser.full_name : '—')}</span>
          <span>Received: ${Utils.formatDate(letter.date_received)}</span>
          ${letter.archived_at ? `<span>Archived: ${Utils.formatDate(letter.archived_at)}</span>` : ''}
        </div>
      </div>
    `;
  }
};
