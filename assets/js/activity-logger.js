/**
 * ============================================================
 * OMSP Document Tracking / Monitoring
 * Activity Logger - Tracks all user actions in the system
 * ============================================================
 */

const ActivityLogger = {
  /**
   * Log a user action
   * @param {string} action - Description of the action
   * @param {string} actionType - 'create' | 'update' | 'delete' | 'archive' | 'restore' | 'login' | 'logout' | 'export' | 'status_change' | 'approve' | 'deny'
   * @param {string} recordType - 'fa' | 'pa' | 'beneficiary' | 'category' | 'user' | 'budget' | 'system' | 'term'
   * @param {string} recordId - Related record ID (nullable)
   * @param {string} details - Additional details (nullable)
   * @returns {Object} The log entry
   */
  log(action, actionType = 'create', recordType = 'system', recordId = null, details = null) {
    const user = Storage.get(KEYS.CURRENT_USER);
    const entry = {
      log_id: Storage.generateId('log'),
      user_id: user ? user.user_id : 'system',
      user_name: user ? user.full_name : 'System',
      user_role: user ? user.role : 'system',
      action: action,
      action_type: actionType,
      record_type: recordType,
      record_id: recordId,
      details: details,
      created_at: new Date().toISOString()
    };

    Storage.add(KEYS.ACTIVITY_LOGS, entry);
    return entry;
  },

  /**
   * Get recent activity logs
   * @param {Object} filters - { user_id, action_type, record_type, limit }
   * @returns {Array}
   */
  getRecent(filters = {}) {
    let logs = Storage.getAll(KEYS.ACTIVITY_LOGS);

    if (filters.user_id) {
      logs = logs.filter(l => l.user_id === filters.user_id);
    }
    if (filters.action_type) {
      logs = logs.filter(l => l.action_type === filters.action_type);
    }
    if (filters.record_type) {
      logs = logs.filter(l => l.record_type === filters.record_type);
    }
    if (filters.user_role) {
      logs = logs.filter(l => l.user_role === filters.user_role);
    }

    // Sort newest first
    logs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const limit = filters.limit || 50;
    return logs.slice(0, limit);
  },

  /**
   * Get logs for today
   * @returns {Array}
   */
  getToday() {
    const today = new Date().toISOString().split('T')[0];
    return Storage.getAll(KEYS.ACTIVITY_LOGS)
      .filter(l => l.created_at.startsWith(today))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  /**
   * Get logs count by type for dashboard stats
   * @returns {Object} Counts object
   */
  getCounts() {
    const logs = Storage.getAll(KEYS.ACTIVITY_LOGS);
    const today = new Date().toISOString().split('T')[0];
    const todayLogs = logs.filter(l => l.created_at.startsWith(today));

    return {
      total: logs.length,
      today: todayLogs.length,
      byType: {
        create: logs.filter(l => l.action_type === 'create').length,
        update: logs.filter(l => l.action_type === 'update').length,
        delete: logs.filter(l => l.action_type === 'delete').length,
        login: logs.filter(l => l.action_type === 'login').length
      }
    };
  },

  /**
   * Get action icon class
   * @param {string} actionType
   * @returns {string}
   */
  getActionIcon(actionType) {
    const icons = {
      create: '➕',
      update: '✏️',
      delete: '🗑️',
      archive: '📦',
      restore: '♻️',
      login: '🔑',
      logout: '🚪',
      export: '📤',
      status_change: '🔄',
      approve: '✅',
      deny: '❌'
    };
    return icons[actionType] || '📋';
  },

  /**
   * Get action color class
   * @param {string} actionType
   * @returns {string}
   */
  getActionColor(actionType) {
    const colors = {
      create: 'text-success',
      update: 'text-primary',
      delete: 'text-danger',
      archive: 'text-warning',
      restore: 'text-info',
      login: 'text-secondary',
      logout: 'text-secondary',
      approve: 'text-success',
      deny: 'text-danger'
    };
    return colors[actionType] || 'text-muted';
  },

  /**
   * Render a single activity item as HTML
   * @param {Object} log - Log entry
   * @returns {string} HTML string
   */
  renderItem(log) {
    return `
      <div class="activity-item">
        <div class="activity-icon ${this.getActionColor(log.action_type)}">
          ${this.getActionIcon(log.action_type)}
        </div>
        <div class="activity-content">
          <div class="activity-text">
            <strong>${Utils.escapeHtml(log.user_name)}</strong>
            ${Utils.escapeHtml(log.action)}
          </div>
          ${log.details ? `<div class="activity-details">${Utils.escapeHtml(log.details)}</div>` : ''}
          <div class="activity-time">${Utils.formatRelativeTime(log.created_at)}</div>
        </div>
      </div>
    `;
  },

  /**
   * Render an activity list into a container
   * @param {string|Element} container - Container selector or element
   * @param {Object} filters - Filter options
   */
  renderList(container, filters = {}) {
    const el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) return;

    const logs = this.getRecent(filters);

    if (logs.length === 0) {
      el.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <h3 class="empty-state-title">No Activity Yet</h3>
          <p class="empty-state-text">Activity will appear here as actions are performed.</p>
        </div>
      `;
      return;
    }

    el.innerHTML = logs.map(log => this.renderItem(log)).join('');
  }
};
