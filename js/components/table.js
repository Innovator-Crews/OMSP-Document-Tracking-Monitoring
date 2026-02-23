/* ==============================================
 * table.js
 * PURPOSE: Dynamic data table builder with sorting,
 * pagination, and responsive mobile stacking.
 * Generates HTML table from an array of objects
 * and column definitions.
 *
 * CONTAINS:
 *  - renderTable(options) → Build a full data table
 *
 * OPTIONS:
 *  - containerId: DOM element ID
 *  - columns: Array of { key, label, render?, sortable? }
 *  - data: Array of row objects
 *  - pageSize: Rows per page (default 10)
 *  - emptyMessage: Text when no data
 *  - onRowClick: Callback when row clicked
 *
 * USED BY: fa-list.js, pa-list.js, categories.js,
 *          search.js, admin-*.js
 * DEPENDS ON: utils.js (escapeHtml)
 * ============================================== */

/**
 * Render a dynamic data table with sorting and pagination
 *
 * @param {object} options - Table configuration
 */
function renderTable(options) {
  var container = document.getElementById(options.containerId);
  if (!container) return;

  var columns = options.columns || [];
  var data = options.data || [];
  var pageSize = options.pageSize || 10;
  var currentPage = options.currentPage || 1;
  var emptyMessage = options.emptyMessage || 'No records found';
  var sortKey = options.sortKey || null;
  var sortDir = options.sortDir || 'asc';

  // Sort data if sortKey specified
  if (sortKey) {
    data = data.slice().sort(function (a, b) {
      var aVal = a[sortKey] || '';
      var bVal = b[sortKey] || '';
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }

  // Pagination
  var totalPages = Math.ceil(data.length / pageSize) || 1;
  if (currentPage > totalPages) currentPage = totalPages;
  var startIdx = (currentPage - 1) * pageSize;
  var pageData = data.slice(startIdx, startIdx + pageSize);

  var html = '';

  // Toolbar
  html += '<div class="table-toolbar">';
  html += '  <div class="table-toolbar-left">';
  html += '    <span class="table-count">' + data.length + ' record' + (data.length !== 1 ? 's' : '') + '</span>';
  html += '  </div>';
  html += '  <div class="table-toolbar-right">';
  if (options.toolbarRight) html += options.toolbarRight;
  html += '  </div>';
  html += '</div>';

  if (data.length === 0) {
    // Empty state
    html += '<div class="empty-state">';
    html += '  <div class="empty-state-icon">📭</div>';
    html += '  <div class="empty-state-title">' + escapeHtml(emptyMessage) + '</div>';
    html += '  <div class="empty-state-text">Try adjusting your filters or adding new records.</div>';
    html += '</div>';
  } else {
    // Table
    html += '<table class="data-table">';

    // Header
    html += '<thead><tr>';
    columns.forEach(function (col) {
      var sortable = col.sortable !== false;
      var isSorted = sortKey === col.key;
      var arrow = isSorted ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ' ↕';
      html += '<th class="' + (isSorted ? 'sorted' : '') + '"';
      if (sortable && options.onSort) {
        html += ' onclick="' + options.onSort + '(\'' + col.key + '\')"';
      }
      html += '>';
      html += escapeHtml(col.label);
      if (sortable) html += '<span class="sort-icon">' + arrow + '</span>';
      html += '</th>';
    });
    html += '</tr></thead>';

    // Body
    html += '<tbody>';
    pageData.forEach(function (row, idx) {
      var rowClick = options.onRowClick ? ' onclick="' + options.onRowClick + '(\'' + (row.fa_id || row.pa_id || row.beneficiary_id || '') + '\')"' : '';
      html += '<tr' + rowClick + ' style="' + (options.onRowClick ? 'cursor:pointer' : '') + '">';
      columns.forEach(function (col) {
        var value = '';
        if (col.render) {
          value = col.render(row);
        } else {
          value = escapeHtml(String(row[col.key] || '—'));
        }
        html += '<td data-label="' + escapeHtml(col.label) + '">' + value + '</td>';
      });
      html += '</tr>';
    });
    html += '</tbody>';
    html += '</table>';

    // Pagination
    if (totalPages > 1) {
      html += '<div class="pagination">';
      html += '<button class="page-btn" ' + (currentPage === 1 ? 'disabled' : '') +
              ' onclick="' + (options.onPageChange || 'changePage') + '(' + (currentPage - 1) + ')">‹</button>';
      for (var p = 1; p <= totalPages; p++) {
        html += '<button class="page-btn ' + (p === currentPage ? 'active' : '') +
                '" onclick="' + (options.onPageChange || 'changePage') + '(' + p + ')">' + p + '</button>';
      }
      html += '<button class="page-btn" ' + (currentPage === totalPages ? 'disabled' : '') +
              ' onclick="' + (options.onPageChange || 'changePage') + '(' + (currentPage + 1) + ')">›</button>';
      html += '</div>';
    }
  }

  container.innerHTML = html;
}
