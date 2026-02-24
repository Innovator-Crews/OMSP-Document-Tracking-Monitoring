/**
 * ============================================================
 * OMSP Document Tracking / Monitoring
 * Authentication Module - Login, sessions, role-based access
 * ============================================================
 */

const Auth = {
  /* --------------------------------------------------------
   * SESSION MANAGEMENT
   * -------------------------------------------------------- */

  /**
   * Attempt login with email and password
   * @param {string} email
   * @param {string} password
   * @returns {{ success: boolean, user?: Object, error?: string }}
   */
  login(email, password) {
    if (!email || !password) {
      return { success: false, error: 'Email and password are required.' };
    }

    const users = Storage.getAll(KEYS.USERS);
    const user = users.find(u =>
      u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );

    if (!user) {
      return { success: false, error: 'Invalid email or password.' };
    }

    if (!user.is_active) {
      return { success: false, error: 'Your account has been deactivated. Contact the administrator.' };
    }

    // Update last login
    Storage.update(KEYS.USERS, user.user_id, {
      last_login: new Date().toISOString()
    }, 'user_id');

    // Build session data
    const session = {
      user_id: user.user_id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      logged_in_at: new Date().toISOString()
    };

    // Add role-specific data
    if (user.role === 'board_member') {
      const bm = Storage.getAll(KEYS.BOARD_MEMBERS).find(b => b.user_id === user.user_id);
      if (bm) {
        session.bm_id = bm.bm_id;
        session.district_name = bm.district_name;
      }
    }

    if (user.role === 'secretary') {
      const assignments = Storage.getAll(KEYS.SECRETARY_ASSIGNMENTS)
        .filter(a => a.secretary_user_id === user.user_id);
      session.assigned_bm_ids = assignments.map(a => a.bm_id);
      session.assignments = assignments;
    }

    Storage.set(KEYS.CURRENT_USER, session);

    // Log activity
    ActivityLogger.log('Logged in', 'login', 'system', null, null);

    return { success: true, user: session };
  },

  /**
   * Logout current user
   */
  logout() {
    const user = this.getCurrentUser();
    const wasAdmin = user && user.role === 'sysadmin';
    if (user) {
      ActivityLogger.log('Logged out', 'logout', 'system', null, null);
    }
    Storage.remove(KEYS.CURRENT_USER);
    if (wasAdmin) {
      const base = Utils.getBasePath();
      window.location.href = `${base}sysadmin/login.html`;
    } else {
      window.location.href = this.getLoginUrl();
    }
  },

  /**
   * Get current logged-in user
   * @returns {Object|null}
   */
  getCurrentUser() {
    return Storage.get(KEYS.CURRENT_USER);
  },

  /**
   * Check if user is logged in
   * @returns {boolean}
   */
  isLoggedIn() {
    return this.getCurrentUser() !== null;
  },

  /**
   * Get current user's role
   * @returns {string|null}
   */
  getRole() {
    const user = this.getCurrentUser();
    return user ? user.role : null;
  },

  /* --------------------------------------------------------
   * ACCESS CONTROL
   * -------------------------------------------------------- */

  /**
   * Require authentication - redirect to login if not logged in
   * @returns {Object|null} Current user or null (after redirect)
   */
  requireAuth() {
    if (!this.isLoggedIn()) {
      window.location.href = this.getLoginUrl();
      return null;
    }
    return this.getCurrentUser();
  },

  /**
   * Require specific role(s) - redirect if unauthorized
   * @param {...string} allowedRoles - Roles that can access
   * @returns {Object|null} Current user or null
   */
  requireRole(...allowedRoles) {
    const user = this.requireAuth();
    if (!user) return null;

    if (!allowedRoles.includes(user.role)) {
      // Redirect to their own dashboard
      window.location.href = this.getDashboardUrl(user.role);
      return null;
    }
    return user;
  },

  /**
   * Check if current user has permission for an action
   * @param {string} permission - Permission name
   * @param {Object} context - Additional context (e.g., { bmId })
   * @returns {boolean}
   */
  checkPermission(permission, context = {}) {
    const user = this.getCurrentUser();
    if (!user) return false;

    const role = user.role;
    const permissions = this.getPermissionMatrix();

    // SysAdmin has all permissions
    if (role === 'sysadmin') return true;

    const rolePerms = permissions[role];
    if (!rolePerms) return false;

    // Check base permission
    if (!rolePerms[permission]) return false;

    // Context-based checks
    if (permission === 'view_fa' && role === 'secretary') {
      // Secretary can only view FA for assigned BMs
      if (context.bmId) {
        return (user.assigned_bm_ids || []).includes(context.bmId);
      }
    }

    if (permission === 'create_fa' && role === 'secretary') {
      if (context.bmId) {
        return (user.assigned_bm_ids || []).includes(context.bmId);
      }
    }

    if (permission === 'view_fa' && role === 'board_member') {
      // BM can only view their own FA
      if (context.bmId) {
        return user.bm_id === context.bmId;
      }
    }

    return true;
  },

  /**
   * Get the full permission matrix
   * @returns {Object}
   */
  getPermissionMatrix() {
    return {
      sysadmin: {
        // SysAdmin has all - this is mostly for documentation
        view_dashboard: true,
        manage_users: true,
        manage_bms: true,
        manage_categories: true,
        view_all_fa: true,
        view_all_pa: true,
        approve_archives: true,
        view_logs: true,
        manage_settings: true,
        manage_terms: true,
        global_search: true,
        export_data: true,
        // SysAdmin cannot create FA/PA records
        create_fa: false,
        create_pa: false
      },
      board_member: {
        view_dashboard: true,
        view_fa: true,       // Own FA only
        view_pa: true,       // Own PA only
        create_fa: false,    // BMs don't create records directly
        create_pa: false,
        view_budget: true,   // Own budget
        request_archive: true,
        manage_staff: true,  // View their assigned staff
        view_own_logs: true,
        global_search: false,
        export_data: true,
        manage_users: false,
        manage_categories: false,
        approve_archives: false,
        view_logs: false,
        manage_settings: false
      },
      secretary: {
        view_dashboard: true,
        create_fa: true,     // For assigned BMs
        create_pa: true,     // All PA is transparent
        view_fa: true,       // Assigned BMs' FA only
        view_pa: true,       // All PA (transparent)
        view_budget: true,   // Assigned BMs' budget
        global_search: true,
        manage_categories: true, // Custom categories
        export_data: true,
        view_own_logs: true,
        manage_users: false,
        manage_bms: false,
        approve_archives: false,
        view_logs: false,
        manage_settings: false,
        request_archive: false
      }
    };
  },

  /* --------------------------------------------------------
   * BOARD MEMBER HELPERS
   * -------------------------------------------------------- */

  /**
   * Get BM data for the current user (if board member)
   * @returns {Object|null}
   */
  getCurrentBMData() {
    const user = this.getCurrentUser();
    if (!user || user.role !== 'board_member') return null;
    return Storage.getById(KEYS.BOARD_MEMBERS, user.bm_id, 'bm_id');
  },

  /**
   * Get assigned BMs for current secretary
   * @returns {Array} Board member records
   */
  getAssignedBMs() {
    const user = this.getCurrentUser();
    if (!user || user.role !== 'secretary') return [];

    const bmIds = user.assigned_bm_ids || [];
    const bms = Storage.getAll(KEYS.BOARD_MEMBERS);
    return bms.filter(bm => bmIds.includes(bm.bm_id) && !bm.is_archived);
  },

  /**
   * Check if secretary is assigned to a specific BM
   * @param {string} bmId - Board Member ID
   * @returns {boolean}
   */
  isAssignedTo(bmId) {
    const user = this.getCurrentUser();
    if (!user) return false;
    if (user.role === 'sysadmin') return true;
    if (user.role === 'board_member') return user.bm_id === bmId;
    if (user.role === 'secretary') return (user.assigned_bm_ids || []).includes(bmId);
    return false;
  },

  /* --------------------------------------------------------
   * URL HELPERS
   * -------------------------------------------------------- */

  /**
   * Get the login page URL from any depth
   * @returns {string}
   */
  getLoginUrl() {
    const base = Utils.getBasePath();
    return `${base}pages/login.html`;
  },

  /**
   * Get the dashboard URL for a given role
   * @param {string} role
   * @returns {string}
   */
  getDashboardUrl(role) {
    const base = Utils.getBasePath();
    // All roles use the shared dashboard — DashboardModule routes by role internally
    return `${base}pages/dashboard.html`;
  },

  /**
   * Navigate to user's dashboard based on role
   */
  goToDashboard() {
    const user = this.getCurrentUser();
    if (user) {
      window.location.href = this.getDashboardUrl(user.role);
    } else {
      window.location.href = this.getLoginUrl();
    }
  },

  /* --------------------------------------------------------
   * UI SETUP HELPERS
   * -------------------------------------------------------- */

  /**
   * Set up the sidebar user profile section
   */
  setupSidebarProfile() {
    const user = this.getCurrentUser();
    if (!user) return;

    // Match IDs used in the HTML sidebar-profile section
    const nameEl = document.getElementById('profile-name');
    const roleEl = document.getElementById('profile-role');
    const avatarEl = document.getElementById('profile-avatar');

    if (nameEl) nameEl.textContent = user.full_name;
    if (roleEl) roleEl.textContent = Utils.getRoleLabel(user.role);
    if (avatarEl) avatarEl.textContent = Utils.getInitials(user.full_name);
  },

  /**
   * Highlight the active sidebar link based on current page
   */
  setActiveSidebarLink() {
    const currentPage = window.location.pathname.split('/').pop();
    const links = document.querySelectorAll('.nav-link');
    links.forEach(link => {
      const href = link.getAttribute('href');
      if (href && href.includes(currentPage)) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }
};
