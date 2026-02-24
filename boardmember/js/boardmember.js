/**
 * ============================================================
 * OMSP Document Tracking / Monitoring
 * Board Member Module — BM-specific page logic
 * ============================================================
 * Handles BM-only pages: My FA Budget
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
      <h3 class="mb-md">FA Budget — ${Utils.formatMonth(Utils.getCurrentYearMonth())}</h3>

      <div class="grid-3-col gap-md mb-lg">
        <div class="stat-card stat-card-primary">
          <div class="stat-value">${Utils.formatCurrency(budget.total_budget)}</div>
          <div class="stat-label">Total Budget</div>
        </div>
        <div class="stat-card stat-card-warning">
          <div class="stat-value">${Utils.formatCurrency(budget.used_amount)}</div>
          <div class="stat-label">Used</div>
        </div>
        <div class="stat-card stat-card-success">
          <div class="stat-value">${Utils.formatCurrency(budget.remaining_amount)}</div>
          <div class="stat-label">Remaining</div>
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
            <span>Rollover from previous month: ${Utils.formatCurrency(budget.rollover)}</span>
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
                  <td class="text-right">${Utils.formatCurrency(h.rollover || 0)}</td>
                  <td class="text-right">${Utils.formatCurrency(h.total_budget)}</td>
                  <td class="text-right">${Utils.formatCurrency(h.used_amount)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}
    `;

    container.innerHTML = html;
  }
};
