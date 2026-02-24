/**
 * ============================================================
 * OMSP Document Tracking / Monitoring
 * Board Member Module — BM-specific page logic
 * ============================================================
 * Handles BM-only pages: My FA Budget, My PA Budget
 */

const BoardMemberModule = {

  // ─── My FA Budget Page ───────────────────────────────────
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
        <h3>FA Budget — ${Utils.formatMonth(Utils.getCurrentYearMonth())}</h3>
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

  // ─── Edit FA Base Budget Modal ───────────────────────────
  async showEditFABudget() {
    const bmData = Auth.getCurrentBMData();
    if (!bmData) return;

    const budget = Storage.getCurrentBudget(bmData.bm_id);

    const modalContainer = document.getElementById('modal-container');
    modalContainer.innerHTML = `
      <div class="modal-overlay active">
        <div class="modal modal-sm animate-fade-in">
          <div class="modal-header">
            <h3 class="modal-title">Edit FA Base Budget</h3>
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
      ActivityLogger.log(`Updated FA base budget to ${Utils.formatCurrency(newBase)}`, 'budget_change', 'budget', bmData.bm_id);
      Notifications.success('FA base budget updated.');
      closeModal();
      this.initMyBudget();
    });
  },

  // ─── My PA Budget Page ───────────────────────────────────
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
        <h3>PA Budget Pool</h3>
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
          <h3 class="empty-state-title">No PA Budget Entries</h3>
          <p class="empty-state-text">Click "Add Budget" to create your first PA budget allocation.</p>
        </div>
      `}
    `;

    container.innerHTML = html;
  },

  // ─── Add PA Budget Entry Modal ───────────────────────────
  showAddPABudget() {
    const bmData = Auth.getCurrentBMData();
    if (!bmData) return;
    this._showPABudgetModal('Add PA Budget Entry', '', '', (amount, desc) => {
      const user = Auth.getCurrentUser();
      Storage.addPABudget(bmData.bm_id, amount, desc, user.user_id);
      ActivityLogger.log(`Added PA budget entry: ${Utils.formatCurrency(amount)}`, 'budget_change', 'budget', bmData.bm_id, desc);
      Notifications.success('PA budget entry added.');
      this.initPABudget();
    });
  },

  // ─── Edit PA Budget Entry Modal ──────────────────────────
  showEditPABudget(entryId) {
    const entry = Storage.getById(KEYS.PA_BUDGETS, entryId, 'pa_budget_id');
    if (!entry) return;
    this._showPABudgetModal('Edit PA Budget Entry', entry.amount, entry.description, (amount, desc) => {
      Storage.updatePABudget(entryId, amount, desc);
      const bmData = Auth.getCurrentBMData();
      ActivityLogger.log(`Edited PA budget entry to ${Utils.formatCurrency(amount)}`, 'budget_change', 'budget', bmData ? bmData.bm_id : entryId, desc);
      Notifications.success('PA budget entry updated.');
      this.initPABudget();
    });
  },

  // ─── Remove PA Budget Entry ──────────────────────────────
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

  // ─── Shared PA Budget Modal ──────────────────────────────
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
  }
};
