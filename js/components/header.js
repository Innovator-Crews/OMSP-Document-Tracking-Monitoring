/* ==============================================
 * header.js
 * PURPOSE: Builds the top header bar shown on
 * every authenticated page. Contains the page
 * title, breadcrumb, search input, and mobile
 * hamburger toggle for the sidebar.
 *
 * CONTAINS:
 *  - renderHeader(containerId, title, breadcrumb)
 *    → Inject header HTML with title & search
 *  - setupMobileToggle()
 *    → Wire up hamburger menu for responsive
 *
 * USED BY: Every authenticated page
 * DEPENDS ON: auth.js (getSession)
 * ============================================== */

/**
 * Render the header bar into a container element
 *
 * @param {string} containerId - DOM element ID to inject into
 * @param {string} title       - Page title text (e.g., "Dashboard")
 * @param {string} breadcrumb  - Breadcrumb path (e.g., "Home / Dashboard")
 */
function renderHeader(containerId, title, breadcrumb) {
  var container = document.getElementById(containerId);
  if (!container) return;

  var html = '';

  // Left side: mobile toggle + title
  html += '<div class="header-left">';
  html += '  <button class="mobile-toggle" onclick="toggleSidebar()" aria-label="Toggle Menu">☰</button>';
  html += '  <div>';
  html += '    <div class="header-title">' + escapeHtml(title || '') + '</div>';
  if (breadcrumb) {
    html += '    <div class="header-breadcrumb">' + escapeHtml(breadcrumb) + '</div>';
  }
  html += '  </div>';
  html += '</div>';

  // Right side: search + actions
  html += '<div class="header-right">';
  html += '  <div class="header-search">';
  html += '    <span class="header-search-icon">🔍</span>';
  html += '    <input type="text" placeholder="Quick search..." id="headerSearch" onkeydown="handleHeaderSearch(event)">';
  html += '  </div>';
  html += '</div>';

  container.innerHTML = html;
}

/**
 * Toggle sidebar visibility on mobile screens
 */
function toggleSidebar() {
  var sidebar = document.querySelector('.sidebar');
  var overlay = document.querySelector('.sidebar-overlay');
  if (sidebar) sidebar.classList.toggle('open');
  if (overlay) overlay.classList.toggle('open');
}

/**
 * Handle Enter key in header search bar
 * Redirects to search page with query parameter
 */
function handleHeaderSearch(event) {
  if (event.key === 'Enter') {
    var query = event.target.value.trim();
    if (query) {
      window.location.href = 'search.html?q=' + encodeURIComponent(query);
    }
  }
}
