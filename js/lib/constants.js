/* ==============================================
 * constants.js
 * PURPOSE: Central source of truth for every
 * hard-coded value in the system. Keeps magic
 * strings/numbers out of business logic.
 *
 * CONTAINS:
 *  - STORAGE_KEYS  → localStorage key names
 *  - MUNICIPALITIES → Bataan municipality list
 *  - PA_ACTIONS    → Personal Assistance action types
 *  - FA_STATUSES   → Financial Assistance statuses
 *  - WAIT_DURATIONS → Cooling-off period options
 *  - DEFAULT_FA_BUDGET → Monthly budget default (₱70k)
 *  - FREQUENCY_THRESHOLDS → Frequency flagging rules
 *  - TERM_WARNING_DAYS → Banner trigger thresholds
 *
 * USED BY: Every other JS file references this.
 * ============================================== */

var STORAGE_KEYS = {
  USERS: 'omsp_users',
  BOARD_MEMBERS: 'omsp_board_members',
  SECRETARY_ASSIGNMENTS: 'omsp_secretary_assignments',
  FA_CASE_TYPES: 'omsp_fa_case_types',
  PA_CATEGORIES: 'omsp_pa_categories',
  BENEFICIARIES: 'omsp_beneficiaries',
  FINANCIAL_ASSISTANCE: 'omsp_financial_assistance',
  PERSONAL_ASSISTANCE: 'omsp_personal_assistance',
  MONTHLY_BUDGET_LOGS: 'omsp_monthly_budget_logs',
  ACTIVITY_LOGS: 'omsp_activity_logs',
  MONTHLY_FREQUENCY: 'omsp_monthly_frequency',
  AUTH_STATE: 'omsp_auth_state',
  INITIALIZED: 'omsp_initialized'
};

var MUNICIPALITIES = [
  'Abucay', 'Bagac', 'Balanga City', 'Dinalupihan', 'Hermosa',
  'Limay', 'Mariveles', 'Morong', 'Orani', 'Orion',
  'Pilar', 'Samal'
];

/* Predefined action types for PA records */
var PA_ACTIONS = [
  'For assessments-verification',
  'Provided status of financial assistance',
  'Informed BM',
  'Accomplished',
  'Forwarded to designated office',
  'Calendared-Informed BM',
  'Inquiry',
  'Provided assistance'
];

/* Status options for FA requests */
var FA_STATUSES = ['Ongoing', 'Successful', 'Denied'];

/* Cooling-off period preset options */
var WAIT_DURATIONS = [
  { value: 3, label: '3 months' },
  { value: 6, label: '6 months' },
  { value: 0, label: 'Custom' }
];

/* Default monthly FA budget per Board Member */
var DEFAULT_FA_BUDGET = 70000;

/* Request frequency flagging thresholds */
var FREQUENCY_THRESHOLDS = {
  normal:  { min: 1, max: 2 },   // 1-2 requests = green
  monitor: { min: 3, max: 4 },   // 3-4 requests = yellow
  high:    { min: 5, max: 999 }   // 5+  requests = red
};

/* Days before term_end to trigger warning banners */
var TERM_WARNING_DAYS = {
  gentle:   90,  // Info banner
  warning:  30,  // Yellow warning
  critical: 7    // Red critical
};
