/**
 * ============================================================
 * OMSP Document Tracking / Monitoring
 * Router — Page detection, navigation helpers, breadcrumbs
 * ============================================================
 */

const Router = {
  /**
   * Detect current page from URL path
   * Returns { section, page, role }
   */
  getCurrentPage() {
    const path = window.location.pathname;
    const parts = path.split('/').filter(Boolean);

    // Detect section and page
    const fileName = parts[parts.length - 1] || 'index.html';
    const pageName = fileName.replace('.html', '');

    // Detect section from folder
    let section = 'pages'; // default
    if (parts.includes('sysadmin')) section = 'sysadmin';
    else if (parts.includes('boardmember')) section = 'boardmember';
    else if (parts.includes('staff')) section = 'staff';

    return { section, page: pageName };
  },

  /**
   * Navigate to a page within the app
   */
  navigate(path) {
    const basePath = Utils.getBasePath();
    window.location.href = basePath + path;
  },

  /**
   * Get relative path from current page to root
   */
  getRelativeRoot() {
    const path = window.location.pathname;
    const parts = path.split('/').filter(Boolean);

    // If in sysadmin/, boardmember/, staff/, or pages/ - go up one
    // If at root level index.html - stay
    const folders = ['sysadmin', 'boardmember', 'staff', 'pages'];
    for (const folder of folders) {
      if (parts.includes(folder)) return '../';
    }
    return './';
  },

  /**
   * Build navigation links for the sidebar based on role
   */
  getSidebarLinks(role) {
    const root = this.getRelativeRoot();

    const links = {
      sysadmin: [
        { label: 'Dashboard', icon: 'dashboard', href: `${root}pages/dashboard.html`, id: 'nav-dashboard' },
        { type: 'divider', label: 'Records' },
        { label: 'Financial Assistance Records', icon: 'file-text', href: `${root}pages/fa-list.html`, id: 'nav-fa-list' },
        { label: 'Personal Assistance Records', icon: 'clipboard-list', href: `${root}pages/pa-list.html`, id: 'nav-pa-list' },
        { label: 'Global Search', icon: 'search', href: `${root}pages/global-search.html`, id: 'nav-search' },
        { type: 'divider', label: 'Management' },
        { label: 'Board Members', icon: 'users', href: `${root}sysadmin/bm-management.html`, id: 'nav-bm-mgmt' },
        { label: 'Staff', icon: 'user', href: `${root}sysadmin/staff-management.html`, id: 'nav-staff-mgmt' },
        { label: 'Categories', icon: 'tag', href: `${root}pages/categories.html`, id: 'nav-categories' },
        { label: 'Term / Archive', icon: 'archive', href: `${root}pages/term-management.html`, id: 'nav-term' },
        { type: 'divider', label: 'Reports' },
        { label: 'Reports', icon: 'bar-chart', href: `${root}pages/reports.html`, id: 'nav-reports' },
        { label: 'Activity Logs', icon: 'activity', href: `${root}pages/activity-logs.html`, id: 'nav-activity' },
        { label: 'Budget Overview', icon: 'wallet', href: `${root}pages/budget.html`, id: 'nav-budget' },
      ],
      board_member: [
        { label: 'Dashboard', icon: 'dashboard', href: `${root}pages/dashboard.html`, id: 'nav-dashboard' },
        { type: 'divider', label: 'My Records' },
        { label: 'Financial Assistance Records', icon: 'file-text', href: `${root}pages/fa-list.html`, id: 'nav-fa-list' },
        { label: 'Personal Assistance Records', icon: 'clipboard-list', href: `${root}pages/pa-list.html`, id: 'nav-pa-list' },
        { label: 'Global Search', icon: 'search', href: `${root}pages/global-search.html`, id: 'nav-search' },
        { type: 'divider', label: 'Budget & Term' },
        { label: 'My Financial Assistance Budget', icon: 'wallet', href: `${root}boardmember/my-fa-budget.html`, id: 'nav-fa-budget' },
        { label: 'My Personal Assistance Budget', icon: 'credit-card', href: `${root}boardmember/my-pa-budget.html`, id: 'nav-pa-budget' },
        { label: 'Term / Archive', icon: 'archive', href: `${root}pages/term-management.html`, id: 'nav-term' },
        { type: 'divider', label: 'Reports' },
        { label: 'Activity Logs', icon: 'activity', href: `${root}pages/activity-logs.html`, id: 'nav-activity' },
      ],
      secretary: [
        { label: 'Dashboard', icon: 'dashboard', href: `${root}pages/dashboard.html`, id: 'nav-dashboard' },
        { type: 'divider', label: 'Records' },
        { label: 'New Financial Assistance', icon: 'file-plus', href: `${root}pages/fa-new.html`, id: 'nav-fa-new' },
        { label: 'Financial Assistance Records', icon: 'file-text', href: `${root}pages/fa-list.html`, id: 'nav-fa-list' },
        { label: 'New Personal Assistance', icon: 'plus-circle', href: `${root}pages/pa-new.html`, id: 'nav-pa-new' },
        { label: 'Personal Assistance Records', icon: 'clipboard-list', href: `${root}pages/pa-list.html`, id: 'nav-pa-list' },
        { label: 'Global Search', icon: 'search', href: `${root}pages/global-search.html`, id: 'nav-search' },
        { type: 'divider', label: 'Reports' },
        { label: 'Activity Logs', icon: 'activity', href: `${root}pages/activity-logs.html`, id: 'nav-activity' },
      ]
    };

    return links[role] || links.secretary;
  },

  /**
   * Render sidebar navigation
   */
  renderSidebar() {
    const user = Auth.getCurrentUser();
    if (!user) return;

    const nav = document.getElementById('sidebar-nav');
    if (!nav) return;

    const links = this.getSidebarLinks(user.role);
    const currentPage = this.getCurrentPage();

    nav.innerHTML = links.map(link => {
      if (link.type === 'divider') {
        return `<div class="nav-section-label">${link.label}</div>`;
      }

      const isActive = this.isLinkActive(link, currentPage);
      const iconHtml = typeof Icons !== 'undefined' ? Icons.nav(link.icon) : link.icon;
      return `
        <a href="${link.href}" class="nav-link ${isActive ? 'active' : ''}" id="${link.id}">
          <span class="nav-icon">${iconHtml}</span>
          <span class="nav-text">${link.label}</span>
        </a>
      `;
    }).join('');
  },

  /**
   * Check if a sidebar link is active
   */
  isLinkActive(link, currentPage) {
    const linkFile = link.href.split('/').pop().replace('.html', '');
    return linkFile === currentPage.page;
  },

  /**
   * Set page title and breadcrumbs
   */
  setPageInfo(title, breadcrumbs) {
    const titleEl = document.getElementById('page-title');
    const breadcrumbEl = document.getElementById('breadcrumb');

    if (titleEl) titleEl.textContent = title;
    if (breadcrumbs && breadcrumbEl) {
      breadcrumbEl.innerHTML = breadcrumbs.map((b, i) => {
        if (i === breadcrumbs.length - 1) {
          return `<span class="breadcrumb-current">${b.label}</span>`;
        }
        return `<a href="${b.href}" class="breadcrumb-link">${b.label}</a>`;
      }).join('<span class="breadcrumb-sep">/</span>');
    }
  }
};
