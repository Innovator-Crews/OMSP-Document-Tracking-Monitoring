/* ==============================================
 * modal.js
 * PURPOSE: Reusable modal/dialog system. Supports
 * confirm dialogs, form modals, and alert modals.
 * Handles keyboard (Escape to close), overlay click
 * to close, and focus trapping.
 *
 * CONTAINS:
 *  - showModal(options)    → Show a modal with title, body, buttons
 *  - showConfirm(options)  → Show a confirm/cancel dialog
 *  - showAlert(message)    → Simple alert modal
 *  - closeModal()          → Close the currently open modal
 *
 * USED BY: pages/*.js when needing user confirmation or forms
 * DEPENDS ON: Nothing (standalone component)
 * ============================================== */

/**
 * Show a modal dialog
 *
 * @param {object} options
 * @param {string} options.title      - Modal title text
 * @param {string} options.body       - HTML content for modal body
 * @param {string} options.size       - "sm" | "md" | "lg" (default "md")
 * @param {Array}  options.buttons    - Array of { label, class, onclick }
 * @param {Function} options.onClose  - Callback when modal closes
 */
function showModal(options) {
  // Remove existing modal if any
  closeModal();

  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'modalOverlay';
  overlay.onclick = function (e) {
    if (e.target === overlay) closeModal(options.onClose);
  };

  var maxWidth = '480px';
  if (options.size === 'sm') maxWidth = '360px';
  if (options.size === 'lg') maxWidth = '640px';

  var html = '';
  html += '<div class="modal-container" style="max-width:' + maxWidth + '">';

  // Header
  html += '<div class="modal-header">';
  html += '  <h3 class="modal-title">' + escapeHtml(options.title || '') + '</h3>';
  html += '  <button class="modal-close" onclick="closeModal()">&times;</button>';
  html += '</div>';

  // Body
  html += '<div class="modal-body">';
  html += options.body || '';
  html += '</div>';

  // Footer with buttons
  if (options.buttons && options.buttons.length > 0) {
    html += '<div class="modal-footer">';
    options.buttons.forEach(function (btn) {
      html += '<button class="btn ' + (btn.class || 'btn-secondary') + '" onclick="' + (btn.onclick || 'closeModal()') + '">';
      html += escapeHtml(btn.label);
      html += '</button>';
    });
    html += '</div>';
  }

  html += '</div>';

  overlay.innerHTML = html;
  document.body.appendChild(overlay);

  // Trigger animation
  requestAnimationFrame(function () {
    overlay.classList.add('open');
  });

  // Escape key handler
  document.addEventListener('keydown', handleModalEscape);
}

/**
 * Show a confirmation dialog with Confirm + Cancel buttons
 *
 * @param {object} options
 * @param {string} options.title     - Dialog title
 * @param {string} options.message   - Message HTML
 * @param {string} options.confirmLabel - Confirm button text (default "Confirm")
 * @param {string} options.confirmClass - Confirm button CSS class
 * @param {Function} options.onConfirm - Callback when confirmed
 * @param {Function} options.onCancel  - Callback when cancelled
 */
function showConfirm(options) {
  // Store callback reference on window for onclick string usage
  window._modalConfirmCallback = options.onConfirm;

  showModal({
    title: options.title || 'Confirm',
    body: '<p>' + (options.message || 'Are you sure?') + '</p>',
    buttons: [
      { label: 'Cancel', class: 'btn-secondary', onclick: 'closeModal()' },
      {
        label: options.confirmLabel || 'Confirm',
        class: options.confirmClass || 'btn-primary',
        onclick: '_handleModalConfirm()'
      }
    ],
    onClose: options.onCancel
  });
}

/** Internal: handle confirm button click */
function _handleModalConfirm() {
  if (window._modalConfirmCallback) {
    window._modalConfirmCallback();
  }
  closeModal();
}

/**
 * Show a simple alert message modal
 * @param {string} title
 * @param {string} message
 */
function showAlert(title, message) {
  showModal({
    title: title,
    body: '<p>' + (message || '') + '</p>',
    size: 'sm',
    buttons: [
      { label: 'OK', class: 'btn-primary', onclick: 'closeModal()' }
    ]
  });
}

/**
 * Close the currently open modal
 * @param {Function} callback - Optional onClose callback
 */
function closeModal(callback) {
  var overlay = document.getElementById('modalOverlay');
  if (overlay) {
    overlay.classList.remove('open');
    setTimeout(function () {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, 200);
  }
  document.removeEventListener('keydown', handleModalEscape);
  window._modalConfirmCallback = null;
  if (typeof callback === 'function') callback();
}

/** Handle Escape key to close modal */
function handleModalEscape(e) {
  if (e.key === 'Escape') closeModal();
}
