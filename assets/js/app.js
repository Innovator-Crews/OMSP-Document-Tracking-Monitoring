/**
 * ============================================================
 * OMSP Document Tracking / Monitoring
 * App — Main application initializer
 * ============================================================
 */

const App = {
  /**
   * Initialize the application
   * Called on every page load via DOMContentLoaded
   */
  init() {
    // 1. Initialize storage (seed data if fresh)
    Storage.init();

    // 2. Detect current page
    const { section, page } = Router.getCurrentPage();

    // 3. Handle login page separately
    if (page === 'index' || page === 'login') {
      this.initLoginPage();
      return;
    }

    // 4. Require authentication for all other pages
    const user = Auth.requireAuth();
    if (!user) return; // redirects to login

    // 5. Setup shell (sidebar, header, profile)
    this.setupShell(user);

    // 6. Route to the correct module
    this.routePage(page, section, user);
  },

  /**
   * Initialize login page
   */
  initLoginPage() {
    const form = document.getElementById('login-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      const errorEl = document.getElementById('login-error');

      if (errorEl) errorEl.textContent = '';

      const result = Auth.login(email, password);

      if (!result.success) {
        if (errorEl) {
          errorEl.textContent = result.error;
          errorEl.classList.remove('hidden');
        }
        return;
      }

      // Redirect to dashboard
      Auth.goToDashboard();
    });

    // If already logged in, redirect
    if (Auth.isLoggedIn()) {
      Auth.goToDashboard();
    }
  },

  /**
   * Setup the app shell (sidebar, header, mobile menu)
   */
  setupShell(user) {
    // Set role data attribute for CSS theming
    document.body.setAttribute('data-role', user.role);

    // Inject SVG icons into shell elements (replaces emoji)
    this.injectShellIcons();

    // Render sidebar nav
    Router.renderSidebar();

    // Setup profile in sidebar
    Auth.setupSidebarProfile();

    // Mobile menu toggle
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    if (menuToggle && sidebar) {
      menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        if (overlay) overlay.classList.toggle('active');
      });
    }

    if (overlay && sidebar) {
      overlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
      });
    }

    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        Auth.logout();
      });
    }

    // Tag body with role for CSS scoping (set above at start of setupShell)

    // Set role label in header badge with role-matching color
    const roleLabel = document.getElementById('user-role-label');
    if (roleLabel) {
      roleLabel.textContent = Utils.getRoleLabel(user.role);
      // Swap badge color by role
      roleLabel.classList.remove('badge-info', 'badge-warning', 'badge-success', 'badge-neutral');
      if (user.role === 'board_member') roleLabel.classList.add('badge-warning');
      else if (user.role === 'secretary')  roleLabel.classList.add('badge-success');
      else                                 roleLabel.classList.add('badge-info');
    }

    // Set user name in header
    const nameLabel = document.getElementById('user-name-label');
    if (nameLabel) {
      nameLabel.textContent = user.full_name;
    }

    // Hide "New FA/PA" buttons for non-secretary roles
    if (user.role !== 'secretary') {
      const newFABtn = document.getElementById('new-fa-btn');
      const newPABtn = document.getElementById('new-pa-btn');
      if (newFABtn) newFABtn.style.display = 'none';
      if (newPABtn) newPABtn.style.display = 'none';
    }
  },

  /**
   * Replace emoji placeholders with SVG icons in the app shell
   */
  injectShellIcons() {
    if (typeof Icons === 'undefined') return;

    // Sidebar logo
    const logo = document.querySelector('.sidebar-logo');
    if (logo) logo.innerHTML = Icons.render('landmark', 24);

    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.innerHTML = Icons.render('log-out', 18) + ' Sign Out';

    // Menu toggle
    const menuToggle = document.getElementById('menu-toggle');
    if (menuToggle) menuToggle.innerHTML = Icons.render('menu', 22);

    // "New FA" button
    const newFABtn = document.getElementById('new-fa-btn');
    if (newFABtn) newFABtn.innerHTML = Icons.render('file-plus', 16) + ' New FA';

    // "New PA" button
    const newPABtn = document.getElementById('new-pa-btn');
    if (newPABtn) newPABtn.innerHTML = Icons.render('plus-circle', 16) + ' New PA';

    // Export CSV button
    const exportBtn = document.getElementById('export-csv-btn');
    if (exportBtn) exportBtn.innerHTML = Icons.render('download', 16) + ' Export';

    // "Add Category" button
    const addCatBtn = document.getElementById('add-category-btn');
    if (addCatBtn) addCatBtn.innerHTML = Icons.render('plus', 16) + ' Add Category';

    // Replace all data-icon attributes with rendered SVG icons
    document.querySelectorAll('[data-icon]').forEach(el => {
      const iconName = el.getAttribute('data-icon');
      const size = el.classList.contains('empty-state-icon') ? 32 : 20;
      el.innerHTML = Icons.render(iconName, size);
    });
  },

  /**
   * Route to the correct page module
   */
  routePage(page, section, user) {
    switch (page) {
      // Shared pages
      case 'dashboard':
        if (typeof DashboardModule !== 'undefined') DashboardModule.init();
        Router.setPageInfo('Dashboard');
        break;

      case 'fa-new':
        if (typeof FAModule !== 'undefined') FAModule.initNewForm();
        Router.setPageInfo('New Financial Assistance');
        break;

      case 'fa-list':
        if (typeof FAModule !== 'undefined') FAModule.initList();
        Router.setPageInfo('FA Records');
        break;

      case 'pa-new':
        if (typeof PAModule !== 'undefined') PAModule.initNewForm();
        Router.setPageInfo('New Personal Assistance');
        break;

      case 'pa-list':
        if (typeof PAModule !== 'undefined') PAModule.initList();
        Router.setPageInfo('PA Records');
        break;

      case 'global-search':
        if (typeof SearchModule !== 'undefined') SearchModule.init();
        Router.setPageInfo('Global Search');
        break;

      case 'categories':
        if (typeof CategoryManager !== 'undefined') CategoryManager.init();
        Router.setPageInfo('Category Management');
        break;

      case 'term-management':
        if (typeof TermManager !== 'undefined') TermManager.init();
        Router.setPageInfo('Term & Archive');
        break;

      case 'reports':
        if (typeof ReportsModule !== 'undefined') ReportsModule.init();
        Router.setPageInfo('Reports');
        break;

      case 'activity-logs':
        this.initActivityLogs();
        Router.setPageInfo('Activity Logs');
        break;

      case 'budget':
        this.initBudgetPage();
        Router.setPageInfo('Budget Overview');
        break;

      // SysAdmin pages
      case 'bm-management':
        if (typeof SysAdminModule !== 'undefined') SysAdminModule.initBMManagement();
        else this.initBMManagement(); // fallback
        Router.setPageInfo('Board Member Management');
        break;

      case 'staff-management':
        if (typeof SysAdminModule !== 'undefined') SysAdminModule.initStaffManagement();
        else this.initStaffManagement(); // fallback
        Router.setPageInfo('Staff Management');
        break;

      // BM pages
      case 'my-fa-budget':
        if (typeof BoardMemberModule !== 'undefined') BoardMemberModule.initMyBudget();
        else this.initMyBudget(); // fallback
        Router.setPageInfo('My FA Budget');
        break;

      default:
        console.log('No module for page:', page);
    }
  },

  /**
   * Activity Logs Page
   */
  initActivityLogs() {
    const container = document.getElementById('activity-content');
    if (!container) return;

    const user = Auth.getCurrentUser();
    const filters = {};

    // Non-admin only sees own activity
    if (user.role !== 'sysadmin') {
      filters.user_id = user.user_id;
    }

    const logs = ActivityLogger.getRecent(filters, 100);
    ActivityLogger.renderList(container, logs);
  },

  /**
   * Budget Overview Page (SysAdmin view)
   */
  initBudgetPage() {
    const container = document.getElementById('budget-content');
    if (!container) return;

    const bms = Storage.getAll(KEYS.BOARD_MEMBERS).filter(b => !b.is_archived);
    const yearMonth = Utils.getCurrentYearMonth();

    let html = `<h3 class="mb-md">Budget Overview — ${Utils.formatMonth(yearMonth)}</h3>`;
    html += '<div class="grid-2-col gap-md">';

    bms.forEach(bm => {
      const user = Storage.getById(KEYS.USERS, bm.user_id, 'user_id');
      const budget = Storage.getCurrentBudget(bm.bm_id);
      const pct = Utils.percentage(budget.used_amount, budget.total_budget);

      html += `
        <div class="card">
          <div class="card-body">
            <div class="d-flex justify-between align-center mb-sm">
              <div>
                <strong>${user ? Utils.escapeHtml(user.full_name) : 'Unknown'}</strong>
                <div class="text-sm text-muted">${Utils.escapeHtml(bm.district_name)}</div>
              </div>
              <span class="badge ${pct > 90 ? 'badge-danger' : pct > 70 ? 'badge-warning' : 'badge-success'}">${pct}%</span>
            </div>
            <div class="progress-bar mb-xs">
              <div class="progress-fill ${pct > 90 ? 'progress-danger' : pct > 70 ? 'progress-warning' : 'progress-primary'}" style="width:${pct}%"></div>
            </div>
            <div class="d-flex justify-between text-sm">
              <span>Used: ${Utils.formatCurrency(budget.used_amount)}</span>
              <span>Remaining: ${Utils.formatCurrency(budget.remaining_amount)}</span>
            </div>
            <div class="text-sm text-muted mt-xs">Total: ${Utils.formatCurrency(budget.total_budget)} (Rollover: ${Utils.formatCurrency(budget.rollover)})</div>
          </div>
        </div>
      `;
    });

    html += '</div>';
    container.innerHTML = html;
  },

  /**
   * BM Management Page (SysAdmin)
   */
  initBMManagement() {
    const container = document.getElementById('bm-management-content');
    if (!container) return;

    const bms = Storage.getAll(KEYS.BOARD_MEMBERS);
    const active = bms.filter(b => !b.is_archived);
    const archived = bms.filter(b => b.is_archived);

    let html = `
      <div class="grid-3-col gap-md mb-lg">
        <div class="stat-card stat-card-primary">
          <div class="stat-value">${active.length}</div>
          <div class="stat-label">Active Board Members</div>
        </div>
        <div class="stat-card stat-card-warning">
          <div class="stat-value">${active.filter(b => b.archive_status === 'pending').length}</div>
          <div class="stat-label">Pending Archive</div>
        </div>
        <div class="stat-card stat-card-muted">
          <div class="stat-value">${archived.length}</div>
          <div class="stat-label">Archived</div>
        </div>
      </div>

      <h3 class="mb-md">Active Board Members</h3>
      <div class="table-container mb-lg">
        <table class="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>District</th>
              <th>Term Start</th>
              <th>Term End</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${active.map(bm => {
              const user = Storage.getById(KEYS.USERS, bm.user_id, 'user_id');
              return `
                <tr>
                  <td><strong>${user ? Utils.escapeHtml(user.full_name) : 'Unknown'}</strong></td>
                  <td>${Utils.escapeHtml(bm.district_name)}</td>
                  <td>${Utils.formatDate(bm.term_start)}</td>
                  <td>${Utils.formatDate(bm.term_end)}</td>
                  <td><span class="badge badge-success">Active</span></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;

    if (archived.length > 0) {
      html += `
        <details class="mt-md">
          <summary class="text-muted" style="cursor:pointer; font-weight:600;">Archived Board Members (${archived.length})</summary>
          <div class="table-container mt-sm">
            <table class="data-table">
              <thead>
                <tr><th>Name</th><th>District</th><th>Term</th></tr>
              </thead>
              <tbody>
                ${archived.map(bm => {
                  const user = Storage.getById(KEYS.USERS, bm.user_id, 'user_id');
                  return `<tr><td>${user ? Utils.escapeHtml(user.full_name) : 'Unknown'}</td><td>${Utils.escapeHtml(bm.district_name)}</td><td>${Utils.formatDate(bm.term_start)} — ${Utils.formatDate(bm.term_end)}</td></tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </details>
      `;
    }

    container.innerHTML = html;
  },

  /**
   * Staff Management Page (SysAdmin)
   */
  initStaffManagement() {
    const container = document.getElementById('staff-management-content');
    if (!container) return;

    const users = Storage.getAll(KEYS.USERS).filter(u => u.role === 'secretary' && !u.is_archived);
    const assignments = Storage.getAll(KEYS.SECRETARY_ASSIGNMENTS);

    let html = `
      <div class="stat-card stat-card-primary mb-lg" style="max-width:200px">
        <div class="stat-value">${users.length}</div>
        <div class="stat-label">Active Staff</div>
      </div>

      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Assigned Board Members</th>
            </tr>
          </thead>
          <tbody>
            ${users.map(u => {
              const userAssignments = assignments.filter(a => a.secretary_user_id === u.user_id);
              const bmNames = userAssignments.map(a => {
                const bm = Storage.getById(KEYS.BOARD_MEMBERS, a.bm_id, 'bm_id');
                const bmUser = bm ? Storage.getById(KEYS.USERS, bm.user_id, 'user_id') : null;
                return bmUser ? bmUser.full_name : 'Unknown';
              });
              return `
                <tr>
                  <td><strong>${Utils.escapeHtml(u.full_name)}</strong></td>
                  <td>${Utils.escapeHtml(u.email)}</td>
                  <td>${bmNames.map(n => `<span class="badge badge-info mr-xs">${Utils.escapeHtml(n)}</span>`).join('') || '<span class="text-muted">None</span>'}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;

    container.innerHTML = html;
  },

  /**
   * My FA Budget Page (BM view)
   */
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
        <div class="table-container">
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

// ============================================================
// Boot
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
