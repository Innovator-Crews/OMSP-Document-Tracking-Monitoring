/**
 * ============================================================
 * OMSP Document Tracking / Monitoring
 * Category Manager - Permanent + Custom category CRUD
 * ============================================================
 * Permanent categories: Medical, Hospital Bill, Lab/Therapy, Burial, etc.
 * Custom categories: Added by staff/BM, can be deleted
 * ============================================================
 */

const CategoryManager = {
  init() {
    const user = Auth.requireAuth();
    if (!user) return;

    this.currentTab = 'fa';
    this.setupTabs();
    this.loadCategories();
    this.attachHandlers();
  },

  setupTabs() {
    const tabs = document.querySelectorAll('[data-cat-tab]');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentTab = tab.dataset.catTab;
        this.loadCategories();
      });
    });
  },

  getStorageKey() {
    return this.currentTab === 'fa' ? KEYS.FA_CATEGORIES : KEYS.PA_CATEGORIES;
  },

  loadCategories() {
    const key = this.getStorageKey();
    const categories = Storage.query(key, {}, { includeArchived: true });

    this.renderCategories(categories);
  },

  renderCategories(categories) {
    const container = document.getElementById('category-list');
    if (!container) return;

    const permanent = categories.filter(c => c.is_permanent && !c.is_archived);
    const custom = categories.filter(c => !c.is_permanent && !c.is_archived);
    const archived = categories.filter(c => c.is_archived);

    let html = '';

    // Permanent
    html += '<h4 class="mb-sm mt-md">Standard Categories (Permanent)</h4>';
    if (permanent.length === 0) {
      html += '<p class="text-muted">No permanent categories</p>';
    } else {
      html += '<div class="category-grid">';
      permanent.forEach(c => {
        html += `
          <div class="card">
            <div class="card-body d-flex justify-between align-center">
              <div class="d-flex align-center gap-sm">
                <span class="badge badge-category-permanent">Permanent</span>
                <strong>${Utils.escapeHtml(c.name)}</strong>
              </div>
              <span class="text-muted text-sm">Default</span>
            </div>
          </div>
        `;
      });
      html += '</div>';
    }

    // Custom
    html += '<h4 class="mb-sm mt-lg">Custom Categories</h4>';
    if (custom.length === 0) {
      html += '<p class="text-muted">No custom categories added yet</p>';
    } else {
      html += '<div class="category-grid">';
      custom.forEach(c => {
        const creator = Storage.getById(KEYS.USERS, c.created_by, 'user_id');
        html += `
          <div class="card">
            <div class="card-body d-flex justify-between align-center">
              <div>
                <div class="d-flex align-center gap-sm">
                  <span class="badge badge-category-custom">Custom</span>
                  <strong>${Utils.escapeHtml(c.name)}</strong>
                </div>
                <span class="text-muted text-sm">Added by ${Utils.escapeHtml(creator ? creator.full_name : 'Unknown')} • ${Utils.formatDate(c.created_at)}</span>
              </div>
              <div class="d-flex gap-xs">
                <button class="btn btn-sm btn-ghost" onclick="CategoryManager.editCategory('${c.id}')" title="Edit">✏️</button>
                <button class="btn btn-sm btn-ghost text-danger" onclick="CategoryManager.archiveCategory('${c.id}')" title="Archive">🗑️</button>
              </div>
            </div>
          </div>
        `;
      });
      html += '</div>';
    }

    // Archived
    if (archived.length > 0) {
      html += `
        <details class="mt-lg">
          <summary class="cursor-pointer font-semibold text-muted">Archived Categories (${archived.length})</summary>
          <div class="category-grid mt-sm">
      `;
      archived.forEach(c => {
        html += `
          <div class="card" style="opacity: 0.6">
            <div class="card-body d-flex justify-between align-center">
              <div>
                <span class="badge badge-neutral">Archived</span>
                <span class="ml-sm">${Utils.escapeHtml(c.name)}</span>
              </div>
              <button class="btn btn-sm btn-secondary" onclick="CategoryManager.restoreCategory('${c.id}')">Restore</button>
            </div>
          </div>
        `;
      });
      html += '</div></details>';
    }

    container.innerHTML = html;
  },

  attachHandlers() {
    const addBtn = document.getElementById('add-category-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => this.showAddModal());
    }
  },

  showAddModal() {
    const typeLabel = this.currentTab === 'fa' ? 'FA' : 'PA';
    const html = `
      <div class="modal-overlay active" id="add-cat-modal">
        <div class="modal modal-sm animate-fade-in">
          <div class="modal-header">
            <h3 class="modal-title">Add ${typeLabel} Category</h3>
            <button class="modal-close" onclick="document.getElementById('add-cat-modal').remove()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Category Name</label>
              <input type="text" class="form-input" id="new-cat-name" placeholder="Enter category name" maxlength="50" required>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="document.getElementById('add-cat-modal').remove()">Cancel</button>
            <button class="btn btn-primary" onclick="CategoryManager.addCategory()">Add Category</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
    document.getElementById('new-cat-name')?.focus();
  },

  addCategory() {
    const name = document.getElementById('new-cat-name')?.value?.trim();
    if (!name) {
      Notifications.error('Category name is required.');
      return;
    }

    const key = this.getStorageKey();
    const existing = Storage.getAll(key);
    if (existing.some(c => c.name.toLowerCase() === name.toLowerCase() && !c.is_archived)) {
      Notifications.warning('A category with this name already exists.');
      return;
    }

    const user = Auth.getCurrentUser();
    const newCat = {
      id: Storage.generateId(this.currentTab === 'fa' ? 'facat' : 'pacat'),
      name: name,
      is_default: false,
      is_permanent: false,
      created_by: user.user_id,
      created_at: new Date().toISOString(),
      is_archived: false,
      archived_at: null,
      archived_by: null
    };

    Storage.add(key, newCat);
    ActivityLogger.log(`Added ${this.currentTab.toUpperCase()} category: ${name}`, 'create', 'category', newCat.id);

    document.getElementById('add-cat-modal')?.remove();
    Notifications.success(`Category "${name}" added.`);
    this.loadCategories();
  },

  editCategory(catId) {
    const key = this.getStorageKey();
    const cat = Storage.getById(key, catId, 'id');
    if (!cat) return;

    const html = `
      <div class="modal-overlay active" id="edit-cat-modal">
        <div class="modal modal-sm animate-fade-in">
          <div class="modal-header">
            <h3 class="modal-title">Edit Category</h3>
            <button class="modal-close" onclick="document.getElementById('edit-cat-modal').remove()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Category Name</label>
              <input type="text" class="form-input" id="edit-cat-name" value="${Utils.escapeHtml(cat.name)}" maxlength="50">
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="document.getElementById('edit-cat-modal').remove()">Cancel</button>
            <button class="btn btn-primary" onclick="CategoryManager.saveEdit('${catId}')">Save</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
    document.getElementById('edit-cat-name')?.focus();
  },

  saveEdit(catId) {
    const name = document.getElementById('edit-cat-name')?.value?.trim();
    if (!name) {
      Notifications.error('Category name is required.');
      return;
    }

    const key = this.getStorageKey();
    Storage.update(key, catId, { name }, 'id');
    ActivityLogger.log(`Updated category: ${name}`, 'update', 'category', catId);

    document.getElementById('edit-cat-modal')?.remove();
    Notifications.success(`Category updated.`);
    this.loadCategories();
  },

  async archiveCategory(catId) {
    const key = this.getStorageKey();
    const cat = Storage.getById(key, catId, 'id');
    if (!cat) return;

    const confirmed = await Notifications.confirm({
      title: 'Archive Category',
      message: `Are you sure you want to archive "${cat.name}"? It will no longer appear in dropdowns.`,
      confirmText: 'Archive',
      type: 'warning'
    });

    if (!confirmed) return;

    const user = Auth.getCurrentUser();
    Storage.softDelete(key, catId, 'id', user.user_id);
    ActivityLogger.log(`Archived category: ${cat.name}`, 'archive', 'category', catId);

    Notifications.success(`Category "${cat.name}" archived.`);
    this.loadCategories();
  },

  restoreCategory(catId) {
    const key = this.getStorageKey();
    const cat = Storage.getById(key, catId, 'id');
    if (!cat) return;

    Storage.restore(key, catId, 'id');
    ActivityLogger.log(`Restored category: ${cat.name}`, 'restore', 'category', catId);

    Notifications.success(`Category "${cat.name}" restored.`);
    this.loadCategories();
  }
};
