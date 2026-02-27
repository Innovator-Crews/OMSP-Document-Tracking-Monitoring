# OMSP Document Tracking System — Comprehensive Audit Report
**Scope:** Full codebase audit of `/omsptracking`  
**Files Reviewed:** 21 source files (all JS modules, storage layer, auth, validators, exportutils, notifications, activity-logger, sysadmin, boardmember, staff, app, plus all Claude documentation)  
**Date:** June 2025

---

## Summary

| Severity | Count | Description |
|----------|-------|-------------|
| 🔴 **Critical** | 2 | Data integrity / enforcement completely missing |
| 🟠 **High** | 8 | Core feature broken, misleading UI, or permanently inert |
| 🟡 **Medium** | 9 | Incomplete features, export gaps, permission bypasses |
| 🔵 **Low** | 7 | Dead code, documentation drift, cosmetic correctness issues |
| **Total** | **26** | |

---

## CRITICAL Gaps

---

### C1 — PA Budget Enforcement Gate Missing
**File:** `assets/js/modules/pa-module.js` — `submitNewPA()` (approx. line 820)  
**Also:** `assets/js/storage.js` — `deductFromPABudget()` (approx. line 585)

**Intended:**  
`Storage.deductFromPABudget(bmId, amount)` is documented in `claude/data-models.md` as the enforcement gate: "Validate remaining pool; returns `{ success, remaining, error? }`". Like FA where `deductFromBudget()` blocks over-budget submissions, PA should block if `remaining < amount`.

**Actual:**  
`submitNewPA()` never calls `deductFromPABudget()`. The PA record is saved unconditionally regardless of available balance. `updatePABalanceDisplay()` shows a red warning in the UI when funds are insufficient, but the submit button is never gated. A secretary can blow past the warning and submit anyway — the record saves and the pool goes negative.

**Comparison to FA:** `FAModule.submitNewFA()` calls `Storage.deductFromBudget()` and explicitly `return`s on `!result.success`. The entire parallel structure for PA exists but the call is absent.

**Impact:** PA budget pool is decorative only. Any PA record can be created regardless of available funds.

---

### C2 — Old PA Budget Entries Bleed Into New Term
**File:** `assets/js/modules/term-manager.js` — `confirmNewTerm()` (approx. line 430)

**Intended:**  
When a new term is started (after archive approval), the PA budget pool should reset. The BM starts fresh with a new pool for the new term.

**Actual:**  
`confirmNewTerm()` only resets `bm.pa_balance = 0` on the BM record. It does NOT flag, archive, or remove any entries in `KEYS.PA_BUDGETS`. `Storage.getPABudgetSummary(bmId)` sums **all non-deleted PA_BUDGETS entries** for a BM including previous-term entries. After term rollover, the BM's new PA pool incorrectly includes old-term budget entries.

There is a comment in the code: `// Clear PA budgets for the new term (old ones stay archived)` but no implementation follows it.

**Impact:** Multi-term BMs will show inflated PA pool totals. The PA "remaining" calculation is permanently wrong after any term rollover.

---

## HIGH Gaps

---

### H1 — Rollover Toggle Has No UI — Rollover Is Permanently Disabled
**File:** `assets/js/storage.js` — `setRollover()` (approx. line 320)  
**Callers:** None anywhere in the codebase

**Intended:**  
BM can opt-in to carry over remaining FA budget from one month to the next. `Storage.getCurrentBudget()` correctly checks `lastBudget.rollover_selected` and adds `rollover_amount` to the new month's total. `Storage.setRollover(bmId, yearMonth, value)` is the setter.

**Actual:**  
`setRollover()` is never called from any page. `boardmember/js/boardmember.js` (`initMyBudget()` and `initPABudget()`) has no rollover toggle checkbox or button. All seeded budget entries have `rollover_selected: false`. The logic in `getCurrentBudget()` is fully wired for rollover but will never trigger.

**Impact:** The "Rollover from previous month" line on the FA budget display will always show ₱0. The feature is designed, implemented in storage, but has no entry point.

---

### H2 — Real-Time Validation Never Attached to Any Form
**File:** `assets/js/validators.js` — `attachRealTimeValidation()` (approx. line 260)  
**Callers:** None anywhere in the codebase

**Intended:**  
`attachRealTimeValidation(formId, rules)` attaches `blur` and `input` event listeners to form fields for live inline error messages. This would give users immediate feedback without waiting for form submission.

**Actual:**  
Neither `FAModule.initNewForm()` nor `PAModule.initNewForm()` nor `IncomingModule.initNewForm()` ever calls `attachRealTimeValidation()`. The function is defined and internally correct but never invoked anywhere.

**Impact:** Users only see validation errors on form submit, never on individual field blur. Defined capability is completely unused.

---

### H3 — Secretary Permission Flags Always False, No Toggle UI, Never Enforced
**Files:**  
- `sysadmin/js/sysadmin.js` — `showEditStaffModal()`, `showEditBMModal()` (no flag toggles)  
- `assets/js/modules/category-manager.js` — entire file (no permission check)  
- `assets/js/storage.js` — `assignSecretary()` (always seeds `false`)

**Intended:**  
`SECRETARY_ASSIGNMENTS` has two permission flags: `can_add_allowance` (allows secretary to manage PA budget entries) and `can_make_permanent_category` (allows secretary to create permanent/default categories). These were designed as per-secretary fine-grained permissions.

**Actual — Three-part failure:**
1. **No UI to set them:** `showEditStaffModal()` shows BM assignment checkboxes but has no checkboxes for `can_add_allowance` or `can_make_permanent_category`. `showEditBMModal()` similarly omits them. Both path `showAddStaffModal()` and `assignSecretary()` hard-code both flags to `false`.
2. **No enforcement in CategoryManager:** `CategoryManager.submitAdd()` never checks `Auth.checkPermission('can_make_permanent_category')` before allowing permanent category creation.
3. **No enforcement in PA budget:** `BoardMemberModule.initPABudget()` Add/Edit/Remove buttons are gated by `requireRole('board_member')`, meaning secretaries can never reach this page at all — which may be intentional but contradicts `can_add_allowance` having any purpose.

**Impact:** Permission flags are permanently false and unenforceable. Any secretary assigned to any BM can create permanent categories regardless of the flag.

---

### H4 — `skip_bm_noted` Flag Is Saved but BM Has No Way to See or Acknowledge It
**Files:**  
- `assets/js/modules/fa-module.js` — `submitNewFA()` (~line 190, saves `skip_bm_noted`)  
- `assets/js/modules/pa-module.js` — `submitNewPA()` (~line 820, saves `skip_bm_noted`)  
- `boardmember/js/boardmember.js` — no "pending acknowledgments" section anywhere

**Intended:**  
When a secretary skips a beneficiary's waiting period, `skip_bm_noted: false` is saved. The design implies the Board Member should later review and "note" (acknowledge) these skips.

**Actual:**  
No BM page queries FA/PA records where `skip_waiting_period === true`. No badge, count, or alert surfaces on the BM dashboard. The `initArchives()` page only shows `is_archived` records. The BM's `initSecretaryLogs()` page shows secretary activity logs but doesn't highlight skip events specially. The flag is set to `false` on create and has no mechanism to become `true` ever.

**Impact:** BM has no awareness of skipped waiting periods. The "check-and-acknowledge" oversight workflow is entirely absent. The field functions as dead data.

---

### H5 — FA Admin Edit Does Not Adjust Budget (Silently Corrupts Budget Tracking)
**File:** `assets/js/modules/fa-module.js` — `editRecord()` sysadmin portion (approx. line 980)

**Intended:**  
When sysadmin edits an FA record's `amount_approved`, the monthly budget `used_amount` and `remaining_amount` should be recalculated.

**Actual:**  
The sysadmin edit form updates only the FA record. The monthly budget entry is never touched. A banner in the form reads: *"Changing the amount will NOT automatically adjust the budget"* — the gap is acknowledged but not resolved. A sysadmin who increases an FA from ₱5,000 to ₱15,000 leaves the budget showing only ₱5,000 used, with ₱10,000 phantom remaining capacity.

**Note:** When sysadmin **hard-deletes** an FA record, `Storage.refundBudget()` IS called correctly. The gap is only in the edit path.

**Impact:** Budget display becomes inaccurate after any admin edit that changes the amount. The budget overview and progress bars show stale data.

---

### H6 — Term Expiry Warning System Configured but Never Implemented
**File:** `assets/js/storage.js` — `init()` seeds `settings.term_warning_days: [90, 30, 7]`  
**Callers:** Zero — no code reads `term_warning_days`

**Intended:**  
`SystemSettings.term_warning_days: [90, 30, 7]` clearly intends that when a BM's `term_end` date is 90, 30, or 7 days away, a warning should appear (dashboard alert, badge, notification).

**Actual:**  
No module reads `settings.term_warning_days`. `DashboardModule.renderAdminDashboard()` shows only `archive_status === 'pending'` requests — it does not proactively warn about approaching term ends. `TermManager.init()` and `loadTermOverview()` show term end dates but display no color-coded warnings.

**Impact:** Sysadmin has no automated heads-up about approaching term deadlines. Must manually check BM term end dates. The setting value is set and forgotten.

---

### H7 — SysAdmin Module Load Failure Falls Back to Broken Read-Only UI Silently
**File:** `assets/js/app.js` — `routePage()` (BM management and staff management cases, approx. lines 395-415), fallback `initBMManagement()` and `initStaffManagement()` (approx. lines 750-820)

**Intended:**  
`SysAdminModule.initBMManagement()` provides full CRUD (Add BM, Edit BM, Assign Secretaries, Deactivate). `SysAdminModule.initStaffManagement()` provides full staff management with add/edit/deactivate/export.

**Actual:**  
`routePage()` calls `SysAdminModule.initBMManagement()` with a fallback `else this.initBMManagement()`. The fallback in `App` is a read-only table with no Add/Edit/Action columns. Similarly `App.initStaffManagement()` is a simpler table with no actions. If the external SysAdmin script fails to load (network/caching issue), sysadmin gets a silent no-CRUD view with no error message.

**Impact:** Silent degradation — sysadmin thinks they're on the right page, sees the table, but cannot perform any management action. No console error is shown to the user.

---

### H8 — `IncomingModule` Uses Manual Validation, Bypasses `Validators` System
**File:** `assets/js/modules/incoming-module.js` — `submitNew()` (approx. line 595), `showEditModal()` save handler (approx. line 490)

**Intended:**  
FA and PA forms consistently use `Validators.validateAndDisplay(formId, rules)` for standardized field validation with inline error messages.

**Actual:**  
`submitNew()` only checks: `if (!bmId || !category || !dateReceived || !senderName)` with a generic toast. The edit modal uses browser native `form.checkValidity()` and `form.reportValidity()` only. Neither path calls `Validators.validateAndDisplay()`. Inconsistent UX — incoming letter forms show no inline field-level errors.

**Impact:** No inline validation feedback on the incoming letter form. Error messages are generic. Pattern inconsistency across the app.

---

## MEDIUM Gaps

---

### M1 — 4 of 5 Report Types Have No Export or Print
**File:** `assets/js/modules/reports.js` (fully read, 409 lines)

**Intended:**  
All five reports should be exportable/printable per standard data system expectations. `budgetSummaryReport()` sets the pattern with Export CSV + Print buttons.

**Actual:**  
| Report | Export CSV | Print |
|--------|-----------|-------|
| `budgetSummaryReport()` | ✅ | ✅ |
| `faSummaryReport()` | ❌ | ❌ |
| `paSummaryReport()` | ❌ | ❌ |
| `frequencyReport()` | ❌ | ❌ |
| `bmPerformanceReport()` | ❌ | ❌ |

All four missing reports build their data into HTML tables — the `ExportUtils.toCSV()` infrastructure is available and used elsewhere, but no export buttons are wired.

---

### M2 — Frequency Thresholds Setting Ignored, Hardcoded Values Used
**File:** `assets/js/modules/reports.js` — `frequencyReport()` (approx. line 300)

**Intended:**  
`SystemSettings.frequency_thresholds` is configurable: `{ normal: { max: 2 }, monitor: { min: 3, max: 4 }, high: { min: 5 } }`. The reports module reads settings.

**Actual:**  
```javascript
// Code reads settings but then ignores the value:
if (total >= 5) level = 'high';
else if (total >= 3) level = 'monitor';
else level = 'normal';
```
The thresholds are hardcoded constants regardless of what `Storage.get(KEYS.SETTINGS).frequency_thresholds` contains.

**Impact:** If an administrator changes frequency thresholds in settings (if a settings UI were ever built), the change would not propagate to the frequency report. The report always uses 3/5 thresholds.

---

### M3 — Global Search Has Narrow FA Field Coverage
**File:** `assets/js/modules/search-module.js` — `performSearch()` FA section (approx. line 340)

**Intended:**  
Global search should enable finding FA records by any meaningful identifier — category name, amount, date, BM, encoding secretary.

**Actual:**  
FA search only matches:
- `r.patient_name.toLowerCase().includes(query)`
- `r.fa_id.toLowerCase().includes(query)`

PA search additionally includes `r.event_purpose`. Neither searches:
- Category name (requires lookup join)
- Amount range
- Date range
- BM name
- Encoded by (secretary name)

**Impact:** Searching for "Medical" in global search returns zero FA results even if 50 FA records are categorized as Medical, because the search doesn't check the resolved category name.

---

### M4 — ActivityLogger API Contract Out of Sync with Implementation
**File:** `assets/js/activity-logger.js` — `log()` (line 30)  
**Documentation:** `claude/api-contract.md`

**Intended (per api-contract.md):**  
`ActivityLogger.log(action, details)`

**Actual (implementation):**  
`ActivityLogger.log(action, actionType, recordType, recordId, details)`

Five parameters vs. two. All call sites correctly use 5 parameters. The api-contract.md documentation is misleading to anyone relying on it as a reference.

---

### M5 — PA Records Have No Status Lifecycle
**Files:** `assets/js/modules/pa-module.js` — entire file; `claude/data-models.md`

**Design gap:**  
FA records go through: `Ongoing → Successful | Denied`. On `Denied`, `Storage.refundBudget()` is called. This models real-world (request → approval/denial).

PA records have no `status` field in the data model. PA records are created and exist permanently in a single "recorded" state. There is no PA status filter (unlike FA list which has one). PA cannot be denied, which means no PA budget refund path exists (which also feeds into C1 — deduction not implemented either). The PA model appears to be "record of assistance given" rather than "request for assistance" — but this distinction is nowhere documented and creates confusion when comparing FA and PA modules.

---

### M6 — `resetAll()` Bypasses Settings Seeding
**File:** `assets/js/storage.js` — `resetAll()` (approx. line 1360)

**Intended:**  
`resetAll()` is a test/development utility to wipe and re-seed data.

**Actual:**  
```javascript
resetAll() {
    Object.values(KEYS).forEach(key => this.remove(key));
    this.seedDefaultData();  // Does NOT seed SETTINGS
}
```
`seedDefaultData()` only seeds: USERS, BOARD_MEMBERS, SECRETARY_ASSIGNMENTS, FA_CATEGORIES, PA_CATEGORIES, BENEFICIARIES, FA_RECORDS, PA_RECORDS, MONTHLY_BUDGETS, ACTIVITY_LOGS, MONTHLY_FREQUENCY, INCOMING_LETTERS, PA_BUDGETS.

Settings are seeded only in `Storage.init()` via `if (!this.get(KEYS.SETTINGS)) { this.set(...) }`. After `resetAll()`, the SETTINGS key is wiped but never re-seeded by `seedDefaultData()`. Any code that reads settings immediately after a reset would get `null`.

**Impact:** After a test reset, `frequencyReport()` and `getCrossBMInfo()` would fail trying to read `settings.frequency_thresholds`.

---

### M7 — `ReportsModule.init()` Has No Role Guard
**File:** `assets/js/modules/reports.js` — `init()` (approx. line 30)

**Intended:**  
Reports are described in documentation as sysadmin-only functionality.

**Actual:**  
`init()` calls `Auth.requireAuth()` (checks logged in) but NOT `Auth.requireRole('sysadmin')`. `getPermissionMatrix()` shows `manage_settings: false` and `view_logs: false` for board_member and secretary, but reports don't check these. A logged-in BM or secretary who navigates directly to `reports.html` sees all BM budget summaries, all FA/PA totals across all BMs, and BM performance comparisons.

**Note:** The sidebar likely doesn't show the reports link for non-sysadmin, but URL-based access works.

---

### M8 — Budget Overview Page (`budget.html`) Has No Role Guard
**File:** `assets/js/app.js` — `routePage()` 'budget' case (approx. line 395)

**Intended:**  
Budget overview shows all BMs' budget data — sysadmin territory.

**Actual:**  
```javascript
case 'budget':
    this.initBudgetPage();  // No Auth.requireRole('sysadmin')
    Router.setPageInfo('Budget Overview');
    break;
```
`initBudgetPage()` renders all BMs' budget cards. No role check before rendering. A secretary who navigates to `budget.html` directly sees all BM budget data.

---

### M9 — Sysadmin Dashboard Cross-BM Card Absent — Only Shows to Secretaries
**File:** `assets/js/modules/dashboard.js` — `renderAdminDashboard()` (approx. line 30)

**Intended:**  
The sysadmin has the broadest view and should be first to see cross-BM fraud indicators.

**Actual:**  
`renderAdminDashboard()` shows: system stats, pending archives, budget overview, recent activity. No cross-BM flagged beneficiaries widget.

`renderStaffDashboard()` has `renderFlaggedBeneficiaries()` which shows cross-BM alerts to secretaries — who can only see their assigned BMs' records. The sysadmin who sees ALL records has no centralized cross-BM fraud dashboard.

---

## LOW Gaps

---

### L1 — Staff Module is Dead Code
**File:** `staff/js/staff.js` (full file — ~80 lines)

`StaffModule` has three data utility functions: `getAssignedBMs()`, `getMyRecentRecords()`, `getMyStats()`. There are no HTML pages under `staff/`. No `routePage()` case mentions `StaffModule`. The module object is never loaded or initialized anywhere.

Likely a placeholder for a future dedicated secretary portal (separate from the shared `pages/` directory). Currently it's isolated, unused utility code.

---

### L2 — Notification System is UI Toast Only — No Email/Push
**File:** `assets/js/notifications.js` (fully read)

All notifications are in-browser toasts or confirm modals only. No email, SMS, or push notification capability exists. `project-brief.md` implies archive request notifications should reach the sysadmin. Currently, sysadmin must manually poll the term management page or dashboard for pending archive requests.

**Note:** This is consistent with the MVP + localStorage architecture, but the gap should be documented for Firebase migration.

---

### L3 — `Utils.ordinal()` Guarded Usage Implies It May Not Exist
**File:** `boardmember/js/boardmember.js` — `initArchives()` (approx. line 533)

```javascript
${Utils.ordinal ? Utils.ordinal(t.term_number) : t.term_number} Term
```

The `?` guard suggests the developer was unsure if `Utils.ordinal` exists. If it doesn't, term history shows raw numbers ("1 Term", "2 Term") instead of ordinals ("1st Term", "2nd Term"). The guard prevents a crash but silently degrades the display.

---

### L4 — `Storage.deductFromPABudget()` Misleadingly Named — Does Not Deduct
**File:** `assets/js/storage.js` — `deductFromPABudget()` (approx. line 585)

Despite its name, this function only **validates** — it checks if `remaining >= amount` and returns `{ success: true/false }`. It updates no storage record. The "deduction" is retrospective: `getPABudgetSummary()` calculates `total_used` by summing all PA records.

This is the root of C1's confusion. The function name implies it performs a deduction. Any developer reading the method signature would expect it to update storage. Its actual behavior is pure validation/read.

---

### L5 — Incoming Letter Create/Edit Activity Logs Are Inconsistent
**File:** `assets/js/modules/incoming-module.js`

Create call: `ActivityLogger.log('Created incoming letter (${category}) from ${senderName}', 'create', 'incoming_letter', letter.letter_id)` — 4 params, missing `details`.

Edit call: `ActivityLogger.log('Updated incoming letter from ${updates.sender_name}', 'update', 'incoming_letter', letterId)` — 4 params, missing `details`.

By contrast FA/PA logging always provides all 5 params including a human-readable details string. Incoming letter activity logs have no details field, making them less useful in the filtered activity log view.

---

### L6 — BM-003 PA Budget Not Seeded
**File:** `assets/js/storage.js` — `seedDefaultData()` (approx. line 1295)

`PA_BUDGETS` seeded for `bm_001` (₱50,000) and `bm_002` (₱30,000) but not for `bm_003` (Pedro Reyes, 2nd term). On first load, `bm_003`'s PA budget page shows a ₱0 pool with no entries. This is inconsistent with the demo data experience but not a functional bug — BM can add entries.

---

### L7 — Seed Data Documentation Mismatch
**File:** `claude/data-models.md` — Storage API Reference section (line 321)

```
Storage.seedSampleData() → Seeds users (5), board members (3), assignments (3), FA records (6), PA records (4)...
```

The actual `seedDefaultData()` seeds: 6 users (1 admin + 3 BMs + 2 secretaries), 3 board members, 2 assignments, 4 FA categories, 4 PA categories, 3 beneficiaries, 2 FA records, 1 PA record, 3 monthly budgets, 2 activity logs, 1 empty MONTHLY_FREQUENCY, 3 INCOMING_LETTERS, 2 PA_BUDGETS.

The documentation claims "6 FA records, 4 PA records" but actual seed data has 2 FA and 1 PA. The method is also named `seedDefaultData()` not `seedSampleData()`. The api reference is out of date.

---

## Working Correctly (Confirmed)

The following were audited and confirmed fully functional:

| Area | Status |
|------|--------|
| FA create flow (form → validate → budget deduct → frequency → log → redirect) | ✅ |
| PA create flow (form → validate → frequency → log → redirect) | ✅ (missing budget gate — see C1) |
| FA status lifecycle (Ongoing → Successful/Denied, Denied refunds budget) | ✅ |
| FA sysadmin hard delete with budget refund | ✅ |
| Category CRUD with archive/restore | ✅ |
| Term archive lifecycle (request → pending → approve/deny → bulk archive) | ✅ |
| FA budget auto-creation per month | ✅ |
| FA budget over-spend hard block | ✅ |
| `updateFABaseBudget()` recalculation | ✅ |
| Cooling period display in FA/PA new form | ✅ |
| Cross-BM detection on beneficiary select | ✅ |
| Cross-BM badge in FA/PA list views | ✅ |
| FA/PA CSV export | ✅ |
| Budget summary report with export/print | ✅ |
| Global search (beneficiary, FA by name/id, PA by name/purpose/id) | ✅ |
| Archive search including letters | ✅ |
| BM management CRUD (add/edit/deactivate/reactivate/export) | ✅ |
| Staff management CRUD (add/edit/deactivate/reactivate/export) | ✅ |
| Secretary assignment from both BM and staff edit modals | ✅ |
| Incoming letter CRUD (list/create/edit/view/export) | ✅ |
| Activity log page with filters, pagination, export | ✅ |
| Dashboard role routing (admin/BM/secretary views) | ✅ |
| BM secretary-logs page | ✅ |
| BM archives page (past term records) | ✅ |
| PA budget entries CRUD (BM side: add/edit/remove) | ✅ |
| `Auth.checkPermission()` BM/secretary scoping | ✅ |
| `getAssignedBMs()` / `getCurrentBMData()` | ✅ |
| RBAC route guards (`requireRole`) on sensitive pages | ✅ (gap noted on budget.html and reports.html) |
| `Validators.validateAndDisplay()` called on FA/PA submit | ✅ |
| Backfill migration for `cooldown_months` and `date_requested` fields | ✅ |

---

## Recommended Fix Priority

### Immediate (blocks correctness):
1. **C1** — Add `deductFromPABudget()` call + success check in `PAModule.submitNewPA()`
2. **C2** — In `confirmNewTerm()`, soft-delete or flag old PA_BUDGETS entries with a `term_number` field before creating new ones

### Short-term (feature completeness):
3. **H1** — Add rollover toggle checkbox to BM budget page, wire to `Storage.setRollover()`
4. **H3** — Add permission flag checkboxes to staff/BM edit modals; add `checkPermission('can_make_permanent_category')` in CategoryManager
5. **H5** — In `FAModule.editRecord()` save handler, compute delta and call `Storage.deductFromBudget()` or `refundBudget()` based on direction
6. **H6** — Add term expiry warning logic in `DashboardModule.renderAdminDashboard()` reading `settings.term_warning_days`
7. **M1** — Add export/print buttons to the remaining 4 report types

### Medium-term (polish and consistency):
8. **H2** — Call `Validators.attachRealTimeValidation()` in FA/PA form init
9. **H4** — Add "Skipped Waiting Period" review section to BM dashboard; surface `skip_bm_noted=false` records
10. **H8** — Replace manual validation in `IncomingModule` with `Validators.validateAndDisplay()`
11. **M2** — Read `settings.frequency_thresholds` in `frequencyReport()` instead of hardcoding
12. **M3** — Extend FA search to match resolved category name
13. **M7** / **M8** — Add `Auth.requireRole('sysadmin')` to reports and budget page routes
14. **M6** — Add settings seeding to `resetAll()` / `seedDefaultData()`

---

*End of audit report. Total gaps: 26 (2 Critical, 8 High, 9 Medium, 7 Low)*
