/* ==============================================
 * toast.js
 * PURPOSE: Notification toast system. Shows brief
 * auto-dismissing messages at the top-right of
 * the screen. Supports success, error, warning,
 * and info types with corresponding colors/icons.
 *
 * CONTAINS:
 *  - showToast(message, type, duration)
 *    → Display a toast notification
 *  - Types: "success", "error", "warning", "info"
 *
 * USED BY: pages/*.js after form submissions, errors
 * DEPENDS ON: Nothing (standalone component)
 * ============================================== */

/**
 * Show a toast notification
 *
 * @param {string} message  - Text to display
 * @param {string} type     - "success" | "error" | "warning" | "info"
 * @param {number} duration - Auto-dismiss time in ms (default 3000)
 */
function showToast(message, type, duration) {
  type = type || 'info';
  duration = duration || 3000;

  // Ensure toast container exists
  var container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  // Icon per type
  var icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };

  // Create toast element
  var toast = document.createElement('div');
  toast.className = 'toast toast-' + type;

  toast.innerHTML =
    '<span class="toast-icon">' + (icons[type] || 'ℹ️') + '</span>' +
    '<span class="toast-message">' + escapeHtml(message) + '</span>' +
    '<button class="toast-close" onclick="this.parentElement.remove()">&times;</button>';

  container.appendChild(toast);

  // Trigger slide-in animation
  requestAnimationFrame(function () {
    toast.classList.add('show');
  });

  // Auto-dismiss
  setTimeout(function () {
    toast.classList.remove('show');
    setTimeout(function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, duration);
}
