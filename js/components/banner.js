/* ==============================================
 * banner.js
 * PURPOSE: Term warning banner system. Displays
 * colored banners at the top of the dashboard
 * based on how close the BM's term end date is.
 *
 * BANNER TYPES:
 *  - gentle  (90 days): Blue info — dismissible
 *  - warning (30 days): Yellow — shows pending counts
 *  - critical (7 days): Orange/red — finalize records
 *  - ended   (0 days):  Red — account locked, read-only
 *
 * CONTAINS:
 *  - renderTermBanner(containerId) → Show appropriate banner
 *
 * USED BY: dashboard.js
 * DEPENDS ON: auth.js (getCurrentBM, getTermWarningLevel)
 * ============================================== */

/**
 * Render the term warning banner if applicable.
 * Only shows for board_member role. SysAdmins and
 * Secretaries see a simplified info banner.
 *
 * @param {string} containerId - DOM element to inject banner into
 */
function renderTermBanner(containerId) {
  var container = document.getElementById(containerId);
  if (!container) return;

  var session = getSession();
  if (!session) return;

  // Only BMs get term banners
  if (session.role !== 'board_member') {
    container.innerHTML = '';
    return;
  }

  var bm = getCurrentBM();
  if (!bm) return;

  var level = getTermWarningLevel();
  if (!level) {
    container.innerHTML = '';
    return;
  }

  var days = getDaysUntil(bm.term_end);
  var html = '';

  switch (level) {
    case 'gentle':
      html = buildBanner(
        'info',
        'ℹ️ Your term ends in ' + days + ' days. Plan accordingly.',
        true, // dismissible
        null
      );
      break;

    case 'warning':
      var pendingFA = getFARecords().filter(function (r) {
        return r.bm_id === bm.bm_id && r.status === 'Ongoing';
      }).length;
      var pendingPA = getPARecords().filter(function (r) {
        return r.bm_id === bm.bm_id && !r.is_archived;
      }).length;

      html = buildBanner(
        'warning',
        '⚠️ Term ends in ' + days + ' days. Complete pending requests. ' +
        '<strong>' + pendingFA + ' pending FA, ' + pendingPA + ' PA records</strong>',
        false,
        '<a href="fa-list.html" class="btn btn-sm btn-warning">View Pending</a>'
      );
      break;

    case 'critical':
      html = buildBanner(
        'critical',
        '🔴 Term ends in ' + days + ' days. Finalize all records immediately.',
        false,
        '<a href="dashboard.html" class="btn btn-sm btn-danger">View Dashboard</a>'
      );
      break;

    case 'ended':
      html = buildBanner(
        'ended',
        '🔒 <strong>TERM ENDED</strong> — Account is now read-only. ' +
        'You can view and export records but cannot create or edit.',
        false,
        bm.archive_requested
          ? '<span class="badge badge-warning">Archive Pending</span>'
          : '<button class="btn btn-sm btn-danger" onclick="requestArchive()">Request Archive</button>'
      );
      break;
  }

  container.innerHTML = html;
}

/**
 * Build banner HTML string
 *
 * @param {string} type       - "info" | "warning" | "critical" | "ended"
 * @param {string} message    - Banner text (can include HTML)
 * @param {boolean} dismissible - Show dismiss button?
 * @param {string|null} action - HTML for action button/badge
 * @returns {string} HTML string
 */
function buildBanner(type, message, dismissible, action) {
  var classes = {
    info: 'banner-info',
    warning: 'banner-warning',
    critical: 'banner-critical',
    ended: 'banner-ended'
  };

  var html = '<div class="term-banner ' + (classes[type] || '') + '" id="termBanner">';
  html += '  <div class="banner-content">';
  html += '    <span class="banner-message">' + message + '</span>';
  if (action) {
    html += '    <span class="banner-actions">' + action + '</span>';
  }
  html += '  </div>';
  if (dismissible) {
    html += '  <button class="banner-dismiss" onclick="dismissBanner()">✕</button>';
  }
  html += '</div>';

  return html;
}

/**
 * Dismiss the term banner (only for gentle/info banners)
 */
function dismissBanner() {
  var banner = document.getElementById('termBanner');
  if (banner) {
    banner.style.opacity = '0';
    setTimeout(function () { banner.remove(); }, 300);
  }
}

/**
 * BM requests term archive — called from "ended" banner button
 */
function requestArchive() {
  var bm = getCurrentBM();
  if (!bm) return;

  var faCount = getFARecordsByBM(bm.bm_id).length;
  var paCount = getPARecordsByBM(bm.bm_id).length;
  var budget = getOrCreateBudgetLog(bm.bm_id);

  showConfirm({
    title: 'Confirm Archive Request',
    message:
      '<strong>You are about to archive:</strong><br><br>' +
      '• ' + escapeHtml(bm.district_name) + '<br>' +
      '• Term: ' + formatDate(bm.term_start) + ' – ' + formatDate(bm.term_end) + '<br>' +
      '• ' + faCount + ' FA records<br>' +
      '• ' + paCount + ' PA records<br>' +
      '• Remaining Budget: ' + formatCurrency(budget.remaining_amount) + '<br><br>' +
      '<strong>This will:</strong><br>' +
      '✓ Move records to permanent archive<br>' +
      '✓ Lock this term from further changes<br>' +
      '✓ Allow re-election with fresh start<br><br>' +
      '<em>⚠️ This action requires SysAdmin approval.</em>',
    confirmLabel: 'Send Archive Request',
    confirmClass: 'btn-danger',
    onConfirm: function () {
      updateBM(bm.bm_id, {
        archive_requested: true,
        archive_requested_at: getNowISO()
      });

      var session = getSession();
      addActivityLog(
        session.user_id,
        'Requested term archive for ' + bm.district_name,
        'archive_request',
        'board_member',
        bm.bm_id,
        'Term: ' + bm.term_start + ' to ' + bm.term_end
      );

      showToast('Archive request sent to SysAdmin. Pending approval.', 'success');
      renderTermBanner('bannerContainer');
    }
  });
}
