/**
 * ============================================================
 * OMSP Document Tracking / Monitoring
 * Reports Module - Budget reports, summaries, data analytics
 * ============================================================
 */

const ReportsModule = {
  init() {
    const user = Auth.requireAuth();
    if (!user) return;
    this.setupReportTypes();
  },

  setupReportTypes() {
    const typeSelect = document.getElementById('report-type');
    if (!typeSelect) return;

    typeSelect.addEventListener('change', () => {
      this.generateReport(typeSelect.value);
    });
  },

  generateReport(type) {
    switch (type) {
      case 'budget-summary': this.budgetSummaryReport(); break;
      case 'fa-summary': this.faSummaryReport(); break;
      case 'pa-summary': this.paSummaryReport(); break;
      case 'frequency-report': this.frequencyReport(); break;
      case 'bm-performance': this.bmPerformanceReport(); break;
      default: this.showPlaceholder();
    }
  },

  budgetSummaryReport() {
    const container = document.getElementById('report-content');
    if (!container) return;

    const bms = Storage.getAll(KEYS.BOARD_MEMBERS).filter(b => !b.is_archived);
    const yearMonth = Utils.getCurrentYearMonth();

    let totalBudget = 0, totalUsed = 0, totalRemaining = 0;
    const rows = bms.map(bm => {
      const budget = Storage.getCurrentBudget(bm.bm_id);
      const user = Storage.getById(KEYS.USERS, bm.user_id, 'user_id');
      totalBudget += budget.total_budget;
      totalUsed += budget.used_amount;
      totalRemaining += budget.remaining_amount;

      return {
        name: user ? user.full_name : 'Unknown',
        district: bm.district_name,
        total: budget.total_budget,
        used: budget.used_amount,
        remaining: budget.remaining_amount,
        pct: Utils.percentage(budget.used_amount, budget.total_budget)
      };
    });

    container.innerHTML = `
      <h3 class="mb-md">Budget Summary — ${Utils.formatMonth(yearMonth)}</h3>
      <div class="grid-3-col gap-md mb-lg">
        <div class="stat-card stat-card-primary">
          <div class="stat-value">${Utils.formatCurrency(totalBudget)}</div>
          <div class="stat-label">Total Budget</div>
        </div>
        <div class="stat-card stat-card-warning">
          <div class="stat-value">${Utils.formatCurrency(totalUsed)}</div>
          <div class="stat-label">Total Used</div>
        </div>
        <div class="stat-card stat-card-success">
          <div class="stat-value">${Utils.formatCurrency(totalRemaining)}</div>
          <div class="stat-label">Total Remaining</div>
        </div>
      </div>

      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Board Member</th>
              <th>District</th>
              <th class="text-right">Total Budget</th>
              <th class="text-right">Used</th>
              <th class="text-right">Remaining</th>
              <th>Usage</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(r => `
              <tr>
                <td><strong>${Utils.escapeHtml(r.name)}</strong></td>
                <td>${Utils.escapeHtml(r.district)}</td>
                <td class="text-right">${Utils.formatCurrency(r.total)}</td>
                <td class="text-right">${Utils.formatCurrency(r.used)}</td>
                <td class="text-right">${Utils.formatCurrency(r.remaining)}</td>
                <td>
                  <div class="d-flex align-center gap-sm">
                    <div class="progress-bar progress-sm" style="width:100px">
                      <div class="progress-fill ${r.pct > 90 ? 'progress-danger' : r.pct > 70 ? 'progress-warning' : 'progress-primary'}" style="width:${r.pct}%"></div>
                    </div>
                    <span class="text-sm">${r.pct}%</span>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="mt-md d-flex gap-sm">
        <button class="btn btn-secondary" onclick="ReportsModule.exportBudgetReport()">📤 Export CSV</button>
        <button class="btn btn-secondary" onclick="ReportsModule.printBudgetReport()">🖨️ Print</button>
      </div>
    `;
  },

  faSummaryReport() {
    const container = document.getElementById('report-content');
    if (!container) return;

    const records = Storage.getAll(KEYS.FA_RECORDS).filter(r => !r.is_archived);
    const categories = Storage.getAll(KEYS.FA_CATEGORIES);

    const byStatus = { Ongoing: 0, Successful: 0, Denied: 0 };
    const byCategory = {};
    let totalAmount = 0;

    records.forEach(r => {
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
      const catName = r.case_type_custom || (categories.find(c => c.id === r.case_type_id)?.name || 'Unknown');
      byCategory[catName] = (byCategory[catName] || 0) + 1;
      totalAmount += r.amount_approved || 0;
    });

    container.innerHTML = `
      <h3 class="mb-md">Financial Assistance Summary</h3>
      <div class="grid-3-col gap-md mb-lg">
        <div class="stat-card stat-card-primary">
          <div class="stat-value">${records.length}</div>
          <div class="stat-label">Total Records</div>
        </div>
        <div class="stat-card stat-card-success">
          <div class="stat-value">${Utils.formatCurrency(totalAmount)}</div>
          <div class="stat-label">Total Amount</div>
        </div>
        <div class="stat-card stat-card-warning">
          <div class="stat-value">${byStatus.Ongoing || 0}</div>
          <div class="stat-label">Ongoing</div>
        </div>
      </div>

      <div class="grid-2-col gap-lg">
        <div class="card">
          <div class="card-body">
            <h4 class="mb-sm">By Status</h4>
            ${Object.entries(byStatus).map(([status, count]) => `
              <div class="d-flex justify-between align-center mb-xs">
                <span class="badge badge-status-${Utils.getStatusClass(status)}">${status}</span>
                <strong>${count}</strong>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="card">
          <div class="card-body">
            <h4 class="mb-sm">By Category</h4>
            ${Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([cat, count]) => `
              <div class="d-flex justify-between align-center mb-xs">
                <span>${Utils.escapeHtml(cat)}</span>
                <strong>${count}</strong>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  },

  paSummaryReport() {
    const container = document.getElementById('report-content');
    if (!container) return;

    const records = Storage.getAll(KEYS.PA_RECORDS).filter(r => !r.is_archived);
    const categories = Storage.getAll(KEYS.PA_CATEGORIES);
    const bms = Storage.getAll(KEYS.BOARD_MEMBERS);

    const byBM = {};
    let totalAmount = 0;

    records.forEach(r => {
      const bm = bms.find(b => b.bm_id === r.bm_id);
      const bmUser = bm ? Storage.getById(KEYS.USERS, bm.user_id, 'user_id') : null;
      const name = bmUser ? bmUser.full_name : 'Unknown';
      byBM[name] = (byBM[name] || 0) + (r.amount_provided || 0);
      totalAmount += r.amount_provided || 0;
    });

    container.innerHTML = `
      <h3 class="mb-md">Personal Assistance Summary</h3>
      <div class="grid-2-col gap-md mb-lg">
        <div class="stat-card stat-card-teal">
          <div class="stat-value">${records.length}</div>
          <div class="stat-label">Total PA Records</div>
        </div>
        <div class="stat-card stat-card-success">
          <div class="stat-value">${Utils.formatCurrency(totalAmount)}</div>
          <div class="stat-label">Total Amount Provided</div>
        </div>
      </div>

      <div class="card">
        <div class="card-body">
          <h4 class="mb-sm">By Board Member</h4>
          ${Object.entries(byBM).sort((a, b) => b[1] - a[1]).map(([name, amount]) => `
            <div class="d-flex justify-between align-center mb-sm">
              <span>${Utils.escapeHtml(name)}</span>
              <strong>${Utils.formatCurrency(amount)}</strong>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  frequencyReport() {
    const container = document.getElementById('report-content');
    if (!container) return;

    const yearMonth = Utils.getCurrentYearMonth();
    const freqs = Storage.getAll(KEYS.MONTHLY_FREQUENCY).filter(f => f.year_month === yearMonth);
    const bens = Storage.getAll(KEYS.BENEFICIARIES);

    const enriched = freqs.map(f => {
      const ben = bens.find(b => b.beneficiary_id === f.beneficiary_id);
      const total = f.fa_count + f.pa_count;
      let level = 'normal';
      if (total >= 5) level = 'high';
      else if (total >= 3) level = 'monitor';
      return { ...f, name: ben ? ben.full_name : 'Unknown', total, level };
    }).sort((a, b) => b.total - a.total);

    container.innerHTML = `
      <h3 class="mb-md">Frequency Report — ${Utils.formatMonth(yearMonth)}</h3>

      <div class="grid-3-col gap-md mb-lg">
        <div class="stat-card stat-card-success">
          <div class="stat-value">${enriched.filter(f => f.level === 'normal').length}</div>
          <div class="stat-label">Normal</div>
        </div>
        <div class="stat-card stat-card-warning">
          <div class="stat-value">${enriched.filter(f => f.level === 'monitor').length}</div>
          <div class="stat-label">Monitor</div>
        </div>
        <div class="stat-card stat-card-danger">
          <div class="stat-value">${enriched.filter(f => f.level === 'high').length}</div>
          <div class="stat-label">High</div>
        </div>
      </div>

      ${enriched.length === 0 ? '<p class="text-muted">No frequency data for this month.</p>' : `
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Beneficiary</th>
                <th>FA Count</th>
                <th>PA Count</th>
                <th>Total</th>
                <th>Amount</th>
                <th>Level</th>
              </tr>
            </thead>
            <tbody>
              ${enriched.map(f => `
                <tr>
                  <td><strong>${Utils.escapeHtml(f.name)}</strong></td>
                  <td>${f.fa_count}</td>
                  <td>${f.pa_count}</td>
                  <td><strong>${f.total}</strong></td>
                  <td>${Utils.formatCurrency(f.total_amount)}</td>
                  <td><span class="badge ${Utils.getFrequencyClass(f.level)}">${f.level}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `}
    `;
  },

  bmPerformanceReport() {
    const container = document.getElementById('report-content');
    if (!container) return;

    const bms = Storage.getAll(KEYS.BOARD_MEMBERS).filter(b => !b.is_archived);

    const data = bms.map(bm => {
      const user = Storage.getById(KEYS.USERS, bm.user_id, 'user_id');
      const faRecords = Storage.query(KEYS.FA_RECORDS, { bm_id: bm.bm_id });
      const paRecords = Storage.query(KEYS.PA_RECORDS, { bm_id: bm.bm_id });
      const budget = Storage.getCurrentBudget(bm.bm_id);

      return {
        name: user ? user.full_name : 'Unknown',
        district: bm.district_name,
        faCount: faRecords.length,
        paCount: paRecords.length,
        faTotal: faRecords.reduce((s, r) => s + (r.amount_approved || 0), 0),
        paTotal: paRecords.reduce((s, r) => s + (r.amount_provided || 0), 0),
        budgetUsed: budget.used_amount,
        budgetPct: Utils.percentage(budget.used_amount, budget.total_budget)
      };
    });

    container.innerHTML = `
      <h3 class="mb-md">Board Member Performance</h3>
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Board Member</th>
              <th>District</th>
              <th>FA Records</th>
              <th>PA Records</th>
              <th class="text-right">FA Total</th>
              <th class="text-right">PA Total</th>
              <th>Budget Usage</th>
            </tr>
          </thead>
          <tbody>
            ${data.map(d => `
              <tr>
                <td><strong>${Utils.escapeHtml(d.name)}</strong></td>
                <td>${Utils.escapeHtml(d.district)}</td>
                <td>${d.faCount}</td>
                <td>${d.paCount}</td>
                <td class="text-right">${Utils.formatCurrency(d.faTotal)}</td>
                <td class="text-right">${Utils.formatCurrency(d.paTotal)}</td>
                <td>
                  <div class="d-flex align-center gap-sm">
                    <div class="progress-bar progress-sm" style="width:80px">
                      <div class="progress-fill ${d.budgetPct > 90 ? 'progress-danger' : 'progress-primary'}" style="width:${d.budgetPct}%"></div>
                    </div>
                    <span class="text-sm">${d.budgetPct}%</span>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  showPlaceholder() {
    const container = document.getElementById('report-content');
    if (!container) return;
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📊</div>
        <h3 class="empty-state-title">Select a Report</h3>
        <p class="empty-state-text">Choose a report type from the dropdown above.</p>
      </div>
    `;
  },

  exportBudgetReport() {
    const bms = Storage.getAll(KEYS.BOARD_MEMBERS).filter(b => !b.is_archived);
    const data = bms.map(bm => {
      const budget = Storage.getCurrentBudget(bm.bm_id);
      const user = Storage.getById(KEYS.USERS, bm.user_id, 'user_id');
      return {
        name: user ? user.full_name : 'Unknown',
        district: bm.district_name,
        total_budget: budget.total_budget,
        used: budget.used_amount,
        remaining: budget.remaining_amount
      };
    });
    ExportUtils.toCSV(data, 'budget-report', {
      headers: ['Board Member', 'District', 'Total Budget', 'Used', 'Remaining']
    });
  },

  printBudgetReport() {
    const bms = Storage.getAll(KEYS.BOARD_MEMBERS).filter(b => !b.is_archived);
    const data = bms.map(bm => {
      const budget = Storage.getCurrentBudget(bm.bm_id);
      const user = Storage.getById(KEYS.USERS, bm.user_id, 'user_id');
      return {
        name: user ? user.full_name : 'Unknown',
        district: bm.district_name,
        total_budget: Utils.formatCurrency(budget.total_budget),
        used: Utils.formatCurrency(budget.used_amount),
        remaining: Utils.formatCurrency(budget.remaining_amount)
      };
    });

    ExportUtils.printReport({
      title: 'Budget Summary Report',
      subtitle: Utils.formatMonth(Utils.getCurrentYearMonth()),
      data,
      columns: ['name', 'district', 'total_budget', 'used', 'remaining'],
      headers: ['Board Member', 'District', 'Total Budget', 'Used', 'Remaining']
    });
  }
};
