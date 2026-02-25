/**
 * ============================================================
 * OMSP Document Tracking / Monitoring
 * Staff Module — Secretary/Staff-specific page logic
 * ============================================================
 * Handles staff-only functionality and utilities
 */

const StaffModule = {

  /**
   * Get the list of BMs assigned to the current secretary
   * @returns {Array} Board member objects assigned to this secretary
   */
  getAssignedBMs() {
    const user = Auth.getCurrentUser();
    if (!user || user.role !== 'secretary') return [];

    const assignments = Storage.getAll(KEYS.SECRETARY_ASSIGNMENTS)
      .filter(a => a.secretary_user_id === user.user_id);

    return assignments.map(a => {
      const bm = Storage.getById(KEYS.BOARD_MEMBERS, a.bm_id, 'bm_id');
      if (!bm) return null;
      const bmUser = Storage.getById(KEYS.USERS, bm.user_id, 'user_id');
      return { ...bm, user: bmUser };
    }).filter(Boolean);
  },

  /**
   * Get recent records created by this secretary
   * @param {number} limit
   * @returns {Array} Mixed Financial Assistance/Personal Assistance records
   */
  getMyRecentRecords(limit = 10) {
    const user = Auth.getCurrentUser();
    if (!user) return [];

    const faRecords = Storage.getAll(KEYS.FA_RECORDS)
      .filter(r => r.created_by === user.user_id && !r.is_deleted)
      .map(r => ({ ...r, _type: 'FA' }));

    const paRecords = Storage.getAll(KEYS.PA_RECORDS)
      .filter(r => r.created_by === user.user_id && !r.is_deleted)
      .map(r => ({ ...r, _type: 'PA' }));

    return [...faRecords, ...paRecords]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, limit);
  },

  /**
   * Get count stats for the current secretary
   * @returns {Object} { totalFA, totalPA, todayFA, todayPA }
   */
  getMyStats() {
    const user = Auth.getCurrentUser();
    if (!user) return { totalFA: 0, totalPA: 0, todayFA: 0, todayPA: 0 };

    const today = new Date().toISOString().split('T')[0];

    const faRecords = Storage.getAll(KEYS.FA_RECORDS)
      .filter(r => r.created_by === user.user_id && !r.is_deleted);

    const paRecords = Storage.getAll(KEYS.PA_RECORDS)
      .filter(r => r.created_by === user.user_id && !r.is_deleted);

    return {
      totalFA: faRecords.length,
      totalPA: paRecords.length,
      todayFA: faRecords.filter(r => r.created_at && r.created_at.startsWith(today)).length,
      todayPA: paRecords.filter(r => r.created_at && r.created_at.startsWith(today)).length
    };
  }
};
