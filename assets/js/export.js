/**
 * ============================================================
 * OMSP Document Tracking / Monitoring
 * Export Module - CSV export & print utilities
 * ============================================================
 */

const ExportUtils = {
  /**
   * Export data array to CSV and trigger download
   * @param {Array<Object>} data - Array of objects to export
   * @param {string} filename - Output filename (without .csv)
   * @param {Object} options - { columns, headers, transform }
   */
  toCSV(data, filename = 'export', options = {}) {
    if (!data || data.length === 0) {
      Notifications.warning('No data to export.');
      return;
    }

    const {
      columns = null,
      headers = null,
      transform = null
    } = options;

    // Determine columns
    const cols = columns || Object.keys(data[0]);

    // Build CSV header row
    const headerRow = headers
      ? cols.map((col, i) => this.escapeCSV(headers[i] || col))
      : cols.map(col => this.escapeCSV(this.headerize(col)));

    // Build data rows
    const rows = data.map(item => {
      return cols.map(col => {
        let val = item[col];
        if (transform && transform[col]) {
          val = transform[col](val, item);
        }
        return this.escapeCSV(val);
      }).join(',');
    });

    // Combine
    const csv = [headerRow.join(','), ...rows].join('\n');

    // Add BOM for Excel compatibility
    const bom = '\uFEFF';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });

    this.downloadBlob(blob, `${filename}.csv`);

    Notifications.success(`Exported ${data.length} records to ${filename}.csv`);
  },

  /**
   * Export table element to CSV
   * @param {string|Element} tableSelector - Table element or selector
   * @param {string} filename - Output filename
   */
  tableToCSV(tableSelector, filename = 'table-export') {
    const table = typeof tableSelector === 'string'
      ? document.querySelector(tableSelector)
      : tableSelector;

    if (!table) {
      Notifications.error('Table not found.');
      return;
    }

    const rows = [];

    // Header
    const headerCells = table.querySelectorAll('thead th');
    if (headerCells.length) {
      rows.push(Array.from(headerCells).map(th => this.escapeCSV(th.textContent.trim())).join(','));
    }

    // Body
    table.querySelectorAll('tbody tr').forEach(tr => {
      const cells = tr.querySelectorAll('td');
      rows.push(Array.from(cells).map(td => this.escapeCSV(td.textContent.trim())).join(','));
    });

    const csv = rows.join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    this.downloadBlob(blob, `${filename}.csv`);

    Notifications.success(`Table exported to ${filename}.csv`);
  },

  /**
   * Generate a printable report view
   * @param {Object} config - { title, subtitle, data, columns, headers, summary }
   */
  printReport(config) {
    const {
      title = 'Report',
      subtitle = '',
      data = [],
      columns = [],
      headers = [],
      summary = null
    } = config;

    const cols = columns.length ? columns : (data.length ? Object.keys(data[0]) : []);
    const heads = headers.length ? headers : cols.map(c => this.headerize(c));

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${Utils.escapeHtml(title)}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Inter', Arial, sans-serif; font-size: 12px; color: #1e293b; padding: 20px; }
          .report-header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #1d4ed8; padding-bottom: 16px; }
          .report-header h1 { font-size: 18px; color: #1d4ed8; margin-bottom: 4px; }
          .report-header p { font-size: 12px; color: #64748b; }
          .report-meta { display: flex; justify-content: space-between; margin-bottom: 16px; font-size: 11px; color: #64748b; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
          th { background: #f1f5f9; color: #1e293b; font-weight: 600; text-align: left; padding: 8px 12px; border: 1px solid #e2e8f0; font-size: 11px; }
          td { padding: 6px 12px; border: 1px solid #e2e8f0; font-size: 11px; }
          tr:nth-child(even) { background: #f8fafc; }
          .summary { margin-top: 16px; padding: 12px; background: #f1f5f9; border-radius: 4px; }
          .summary-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
          .summary-label { font-weight: 600; }
          .footer { margin-top: 24px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="report-header">
          <h1>OMSP - ${Utils.escapeHtml(title)}</h1>
          ${subtitle ? `<p>${Utils.escapeHtml(subtitle)}</p>` : ''}
        </div>
        <div class="report-meta">
          <span>Generated: ${new Date().toLocaleString('en-PH')}</span>
          <span>Total Records: ${data.length}</span>
        </div>
        <table>
          <thead>
            <tr>${heads.map(h => `<th>${Utils.escapeHtml(h)}</th>`).join('')}</tr>
          </thead>
          <tbody>
    `;

    data.forEach(item => {
      html += '<tr>';
      cols.forEach(col => {
        const val = item[col] !== undefined && item[col] !== null ? item[col] : '—';
        html += `<td>${Utils.escapeHtml(String(val))}</td>`;
      });
      html += '</tr>';
    });

    html += '</tbody></table>';

    if (summary) {
      html += '<div class="summary">';
      Object.entries(summary).forEach(([label, value]) => {
        html += `<div class="summary-row"><span class="summary-label">${Utils.escapeHtml(label)}:</span><span>${Utils.escapeHtml(String(value))}</span></div>`;
      });
      html += '</div>';
    }

    html += `
        <div class="footer">
          OMSP Document Tracking / Monitoring &bull; Province of Bataan, Sangguniang Panlalawigan
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  },

  /* --------------------------------------------------------
   * HELPERS
   * -------------------------------------------------------- */

  /**
   * Escape a value for CSV
   * @param {any} value
   * @returns {string}
   */
  escapeCSV(value) {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  },

  /**
   * Convert snake_case/camelCase to Title Header
   * @param {string} str
   * @returns {string}
   */
  headerize(str) {
    return str
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/\b\w/g, c => c.toUpperCase())
      .trim();
  },

  /**
   * Trigger file download from a Blob
   * @param {Blob} blob
   * @param {string} filename
   */
  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
};
