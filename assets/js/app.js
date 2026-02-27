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

    // Initialize odometer-style stat animations for rendered metrics
    if (typeof Utils !== 'undefined' && typeof Utils.initStatOdometerObserver === 'function') {
      Utils.initStatOdometerObserver(document.body);
    }

    // Render sidebar nav
    Router.renderSidebar();

    // Setup profile in sidebar
    Auth.setupSidebarProfile();

    // Sidebar scroll preservation — restore saved position & ensure active link is visible
    this.restoreSidebarScroll();

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

    // Sidebar collapse toggle (desktop)
    const collapseBtn = document.getElementById('sidebar-collapse-btn');
    if (collapseBtn && sidebar) {
      // Restore collapse state WITHOUT transition animation
      const isCollapsed = localStorage.getItem('omsp_sidebar_collapsed') === 'true';
      if (isCollapsed) {
        // Add no-transition class to suppress ALL CSS transitions during restore
        document.documentElement.classList.add('no-transition');
        sidebar.classList.add('collapsed');
        // Force reflow so the browser applies collapsed state immediately
        sidebar.offsetHeight;
        // Remove no-transition after the browser has fully painted
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            document.documentElement.classList.remove('no-transition');
          });
        });
      }

      collapseBtn.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        localStorage.setItem('omsp_sidebar_collapsed', sidebar.classList.contains('collapsed'));
      });
    }

    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        Notifications.confirm({
          title: 'Sign Out',
          message: 'Are you sure you want to sign out? Any unsaved changes will be lost.',
          confirmText: 'Sign Out',
          cancelText: 'Cancel',
          type: 'warning',
          onConfirm: () => Auth.logout()
        });
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

    // Hide "New" buttons for non-secretary roles
    if (user.role !== 'secretary') {
      const newFABtn = document.getElementById('new-fa-btn');
      const newPABtn = document.getElementById('new-pa-btn');
      const newILBtn = document.getElementById('new-il-btn');
      if (newFABtn) newFABtn.style.display = 'none';
      if (newPABtn) newPABtn.style.display = 'none';
      if (newILBtn) newILBtn.style.display = 'none';
    }
  },

  /**
   * Replace emoji placeholders with SVG icons in the app shell
   */
  injectShellIcons() {
    if (typeof Icons === 'undefined') return;
    const basePath = (typeof Utils !== 'undefined' && typeof Utils.getBasePath === 'function')
      ? Utils.getBasePath()
      : './';

    // Sidebar logo
    const logo = document.querySelector('.sidebar-logo');
    if (logo) {
      logo.innerHTML = `<img src="${basePath}assets/images/SP-logo-nobg.png" alt="SP Logo" class="sidebar-logo-img">`;
    }

    // Sidebar collapse button
    const collapseBtn = document.getElementById('sidebar-collapse-btn');
    if (collapseBtn) collapseBtn.innerHTML = Icons.render('chevron-left', 16);

    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.innerHTML = Icons.render('log-out', 18) + ' Sign Out';

    // Menu toggle
    const menuToggle = document.getElementById('menu-toggle');
    if (menuToggle) menuToggle.innerHTML = Icons.render('menu', 22);

    // "New Financial Assistance" button
    const newFABtn = document.getElementById('new-fa-btn');
    if (newFABtn) newFABtn.innerHTML = Icons.render('file-plus', 16) + ' New Financial Assistance';

    // "New Personal Assistance" button
    const newPABtn = document.getElementById('new-pa-btn');
    if (newPABtn) newPABtn.innerHTML = Icons.render('plus-circle', 16) + ' New Personal Assistance';

    // "New Incoming Letter" button
    const newILBtn = document.getElementById('new-il-btn');
    if (newILBtn) newILBtn.innerHTML = Icons.render('mail', 16) + ' New Incoming Letter';

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
   * Restore sidebar scroll position so the active nav item remains visible
   * across page navigations (saves/restores via sessionStorage).
   */
  restoreSidebarScroll() {
    const sidebarNav = document.getElementById('sidebar-nav');
    const sidebar = document.getElementById('sidebar');
    if (!sidebarNav) return;

    // Restore saved scroll positions
    const savedNavScroll = sessionStorage.getItem('omsp_sidebar_nav_scroll');
    if (savedNavScroll) {
      sidebarNav.scrollTop = parseInt(savedNavScroll, 10);
    }
    if (sidebar) {
      const savedSidebarScroll = sessionStorage.getItem('omsp_sidebar_scroll');
      if (savedSidebarScroll) {
        sidebar.scrollTop = parseInt(savedSidebarScroll, 10);
      }
    }

    // Ensure active link is scrolled into view
    requestAnimationFrame(() => {
      const activeLink = sidebarNav.querySelector('.nav-link.active');
      if (activeLink) {
        const navRect = sidebarNav.getBoundingClientRect();
        const linkRect = activeLink.getBoundingClientRect();
        if (linkRect.top < navRect.top || linkRect.bottom > navRect.bottom) {
          activeLink.scrollIntoView({ block: 'center', behavior: 'instant' });
        }
      }
    });

    // Persist scroll position on scroll events
    sidebarNav.addEventListener('scroll', () => {
      sessionStorage.setItem('omsp_sidebar_nav_scroll', sidebarNav.scrollTop);
    });
    if (sidebar) {
      sidebar.addEventListener('scroll', () => {
        sessionStorage.setItem('omsp_sidebar_scroll', sidebar.scrollTop);
      });
    }
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
        if (!Auth.requireRole('secretary')) return;
        if (typeof FAModule !== 'undefined') FAModule.initNewForm();
        Router.setPageInfo('New Financial Assistance');
        break;

      case 'fa-list':
        if (typeof FAModule !== 'undefined') FAModule.initList();
        Router.setPageInfo('Financial Assistance Records');
        break;

      case 'pa-new':
        if (!Auth.requireRole('secretary')) return;
        if (typeof PAModule !== 'undefined') PAModule.initNewForm();
        Router.setPageInfo('New Personal Assistance');
        break;

      case 'pa-list':
        if (typeof PAModule !== 'undefined') PAModule.initList();
        Router.setPageInfo('Personal Assistance Records');
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
        if (!Auth.requireRole('sysadmin')) return;
        if (typeof SysAdminModule !== 'undefined') SysAdminModule.initBMManagement();
        else this.initBMManagement(); // fallback
        Router.setPageInfo('Board Member Management');
        break;

      case 'staff-management':
        if (!Auth.requireRole('sysadmin')) return;
        if (typeof SysAdminModule !== 'undefined') SysAdminModule.initStaffManagement();
        else this.initStaffManagement(); // fallback
        Router.setPageInfo('Staff Management');
        break;

      // BM pages
      case 'my-fa-budget':
        if (!Auth.requireRole('board_member')) return;
        if (typeof BoardMemberModule !== 'undefined') BoardMemberModule.initMyBudget();
        else this.initMyBudget(); // fallback
        Router.setPageInfo('My Financial Assistance Budget');
        break;

      case 'my-pa-budget':
        if (!Auth.requireRole('board_member')) return;
        if (typeof BoardMemberModule !== 'undefined') BoardMemberModule.initPABudget();
        Router.setPageInfo('My Personal Assistance Budget');
        break;

      // BM oversight pages
      case 'secretary-logs':
        if (!Auth.requireRole('board_member')) return;
        if (typeof BoardMemberModule !== 'undefined') BoardMemberModule.initSecretaryLogs();
        Router.setPageInfo('Secretary Activity Logs');
        break;

      case 'archives':
        if (!Auth.requireRole('board_member')) return;
        if (typeof BoardMemberModule !== 'undefined') BoardMemberModule.initArchives();
        Router.setPageInfo('Past Term Archives');
        break;

      // Incoming Letters pages
      case 'incoming-new':
        if (!Auth.requireRole('secretary')) return;
        if (typeof IncomingModule !== 'undefined') IncomingModule.initNewForm();
        Router.setPageInfo('New Incoming Letter');
        break;

      case 'incoming-list':
        if (typeof IncomingModule !== 'undefined') IncomingModule.initList();
        Router.setPageInfo('Incoming Letters');
        break;

      // Search Archives
      case 'search-archives':
        if (typeof SearchModule !== 'undefined') SearchModule.initArchives();
        Router.setPageInfo('Search Archives');
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
    const isSysAdmin = user.role === 'sysadmin';

    // Get all logs to build filter dropdowns
    const allLogs = Storage.getAll(KEYS.ACTIVITY_LOGS);
    const uniqueUsers = [...new Map(allLogs.map(l => [l.user_id, { id: l.user_id, name: l.user_name }])).values()];
    uniqueUsers.sort((a, b) => a.name.localeCompare(b.name));

    const actionTypes = [
      { value: 'create', label: 'Create' },
      { value: 'update', label: 'Update' },
      { value: 'edit', label: 'Edit' },
      { value: 'delete', label: 'Delete' },
      { value: 'archive', label: 'Archive' },
      { value: 'restore', label: 'Restore' },
      { value: 'login', label: 'Login' },
      { value: 'logout', label: 'Logout' },
      { value: 'export', label: 'Export' },
      { value: 'status_change', label: 'Status Change' },
      { value: 'approve', label: 'Approve' },
      { value: 'deny', label: 'Deny' }
    ];

    const recordTypes = [
      { value: 'fa', label: 'Financial Assistance' },
      { value: 'pa', label: 'Personal Assistance' },
      { value: 'beneficiary', label: 'Beneficiary' },
      { value: 'category', label: 'Category' },
      { value: 'user', label: 'User' },
      { value: 'budget', label: 'Budget' },
      { value: 'term', label: 'Term' },
      { value: 'system', label: 'System' }
    ];

    container.innerHTML = `
      <div class="card mb-md">
        <div class="card-header">
          <h3 class="card-title">${Icons.render('filter', 18)} Filters</h3>
          <div class="d-flex gap-sm">
            <button class="btn btn-ghost btn-sm" id="clear-log-filters">${Icons.render('x', 14)} Clear</button>
            <button class="btn btn-outline btn-sm" id="export-logs-btn">${Icons.render('download', 14)} Export CSV</button>
          </div>
        </div>
        <div class="card-body">
          <div class="log-filters">
            <div class="form-group" style="margin-bottom:0;flex:1;min-width:150px;">
              <label class="form-label">Action Type</label>
              <select id="filter-action-type" class="form-select">
                <option value="">All Actions</option>
                ${actionTypes.map(t => `<option value="${t.value}">${t.label}</option>`).join('')}
              </select>
            </div>
            <div class="form-group" style="margin-bottom:0;flex:1;min-width:150px;">
              <label class="form-label">Record Type</label>
              <select id="filter-record-type" class="form-select">
                <option value="">All Records</option>
                ${recordTypes.map(t => `<option value="${t.value}">${t.label}</option>`).join('')}
              </select>
            </div>
            ${isSysAdmin ? `
            <div class="form-group" style="margin-bottom:0;flex:1;min-width:150px;">
              <label class="form-label">User</label>
              <select id="filter-user" class="form-select">
                <option value="">All Users</option>
                ${uniqueUsers.map(u => `<option value="${Utils.escapeHtml(u.id)}">${Utils.escapeHtml(u.name)}</option>`).join('')}
              </select>
            </div>
            ` : ''}
            <div class="form-group" style="margin-bottom:0;flex:1;min-width:140px;">
              <label class="form-label">Date From</label>
              <input type="date" id="filter-date-from" class="form-input" />
            </div>
            <div class="form-group" style="margin-bottom:0;flex:1;min-width:140px;">
              <label class="form-label">Date To</label>
              <input type="date" id="filter-date-to" class="form-input" />
            </div>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Activity Log</h3>
          <span class="text-sm text-muted" id="log-count-label"></span>
        </div>
        <div class="card-body" id="log-list-container"></div>
        <div id="log-pagination" class="card-footer"></div>
      </div>
    `;

    // State
    let currentPage = 1;
    const pageSize = 25;

    const applyFilters = () => {
      const filters = { limit: 500 };
      if (!isSysAdmin) filters.user_id = user.user_id;

      const actionType = document.getElementById('filter-action-type').value;
      const recordType = document.getElementById('filter-record-type').value;
      const userFilter = isSysAdmin ? document.getElementById('filter-user')?.value : '';
      const dateFrom = document.getElementById('filter-date-from').value;
      const dateTo = document.getElementById('filter-date-to').value;

      if (actionType) filters.action_type = actionType;
      if (recordType) filters.record_type = recordType;
      if (userFilter) filters.user_id = userFilter;
      if (dateFrom) filters.date_from = dateFrom;
      if (dateTo) filters.date_to = dateTo;

      const logs = ActivityLogger.getRecent(filters);
      const paged = Utils.paginate(logs, currentPage, pageSize);

      document.getElementById('log-count-label').textContent = `${logs.length} entries`;

      const listEl = document.getElementById('log-list-container');
      if (paged.data.length === 0) {
        listEl.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">${Icons.render('clipboard-list', 32)}</div>
            <h3 class="empty-state-title">No Activity Found</h3>
            <p class="empty-state-text">No logs match your current filters.</p>
          </div>
        `;
      } else {
        listEl.innerHTML = paged.data.map(log => {
          const iconClass = log.action_type === 'update' || log.action_type === 'edit' ? 'log-icon-edit'
            : log.action_type === 'create' ? 'log-icon-create'
            : log.action_type === 'delete' ? 'log-icon-delete'
            : log.action_type === 'login' || log.action_type === 'logout' ? 'log-icon-login'
            : '';
          return `
            <div class="log-entry">
              <div class="log-entry-icon ${iconClass}">
                ${ActivityLogger.getActionIcon(log.action_type)}
              </div>
              <div class="log-entry-body">
                <div class="log-entry-action">
                  <strong>${Utils.escapeHtml(log.user_name)}</strong>
                  ${Utils.escapeHtml(log.action)}
                </div>
                ${log.details ? `<div class="log-entry-details">${Utils.escapeHtml(log.details)}</div>` : ''}
                <div class="log-entry-details">
                  <span class="badge badge-neutral" style="font-size:0.7rem;">${log.action_type}</span>
                  <span class="badge badge-info" style="font-size:0.7rem;">${log.record_type}</span>
                </div>
              </div>
              <div class="log-entry-time">${Utils.formatDate(log.created_at, 'short')} ${new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          `;
        }).join('');
      }

      // Pagination
      const pagEl = document.getElementById('log-pagination');
      if (paged.totalPages > 1) {
        let pagHtml = '';
        pagHtml += `<div class="pagination"><span>Showing ${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, logs.length)} of ${logs.length}</span><div class="pagination-buttons">`;
        pagHtml += `<button class="pagination-btn" ${currentPage <= 1 ? 'disabled' : ''} onclick="App._activityGoToPage(${currentPage - 1})">&laquo;</button>`;
        const startPg = Math.max(1, currentPage - 2);
        const endPg = Math.min(paged.totalPages, currentPage + 2);
        if (startPg > 1) {
          pagHtml += `<button class="pagination-btn" onclick="App._activityGoToPage(1)">1</button>`;
          if (startPg > 2) pagHtml += `<span class="pagination-ellipsis">…</span>`;
        }
        for (let i = startPg; i <= endPg; i++) {
          pagHtml += `<button class="pagination-btn ${i === currentPage ? 'active' : ''}" onclick="App._activityGoToPage(${i})">${i}</button>`;
        }
        if (endPg < paged.totalPages) {
          if (endPg < paged.totalPages - 1) pagHtml += `<span class="pagination-ellipsis">…</span>`;
          pagHtml += `<button class="pagination-btn" onclick="App._activityGoToPage(${paged.totalPages})">${paged.totalPages}</button>`;
        }
        pagHtml += `<button class="pagination-btn" ${currentPage >= paged.totalPages ? 'disabled' : ''} onclick="App._activityGoToPage(${currentPage + 1})">&raquo;</button>`;
        pagHtml += '</div></div>';
        pagEl.innerHTML = pagHtml;
      } else {
        pagEl.innerHTML = '';
      }
    };

    // Attach filter change listeners
    ['filter-action-type', 'filter-record-type', 'filter-date-from', 'filter-date-to'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', () => { currentPage = 1; applyFilters(); });
    });
    if (isSysAdmin) {
      const userEl = document.getElementById('filter-user');
      if (userEl) userEl.addEventListener('change', () => { currentPage = 1; applyFilters(); });
    }

    // Clear filters
    document.getElementById('clear-log-filters').addEventListener('click', () => {
      document.getElementById('filter-action-type').value = '';
      document.getElementById('filter-record-type').value = '';
      document.getElementById('filter-date-from').value = '';
      document.getElementById('filter-date-to').value = '';
      if (isSysAdmin && document.getElementById('filter-user')) {
        document.getElementById('filter-user').value = '';
      }
      currentPage = 1;
      applyFilters();
    });

    // Export CSV
    document.getElementById('export-logs-btn').addEventListener('click', () => {
      const filters = { limit: 10000 };
      if (!isSysAdmin) filters.user_id = user.user_id;
      const actionType = document.getElementById('filter-action-type').value;
      const recordType = document.getElementById('filter-record-type').value;
      const userFilter = isSysAdmin ? document.getElementById('filter-user')?.value : '';
      const dateFrom = document.getElementById('filter-date-from').value;
      const dateTo = document.getElementById('filter-date-to').value;
      if (actionType) filters.action_type = actionType;
      if (recordType) filters.record_type = recordType;
      if (userFilter) filters.user_id = userFilter;
      if (dateFrom) filters.date_from = dateFrom;
      if (dateTo) filters.date_to = dateTo;

      const logs = ActivityLogger.getRecent(filters);
      ExportUtils.toCSV(logs, 'activity-logs', {
        columns: ['created_at', 'user_name', 'user_role', 'action', 'action_type', 'record_type', 'record_id', 'details'],
        headers: ['Timestamp', 'User', 'Role', 'Action', 'Type', 'Record', 'Record ID', 'Details']
      });
    });

    // Initial render
    applyFilters();

    // Expose pagination callback globally
    this._activityGoToPage = (page) => {
      currentPage = page;
      applyFilters();
    };
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
            <div class="text-sm text-muted mt-xs">Total: ${Utils.formatCurrency(budget.total_budget)} (Rollover: ${Utils.formatCurrency(budget.rollover_amount || 0)})</div>
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
  * My Financial Assistance Budget Page (BM view)
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
      <h3 class="mb-md">Financial Assistance Budget — ${Utils.formatMonth(Utils.getCurrentYearMonth())}</h3>

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
            <span>Rollover from previous month: ${Utils.formatCurrency(budget.rollover_amount || 0)}</span>
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
                  <td class="text-right">${Utils.formatCurrency(h.rollover_amount || 0)}</td>
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

  // Global: close modals when clicking outside (on the overlay)
  document.addEventListener('click', (e) => {
    const overlay = e.target.closest('.modal-overlay');
    if (overlay && e.target === overlay) {
      overlay.remove();
    }
  });
});
