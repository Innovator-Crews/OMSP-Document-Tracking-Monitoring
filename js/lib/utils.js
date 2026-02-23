/* ==============================================
 * utils.js
 * PURPOSE: Pure helper/utility functions with
 * no side effects. Used throughout the app for
 * common operations.
 *
 * CONTAINS:
 *  - generateId()       → Creates unique IDs
 *  - formatCurrency()   → "₱70,000" formatting
 *  - formatDate()       → "January 15, 2025"
 *  - formatDateTime()   → "Jan 15, 2025, 02:30 PM"
 *  - getCurrentYearMonth() → "2025-03"
 *  - getDaysUntil()     → Days until a target date
 *  - addMonths()        → Add months to a date
 *  - getFrequencyLevel() → normal/monitor/high
 *  - getFrequencyBadge() → badge color + icon
 *  - getBudgetPercentage() → % used
 *  - getBudgetColor()   → green/yellow/red class
 *  - truncate()         → Shorten long strings
 *  - escapeHtml()       → Prevent XSS in rendered HTML
 *  - debounce()         → Throttle rapid function calls
 *
 * USED BY: pages/*.js, components/*.js
 * DEPENDS ON: Nothing (standalone)
 * ============================================== */

/**
 * Generate a unique ID string using timestamp + random
 * Used as primary key for all localStorage records
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

/**
 * Format a number as Philippine Peso currency
 * @param {number} amount - The amount to format
 * @returns {string} Formatted string like "₱70,000"
 */
function formatCurrency(amount) {
  return '₱' + Number(amount || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

/**
 * Format an ISO date string to readable long format
 * @param {string} dateStr - ISO date string
 * @returns {string} "January 15, 2025"
 */
function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
}

/**
 * Format an ISO date string to date + time
 * @param {string} dateStr - ISO date string
 * @returns {string} "Jan 15, 2025, 02:30 PM"
 */
function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

/**
 * Get current year-month as "YYYY-MM" string
 * Used for monthly budget tracking
 * @returns {string} e.g., "2025-03"
 */
function getCurrentYearMonth() {
  var now = new Date();
  return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
}

/**
 * Calculate days remaining until a target date
 * @param {string} dateStr - Target ISO date
 * @returns {number} Positive = future, Negative = past
 */
function getDaysUntil(dateStr) {
  var target = new Date(dateStr);
  var now = new Date();
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

/**
 * Add months to a date string
 * @param {string} dateStr - Starting ISO date
 * @param {number} months - Months to add
 * @returns {string} New date as "YYYY-MM-DD"
 */
function addMonths(dateStr, months) {
  var date = new Date(dateStr);
  date.setMonth(date.getMonth() + months);
  return date.toISOString().split('T')[0];
}

/**
 * Determine frequency alert level from request count
 * @param {number} count - Number of requests this month
 * @returns {string} "normal" | "monitor" | "high"
 */
function getFrequencyLevel(count) {
  if (count >= 5) return 'high';
  if (count >= 3) return 'monitor';
  return 'normal';
}

/**
 * Get display properties for a frequency level
 * @param {string} level - "normal" | "monitor" | "high"
 * @returns {object} { cssClass, icon, label }
 */
function getFrequencyBadge(level) {
  switch (level) {
    case 'high':    return { cssClass: 'badge-danger',  icon: '🔴', label: 'High' };
    case 'monitor': return { cssClass: 'badge-warning', icon: '🟡', label: 'Monitor' };
    default:        return { cssClass: 'badge-success', icon: '🟢', label: 'Normal' };
  }
}

/**
 * Calculate budget usage percentage
 * @param {number} used  - Amount spent
 * @param {number} total - Total budget
 * @returns {number} 0–100
 */
function getBudgetPercentage(used, total) {
  if (total === 0) return 0;
  return Math.round((used / total) * 100);
}

/**
 * Get progress bar color based on percentage used
 * @param {number} pct - Percentage 0–100
 * @returns {string} CSS class name
 */
function getBudgetColor(pct) {
  if (pct >= 80) return 'progress-red';
  if (pct >= 50) return 'progress-yellow';
  return 'progress-green';
}

/**
 * Truncate a string to a max length with ellipsis
 * @param {string} str - The string to truncate
 * @param {number} len - Max characters
 * @returns {string} "Hello wor..."
 */
function truncate(str, len) {
  if (!str) return '';
  if (str.length <= len) return str;
  return str.substring(0, len) + '...';
}

/**
 * Escape HTML special characters to prevent XSS
 * Always use this when injecting user data into innerHTML
 * @param {string} str - Raw string
 * @returns {string} Safe HTML string
 */
function escapeHtml(str) {
  if (!str) return '';
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

/**
 * Debounce a function call (e.g., search input)
 * @param {Function} fn   - Function to debounce
 * @param {number}   delay - Milliseconds to wait
 * @returns {Function} Debounced function
 */
function debounce(fn, delay) {
  var timer;
  return function () {
    var context = this;
    var args = arguments;
    clearTimeout(timer);
    timer = setTimeout(function () {
      fn.apply(context, args);
    }, delay);
  };
}

/**
 * Get today's date as ISO string "YYYY-MM-DD"
 * @returns {string}
 */
function getTodayISO() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get current timestamp as ISO string
 * @returns {string}
 */
function getNowISO() {
  return new Date().toISOString();
}
