# Data Models (localStorage Keys)

## localStorage Keys
| Key | Description | Type |
|-----|-------------|------|
| `bataan_sp_users` | All user accounts | Array\<User\> |
| `bataan_sp_board_members` | BM profiles with term info | Array\<BoardMember\> |
| `bataan_sp_secretary_assignments` | Secretary-to-BM mappings | Array\<Assignment\> |
| `bataan_sp_beneficiaries` | Master beneficiary list | Array\<Beneficiary\> |
| `bataan_sp_fa_records` | Financial assistance transactions | Array\<FARecord\> |
| `bataan_sp_pa_records` | Personal assistance transactions | Array\<PARecord\> |
| `bataan_sp_fa_categories` | FA case types (default + custom) | Array\<Category\> |
| `bataan_sp_pa_categories` | PA categories (default + custom) | Array\<Category\> |
| `bataan_sp_monthly_budgets` | Budget tracking per BM per month | Array\<Budget\> |
| `bataan_sp_activity_logs` | Audit trail | Array\<LogEntry\> |
| `bataan_sp_monthly_frequency` | Beneficiary frequency tracking | Array\<Frequency\> |
| `bataan_sp_current_user` | Active session data | User \| null |
| `bataan_sp_settings` | System-wide configuration | Object |

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

### BoardMember
```json
{
  "bm_id": "bm_001",
  "user_id": "usr_002",
  "district_name": "District 1",
  "current_term_number": 1,
  "term_start": "2025-01-01",
  "term_end": "2028-06-30",
  "fa_monthly_budget": 70000,
  "pa_balance": 0,
  "is_active": true,
  "archive_requested": false,
  "archive_requested_at": null,
  "archive_status": "none | pending | approved | rejected",
  "is_archived": false,
  "archived_at": null,
  "archived_by": null
}
```

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

### MonthlyBudget
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

### ActivityLog
```json
{
  "log_id": "log_001",
  "user_id": "usr_005",
  "user_name": "Maria Santos",
  "action": "Created FA request",
  "action_type": "create | edit | archive | restore | login | logout | export | budget_change | skip_waiting | archive_request | archive_approve",
  "record_type": "fa | pa | beneficiary | user | category | budget",
  "record_id": "fa_001",
  "details": "FA request for Juan Dela Cruz - Medical - ₱5,000",
  "created_at": "2025-02-01T10:30:00Z"
}
```

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
