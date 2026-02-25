/**
 * ============================================================
 * OMSP Document Tracking / Monitoring
 * Notifications Module - Toast system & alerts
 * ============================================================
 */

const Notifications = {
  container: null,
  autoCloseDelay: 4000,

  /**
   * Initialize the toast container
   */
  init() {
    if (this.container) return;
    this.container = document.createElement('div');
    this.container.className = 'toast-container';
    this.container.setAttribute('aria-live', 'polite');
    this.container.setAttribute('aria-label', 'Notifications');
    document.body.appendChild(this.container);
  },

  /**
   * Show a toast notification
   * @param {string} message - Toast message
   * @param {string} type - 'success' | 'error' | 'warning' | 'info'
   * @param {Object} options - { title, duration, persistent, action }
   */
  toast(message, type = 'info', options = {}) {
    this.init();

    const {
      title = this.getDefaultTitle(type),
      duration = this.autoCloseDelay,
      persistent = false,
      action = null
    } = options;

    const icons = {
      success: `<svg width="20" height="20" fill="none" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16z" fill="#10B981"/><path d="M6.5 10l2.5 2.5 5-5" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
      error: `<svg width="20" height="20" fill="none" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16z" fill="#EF4444"/><path d="M13 7l-6 6M7 7l6 6" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>`,
      warning: `<svg width="20" height="20" fill="none" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16z" fill="#F59E0B"/><path d="M10 7v3M10 13h.01" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>`,
      info: `<svg width="20" height="20" fill="none" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16z" fill="#3B82F6"/><path d="M10 9v4M10 7h.01" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>`
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
      <div class="toast-icon">${icons[type] || icons.info}</div>
      <div class="toast-content">
        ${title ? `<div class="toast-title">${Utils.escapeHtml(title)}</div>` : ''}
        <div class="toast-message">${Utils.escapeHtml(message)}</div>
        ${action ? `<button class="toast-action" data-action="true">${Utils.escapeHtml(action.label)}</button>` : ''}
      </div>
      <button class="toast-close" aria-label="Dismiss notification">&times;</button>
    `;

    // Close button handler
    toast.querySelector('.toast-close').addEventListener('click', () => {
      this.dismissToast(toast);
    });

    // Action button handler
    if (action && action.handler) {
      const actionBtn = toast.querySelector('.toast-action');
      if (actionBtn) {
        actionBtn.addEventListener('click', () => {
          action.handler();
          this.dismissToast(toast);
        });
      }
    }

    this.container.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => toast.classList.add('toast-visible'));

    // Auto-dismiss
    if (!persistent) {
      toast._timeout = setTimeout(() => this.dismissToast(toast), duration);
    }

    // Pause on hover
    toast.addEventListener('mouseenter', () => {
      if (toast._timeout) clearTimeout(toast._timeout);
    });
    toast.addEventListener('mouseleave', () => {
      if (!persistent) {
        toast._timeout = setTimeout(() => this.dismissToast(toast), 2000);
      }
    });

    return toast;
  },

  /**
   * Dismiss a toast with animation
   * @param {Element} toast
   */
  dismissToast(toast) {
    if (!toast || !toast.parentNode) return;
    if (toast._timeout) clearTimeout(toast._timeout);
    toast.classList.add('toast-exit');
    toast.addEventListener('animationend', () => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    });
  },

  /**
   * Clear all toasts
   */
  clearAll() {
    if (!this.container) return;
    const toasts = this.container.querySelectorAll('.toast');
    toasts.forEach(t => this.dismissToast(t));
  },

  /**
   * Get default title for toast type
   * @param {string} type
   * @returns {string}
   */
  getDefaultTitle(type) {
    const titles = {
      success: 'Success',
      error: 'Error',
      warning: 'Warning',
      info: 'Info'
    };
    return titles[type] || '';
  },

  /* --------------------------------------------------------
   * CONVENIENCE METHODS
   * -------------------------------------------------------- */

  success(message, options = {}) {
    return this.toast(message, 'success', options);
  },

  error(message, options = {}) {
    return this.toast(message, 'error', options);
  },

  warning(message, options = {}) {
    return this.toast(message, 'warning', options);
  },

  info(message, options = {}) {
    return this.toast(message, 'info', options);
  },

  /* --------------------------------------------------------
   * CONFIRMATION DIALOG
   * -------------------------------------------------------- */

  /**
   * Show a confirmation modal
   * @param {Object} config - { title, message, confirmText, cancelText, type, onConfirm, onCancel }
   * @returns {Promise<boolean>}
   */
  confirm(config = {}) {
    const {
      title = 'Confirm Action',
      message = 'Are you sure you want to proceed?',
      confirmText = 'Confirm',
      cancelText = 'Cancel',
      type = 'warning',
      onConfirm = null,
      onCancel = null
    } = config;

    return new Promise((resolve) => {
      // Create modal overlay
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay active';
      overlay.innerHTML = `
        <div class="modal modal-sm animate-fade-in">
          <div class="modal-header">
            <h3 class="modal-title">${Utils.escapeHtml(title)}</h3>
          </div>
          <div class="modal-body">
            <p>${Utils.escapeHtml(message)}</p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" data-action="cancel">${Utils.escapeHtml(cancelText)}</button>
            <button class="btn btn-${type === 'danger' ? 'danger' : 'primary'}" data-action="confirm">${Utils.escapeHtml(confirmText)}</button>
          </div>
        </div>
      `;

      const close = (result) => {
        overlay.classList.remove('active');
        setTimeout(() => overlay.remove(), 200);
        if (result && onConfirm) onConfirm();
        if (!result && onCancel) onCancel();
        resolve(result);
      };

      overlay.querySelector('[data-action="confirm"]').addEventListener('click', () => close(true));
      overlay.querySelector('[data-action="cancel"]').addEventListener('click', () => close(false));
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close(false);
      });

      // Escape key to cancel
      const escHandler = (e) => {
        if (e.key === 'Escape') {
          close(false);
          document.removeEventListener('keydown', escHandler);
        }
      };
      document.addEventListener('keydown', escHandler);

      document.body.appendChild(overlay);

      // Focus confirm button
      overlay.querySelector('[data-action="confirm"]').focus();
    });
  },

  /* --------------------------------------------------------
   * INLINE ALERTS / BANNERS
   * -------------------------------------------------------- */

  /**
   * Show an inline banner in a container
   * @param {string|Element} container - Selector or element
   * @param {string} message
   * @param {string} type - 'info' | 'warning' | 'critical' | 'danger' | 'success'
   * @param {Object} options - { dismissible, icon }
   */
  showBanner(container, message, type = 'info', options = {}) {
    const el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) return;

    const { dismissible = true } = options;

    const banner = document.createElement('div');
    banner.className = `banner banner-${type}`;
    banner.innerHTML = `
      <div class="banner-content">
        <span class="banner-message">${message}</span>
      </div>
      ${dismissible ? '<button class="banner-close">&times;</button>' : ''}
    `;

    if (dismissible) {
      banner.querySelector('.banner-close').addEventListener('click', () => {
        banner.remove();
      });
    }

    el.prepend(banner);
    return banner;
  }
};
