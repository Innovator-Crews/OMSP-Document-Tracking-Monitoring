/**
 * ============================================================
 * OMSP Document Tracking / Monitoring
 * SysAdmin Module — Board Member & Staff Management
 * ============================================================
 * Handles sysadmin-only pages: BM management, staff management
 */

const SysAdminModule = {

  // ─── Board Member Management ─────────────────────────────
  initBMManagement() {
    const container = document.getElementById('bm-management-content');
    if (!container) return;

    const bms = Storage.getAll(KEYS.BOARD_MEMBERS);
    const active = bms.filter(b => !b.is_archived);
    const archived = bms.filter(b => b.is_archived);

    let html = `
      <div class="grid-3-col gap-md mb-lg">
        <div class="stat-card stat-card-blue">
          <div class="stat-icon stat-icon-blue">${typeof Icons !== 'undefined' ? Icons.render('users', 22) : ''}</div>
          <div class="stat-label">Active Board Members</div>
          <div class="stat-value">${active.length}</div>
        </div>
        <div class="stat-card stat-card-amber">
          <div class="stat-icon stat-icon-amber">${typeof Icons !== 'undefined' ? Icons.render('clock', 22) : ''}</div>
          <div class="stat-label">Pending Archive</div>
          <div class="stat-value">${active.filter(b => b.archive_status === 'pending').length}</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:var(--neutral-100);color:var(--neutral-500)">${typeof Icons !== 'undefined' ? Icons.render('archive', 22) : ''}</div>
          <div class="stat-label">Archived</div>
          <div class="stat-value">${archived.length}</div>
        </div>
      </div>

      <h3 class="mb-md">Active Board Members</h3>
      <div class="table-container mb-lg">
        <table class="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>District</th>
              <th>Term Start</th>
              <th>Term End</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${active.map(bm => {
              const user = Storage.getById(KEYS.USERS, bm.user_id, 'user_id');
              return `
                <tr>
                  <td><strong>${user ? Utils.escapeHtml(user.full_name) : 'Unknown'}</strong></td>
                  <td>${Utils.escapeHtml(bm.district_name)}</td>
                  <td>${Utils.formatDate(bm.term_start)}</td>
                  <td>${Utils.formatDate(bm.term_end)}</td>
                  <td><span class="badge badge-success">Active</span></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;

    if (archived.length > 0) {
      html += `
        <details class="mt-md">
          <summary class="text-muted" style="cursor:pointer; font-weight:600;">Archived Board Members (${archived.length})</summary>
          <div class="table-container mt-sm">
            <table class="data-table">
              <thead>
                <tr><th>Name</th><th>District</th><th>Term</th></tr>
              </thead>
              <tbody>
                ${archived.map(bm => {
                  const user = Storage.getById(KEYS.USERS, bm.user_id, 'user_id');
                  return `<tr><td>${user ? Utils.escapeHtml(user.full_name) : 'Unknown'}</td><td>${Utils.escapeHtml(bm.district_name)}</td><td>${Utils.formatDate(bm.term_start)} — ${Utils.formatDate(bm.term_end)}</td></tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </details>
      `;
    }

    container.innerHTML = html;
  },

  // ─── Staff Management ────────────────────────────────────
  initStaffManagement() {
    const container = document.getElementById('staff-management-content');
    if (!container) return;

    const users = Storage.getAll(KEYS.USERS).filter(u => u.role === 'secretary' && !u.is_archived);
    const assignments = Storage.getAll(KEYS.SECRETARY_ASSIGNMENTS);

    let html = `
      <div class="stat-card stat-card-blue mb-lg" style="max-width:200px">
        <div class="stat-icon stat-icon-blue">${typeof Icons !== 'undefined' ? Icons.render('user', 22) : ''}</div>
        <div class="stat-label">Active Staff</div>
        <div class="stat-value">${users.length}</div>
      </div>

      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Assigned Board Members</th>
            </tr>
          </thead>
          <tbody>
            ${users.map(u => {
              const userAssignments = assignments.filter(a => a.secretary_user_id === u.user_id);
              const bmNames = userAssignments.map(a => {
                const bm = Storage.getById(KEYS.BOARD_MEMBERS, a.bm_id, 'bm_id');
                const bmUser = bm ? Storage.getById(KEYS.USERS, bm.user_id, 'user_id') : null;
                return bmUser ? bmUser.full_name : 'Unknown';
              });
              return `
                <tr>
                  <td><strong>${Utils.escapeHtml(u.full_name)}</strong></td>
                  <td>${Utils.escapeHtml(u.email)}</td>
                  <td>${bmNames.map(n => `<span class="badge badge-info mr-xs">${Utils.escapeHtml(n)}</span>`).join('') || '<span class="text-muted">None</span>'}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;

    container.innerHTML = html;
  }
};
