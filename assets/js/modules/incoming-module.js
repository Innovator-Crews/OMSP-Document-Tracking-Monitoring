/**
 * ============================================================
 * OMSP Document Tracking / Monitoring
 * Incoming Letters Module — CRUD for Cultural Activities,
 *   Solicitations, and Invitation Letters
 * ============================================================
 * Access:
 * - Secretary: Can create/edit for their assigned BMs
 * - SysAdmin: Can view all incoming letters
 * - Board Member: Can view their own letters (read-only)
 * ============================================================
 */

const IncomingModule = {
  CATEGORIES: ['Cultural Activities', 'Solicitations', 'Invitation Letters'],

  /* --------------------------------------------------------
   * LIST PAGE
   * -------------------------------------------------------- */

  initList() {
    const user = Auth.requireAuth();
    if (!user) return;

    const container = document.getElementById('incoming-list-content');
    if (!container) return;

    this._currentFilters = { category: '', bm_id: '', search: '' };
    this._currentPage = 1;
    this._perPage = 15;

    this.renderList(container, user);
  },

  renderList(container, user) {
    const filters = this._currentFilters;
    let letters = Storage.getIncomingLetters({
      category: filters.category || undefined,
      bm_id: filters.bm_id || undefined
    });

    // Text search filter
    if (filters.search) {
      const q = filters.search.toLowerCase();
      letters = letters.filter(l =>
        l.sender_name.toLowerCase().includes(q) ||
        (l.event && l.event.toLowerCase().includes(q)) ||
        (l.purpose && l.purpose.toLowerCase().includes(q)) ||
        (l.concerned_office && l.concerned_office.toLowerCase().includes(q))
      );
    }

    // Role-based filtering
    if (user.role === 'secretary') {
      const assignedBMs = Auth.getAssignedBMs();
      const bmIds = assignedBMs.map(bm => bm.bm_id);
      letters = letters.filter(l => bmIds.includes(l.bm_id));
    } else if (user.role === 'board_member') {
      const bms = Storage.query(KEYS.BOARD_MEMBERS, { user_id: user.user_id });
      if (bms.length) {
        letters = letters.filter(l => l.bm_id === bms[0].bm_id);
      }
    }

    const total = letters.length;
    const totalPages = Math.ceil(total / this._perPage) || 1;
    if (this._currentPage > totalPages) this._currentPage = totalPages;
    const start = (this._currentPage - 1) * this._perPage;
    const pageLetters = letters.slice(start, start + this._perPage);

    // Stat cards
    const catCounts = {};
    this.CATEGORIES.forEach(c => catCounts[c] = 0);
    letters.forEach(l => { if (catCounts[l.category] !== undefined) catCounts[l.category]++; });

    container.innerHTML = `
      <div class="stats-grid mb-md">
        <div class="stat-card">
          <div class="stat-value">${total}</div>
          <div class="stat-label">Total Letters</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${catCounts['Cultural Activities']}</div>
          <div class="stat-label">Cultural Activities</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${catCounts['Solicitations']}</div>
          <div class="stat-label">Solicitations</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${catCounts['Invitation Letters']}</div>
          <div class="stat-label">Invitation Letters</div>
        </div>
      </div>

      <!-- Filters -->
      <div class="filter-bar mb-md">
        <div class="filter-group">
          <select id="il-filter-category" class="form-input form-input-sm">
            <option value="">All Categories</option>
            ${this.CATEGORIES.map(c => `<option value="${c}" ${filters.category === c ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
        </div>
        ${user.role === 'secretary' ? `
        <div class="filter-group">
          <select id="il-filter-bm" class="form-input form-input-sm">
            <option value="">All Board Members</option>
            ${Auth.getAssignedBMs().map(bm => {
              const u = Storage.getById(KEYS.USERS, bm.user_id, 'user_id');
              return `<option value="${bm.bm_id}" ${filters.bm_id === bm.bm_id ? 'selected' : ''}>${u ? u.full_name : bm.bm_id}</option>`;
            }).join('')}
          </select>
        </div>` : ''}
        <div class="filter-group">
          <input type="text" id="il-filter-search" class="form-input form-input-sm" placeholder="Search sender, event..." value="${Utils.escapeHtml(filters.search)}" />
        </div>
        <button class="btn btn-secondary btn-sm" id="il-export-btn">${Icons.render('download', 16)} Export</button>
      </div>

      <!-- Table -->
      <div class="table-container">
        <table class="data-table" id="il-table">
          <thead>
            <tr>
              <th>Date Received</th>
              <th>Category</th>
              <th>Sender</th>
              <th>Event / Purpose</th>
              <th>Action Taken</th>
              <th>Board Member</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="il-table-body">
            ${pageLetters.length === 0 ?
              '<tr><td colspan="7" class="text-center text-muted">No incoming letters found.</td></tr>' :
              pageLetters.map(l => this._renderLetterRow(l, user)).join('')
            }
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="pagination" id="il-pagination"></div>
    `;

    // Render pagination
    if (totalPages > 1) {
      const pagEl = document.getElementById('il-pagination');
      if (pagEl) {
        pagEl.innerHTML = Utils.renderPagination(this._currentPage, totalPages);
        pagEl.querySelectorAll('[data-page]').forEach(btn => {
          btn.addEventListener('click', () => {
            this._currentPage = parseInt(btn.dataset.page);
            this.renderList(container, user);
          });
        });
      }
    }

    // Filter event listeners
    this._attachFilterListeners(container, user);

    // Export
    const exportBtn = document.getElementById('il-export-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this._exportLetters(letters));
    }
  },

  _renderLetterRow(letter, user) {
    const catBadge = this._categoryBadge(letter.category);
    const bm = letter.bm_id ? Storage.getById(KEYS.BOARD_MEMBERS, letter.bm_id, 'bm_id') : null;
    const bmUser = bm ? Storage.getById(KEYS.USERS, bm.user_id, 'user_id') : null;
    const bmName = bmUser ? bmUser.full_name : (letter.bm_id || '—');
    const eventPurpose = letter.event || letter.purpose || '—';

    const canEdit = user.role === 'secretary' || user.role === 'sysadmin';

    return `
      <tr>
        <td>${Utils.formatDate(letter.date_received)}</td>
        <td>${catBadge}</td>
        <td>${Utils.escapeHtml(letter.sender_name)}</td>
        <td class="text-truncate" style="max-width:200px" title="${Utils.escapeHtml(eventPurpose)}">${Utils.escapeHtml(eventPurpose)}</td>
        <td>${Utils.escapeHtml(letter.action_taken || '—')}</td>
        <td>${Utils.escapeHtml(bmName)}</td>
        <td>
          <div class="action-btns">
            <button class="btn btn-xs btn-secondary il-view-btn" data-id="${letter.letter_id}" title="View details">${Icons.render('eye', 14)}</button>
            ${canEdit ? `<button class="btn btn-xs btn-primary il-edit-btn" data-id="${letter.letter_id}" title="Edit">${Icons.render('edit', 14)}</button>` : ''}
          </div>
        </td>
      </tr>
    `;
  },

  _categoryBadge(category) {
    const map = {
      'Cultural Activities': 'badge-info',
      'Solicitations': 'badge-warning',
      'Invitation Letters': 'badge-accent'
    };
    return `<span class="badge ${map[category] || 'badge-secondary'}">${Utils.escapeHtml(category)}</span>`;
  },

  _attachFilterListeners(container, user) {
    const catEl = document.getElementById('il-filter-category');
    const bmEl = document.getElementById('il-filter-bm');
    const searchEl = document.getElementById('il-filter-search');

    if (catEl) catEl.addEventListener('change', () => {
      this._currentFilters.category = catEl.value;
      this._currentPage = 1;
      this.renderList(container, user);
    });
    if (bmEl) bmEl.addEventListener('change', () => {
      this._currentFilters.bm_id = bmEl.value;
      this._currentPage = 1;
      this.renderList(container, user);
    });
    if (searchEl) {
      let debounce;
      searchEl.addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => {
          this._currentFilters.search = searchEl.value;
          this._currentPage = 1;
          this.renderList(container, user);
        }, 300);
      });
    }

    // Row action buttons
    container.querySelectorAll('.il-view-btn').forEach(btn => {
      btn.addEventListener('click', () => this.viewDetail(btn.dataset.id));
    });
    container.querySelectorAll('.il-edit-btn').forEach(btn => {
      btn.addEventListener('click', () => this.showEditModal(btn.dataset.id));
    });
  },

  _exportLetters(letters) {
    if (!letters.length) {
      Notifications.warning('No letters to export.');
      return;
    }
    const rows = letters.map(l => {
      const bm = l.bm_id ? Storage.getById(KEYS.BOARD_MEMBERS, l.bm_id, 'bm_id') : null;
      const bmUser = bm ? Storage.getById(KEYS.USERS, bm.user_id, 'user_id') : null;
      return {
        'Date Received': l.date_received,
        'Category': l.category,
        'Sender Name': l.sender_name,
        'Sender Address': l.sender_address,
        'Event': l.event,
        'Purpose': l.purpose,
        'Action Taken': l.action_taken,
        'Date of Event': l.date_of_event || '',
        'Date Released': l.date_released || '',
        'Concerned Office': l.concerned_office,
        'Remarks': l.remarks,
        'Board Member': bmUser ? bmUser.full_name : ''
      };
    });
    ExportUtils.toCSV(rows, 'incoming-letters');
    Notifications.success('Exported successfully.');
  },

  /* --------------------------------------------------------
   * DETAIL VIEW (MODAL)
   * -------------------------------------------------------- */

  viewDetail(letterId) {
    const letter = Storage.getById(KEYS.INCOMING_LETTERS, letterId, 'letter_id');
    if (!letter) {
      Notifications.error('Letter not found.');
      return;
    }

    const bm = letter.bm_id ? Storage.getById(KEYS.BOARD_MEMBERS, letter.bm_id, 'bm_id') : null;
    const bmUser = bm ? Storage.getById(KEYS.USERS, bm.user_id, 'user_id') : null;
    const encoder = Storage.getById(KEYS.USERS, letter.encoded_by, 'user_id');

    const modal = document.getElementById('modal-container');
    modal.innerHTML = `
      <div class="modal-overlay active" id="il-detail-overlay">
        <div class="modal animate-fade-in" style="max-width:600px">
          <div class="modal-header">
            <h3>Incoming Letter Details</h3>
            <button class="modal-close" id="il-detail-close">&times;</button>
          </div>
          <div class="modal-body">
            <div class="detail-grid">
              <div class="detail-row">
                <span class="detail-label">Category</span>
                <span class="detail-value">${this._categoryBadge(letter.category)}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Date Received</span>
                <span class="detail-value">${Utils.formatDate(letter.date_received)}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Sender Name</span>
                <span class="detail-value">${Utils.escapeHtml(letter.sender_name)}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Sender Address</span>
                <span class="detail-value">${Utils.escapeHtml(letter.sender_address || '—')}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Event</span>
                <span class="detail-value">${Utils.escapeHtml(letter.event || '—')}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Purpose</span>
                <span class="detail-value">${Utils.escapeHtml(letter.purpose || '—')}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Action Taken</span>
                <span class="detail-value">${Utils.escapeHtml(letter.action_taken || '—')}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Date of Event</span>
                <span class="detail-value">${letter.date_of_event ? Utils.formatDate(letter.date_of_event) : '—'}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Date Released</span>
                <span class="detail-value">${letter.date_released ? Utils.formatDate(letter.date_released) : '—'}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Concerned Office</span>
                <span class="detail-value">${Utils.escapeHtml(letter.concerned_office || '—')}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Board Member</span>
                <span class="detail-value">${bmUser ? Utils.escapeHtml(bmUser.full_name) : '—'}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Encoded By</span>
                <span class="detail-value">${encoder ? Utils.escapeHtml(encoder.full_name) : letter.encoded_by}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Remarks</span>
                <span class="detail-value">${Utils.escapeHtml(letter.remarks || '—')}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Created</span>
                <span class="detail-value">${Utils.formatDate(letter.created_at)}</span>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="il-detail-done">Close</button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('il-detail-close').addEventListener('click', () => modal.innerHTML = '');
    document.getElementById('il-detail-done').addEventListener('click', () => modal.innerHTML = '');
    document.getElementById('il-detail-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) modal.innerHTML = '';
    });
  },

  /* --------------------------------------------------------
   * EDIT MODAL
   * -------------------------------------------------------- */

  showEditModal(letterId) {
    const letter = Storage.getById(KEYS.INCOMING_LETTERS, letterId, 'letter_id');
    if (!letter) {
      Notifications.error('Letter not found.');
      return;
    }

    const modal = document.getElementById('modal-container');
    modal.innerHTML = `
      <div class="modal-overlay active" id="il-edit-overlay">
        <div class="modal animate-fade-in" style="max-width:600px">
          <div class="modal-header">
            <h3>Edit Incoming Letter</h3>
            <button class="modal-close" id="il-edit-close">&times;</button>
          </div>
          <div class="modal-body">
            <form id="il-edit-form">
              <div class="form-group">
                <label class="form-label">Category</label>
                <select id="il-edit-category" class="form-select" required>
                  ${this.CATEGORIES.map(c => `<option value="${c}" ${letter.category === c ? 'selected' : ''}>${c}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Date Received</label>
                <input type="date" id="il-edit-date-received" class="form-input" value="${letter.date_received}" required />
              </div>
              <div class="form-group">
                <label class="form-label">Sender Name</label>
                <input type="text" id="il-edit-sender-name" class="form-input" value="${Utils.escapeHtml(letter.sender_name)}" required />
              </div>
              <div class="form-group">
                <label class="form-label">Sender Address</label>
                <input type="text" id="il-edit-sender-address" class="form-input" value="${Utils.escapeHtml(letter.sender_address)}" />
              </div>
              <div class="form-group">
                <label class="form-label">Event</label>
                <input type="text" id="il-edit-event" class="form-input" value="${Utils.escapeHtml(letter.event)}" />
              </div>
              <div class="form-group">
                <label class="form-label">Purpose</label>
                <textarea id="il-edit-purpose" class="form-input form-textarea" rows="2">${Utils.escapeHtml(letter.purpose)}</textarea>
              </div>
              <div class="form-group">
                <label class="form-label">Action Taken</label>
                <input type="text" id="il-edit-action-taken" class="form-input" value="${Utils.escapeHtml(letter.action_taken)}" />
              </div>
              <div class="form-group">
                <label class="form-label">Date of Event</label>
                <input type="date" id="il-edit-date-event" class="form-input" value="${letter.date_of_event || ''}" />
              </div>
              <div class="form-group">
                <label class="form-label">Date Released</label>
                <input type="date" id="il-edit-date-released" class="form-input" value="${letter.date_released || ''}" />
              </div>
              <div class="form-group">
                <label class="form-label">Concerned Office</label>
                <input type="text" id="il-edit-concerned-office" class="form-input" value="${Utils.escapeHtml(letter.concerned_office)}" />
              </div>
              <div class="form-group">
                <label class="form-label">Remarks</label>
                <textarea id="il-edit-remarks" class="form-input form-textarea" rows="2">${Utils.escapeHtml(letter.remarks)}</textarea>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="il-edit-cancel">Cancel</button>
            <button class="btn btn-primary" id="il-edit-save">Save Changes</button>
          </div>
        </div>
      </div>
    `;

    const closeModal = () => modal.innerHTML = '';
    document.getElementById('il-edit-close').addEventListener('click', closeModal);
    document.getElementById('il-edit-cancel').addEventListener('click', closeModal);
    document.getElementById('il-edit-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeModal();
    });

    document.getElementById('il-edit-save').addEventListener('click', () => {
      const form = document.getElementById('il-edit-form');
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      const updates = {
        category: document.getElementById('il-edit-category').value,
        date_received: document.getElementById('il-edit-date-received').value,
        sender_name: document.getElementById('il-edit-sender-name').value.trim(),
        sender_address: document.getElementById('il-edit-sender-address').value.trim(),
        event: document.getElementById('il-edit-event').value.trim(),
        purpose: document.getElementById('il-edit-purpose').value.trim(),
        action_taken: document.getElementById('il-edit-action-taken').value.trim(),
        date_of_event: document.getElementById('il-edit-date-event').value || null,
        date_released: document.getElementById('il-edit-date-released').value || null,
        concerned_office: document.getElementById('il-edit-concerned-office').value.trim(),
        remarks: document.getElementById('il-edit-remarks').value.trim(),
        updated_at: new Date().toISOString()
      };

      Storage.updateIncomingLetter(letterId, updates);
      ActivityLogger.log('update', 'incoming_letter', `Updated incoming letter from ${updates.sender_name}`);
      Notifications.success('Letter updated successfully.');
      closeModal();

      // Refresh list
      const user = Auth.requireAuth();
      const container = document.getElementById('incoming-list-content');
      if (container && user) this.renderList(container, user);
    });
  },

  /* --------------------------------------------------------
   * NEW FORM
   * -------------------------------------------------------- */

  initNewForm() {
    const user = Auth.requireAuth();
    if (!user) return;

    if (user.role !== 'secretary') {
      Notifications.error('Only secretaries can create incoming letter records.');
      Auth.goToDashboard();
      return;
    }

    const container = document.getElementById('incoming-new-content');
    if (!container) return;

    const assignedBMs = Auth.getAssignedBMs();

    container.innerHTML = `
      <div class="form-container fade-in">
        <form id="il-form" class="record-form" novalidate>
          <!-- Board Member -->
          <div class="form-group">
            <label for="il-bm" class="form-label">Board Member <span class="required">*</span></label>
            <select id="il-bm" class="form-select" required>
              <option value="">Select Board Member</option>
              ${assignedBMs.map(bm => {
                const u = Storage.getById(KEYS.USERS, bm.user_id, 'user_id');
                return `<option value="${bm.bm_id}">${u ? u.full_name : bm.bm_id} — ${bm.district_name}</option>`;
              }).join('')}
            </select>
          </div>

          <!-- Category -->
          <div class="form-group">
            <label for="il-category" class="form-label">Category <span class="required">*</span></label>
            <select id="il-category" class="form-select" required>
              <option value="">Select Category</option>
              ${this.CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('')}
            </select>
          </div>

          <!-- Date Received -->
          <div class="form-group">
            <label for="il-date-received" class="form-label">Date Received <span class="required">*</span></label>
            <input type="date" id="il-date-received" class="form-input" value="${new Date().toISOString().split('T')[0]}" required />
          </div>

          <!-- Sender Name -->
          <div class="form-group">
            <label for="il-sender-name" class="form-label">Sender Name <span class="required">*</span></label>
            <input type="text" id="il-sender-name" class="form-input" placeholder="Name of sender / organization" required />
          </div>

          <!-- Sender Address -->
          <div class="form-group">
            <label for="il-sender-address" class="form-label">Sender Address</label>
            <input type="text" id="il-sender-address" class="form-input" placeholder="Address of sender" />
          </div>

          <!-- Event -->
          <div class="form-group">
            <label for="il-event" class="form-label">Event</label>
            <input type="text" id="il-event" class="form-input" placeholder="Event name (if applicable)" />
          </div>

          <!-- Purpose -->
          <div class="form-group">
            <label for="il-purpose" class="form-label">Purpose</label>
            <textarea id="il-purpose" class="form-input form-textarea" rows="2" placeholder="Purpose of the letter..."></textarea>
          </div>

          <!-- Action Taken -->
          <div class="form-group">
            <label for="il-action-taken" class="form-label">Action Taken</label>
            <input type="text" id="il-action-taken" class="form-input" placeholder="Action taken on this letter" />
          </div>

          <!-- Date of Event -->
          <div class="form-group">
            <label for="il-date-event" class="form-label">Date of Event</label>
            <input type="date" id="il-date-event" class="form-input" />
          </div>

          <!-- Date Released -->
          <div class="form-group">
            <label for="il-date-released" class="form-label">Date Released</label>
            <input type="date" id="il-date-released" class="form-input" />
          </div>

          <!-- Concerned Office -->
          <div class="form-group">
            <label for="il-concerned-office" class="form-label">Concerned Office</label>
            <input type="text" id="il-concerned-office" class="form-input" placeholder="Office or department concerned" />
          </div>

          <!-- Remarks -->
          <div class="form-group">
            <label for="il-remarks" class="form-label">Remarks</label>
            <textarea id="il-remarks" class="form-input form-textarea" rows="2" placeholder="Additional remarks..."></textarea>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn btn-primary" id="il-submit-btn">Submit Incoming Letter</button>
            <a href="incoming-list.html" class="btn btn-secondary">Cancel</a>
          </div>
        </form>
      </div>
    `;

    // Attach form handler
    const form = document.getElementById('il-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.submitNew(user);
    });
  },

  submitNew(user) {
    const bmId = document.getElementById('il-bm').value;
    const category = document.getElementById('il-category').value;
    const dateReceived = document.getElementById('il-date-received').value;
    const senderName = document.getElementById('il-sender-name').value.trim();

    if (!bmId || !category || !dateReceived || !senderName) {
      Notifications.error('Please fill in all required fields.');
      return;
    }

    const data = {
      bm_id: bmId,
      category: category,
      date_received: dateReceived,
      sender_name: senderName,
      sender_address: document.getElementById('il-sender-address').value.trim(),
      event: document.getElementById('il-event').value.trim(),
      purpose: document.getElementById('il-purpose').value.trim(),
      action_taken: document.getElementById('il-action-taken').value.trim(),
      date_of_event: document.getElementById('il-date-event').value || null,
      date_released: document.getElementById('il-date-released').value || null,
      concerned_office: document.getElementById('il-concerned-office').value.trim(),
      remarks: document.getElementById('il-remarks').value.trim(),
      encoded_by: user.user_id
    };

    const letter = Storage.createIncomingLetter(data);
    ActivityLogger.log('create', 'incoming_letter', `Created incoming letter (${category}) from ${senderName}`);
    Notifications.success('Incoming letter recorded successfully!');

    // Navigate to list
    setTimeout(() => {
      window.location.href = 'incoming-list.html';
    }, 500);
  }
};
