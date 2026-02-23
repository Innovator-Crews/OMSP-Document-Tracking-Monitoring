# System Connections & Data Relationships

## How Each Module Connects

```
┌──────────────────────────────────────────────────────────────────────┐
│                        SYSTEM CONNECTION MAP                         │
│                                                                      │
│  ┌───────────┐          ┌───────────────┐         ┌──────────────┐   │
│  │  LOGIN    │────────▶ | DASHBOARD     │───────▶│   SEARCH     │   │
│  │ index.html│          │ dashboard.html│         │  search.html │   │
│  └───────────┘          └──────┬────────┘         └──────────────┘   │
│                              │                                       │
│               ┌──────────────┼──────────────┐                        │
│               ▼              ▼              ▼                        │
│  ┌─────────────────┐ ┌──────────────┐ ┌───────────────────┐          │
│  │   FA MODULE     │ │  PA MODULE   │ │  ADMIN MODULE     │          │
│  │                 │ │              │ │                   │          │
│  │ fa-list.html    │ │ pa-list.html │ │ admin-users.html  │          │
│  │ fa-create.html  │ │pa-create.html│ │admin-archives.html│          │
│  │                 │ │              │ │ admin-logs.html   │          │
│  └────────┬────────┘ └────────┬───────┘ └───────┬──────────┘         │
│           │                   │                 │                    │
│           └───────────┬───────┘                 │                    │
│                       ▼                         │                    │
│              ┌────────────────┐                 │                    │
│              │  CATEGORIES    │◀───────────────┘                     │
│              │categories.html │                                      │
│              └────────────────┘                                      │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

## Data Entity Relationships

```
USERS
  │
  ├── 1:1 ──▶ BOARD_MEMBERS (if role = board_member)
  │              │
  │              ├── 1:N ──▶ FINANCIAL_ASSISTANCE (bm_id)
  │              ├── 1:N ──▶ PERSONAL_ASSISTANCE  (bm_id)
  │              ├── 1:N ──▶ MONTHLY_BUDGET_LOGS  (bm_id)
  │              └── 1:N ◀── SECRETARY_ASSIGNMENTS (bm_id)
  │
  ├── 1:N ──▶ SECRETARY_ASSIGNMENTS (secretary_user_id)
  │
  ├── 1:N ──▶ FA_CASE_TYPES  (created_by)
  ├── 1:N ──▶ PA_CATEGORIES  (created_by)
  └── 1:N ──▶ ACTIVITY_LOGS  (user_id)

BENEFICIARIES
  │
  ├── 1:N ──▶ FINANCIAL_ASSISTANCE (beneficiary_id)
  ├── 1:N ──▶ PERSONAL_ASSISTANCE  (beneficiary_id)
  └── 1:N ──▶ MONTHLY_FREQUENCY    (beneficiary_id)

FA_CASE_TYPES
  │
  └── 1:N ──▶ FINANCIAL_ASSISTANCE (case_type_id)

PA_CATEGORIES
  │
  └── 1:N ──▶ PERSONAL_ASSISTANCE  (category_id)
```

## Module Dependency Map

### Which JS files does each page need?

| Page | Library Files | Component Files | Page File |
|------|--------------|-----------------|-----------|
| `index.html` | constants, utils, storage, seed, auth | toast | login.js |
| `dashboard.html` | constants, utils, storage, auth | sidebar, header, banner, toast | dashboard.js |
| `fa-list.html` | constants, utils, storage, auth | sidebar, header, table, modal, toast | fa-list.js |
| `fa-create.html` | constants, utils, storage, auth | sidebar, header, modal, toast | fa-create.js |
| `pa-list.html` | constants, utils, storage, auth | sidebar, header, table, modal, toast | pa-list.js |
| `pa-create.html` | constants, utils, storage, auth | sidebar, header, modal, toast | pa-create.js |
| `categories.html` | constants, utils, storage, auth | sidebar, header, table, modal, toast | categories.js |
| `search.html` | constants, utils, storage, auth | sidebar, header, table, toast | search.js |
| `admin-users.html` | constants, utils, storage, auth | sidebar, header, table, modal, toast | admin-users.js |
| `admin-archives.html` | constants, utils, storage, auth | sidebar, header, table, modal, toast | admin-archives.js |
| `admin-logs.html` | constants, utils, storage, auth | sidebar, header, table, toast | admin-logs.js |

## Data Visibility Rules

```
FINANCIAL ASSISTANCE (FA):
├── SysAdmin  → Can see ALL BMs' FA records
├── Board Member → Can see ONLY own FA records
└── Secretary → Can see ONLY assigned BM's FA records

PERSONAL ASSISTANCE (PA):
├── SysAdmin  → Can see ALL PA records
├── Board Member → Can see ONLY own PA records
└── Secretary → Can see ALL PA records (cross-office visibility for duplicate detection)

BUDGET:
├── SysAdmin  → Can see and configure ALL budgets
├── Board Member → Can see ONLY own budget, set rollover preference
└── Secretary → Cannot see budget details

CATEGORIES:
├── SysAdmin  → Full control, can make permanent
├── Board Member → View only
└── Secretary → Can add custom (not permanent), archive if no active records
```

## End-of-Term State Machine

```
                    ┌──────────┐
                    │  ACTIVE  │
                    └────┬─────┘
                         │
              term_end reached
                         │
                    ┌────▼─────┐
                    │ READ-ONLY│
                    └────┬─────┘
                         │
              BM clicks [Request Archive]
                         │
                    ┌────▼──────────┐
                    │ ARCHIVE       │
                    │ REQUESTED     │
                    └────┬──────────┘
                         │
              ┌──────────┼──────────┐
              │                     │
         SysAdmin               SysAdmin
         APPROVES               REJECTS
              │                     │
     ┌────────▼──────┐    ┌────────▼──────┐
     │   ARCHIVED    │    │  READ-ONLY    │
     │  (permanent)  │    │  (try again)  │
     └───────────────┘    └───────────────┘
```
