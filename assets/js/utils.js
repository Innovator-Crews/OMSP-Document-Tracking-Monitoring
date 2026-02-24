/**
 * ============================================================
 * OMSP Document Tracking / Monitoring
 * Utility Functions - Formatters, helpers, and common utilities
 * ============================================================
 */

const Utils = {
  /* --------------------------------------------------------
   * DATE FORMATTING
   * -------------------------------------------------------- */

  /**
   * Format ISO date string to readable format
   * @param {string} dateStr - ISO date string
   * @param {string} format - 'short', 'long', 'datetime', 'time'
   * @returns {string} Formatted date
   */
  formatDate(dateStr, format = 'short') {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '—';

    const options = {
      short: { year: 'numeric', month: 'short', day: 'numeric' },
      long: { year: 'numeric', month: 'long', day: 'numeric' },
      datetime: { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' },
      time: { hour: '2-digit', minute: '2-digit' },
      input: null
    };

    if (format === 'input') {
      return date.toISOString().split('T')[0];
    }

    return date.toLocaleDateString('en-PH', options[format] || options.short);
  },

  /**
   * Get relative time string (e.g., "2 hours ago")
   * @param {string} dateStr - ISO date string
   * @returns {string} Relative time
   */
  formatRelativeTime(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    if (weeks < 5) return `${weeks}w ago`;
    return `${months}mo ago`;
  },

  /**
   * Get current year-month string "YYYY-MM"
   * @returns {string}
   */
  getCurrentYearMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  },

  /**
   * Get previous year-month from a YYYY-MM string
   * @param {string} yearMonth - "YYYY-MM"
   * @returns {string} Previous month
   */
  getPreviousYearMonth(yearMonth) {
    const [year, month] = yearMonth.split('-').map(Number);
    if (month === 1) return `${year - 1}-12`;
    return `${year}-${String(month - 1).padStart(2, '0')}`;
  },

  /**
   * Add months to a date
   * @param {Date} date - Base date
   * @param {number} months - Months to add
   * @returns {string} ISO date string
   */
  addMonths(date, months) {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d.toISOString();
  },

  /**
   * Check if a date is in the past
   * @param {string} dateStr - ISO date string
   * @returns {boolean}
   */
  isPast(dateStr) {
    if (!dateStr) return true;
    return new Date(dateStr) < new Date();
  },

  /**
   * Get days remaining until a date
   * @param {string} dateStr - Target date
   * @returns {number} Days remaining (negative if past)
   */
  daysUntil(dateStr) {
    if (!dateStr) return 0;
    const target = new Date(dateStr);
    const now = new Date();
    return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
  },

  /**
   * Format month name from YYYY-MM
   * @param {string} yearMonth - "YYYY-MM"
   * @returns {string} e.g., "January 2025"
   */
  formatMonth(yearMonth) {
    if (!yearMonth) return '—';
    const [year, month] = yearMonth.split('-');
    const date = new Date(year, parseInt(month) - 1);
    return date.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
  },

  /* --------------------------------------------------------
   * CURRENCY FORMATTING
   * -------------------------------------------------------- */

  /**
   * Format number as Philippine Peso currency
   * @param {number} amount - Amount
   * @param {boolean} showSymbol - Show ₱ symbol
   * @returns {string} Formatted currency
   */
  formatCurrency(amount, showSymbol = true) {
    if (amount === null || amount === undefined) return '—';
    const num = parseFloat(amount);
    if (isNaN(num)) return '—';
    const formatted = num.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return showSymbol ? `₱${formatted}` : formatted;
  },

  /**
   * Parse currency string to number
   * @param {string} str - Currency string (may include ₱ and commas)
   * @returns {number}
   */
  parseCurrency(str) {
    if (!str) return 0;
    return parseFloat(String(str).replace(/[₱,\s]/g, '')) || 0;
  },

  /* --------------------------------------------------------
   * STRING UTILITIES
   * -------------------------------------------------------- */

  /**
   * Generate a unique ID
   * @param {string} prefix - Optional prefix
   * @returns {string}
   */
  generateId(prefix = 'id') {
    return Storage.generateId(prefix);
  },

  /**
   * Escape HTML to prevent XSS
   * @param {string} str - Raw string
   * @returns {string} Escaped string
   */
  escapeHtml(str) {
    if (!str) return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(str).replace(/[&<>"']/g, c => map[c]);
  },

  /**
   * Truncate text with ellipsis
   * @param {string} str - Text to truncate
   * @param {number} maxLength - Maximum length
   * @returns {string}
   */
  truncate(str, maxLength = 50) {
    if (!str || str.length <= maxLength) return str || '';
    return str.substring(0, maxLength) + '…';
  },

  /**
   * Get initials from a full name
   * @param {string} name - Full name
   * @returns {string} Initials (e.g., "JD")
   */
  getInitials(name) {
    if (!name) return '??';
    return name
      .split(' ')
      .filter(Boolean)
      .map(w => w[0].toUpperCase())
      .slice(0, 2)
      .join('');
  },

  /**
   * Capitalize first letter
   * @param {string} str
   * @returns {string}
   */
  capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  },

  /**
   * Convert string to title case
   * @param {string} str
   * @returns {string}
   */
  titleCase(str) {
    if (!str) return '';
    return str.split(' ').map(w => this.capitalize(w)).join(' ');
  },

  /**
   * Slugify a string
   * @param {string} str
   * @returns {string}
   */
  slugify(str) {
    if (!str) return '';
    return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  },

  /* --------------------------------------------------------
   * NUMBER UTILITIES
   * -------------------------------------------------------- */

  /**
   * Clamp a number between min and max
   * @param {number} num
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  clamp(num, min, max) {
    return Math.min(Math.max(num, min), max);
  },

  /**
   * Calculate percentage
   * @param {number} part
   * @param {number} total
   * @returns {number}
   */
  percentage(part, total) {
    if (!total) return 0;
    return Math.round((part / total) * 100);
  },

  /* --------------------------------------------------------
   * GENERAL HELPERS
   * -------------------------------------------------------- */

  /**
   * Deep clone an object
   * @param {any} obj
   * @returns {any}
   */
  deepClone(obj) {
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch {
      return obj;
    }
  },

  /**
   * Debounce a function
   * @param {Function} fn - Function to debounce
   * @param {number} delay - Delay in ms
   * @returns {Function}
   */
  debounce(fn, delay = 300) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  },

  /**
   * Throttle a function
   * @param {Function} fn - Function to throttle
   * @param {number} limit - Minimum interval in ms
   * @returns {Function}
   */
  throttle(fn, limit = 300) {
    let inThrottle;
    return function (...args) {
      if (!inThrottle) {
        fn.apply(this, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  },

  /**
   * Wait for a specified time
   * @param {number} ms - Milliseconds
   * @returns {Promise}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * Get ordinal suffix for a number (1st, 2nd, 3rd, etc.)
   * @param {number} num
   * @returns {string}
   */
  ordinal(num) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = num % 100;
    return num + (s[(v - 20) % 10] || s[v] || s[0]);
  },

  /* --------------------------------------------------------
   * DOM HELPERS
   * -------------------------------------------------------- */

  /**
   * Shorthand for document.querySelector
   * @param {string} selector
   * @param {Element} context
   * @returns {Element|null}
   */
  $(selector, context = document) {
    return context.querySelector(selector);
  },

  /**
   * Shorthand for document.querySelectorAll (returns array)
   * @param {string} selector
   * @param {Element} context
   * @returns {Element[]}
   */
  $$(selector, context = document) {
    return Array.from(context.querySelectorAll(selector));
  },

  /**
   * Create an HTML element from string
   * @param {string} html
   * @returns {Element}
   */
  createElement(html) {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.firstElementChild;
  },

  /**
   * Empty all children of an element
   * @param {Element} el
   */
  emptyElement(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
  },

  /**
   * Show/hide an element
   * @param {Element|string} el - Element or selector
   * @param {boolean} visible
   */
  toggleVisibility(el, visible) {
    const element = typeof el === 'string' ? this.$(el) : el;
    if (!element) return;
    element.style.display = visible ? '' : 'none';
  },

  /**
   * Set loading state on a button
   * @param {Element} btn - Button element
   * @param {boolean} loading
   */
  setButtonLoading(btn, loading) {
    if (!btn) return;
    btn.classList.toggle('btn-loading', loading);
    btn.disabled = loading;
    if (loading) {
      btn.dataset.originalText = btn.textContent;
      btn.textContent = 'Processing...';
    } else {
      btn.textContent = btn.dataset.originalText || btn.textContent;
    }
  },

  /* --------------------------------------------------------
   * ROLE / PERMISSION LABELS
   * -------------------------------------------------------- */

  /**
   * Get human-readable role label
   * @param {string} role
   * @returns {string}
   */
  getRoleLabel(role) {
    const labels = {
      sysadmin: 'System Admin',
      board_member: 'Board Member',
      secretary: 'Secretary'
    };
    return labels[role] || role;
  },

  /**
   * Get status badge class
   * @param {string} status
   * @returns {string} CSS class suffix
   */
  getStatusClass(status) {
    const map = {
      'Ongoing': 'ongoing',
      'Successful': 'successful',
      'Denied': 'denied',
      'Archived': 'archived',
      'Pending': 'pending'
    };
    return map[status] || 'neutral';
  },

  /**
   * Get frequency level badge class
   * @param {string} level
   * @returns {string} CSS class
   */
  getFrequencyClass(level) {
    const map = {
      normal: 'badge-freq-normal',
      monitor: 'badge-freq-monitor',
      high: 'badge-freq-high'
    };
    return map[level] || 'badge-freq-normal';
  },

  /* --------------------------------------------------------
   * URL & NAVIGATION
   * -------------------------------------------------------- */

  /**
   * Get query parameter from current URL
   * @param {string} name
   * @returns {string|null}
   */
  getUrlParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  },

  /**
   * Build URL with query parameters
   * @param {string} base - Base URL
   * @param {Object} params - Query parameters
   * @returns {string}
   */
  buildUrl(base, params = {}) {
    const url = new URL(base, window.location.origin);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        url.searchParams.set(k, v);
      }
    });
    return url.toString();
  },

  /**
   * Get the base path for navigation based on current page depth
   * @returns {string}
   */
  getBasePath() {
    const path = window.location.pathname;
    // If in subfolders like /sysadmin/, /boardmember/, /staff/, /pages/
    if (path.includes('/sysadmin/') || path.includes('/boardmember/') || path.includes('/staff/') || path.includes('/pages/')) {
      return '../';
    }
    return './';
  },

  /* --------------------------------------------------------
   * PAGINATION HELPER
   * -------------------------------------------------------- */

  /**
   * Create a paginated result from an array
   * @param {Array} items - Full data array
   * @param {number} page - Current page (1-indexed)
   * @param {number} pageSize - Items per page
   * @returns {{ data: Array, page: number, pageSize: number, totalItems: number, totalPages: number, hasNext: boolean, hasPrev: boolean }}
   */
  paginate(items, page = 1, pageSize = 10) {
    const totalItems = items.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const currentPage = this.clamp(page, 1, totalPages);
    const start = (currentPage - 1) * pageSize;
    const data = items.slice(start, start + pageSize);
    return {
      data,
      page: currentPage,
      pageSize,
      totalItems,
      totalPages,
      hasNext: currentPage < totalPages,
      hasPrev: currentPage > 1
    };
  },

  /**
   * Render pagination controls HTML
   * @param {Object} paginationResult - Result from Utils.paginate()
   * @param {string} callbackFn - Name of the global function to call on page change
   * @returns {string} HTML string
   */
  renderPagination(paginationResult, callbackFn) {
    const { page, totalPages, totalItems, pageSize, hasNext, hasPrev } = paginationResult;
    if (totalPages <= 1) return '';

    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, totalItems);

    let buttons = '';

    // Prev button
    buttons += `<button class="pagination-btn" ${!hasPrev ? 'disabled' : ''} onclick="${callbackFn}(${page - 1})">&laquo;</button>`;

    // Page numbers (show max 5 around current)
    const startPage = Math.max(1, page - 2);
    const endPage = Math.min(totalPages, page + 2);

    if (startPage > 1) {
      buttons += `<button class="pagination-btn" onclick="${callbackFn}(1)">1</button>`;
      if (startPage > 2) buttons += `<span class="pagination-ellipsis">…</span>`;
    }

    for (let i = startPage; i <= endPage; i++) {
      buttons += `<button class="pagination-btn ${i === page ? 'active' : ''}" onclick="${callbackFn}(${i})">${i}</button>`;
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) buttons += `<span class="pagination-ellipsis">…</span>`;
      buttons += `<button class="pagination-btn" onclick="${callbackFn}(${totalPages})">${totalPages}</button>`;
    }

    // Next button
    buttons += `<button class="pagination-btn" ${!hasNext ? 'disabled' : ''} onclick="${callbackFn}(${page + 1})">&raquo;</button>`;

    return `
      <div class="pagination">
        <span>Showing ${start}–${end} of ${totalItems}</span>
        <div class="pagination-buttons">${buttons}</div>
      </div>
    `;
  },

  /**
   * Render an empty state with icon, title and description
   * @param {string} icon - Icon name from Icons module
   * @param {string} title - Empty state title
   * @param {string} description - Description text
   * @param {string} actionHtml - Optional action button HTML
   * @returns {string} HTML string
   */
  renderEmptyState(icon, title, description, actionHtml = '') {
    const iconHtml = typeof Icons !== 'undefined' ? Icons.render(icon, 48) : '';
    return `
      <div class="empty-state">
        <div class="empty-state-icon">${iconHtml}</div>
        <h3 class="empty-state-title">${title}</h3>
        <p class="empty-state-text">${description}</p>
        ${actionHtml}
      </div>
    `;
  }
};
