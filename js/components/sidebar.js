/* ==============================================
 * sidebar.js
 * PURPOSE: Builds the left navigation sidebar
 * dynamically based on the current user's role.
 * SysAdmin sees all menu items. Board Members see
 * their own sections. Secretaries see assigned BM
 * sections. Highlights the currently active page.
 *
 * CONTAINS:
 *  - renderSidebar(containerId) → Build & inject sidebar HTML
 *  - getSidebarItems(role)      → Get menu items for a role
 *  - highlightActiveLink()      → Mark current page link active
 *
 * USED BY: Every authenticated page calls renderSidebar()
 * DEPENDS ON: auth.js (getSession, getRoleLabel, logout)
 * ============================================== */

/**
 * Render the sidebar navigation into a container element.
 * Call this in every authenticated page's DOMContentLoaded.
 *
 * @param {string} containerId - ID of the DOM element to inject into
 */
function renderSidebar(containerId) {
  var container = document.getElementById(containerId);
  if (!container) return;

  var session = getSession();
  if (!session) return;

  var items = getSidebarItems(session.role);
  var initials = session.full_name.split(' ').map(function (n) { return n[0]; }).join('').toUpperCase();

  var html = '';

  // Brand header
  html += '<div class="sidebar-brand">';
  html += '  <div class="sidebar-brand-icon">🏛️</div>';
  html += '  <div>';
  html += '    <div class="sidebar-brand-text">OMSP</div>';
  html += '    <div class="sidebar-brand-sub">Bataan SP</div>';
  html += '  </div>';
  html += '</div>';

  // Navigation sections
  html += '<nav class="sidebar-nav">';

  items.forEach(function (section) {
    html += '<div class="sidebar-section">';
    html += '<div class="sidebar-section-title">' + escapeHtml(section.title) + '</div>';

    section.links.forEach(function (link) {
      html += '<a href="' + link.href + '" class="sidebar-link" data-page="' + link.page + '">';
      html += '  <span class="sidebar-link-icon">' + link.icon + '</span>';
      html += '  <span>' + escapeHtml(link.label) + '</span>';
      if (link.badge) {
        html += '  <span class="sidebar-link-badge">' + link.badge + '</span>';
      }
      html += '</a>';
    });

    html += '</div>';
  });

  html += '</nav>';

  // Footer with user info + logout
  html += '<div class="sidebar-footer">';
  html += '  <div class="sidebar-user">';
  html += '    <div class="avatar">' + initials + '</div>';
  html += '    <div class="sidebar-user-info">';
  html += '      <div class="sidebar-user-name">' + escapeHtml(session.full_name) + '</div>';
  html += '      <div class="sidebar-user-role">' + getRoleLabel(session.role) + '</div>';
  html += '    </div>';
  html += '    <button class="sidebar-logout" onclick="logout()" title="Logout">⏻</button>';
  html += '  </div>';
  html += '</div>';

  container.innerHTML = html;

  // Highlight active link
  highlightActiveLink();
}

/**
 * Get navigation menu items filtered by user role
 * @param {string} role - "sysadmin" | "board_member" | "secretary"
 * @returns {Array} Array of section objects with links
 */
function getSidebarItems(role) {
  var sections = [];

  // MAIN section — visible to all
  sections.push({
    title: 'Main',
    links: [
      { icon: '📊', label: 'Dashboard', href: 'dashboard.html', page: 'dashboard' },
      { icon: '🔍', label: 'Global Search', href: 'search.html', page: 'search' }
    ]
  });

  // FINANCIAL ASSISTANCE — visible to all roles
  sections.push({
    title: 'Financial Assistance',
    links: [
      { icon: '📋', label: 'FA Records', href: 'fa-list.html', page: 'fa-list' },
      { icon: '➕', label: 'New FA Request', href: 'fa-create.html', page: 'fa-create' }
    ]
  });

  // PERSONAL ASSISTANCE — visible to all roles
  sections.push({
    title: 'Personal Assistance',
    links: [
      { icon: '📝', label: 'PA Records', href: 'pa-list.html', page: 'pa-list' },
      { icon: '➕', label: 'New PA Request', href: 'pa-create.html', page: 'pa-create' }
    ]
  });

  // ADMINISTRATION — varies by role
  if (role === 'sysadmin') {
    // Check for pending archives
    var pendingArchives = getBMs().filter(function (b) { return b.archive_requested && !b.is_archived; }).length;

    sections.push({
      title: 'Administration',
      links: [
        { icon: '🏷️', label: 'Categories', href: 'categories.html', page: 'categories' },
        { icon: '👥', label: 'Manage Users', href: 'admin-users.html', page: 'admin-users' },
        { icon: '🗂️', label: 'Term Archives', href: 'admin-archives.html', page: 'admin-archives', badge: pendingArchives > 0 ? pendingArchives : null },
        { icon: '📜', label: 'Activity Logs', href: 'admin-logs.html', page: 'admin-logs' }
      ]
    });
  } else if (role === 'secretary') {
    sections.push({
      title: 'Administration',
      links: [
        { icon: '🏷️', label: 'Categories', href: 'categories.html', page: 'categories' },
        { icon: '📜', label: 'Activity Logs', href: 'admin-logs.html', page: 'admin-logs' }
      ]
    });
  } else if (role === 'board_member') {
    sections.push({
      title: 'My Account',
      links: [
        { icon: '📜', label: 'Activity Logs', href: 'admin-logs.html', page: 'admin-logs' }
      ]
    });
  }

  // Remove "New FA/PA Request" links if term ended
  if (role === 'board_member' && isTermReadOnly()) {
    sections = sections.map(function (s) {
      s.links = s.links.filter(function (l) {
        return l.page !== 'fa-create' && l.page !== 'pa-create';
      });
      return s;
    });
  }

  return sections;
}

/**
 * Highlight the sidebar link matching the current page
 */
function highlightActiveLink() {
  var currentPage = window.location.pathname.split('/').pop().replace('.html', '') || 'index';
  var links = document.querySelectorAll('.sidebar-link');
  links.forEach(function (link) {
    if (link.getAttribute('data-page') === currentPage) {
      link.classList.add('active');
    }
  });
}
