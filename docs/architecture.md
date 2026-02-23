# Architecture Overview

## OMSP Document Tracking & Monitoring System

### System Architecture Diagram

```
┌───────────────────────────────────────────────────────────────┐
│                     BROWSER (Client-Side)                     │
│                                                               │
│  ┌──────────────┐   ┌──────────────┐   ┌────────────────┐     │
│  │  HTML Pages  │   │  CSS Styles  │   │  JavaScript    │     │
│  │  (10 pages)  │   │  (6 files)   │   │  (16 files)    │     │
│  └──────┬───────┘   └──────┬───────┘   └───────┬────────┘     │
│         │                  │                   │              │
│         └──────────────────┼───────────────────┘              │
│                            │                                  │
│  ┌─────────────────────────▼───────────────────────────────┐  │
│  │              JavaScript Application Layer               │  │
│  │                                                         │  │
│  │  ┌─────────┐  ┌──────────┐  ┌────────────────────────┐  │  │
│  │  │  Auth   │  │  Router  │  │  Page Controllers      │  │  │
│  │  │  Guard  │  │  (app.js)│  │  (pages/*.js)          │  │  │
│  │  └────┬────┘  └────┬─────┘  └───────────┬────────────┘  │  │
│  │       │            │                    │               │  │
│  │  ┌────▼────────────▼────────────────────▼────────────┐  │  │
│  │  │              Component Layer                      │  │  │
│  │  │  sidebar.js | header.js | modal.js | toast.js     │  │  │
│  │  │  banner.js  | table.js                            │  │  │
│  │  └────────────────────┬──────────────────────────────┘  │  │
│  │                       │                                 │  │
│  │  ┌────────────────────▼───────────────────────────────┐ │  │
│  │  │              Library Layer                         │ │  │
│  │  │  constants.js | utils.js | storage.js | seed.js    │ │  │
│  │  │  auth.js                                           │ │  │
│  │  └────────────────────┬───────────────────────────────┘ │  │
│  │                       │                                 │  │
│  └───────────────────────┼─────────────────────────────────┘  │
│                          │                                    │
│  ┌───────────────────────▼─────────────────────────────────┐  │
│  │               localStorage (Browser)                    │  │
│  │                                                         │  │
│  │  omsp_users          → User accounts & credentials      │  │
│  │  omsp_board_members  → BM profiles, terms, districts    │  │
│  │  omsp_secretary_assignments → Staff ↔ BM links          │  │
│  │  omsp_fa_case_types  → FA categories (permanent+custom) │  │
│  │  omsp_pa_categories  → PA categories (permanent+custom) │  │
│  │  omsp_beneficiaries  → Client/beneficiary registry      │  │
│  │  omsp_financial_assistance → FA transaction records     │  │
│  │  omsp_personal_assistance  → PA transaction records     │  │
│  │  omsp_monthly_budget_logs  → Monthly budget tracking    │  │
│  │  omsp_activity_logs  → Audit trail of all actions       │  │
│  │  omsp_monthly_frequency → Beneficiary request counts    │  │
│  │  omsp_auth_state     → Current logged-in session        │  │
│  │  omsp_initialized    → Flag: seed data loaded?          │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
└───────────────────────────────────────────────────────────────┘
            │
            │  Deployed as static files
            ▼
┌──────────────────────┐
│       VERCEL         │
│  (Static Hosting)    │
│  - No server needed  │
│  - CDN distributed   │
│  - Auto HTTPS        │
└──────────────────────┘
```

### Layer Responsibilities

| Layer | Files | Purpose |
|-------|-------|---------|
| **HTML Pages** | `index.html`, `dashboard.html`, etc. | Visual structure & layout for each screen |
| **CSS Styles** | `css/variables.css`, `css/base.css`, etc. | Design tokens, resets, component styles, responsive design |
| **Page Controllers** | `js/pages/*.js` | Business logic specific to each page (form handling, data loading) |
| **Components** | `js/components/*.js` | Reusable UI builders (sidebar, modals, tables, toasts, banners) |
| **Library** | `js/lib/*.js` | Core utilities, localStorage CRUD, authentication, seed data |
| **Storage** | Browser localStorage | All data persistence (JSON serialized, no server/database) |

### Data Flow

```
User Action → Page Controller → Storage Layer → localStorage
                ↓                     ↑
            Component Layer     Read/Write JSON
                ↓
            DOM Update (innerHTML / classList)
```

### Authentication Flow

```
index.html (Login)
    │
    ├── User enters email + password
    ├── auth.js → checks localStorage users table
    ├── Match found → save session to omsp_auth_state
    ├── Redirect based on role:
    │   ├── sysadmin    → dashboard.html
    │   ├── board_member → dashboard.html
    │   └── secretary   → dashboard.html
    └── No match → show error toast
```

### Page Access Control

```
Every page (except index.html) runs:
  1. auth.js → checkAuth()
  2. If no session → redirect to index.html
  3. If session valid → load page with role-based UI
  4. Sidebar items filtered by user role
```
