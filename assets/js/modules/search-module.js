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

      const faMatches = faRecords.filter(r =>
        r.patient_name?.toLowerCase().includes(q) ||
        r.fa_id?.toLowerCase().includes(q)
      );
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

    // Get all records for this beneficiary
    const faRecords = Storage.getAll(KEYS.FA_RECORDS).filter(r => r.beneficiary_id === ben.beneficiary_id && !r.is_archived);
    const paRecords = Storage.getAll(KEYS.PA_RECORDS).filter(r => r.beneficiary_id === ben.beneficiary_id && !r.is_archived);
    const totalFA = faRecords.reduce((s, r) => s + (r.amount_approved || 0), 0);
    const totalPA = paRecords.reduce((s, r) => s + (r.amount_provided || 0), 0);

    return `
      <div class="result-card" onclick="SearchModule.showBeneficiaryDetail('${ben.beneficiary_id}')">
        <div class="result-header">
          <div class="d-flex align-center gap-sm">
            <div class="avatar">${Utils.getInitials(ben.full_name)}</div>
            <div>
              <h4 class="result-title">${Utils.escapeHtml(ben.full_name)}</h4>
              <span class="text-muted text-sm">${Utils.escapeHtml(ben.municipality || ben.address || '—')}</span>
            </div>
          </div>
          <span class="badge ${Utils.getFrequencyClass(freq.level)}">${freq.level} (${freq.total}x)</span>
        </div>
        <div class="result-meta">
          <span class="badge badge-primary">Beneficiary</span>
          <span>FA: ${faRecords.length} records (${Utils.formatCurrency(totalFA)})</span>
          <span>PA: ${paRecords.length} records (${Utils.formatCurrency(totalPA)})</span>
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
            <h4 class="result-title">${Utils.escapeHtml(record.patient_name)}</h4>
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
            <h4 class="result-title">${Utils.escapeHtml(record.client_name)}</h4>
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
  }
};
