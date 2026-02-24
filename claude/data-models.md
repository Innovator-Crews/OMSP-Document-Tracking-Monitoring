# Data Models (localStorage Keys)

## localStorage Keys
| Key | Constant | Description | Type |
|-----|----------|-------------|------|
| `bataan_sp_users` | `KEYS.USERS` | All user accounts (sysadmin, BM, secretary) | Array\<User\> |
| `bataan_sp_board_members` | `KEYS.BOARD_MEMBERS` | BM profiles with term, budget, archive info | Array\<BoardMember\> |
| `bataan_sp_secretary_assignments` | `KEYS.SECRETARY_ASSIGNMENTS` | Secretary-to-BM mappings | Array\<Assignment\> |
| `bataan_sp_beneficiaries` | `KEYS.BENEFICIARIES` | Master beneficiary list | Array\<Beneficiary\> |
| `bataan_sp_fa_records` | `KEYS.FA_RECORDS` | Financial assistance transactions | Array\<FARecord\> |
| `bataan_sp_pa_records` | `KEYS.PA_RECORDS` | Personal assistance transactions | Array\<PARecord\> |
| `bataan_sp_fa_categories` | `KEYS.FA_CATEGORIES` | FA case types (default + custom) | Array\<Category\> |
| `bataan_sp_pa_categories` | `KEYS.PA_CATEGORIES` | PA categories (default + custom) | Array\<Category\> |
| `bataan_sp_monthly_budgets` | `KEYS.MONTHLY_BUDGETS` | FA budget tracking per BM per month | Array\<MonthlyBudget\> |
| `bataan_sp_pa_budgets` | `KEYS.PA_BUDGETS` | PA budget pool entries per BM | Array\<PABudgetEntry\> |
| `bataan_sp_activity_logs` | `KEYS.ACTIVITY_LOGS` | Audit trail of all system actions | Array\<ActivityLog\> |
| `bataan_sp_monthly_frequency` | `KEYS.MONTHLY_FREQUENCY` | Beneficiary request frequency tracking | Array\<MonthlyFrequency\> |
| `bataan_sp_current_user` | `KEYS.CURRENT_USER` | Active session (logged-in user) | User \| null |
| `bataan_sp_settings` | `KEYS.SETTINGS` | System-wide configuration | SystemSettings |
| `omsp_sidebar_collapsed` | *(direct)* | Sidebar collapsed state | `"true"` \| null |

---

## Object Schemas

### User
```json
{
  "user_id": "usr_001",
  "email": "admin@omsp.gov.ph",
  "password": "hashed_string",
  "full_name": "System Administrator",
  "role": "sysadmin | board_member | secretary",
  "is_active": true,
  "is_temp_account": false,
  "created_at": "2025-01-01T00:00:00Z",
  "last_login": "2025-03-15T09:30:00Z"
}
```
**Notes:**
- `role` determines sidebar nav, permissions, and page access
- `is_temp_account` — staff accounts created by sysadmin that haven't been personalized yet
- Passwords are plaintext in MVP (localStorage), will be hashed when migrating to Firebase

### BoardMember
```json
{
  "bm_id": "bm_001",
  "user_id": "usr_002",
  "district_name": "District 1 - Balanga City",
  "current_term_number": 1,
  "term_start": "2025-01-01",
  "term_end": "2028-06-30",
  "fa_monthly_budget": 70000,
  "pa_balance": 50000,
  "is_active": true,
  "archive_requested": false,
  "archive_requested_at": null,
  "archive_status": "none | pending | approved | denied",
  "is_archived": false,
  "archived_at": null,
  "archived_by": null
}
```
**Notes:**
- `fa_monthly_budget` — base FA budget per month (editable by BM via "Edit Base Budget" modal in `my-fa-budget.html`). When changed, `updateFABaseBudget()` adjusts both the BM record and the current month's budget log.
- `pa_balance` — legacy field; PA budget is now pool-based via `PA_BUDGETS` entries. This field may reflect the sum of PA budget entries for backward compatibility.
- `current_term_number` increments when sysadmin starts a new term for an archived BM.
- `archive_status` flow: `none` → BM clicks "Request Archive" → `pending` → SysAdmin approves → `approved` / denies → `denied`.
- When `is_archived = true`, all FA/PA records for that BM are also marked archived.
- Multi-term: After archive approval, sysadmin can start a new term → `current_term_number++`, dates reset, `is_archived = false`, `archive_status = 'none'`, fresh budget created.

### SecretaryAssignment
```json
{
  "assignment_id": "asgn_001",
  "secretary_user_id": "usr_005",
  "bm_id": "bm_001",
  "can_add_allowance": false,
  "can_make_permanent_category": false,
  "assigned_at": "2025-01-15T00:00:00Z"
}
```
**Notes:**
- A secretary can be assigned to multiple BMs via multiple assignment records.
- `can_add_allowance` and `can_make_permanent_category` are permission flags set by sysadmin.

### Beneficiary
```json
{
  "beneficiary_id": "ben_001",
  "full_name": "Juan Dela Cruz",
  "date_of_birth": "1985-05-15",
  "barangay": "Poblacion",
  "municipality": "Balanga City",
  "contact_number": "09171234567",
  "address": "123 Rizal St, Poblacion, Balanga City",
  "created_at": "2025-02-01T10:00:00Z"
}
```
**Notes:**
- Duplicate detection happens at FA/PA creation time via `full_name` + `date_of_birth` fuzzy match.
- A single beneficiary can have multiple FA and PA records across different BMs and time periods.

### FARecord (Financial Assistance)
```json
{
  "fa_id": "fa_001",
  "beneficiary_id": "ben_001",
  "patient_name": "Maria Dela Cruz",
  "case_type_id": "facat_001",
  "case_type_custom": null,
  "status": "Ongoing | Successful | Denied",
  "amount_requested": 5000,
  "amount_approved": 5000,
  "bm_id": "bm_001",
  "wait_duration_months": 3,
  "wait_duration_custom": null,
  "next_available_date": "2025-05-01",
  "skip_waiting_period": false,
  "skip_reason": null,
  "skip_bm_noted": false,
  "encoded_by": "usr_005",
  "created_at": "2025-02-01T10:30:00Z",
  "updated_at": "2025-02-01T10:30:00Z",
  "is_archived": false,
  "archived_at": null
}
```
**Notes:**
- FA records are **private per BM** — only the BM and their assigned secretary can see them.
- `amount_approved` is deducted from `MonthlyBudget.remaining_amount` via `Storage.deductFromBudget()`.
- `skip_waiting_period` + `skip_reason` + `skip_bm_noted` are set when a secretary requests to bypass the cooling-off period.
- On term archive, all FA records for that BM get `is_archived = true`.

### PARecord (Personal Assistance)
```json
{
  "pa_id": "pa_001",
  "beneficiary_id": "ben_001",
  "client_name": "Juan Dela Cruz",
  "address": "Poblacion, Balanga City",
  "event_purpose": "Medical check-up assistance",
  "category_id": "pacat_001",
  "action_taken": "Provided assistance",
  "amount_provided": 2000,
  "bm_id": "bm_001",
  "skip_waiting_period": false,
  "skip_reason": null,
  "skip_bm_noted": false,
  "encoded_by": "usr_005",
  "office_note": null,
  "flagged_for_review": false,
  "created_at": "2025-02-15T14:00:00Z",
  "updated_at": "2025-02-15T14:00:00Z",
  "is_archived": false
}
```
**Notes:**
- PA records are **transparent** — all secretaries can see all PA records (cross-BM visibility to detect fraud/duplicates).
- `amount_provided` is deducted from PA budget pool via `Storage.deductFromPABudget()` if PA budgets exist.
- `flagged_for_review` is set when frequency thresholds are exceeded.

### Category (FA or PA)
```json
{
  "id": "facat_001",
  "name": "Medical",
  "is_default": true,
  "is_permanent": true,
  "created_by": "usr_001",
  "created_at": "2025-01-01T00:00:00Z",
  "is_archived": false,
  "archived_at": null,
  "archived_by": null
}
```
**Default FA Categories:** Medical, Hospital Bill, Lab / Therapy, Burial  
**Default PA Categories:** Personal, Hospital Bill, Medical, Others  
**Notes:**
- `is_permanent = true` → cannot be archived (system defaults)
- `is_default = true` → pre-seeded category
- Custom categories can be archived only if no active records use them.
- SysAdmin can make any custom category permanent.

### MonthlyBudget (FA Budget per BM per Month)
```json
{
  "log_id": "budg_001",
  "bm_id": "bm_001",
  "year_month": "2025-02",
  "base_budget": 70000,
  "rollover_amount": 0,
  "rollover_selected": false,
  "total_budget": 70000,
  "used_amount": 15000,
  "remaining_amount": 55000,
  "closed_at": null
}
```
**Notes:**
- Auto-created by `Storage.getCurrentBudget(bmId)` when first accessed in a month.
- `base_budget` comes from `BoardMember.fa_monthly_budget` (default ₱70,000, editable by BM).
- `rollover_amount` carries over from previous month's `remaining_amount` if `rollover_selected` was `true`.
- `total_budget = base_budget + rollover_amount`.
- `remaining_amount = total_budget - used_amount`.
- `updateFABaseBudget(bmId, newBase)` recalculates: `total_budget = newBase + rollover_amount`, adjusts `remaining_amount` by the delta.

### PABudgetEntry (PA Budget Pool per BM) ← NEW
```json
{
  "pa_budget_id": "pab_001",
  "bm_id": "bm_001",
  "amount": 50000,
  "description": "Initial PA Budget Allocation",
  "added_by": "usr_bm01",
  "created_at": "2025-01-15T10:00:00Z"
}
```
**Notes:**
- PA budget is **pool-based** (not monthly like FA). BM can add/edit/remove entries anytime.
- `Storage.getPABudgets(bmId)` returns all entries for a BM, sorted newest first.
- `Storage.getPABudgetSummary(bmId)` calculates: `total_pool` (sum of all entry amounts), `total_used` (sum of PA record amounts for that BM), `remaining = total_pool - total_used`.
- `Storage.addPABudget(bmId, amount, description, addedBy)` creates a new entry.
- `Storage.updatePABudget(entryId, amount, description)` modifies an existing entry.
- `Storage.removePABudget(entryId)` soft-deletes an entry.
- `Storage.deductFromPABudget(bmId, amount)` validates that `remaining >= amount` before allowing a PA record to be created.

### ActivityLog
```json
{
  "log_id": "log_001",
  "user_id": "usr_005",
  "user_name": "Maria Santos",
  "action": "Created FA request",
  "action_type": "create | edit | archive | restore | login | logout | export | budget_change | skip_waiting | archive_request | archive_approve",
  "record_type": "fa | pa | beneficiary | user | category | budget | term",
  "record_id": "fa_001",
  "details": "FA request for Juan Dela Cruz - Medical - ₱5,000",
  "created_at": "2025-02-01T10:30:00Z"
}
```
**Notes:**
- Logged automatically on every data-modifying action via `ActivityLogger.log()`.
- `record_type: "term"` added for term archive requests, approvals, denials, and new term creation.
- All activity logs are viewable on `pages/activity-logs.html` with filtering by type, date, user.

### MonthlyFrequency
```json
{
  "freq_id": "freq_001",
  "beneficiary_id": "ben_001",
  "year_month": "2025-02",
  "fa_count": 1,
  "pa_count": 2,
  "total_amount": 7000,
  "bm_ids": ["bm_001", "bm_003"]
}
```
**Notes:**
- Tracks how many times a beneficiary requested assistance in a given month.
- Frequency badges: 🟢 Normal (1-2), 🟡 Monitor (3-4), 🔴 High (5+).
- `bm_ids` tracks which BMs the beneficiary visited (cross-BM tracking for fraud detection).

### SystemSettings
```json
{
  "default_fa_budget": 70000,
  "term_warning_days": [90, 30, 7],
  "frequency_thresholds": {
    "normal": { "min": 0, "max": 2 },
    "monitor": { "min": 3, "max": 4 },
    "high": { "min": 5, "max": 999 }
  },
  "default_wait_months": 3,
  "allow_rollover": true
}
```

---

## Storage API Reference (storage.js)

### Core CRUD Methods
| Method | Description |
|--------|-------------|
| `Storage.getAll(key)` | Get all records from a localStorage key |
| `Storage.get(key)` | Alias for getAll |
| `Storage.set(key, data)` | Set entire array for a key |
| `Storage.add(key, record)` | Append a record to an array |
| `Storage.getById(key, id, idField)` | Find record by ID field |
| `Storage.update(key, id, updates, idField)` | Partial update a record |
| `Storage.remove(key, id, idField)` | Hard delete (rarely used) |
| `Storage.softDelete(key, id, idField)` | Set `is_archived = true` |
| `Storage.restore(key, id, idField)` | Set `is_archived = false` |
| `Storage.query(key, filters, options)` | Query with filters & sorting |
| `Storage.generateId(prefix)` | Generate unique ID like `fa_a1b2c3` |

### FA Budget Methods
| Method | Description |
|--------|-------------|
| `Storage.getCurrentBudget(bmId)` | Get or auto-create current month's FA budget |
| `Storage.getBudgetHistory(bmId)` | Get all monthly budgets for a BM, sorted by year_month desc |
| `Storage.deductFromBudget(bmId, amount)` | Deduct from current month; returns `{ success, budget, error? }` |
| `Storage.updateFABaseBudget(bmId, newBase)` | Change the base FA budget; recalculates totals + remaining |

### PA Budget Methods (NEW)
| Method | Description |
|--------|-------------|
| `Storage.getPABudgets(bmId)` | Get all PA budget entries for a BM (sorted newest first) |
| `Storage.getPABudgetSummary(bmId)` | Returns `{ total_pool, total_used, remaining, entries[] }` |
| `Storage.addPABudget(bmId, amount, description, addedBy)` | Add a new PA budget entry |
| `Storage.updatePABudget(entryId, amount, description)` | Update an existing PA budget entry |
| `Storage.removePABudget(entryId)` | Remove (hard delete) a PA budget entry |
| `Storage.deductFromPABudget(bmId, amount)` | Validate remaining pool; returns `{ success, remaining, error? }` |

### Seed Data
| Method | Description |
|--------|-------------|
| `Storage.seedSampleData()` | Seeds users (5), board members (3), assignments (3), FA records (6), PA records (4), categories (4+4), budgets (6), beneficiaries (6), PA budgets (2), settings |
