/**
 * ============================================================
 * OMSP Document Tracking / Monitoring
 * Board Member Module — BM-specific page logic
 * ============================================================
 * Handles BM-only pages: My Financial Assistance Budget, My Personal Assistance Budget
 */

const BoardMemberModule = {

  // ─── My Financial Assistance Budget Page ───────────────────────────────────
  initMyBudget() {
    const container = document.getElementById('my-budget-content');
    if (!container) return;

    const user = Auth.getCurrentUser();
    const bmData = Auth.getCurrentBMData();
    if (!bmData) {
      container.innerHTML = '<p class="text-muted">Board member data not found.</p>';
      return;
    }

    const budget = Storage.getCurrentBudget(bmData.bm_id);
    const pct = Utils.percentage(budget.used_amount, budget.total_budget);
    const history = Storage.getBudgetHistory(bmData.bm_id);

    let html = `
      <div class="d-flex justify-between align-center mb-md">
        <h3>Financial Assistance Budget — ${Utils.formatMonth(Utils.getCurrentYearMonth())}</h3>
        <button class="btn btn-sm btn-secondary" onclick="BoardMemberModule.showEditFABudget()">
          ${typeof Icons !== 'undefined' ? Icons.render('edit', 14) : ''} Edit Base Budget
        </button>
      </div>

      <div class="grid-3-col gap-md mb-lg">
        <div class="stat-card stat-card-blue">
          <div class="stat-icon stat-icon-blue">${typeof Icons !== 'undefined' ? Icons.render('wallet', 22) : ''}</div>
          <div class="stat-label">Total Budget</div>
          <div class="stat-value">${Utils.formatCurrency(budget.total_budget)}</div>
        </div>
        <div class="stat-card stat-card-amber">
          <div class="stat-icon stat-icon-amber">${typeof Icons !== 'undefined' ? Icons.render('trending-up', 22) : ''}</div>
          <div class="stat-label">Used</div>
          <div class="stat-value">${Utils.formatCurrency(budget.used_amount)}</div>
        </div>
        <div class="stat-card stat-card-green">
          <div class="stat-icon stat-icon-green">${typeof Icons !== 'undefined' ? Icons.render('check-circle', 22) : ''}</div>
          <div class="stat-label">Remaining</div>
          <div class="stat-value">${Utils.formatCurrency(budget.remaining_amount)}</div>
        </div>
      </div>

      <div class="card mb-lg">
        <div class="card-body">
          <h4 class="mb-sm">Usage</h4>
          <div class="progress-bar progress-lg mb-xs">
            <div class="progress-fill ${pct > 90 ? 'progress-danger' : pct > 70 ? 'progress-warning' : 'progress-primary'}" style="width:${pct}%"></div>
          </div>
          <div class="d-flex justify-between text-sm">
            <span>${pct}% used</span>
            <span>Rollover from previous month: ${Utils.formatCurrency(budget.rollover_amount || 0)}</span>
          </div>
          <div class="mt-md">
            <label class="d-flex align-center gap-sm cursor-pointer" style="width:fit-content;">
              <input type="checkbox" id="rollover-toggle" ${budget.rollover_selected ? 'checked' : ''}
                onchange="BoardMemberModule.toggleRollover(this.checked)"
                style="width:16px;height:16px;" />
              <span>Roll over unused budget to next month</span>
            </label>
            <p class="text-sm text-muted mt-xs">When enabled, any unused balance at month-end carries over to the following month's total.</p>
          </div>
        </div>
      </div>

      ${history.length > 0 ? `
        <h4 class="mb-sm">Budget History</h4>
        <div class="table-container budget-history">
          <table class="data-table">
            <thead>
              <tr><th>Month</th><th class="text-right">Base Budget</th><th class="text-right">Rollover</th><th class="text-right">Total</th><th class="text-right">Used</th></tr>
            </thead>
            <tbody>
              ${history.sort((a, b) => b.year_month.localeCompare(a.year_month)).map(h => `
                <tr>
                  <td>${Utils.formatMonth(h.year_month)}</td>
                  <td class="text-right">${Utils.formatCurrency(h.base_budget)}</td>
                  <td class="text-right">${Utils.formatCurrency(h.rollover_amount || 0)}</td>
                  <td class="text-right">${Utils.formatCurrency(h.total_budget)}</td>
                  <td class="text-right">${Utils.formatCurrency(h.used_amount)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : `
        <div class="empty-state">
          <div class="empty-state-icon">${typeof Icons !== 'undefined' ? Icons.render('wallet', 48) : ''}</div>
          <h3 class="empty-state-title">No Budget History</h3>
          <p class="empty-state-text">Budget history will appear here as months pass.</p>
        </div>
      `}
    `;

    container.innerHTML = html;
  },

  // ─── Toggle Rollover Preference ─────────────────────────────────────────────────────────────
  toggleRollover(selected) {
    const bmData = Auth.getCurrentBMData();
    if (!bmData) return;
    Storage.setRollover(bmData.bm_id, selected);
    ActivityLogger.log(
      `Set Financial Assistance budget rollover to ${selected ? 'enabled' : 'disabled'}`,
      'update', 'budget', bmData.bm_id
    );
    Notifications.success(`Budget rollover ${selected ? 'enabled — unused balance will carry over' : 'disabled'}.`);
  },

  // ─── Edit Financial Assistance Base Budget Modal ───────────────────────────
  async showEditFABudget() {
    const bmData = Auth.getCurrentBMData();
    if (!bmData) return;

    const budget = Storage.getCurrentBudget(bmData.bm_id);

    const modalContainer = document.getElementById('modal-container');
    modalContainer.innerHTML = `
      <div class="modal-overlay active">
        <div class="modal modal-sm animate-fade-in">
          <div class="modal-header">
            <h3 class="modal-title">Edit Financial Assistance Base Budget</h3>
            <button class="modal-close" id="modal-close-btn">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Current Base Budget</label>
              <p class="text-muted mb-sm">${Utils.formatCurrency(budget.base_budget)}</p>
            </div>
            <div class="form-group">
              <label class="form-label" for="new-fa-base">New Base Budget Amount</label>
              <input type="number" id="new-fa-base" class="form-input" value="${budget.base_budget}" min="0" step="1000" />
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="modal-cancel-btn">Cancel</button>
            <button class="btn btn-primary" id="modal-save-btn">Save Changes</button>
          </div>
        </div>
      </div>
    `;

    const overlay = modalContainer.querySelector('.modal-overlay');
    const closeModal = () => { overlay.classList.remove('active'); setTimeout(() => modalContainer.innerHTML = '', 200); };

    modalContainer.querySelector('#modal-close-btn').addEventListener('click', closeModal);
    modalContainer.querySelector('#modal-cancel-btn').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

    modalContainer.querySelector('#modal-save-btn').addEventListener('click', () => {
      const newBase = parseFloat(document.getElementById('new-fa-base').value);
      if (isNaN(newBase) || newBase < 0) {
        Notifications.error('Please enter a valid amount.');
        return;
      }
      Storage.updateFABaseBudget(bmData.bm_id, newBase);
      ActivityLogger.log(`Updated Financial Assistance base budget to ${Utils.formatCurrency(newBase)}`, 'budget_change', 'budget', bmData.bm_id);
      Notifications.success('Financial Assistance base budget updated.');
      closeModal();
      this.initMyBudget();
    });
  },

  // ─── My Personal Assistance Budget Page ───────────────────────────────────
  initPABudget() {
    const container = document.getElementById('pa-budget-content');
    if (!container) return;

    const user = Auth.getCurrentUser();
    const bmData = Auth.getCurrentBMData();
    if (!bmData) {
      container.innerHTML = '<p class="text-muted">Board member data not found.</p>';
      return;
    }

    const summary = Storage.getPABudgetSummary(bmData.bm_id);
    const pct = summary.total_pool > 0 ? Utils.percentage(summary.total_used, summary.total_pool) : 0;

    let html = `
      <div class="d-flex justify-between align-center mb-md">
        <h3>Personal Assistance Budget Pool</h3>
        <button class="btn btn-sm btn-primary" onclick="BoardMemberModule.showAddPABudget()">
          ${typeof Icons !== 'undefined' ? Icons.render('plus', 14) : ''} Add Budget
        </button>
      </div>

      <div class="grid-3-col gap-md mb-lg">
        <div class="stat-card stat-card-blue">
          <div class="stat-icon stat-icon-blue">${typeof Icons !== 'undefined' ? Icons.render('credit-card', 22) : ''}</div>
          <div class="stat-label">Total Pool</div>
          <div class="stat-value">${Utils.formatCurrency(summary.total_pool)}</div>
        </div>
        <div class="stat-card stat-card-amber">
          <div class="stat-icon stat-icon-amber">${typeof Icons !== 'undefined' ? Icons.render('trending-up', 22) : ''}</div>
          <div class="stat-label">Used</div>
          <div class="stat-value">${Utils.formatCurrency(summary.total_used)}</div>
        </div>
        <div class="stat-card stat-card-green">
          <div class="stat-icon stat-icon-green">${typeof Icons !== 'undefined' ? Icons.render('check-circle', 22) : ''}</div>
          <div class="stat-label">Remaining</div>
          <div class="stat-value">${Utils.formatCurrency(summary.remaining)}</div>
        </div>
      </div>

      ${summary.total_pool > 0 ? `
      <div class="card mb-lg">
        <div class="card-body">
          <h4 class="mb-sm">Usage</h4>
          <div class="progress-bar progress-lg mb-xs">
            <div class="progress-fill ${pct > 90 ? 'progress-danger' : pct > 70 ? 'progress-warning' : 'progress-primary'}" style="width:${Math.min(pct, 100)}%"></div>
          </div>
          <div class="d-flex justify-between text-sm">
            <span>${pct}% used</span>
            <span>${Utils.formatCurrency(summary.remaining)} available</span>
          </div>
        </div>
      </div>
      ` : ''}

      <h4 class="mb-sm">Budget Entries</h4>
      ${summary.entries.length > 0 ? `
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Date Added</th>
                <th>Description</th>
                <th class="text-right">Amount</th>
                <th class="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${summary.entries.map(entry => `
                <tr>
                  <td>${Utils.formatDate(entry.created_at)}</td>
                  <td>${Utils.escapeHtml(entry.description || '—')}</td>
                  <td class="text-right">${Utils.formatCurrency(entry.amount)}</td>
                  <td class="text-center">
                    <div class="btn-group" style="justify-content:center">
                      <button class="btn btn-sm btn-ghost" onclick="BoardMemberModule.showEditPABudget('${entry.pa_budget_id}')" title="Edit">
                        ${typeof Icons !== 'undefined' ? Icons.render('edit', 14) : 'Edit'}
                      </button>
                      <button class="btn btn-sm btn-ghost text-danger" onclick="BoardMemberModule.removePABudgetEntry('${entry.pa_budget_id}')" title="Remove">
                        ${typeof Icons !== 'undefined' ? Icons.render('trash', 14) : 'Del'}
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2"><strong>Total Pool</strong></td>
                <td class="text-right"><strong>${Utils.formatCurrency(summary.total_pool)}</strong></td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      ` : `
        <div class="empty-state">
          <div class="empty-state-icon">${typeof Icons !== 'undefined' ? Icons.render('credit-card', 48) : ''}</div>
          <h3 class="empty-state-title">No Personal Assistance Budget Entries</h3>
          <p class="empty-state-text">Click "Add Budget" to create your first PA budget allocation.</p>
        </div>
      `}
    `;

    container.innerHTML = html;
  },

  // ─── Add Personal Assistance Budget Entry Modal ───────────────────────────
  showAddPABudget() {
    const bmData = Auth.getCurrentBMData();
    if (!bmData) return;
    this._showPABudgetModal('Add Personal Assistance Budget Entry', '', '', (amount, desc) => {
      const user = Auth.getCurrentUser();
      Storage.addPABudget(bmData.bm_id, amount, desc, user.user_id);
      ActivityLogger.log(`Added PA budget entry: ${Utils.formatCurrency(amount)}`, 'budget_change', 'budget', bmData.bm_id, desc);
      Notifications.success('PA budget entry added.');
      this.initPABudget();
    });
  },

  // ─── Edit Personal Assistance Budget Entry Modal ──────────────────────────
  showEditPABudget(entryId) {
    const entry = Storage.getById(KEYS.PA_BUDGETS, entryId, 'pa_budget_id');
    if (!entry) return;
    this._showPABudgetModal('Edit Personal Assistance Budget Entry', entry.amount, entry.description, (amount, desc) => {
      Storage.updatePABudget(entryId, amount, desc);
      const bmData = Auth.getCurrentBMData();
      ActivityLogger.log(`Edited PA budget entry to ${Utils.formatCurrency(amount)}`, 'budget_change', 'budget', bmData ? bmData.bm_id : entryId, desc);
      Notifications.success('PA budget entry updated.');
      this.initPABudget();
    });
  },

  // ─── Remove Personal Assistance Budget Entry ──────────────────────────────
  async removePABudgetEntry(entryId) {
    const confirmed = await Notifications.confirm({
      title: 'Remove Budget Entry',
      message: 'Are you sure you want to remove this PA budget entry? This will reduce the total budget pool.',
      confirmText: 'Remove',
      type: 'danger'
    });
    if (!confirmed) return;

    Storage.removePABudget(entryId);
    const bmData = Auth.getCurrentBMData();
    ActivityLogger.log('Removed a PA budget entry', 'budget_change', 'budget', bmData ? bmData.bm_id : entryId);
    Notifications.success('PA budget entry removed.');
    this.initPABudget();
  },

  // ─── Shared Personal Assistance Budget Modal ──────────────────────────────
  _showPABudgetModal(title, currentAmount, currentDesc, onSave) {
    const modalContainer = document.getElementById('modal-container');
    modalContainer.innerHTML = `
      <div class="modal-overlay active">
        <div class="modal modal-sm animate-fade-in">
          <div class="modal-header">
            <h3 class="modal-title">${title}</h3>
            <button class="modal-close" id="modal-close-btn">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label" for="pa-budget-amount">Amount (₱)</label>
              <input type="number" id="pa-budget-amount" class="form-input" value="${currentAmount}" min="0" step="500" placeholder="e.g. 10000" />
            </div>
            <div class="form-group">
              <label class="form-label" for="pa-budget-desc">Description / Note</label>
              <input type="text" id="pa-budget-desc" class="form-input" value="${Utils.escapeHtml(currentDesc)}" placeholder="e.g. Monthly PA allowance" />
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="modal-cancel-btn">Cancel</button>
            <button class="btn btn-primary" id="modal-save-btn">Save</button>
          </div>
        </div>
      </div>
    `;

    const overlay = modalContainer.querySelector('.modal-overlay');
    const closeModal = () => { overlay.classList.remove('active'); setTimeout(() => modalContainer.innerHTML = '', 200); };

    modalContainer.querySelector('#modal-close-btn').addEventListener('click', closeModal);
    modalContainer.querySelector('#modal-cancel-btn').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

    modalContainer.querySelector('#modal-save-btn').addEventListener('click', () => {
      const amount = parseFloat(document.getElementById('pa-budget-amount').value);
      const desc = document.getElementById('pa-budget-desc').value.trim();
      if (isNaN(amount) || amount <= 0) {
        Notifications.error('Please enter a valid amount greater than 0.');
        return;
      }
      closeModal();
      onSave(amount, desc);
    });
  },

  // ─── Secretary Activity Logs (BM Oversight) ───────────────────────────────
  initSecretaryLogs() {
    const container = document.getElementById('secretary-logs-content');
    if (!container) return;

    const user = Auth.getCurrentUser();
    const bmData = Auth.getCurrentBMData();
    if (!bmData) {
      container.innerHTML = '<p class="text-muted">Board member data not found.</p>';
      return;
    }

    // Get secretaries assigned to this BM
    const secretaries = Storage.getSecretariesForBM(bmData.bm_id);
    const secretaryUserIds = secretaries.map(s => s.user ? s.user.user_id : null).filter(Boolean);

    // Get all activity logs from these secretaries
    const allLogs = Storage.getAll(KEYS.ACTIVITY_LOGS) || [];
    const secLogs = allLogs
      .filter(log => secretaryUserIds.includes(log.user_id))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const bmInfo = Storage.getBMWithTermInfo(bmData.bm_id);

    let html = `
      <div class="mb-lg">
        <h2 class="mb-xs">Secretary Activity Logs</h2>
        <p class="text-muted">
          View all actions performed by your assigned secretaries
          ${bmInfo ? ` · <span class="badge badge-info">${bmInfo.term_badge}</span>` : ''}
          ${bmInfo && bmInfo.is_reelected ? '<span class="badge badge-accent ml-xs">Re-elected</span>' : ''}
        </p>
      </div>

      <div class="grid-2-col gap-md mb-lg">
        <div class="stat-card stat-card-blue">
          <div class="stat-icon stat-icon-blue">${Icons.render('users', 22)}</div>
          <div class="stat-label">Assigned Secretaries</div>
          <div class="stat-value">${secretaries.length}</div>
        </div>
        <div class="stat-card stat-card-teal">
          <div class="stat-icon stat-icon-teal">${Icons.render('activity', 22)}</div>
          <div class="stat-label">Total Actions</div>
          <div class="stat-value">${secLogs.length}</div>
        </div>
      </div>

      ${secretaries.length > 0 ? `
        <div class="card mb-lg">
          <div class="card-header">
            <h3 class="card-title">My Secretaries</h3>
          </div>
          <div class="card-body">
            <div class="d-flex gap-md flex-wrap">
              ${secretaries.map(s => `
                <div class="badge badge-info" style="padding: 8px 16px; font-size: var(--text-sm);">
                  ${Icons.render('user', 14)} ${s.user ? Utils.escapeHtml(s.user.full_name) : 'Unknown'}
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      ` : ''}

      ${secLogs.length > 0 ? `
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Activity History</h3>
          </div>
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Secretary</th>
                  <th>Action</th>
                  <th>Type</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                ${secLogs.slice(0, 100).map(log => `
                  <tr>
                    <td class="text-sm">${Utils.formatDate(log.created_at, 'datetime')}</td>
                    <td><strong>${Utils.escapeHtml(log.user_name || 'Unknown')}</strong></td>
                    <td>${Utils.escapeHtml(log.action)}</td>
                    <td><span class="badge badge-${log.action_type === 'create' ? 'success' : log.action_type === 'delete' ? 'danger' : 'info'}">${log.action_type || 'action'}</span></td>
                    <td class="text-sm text-muted">${Utils.escapeHtml(log.details || '—')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : `
        <div class="empty-state">
          <div class="empty-state-icon">${Icons.render('activity', 48)}</div>
          <h3 class="empty-state-title">No Secretary Activity Yet</h3>
          <p class="empty-state-text">Activity logs from your assigned secretaries will appear here.</p>
        </div>
      `}
    `;

    container.innerHTML = html;
  },

  // ─── Archives Page (Past Term Records) ────────────────────────────────────
  initArchives() {
    const container = document.getElementById('archives-content');
    if (!container) return;

    const user = Auth.getCurrentUser();
    const bmData = Auth.getCurrentBMData();
    if (!bmData) {
      container.innerHTML = '<p class="text-muted">Board member data not found.</p>';
      return;
    }

    const bmInfo = Storage.getBMWithTermInfo(bmData.bm_id);
    const terms = bmData.terms || [{ term_number: bmData.current_term_number || 1, term_start: bmData.term_start, term_end: bmData.term_end, status: 'active' }];

    // Get archived FA/PA records
    const archivedFA = Storage.getAll(KEYS.FA_RECORDS).filter(r => r.bm_id === bmData.bm_id && r.is_archived);
    const archivedPA = Storage.getAll(KEYS.PA_RECORDS).filter(r => r.bm_id === bmData.bm_id && r.is_archived);

    let html = `
      <div class="mb-lg">
        <h2 class="mb-xs">Past Term Archives</h2>
        <p class="text-muted">
          View records from your previous terms
          ${bmInfo ? ` · <span class="badge badge-info">${bmInfo.term_badge}</span>` : ''}
          ${bmInfo && bmInfo.is_reelected ? '<span class="badge badge-accent ml-xs">Re-elected</span>' : ''}
        </p>
      </div>

      <div class="grid-3-col gap-md mb-lg">
        <div class="stat-card stat-card-blue">
          <div class="stat-icon stat-icon-blue">${Icons.render('calendar', 22)}</div>
          <div class="stat-label">Total Terms</div>
          <div class="stat-value">${terms.length}</div>
        </div>
        <div class="stat-card stat-card-teal">
          <div class="stat-icon stat-icon-teal">${Icons.render('file-text', 22)}</div>
          <div class="stat-label">Archived FA Records</div>
          <div class="stat-value">${archivedFA.length}</div>
        </div>
        <div class="stat-card stat-card-amber">
          <div class="stat-icon stat-icon-amber">${Icons.render('clipboard-list', 22)}</div>
          <div class="stat-label">Archived PA Records</div>
          <div class="stat-value">${archivedPA.length}</div>
        </div>
      </div>

      <div class="card mb-lg">
        <div class="card-header">
          <h3 class="card-title">Term History</h3>
        </div>
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr><th>Term</th><th>Start</th><th>End</th><th>Status</th></tr>
            </thead>
            <tbody>
              ${terms.map(t => `
                <tr>
                  <td><span class="badge badge-info">${Utils.ordinal ? Utils.ordinal(t.term_number) : t.term_number} Term</span></td>
                  <td>${Utils.formatDate(t.term_start)}</td>
                  <td>${Utils.formatDate(t.term_end)}</td>
                  <td><span class="badge badge-${t.status === 'active' ? 'success' : 'neutral'}">${t.status}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      ${archivedFA.length > 0 ? `
        <div class="card mb-lg">
          <div class="card-header">
            <h3 class="card-title">Archived Financial Assistance Records</h3>
          </div>
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr><th>ID</th><th>Beneficiary</th><th>Category</th><th>Amount</th><th>Status</th><th>Date</th></tr>
              </thead>
              <tbody>
                ${archivedFA.map(r => {
                  const cat = Storage.getById(KEYS.FA_CATEGORIES, r.case_type_id, 'id');
                  return `
                    <tr>
                      <td class="text-sm">${r.fa_id}</td>
                      <td><strong>${Utils.escapeHtml(r.patient_name)}</strong></td>
                      <td>${cat ? Utils.escapeHtml(cat.name) : r.case_type_custom || '—'}</td>
                      <td>${Utils.formatCurrency(r.amount_approved || 0)}</td>
                      <td><span class="badge badge-${r.status === 'Successful' ? 'success' : 'warning'}">${r.status}</span></td>
                      <td class="text-sm">${Utils.formatDate(r.created_at)}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : ''}

      ${archivedPA.length > 0 ? `
        <div class="card mb-lg">
          <div class="card-header">
            <h3 class="card-title">Archived Personal Assistance Records</h3>
          </div>
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr><th>ID</th><th>Client</th><th>Category</th><th>Amount</th><th>Date</th></tr>
              </thead>
              <tbody>
                ${archivedPA.map(r => {
                  const cat = Storage.getById(KEYS.PA_CATEGORIES, r.category_id, 'id');
                  return `
                    <tr>
                      <td class="text-sm">${r.pa_id}</td>
                      <td><strong>${Utils.escapeHtml(r.client_name)}</strong></td>
                      <td>${cat ? Utils.escapeHtml(cat.name) : '—'}</td>
                      <td>${Utils.formatCurrency(r.amount_provided || 0)}</td>
                      <td class="text-sm">${Utils.formatDate(r.created_at)}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : ''}

      ${archivedFA.length === 0 && archivedPA.length === 0 ? `
        <div class="empty-state">
          <div class="empty-state-icon">${Icons.render('archive', 48)}</div>
          <h3 class="empty-state-title">No Archived Records</h3>
          <p class="empty-state-text">Records from previous terms will appear here after term archival is completed.</p>
        </div>
      ` : ''}
    `;

    container.innerHTML = html;
  }
};
