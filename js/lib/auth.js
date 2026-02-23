/* ==============================================
 * auth.js
 * PURPOSE: Authentication & authorization manager.
 * Handles login validation, session persistence,
 * logout, and page-level access control.
 *
 * CONTAINS:
 *  - login(email, password) → Validate credentials & create session
 *  - logout()               → Clear session & redirect
 *  - checkAuth()            → Guard — redirect if not logged in
 *  - getCurrentUser()       → Get logged-in user object
 *  - getCurrentBM()         → Get BM profile (if role=board_member)
 *  - getCurrentAssignedBMs() → Get BM IDs for secretary
 *  - hasRole(role)          → Check if current user has a role
 *  - canAccess(feature)     → Permission check helper
 *  - isTermEnded()          → Check if BM's term has ended
 *  - isTermReadOnly()       → Check if BM account is read-only
 *
 * USED BY: Every page calls checkAuth() on load.
 *          Login page calls login(). All pages use getCurrentUser().
 * DEPENDS ON: constants.js, utils.js, storage.js
 * ============================================== */

/**
 * Attempt login with email + password.
 * On success: saves session to localStorage, returns user object.
 * On failure: returns null.
 *
 * @param {string} email    - User's email
 * @param {string} password - Plain text password (MVP only)
 * @returns {object|null} User object or null
 */
function login(email, password) {
  var user = findUserByEmail(email);
  if (!user) return null;
  if (user.password !== password) return null;
  if (!user.is_active) return null;

  // Build session object
  var session = {
    user_id: user.user_id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    logged_in_at: getNowISO()
  };

  // If board member, attach bm_id
  if (user.role === 'board_member') {
    var bm = getBMByUserId(user.user_id);
    if (bm) session.bm_id = bm.bm_id;
  }

  // If secretary, attach assigned BM IDs
  if (user.role === 'secretary') {
    session.assigned_bm_ids = getAssignedBMIds(user.user_id);
  }

  // Save session
  localStorage.setItem(STORAGE_KEYS.AUTH_STATE, JSON.stringify(session));

  // Update last_login
  updateUser(user.user_id, { last_login: getNowISO() });

  // Activity log
  addActivityLog(user.user_id, 'User logged in', 'login', 'user', user.user_id, '');

  return user;
}

/**
 * Log out current user: clear session and redirect to login
 */
function logout() {
  var session = getSession();
  if (session) {
    addActivityLog(session.user_id, 'User logged out', 'logout', 'user', session.user_id, '');
  }
  localStorage.removeItem(STORAGE_KEYS.AUTH_STATE);
  window.location.href = 'index.html';
}

/**
 * Get current session from localStorage
 * @returns {object|null}
 */
function getSession() {
  try {
    var data = localStorage.getItem(STORAGE_KEYS.AUTH_STATE);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
}

/**
 * Auth guard — call at the top of every protected page.
 * If no valid session, redirects to login page.
 * @returns {object} Session object (guaranteed non-null if returns)
 */
function checkAuth() {
  initializeApp(); // Ensure seed data exists

  var session = getSession();
  if (!session) {
    window.location.href = 'index.html';
    return null;
  }
  return session;
}

/**
 * Get the full User object for the logged-in user
 * @returns {object|null}
 */
function getCurrentUser() {
  var session = getSession();
  if (!session) return null;
  return storageFindById(STORAGE_KEYS.USERS, 'user_id', session.user_id);
}

/**
 * Get the BoardMember profile for the logged-in BM
 * Returns null if user is not a board_member
 * @returns {object|null}
 */
function getCurrentBM() {
  var session = getSession();
  if (!session || !session.bm_id) return null;
  return getBMById(session.bm_id);
}

/**
 * Get BM IDs that the current secretary is assigned to
 * @returns {string[]} Array of bm_id strings
 */
function getCurrentAssignedBMs() {
  var session = getSession();
  if (!session) return [];
  if (session.role === 'sysadmin') {
    return getBMs().map(function (b) { return b.bm_id; });
  }
  if (session.role === 'board_member' && session.bm_id) {
    return [session.bm_id];
  }
  return session.assigned_bm_ids || [];
}

/**
 * Check if current user has a specific role
 * @param {string} role - "sysadmin", "board_member", or "secretary"
 * @returns {boolean}
 */
function hasRole(role) {
  var session = getSession();
  return session && session.role === role;
}

/**
 * Get role display label
 * @param {string} role
 * @returns {string}
 */
function getRoleLabel(role) {
  switch (role) {
    case 'sysadmin': return 'System Admin';
    case 'board_member': return 'Board Member';
    case 'secretary': return 'Secretary';
    default: return role;
  }
}

/**
 * Check if the current BM's term has ended
 * @returns {boolean}
 */
function isTermEnded() {
  var bm = getCurrentBM();
  if (!bm) return false;
  return getDaysUntil(bm.term_end) <= 0;
}

/**
 * Check if BM account should be read-only
 * (term ended or archived)
 * @returns {boolean}
 */
function isTermReadOnly() {
  var bm = getCurrentBM();
  if (!bm) return false;
  return bm.is_archived || getDaysUntil(bm.term_end) <= 0;
}

/**
 * Get the term warning level for the current BM
 * @returns {string|null} "gentle" | "warning" | "critical" | "ended" | null
 */
function getTermWarningLevel() {
  var bm = getCurrentBM();
  if (!bm) return null;

  var days = getDaysUntil(bm.term_end);

  if (days <= 0) return 'ended';
  if (days <= TERM_WARNING_DAYS.critical) return 'critical';
  if (days <= TERM_WARNING_DAYS.warning) return 'warning';
  if (days <= TERM_WARNING_DAYS.gentle) return 'gentle';
  return null;
}
