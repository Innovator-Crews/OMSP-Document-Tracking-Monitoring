# OMSP Tracker — Living Context Document

> **Purpose:** This is a living reference that Claude reads before every change and updates after every session.  
> **Last updated:** 2026-02-25  
> **Session:** Landing page design improvements + initial system audit

---

## 1. SYSTEM OVERVIEW

**What it is:** A document tracking & monitoring system for the Office of the Majority & Secretary of the Panlalawigan (OMSP), Province of Bataan. Tracks Financial Assistance (FA) and Personal Assistance (PA) records for 12 Board Members.

**Tech stack:** Static HTML/CSS/JS (vanilla ES6+), localStorage for data, deployed on Vercel.  
**Future:** localStorage → Firebase after MVP supervisor feedback.

---

## 2. ROLE MAP & PERMISSIONS

### Three roles, one dashboard page branching by role:

| Role | Login Page | Can Create | Can View | Special Powers | Demo Creds |
|------|-----------|-----------|---------|----------------|------------|
| **SysAdmin** | `sysadmin/login.html` | Nothing (read-only) | ALL data | Manage users, approve archives, manage terms, make categories permanent | `admin@omsp.gov.ph` / `admin123` |
| **Board Member** | `pages/login.html` | Nothing | Own FA/PA + own budget | Edit own FA base budget, manage own PA budget pool, request term archive, approve "skip waiting" | `cruz@omsp.gov.ph` / `bm123` |
| **Secretary** | `pages/login.html` | FA + PA records | Assigned BMs' FA, ALL PA | Add custom categories, export data | `secretary1@omsp.gov.ph` / `sec123` |

### Critical access rules:
- **FA is PRIVATE** — only the BM's assigned secretary + that BM + SysAdmin can see FA records
- **PA is TRANSPARENT** — ALL secretaries see ALL PA records (fraud detection)
- Secretary can only create FA for **assigned** BMs, but can create PA for **any active** BM
- `Auth.checkPermission(permission, { bmId })` enforces context-based checks

### Permission matrix (from auth.js):
```
SysAdmin:    view_fa ✓, create_fa ✗, view_pa ✓, create_pa ✗, view_budget ✓, manage_users ✓, manage_categories ✓, global_search ✓, view_reports ✓, manage_terms ✓
Board Member: view_fa ✓(own), create_fa ✗, view_pa ✓(own), create_pa ✗, view_budget ✓(own), manage_users ✗, manage_categories ✗, global_search ✗, view_reports ✗, manage_terms ✓(own)
Secretary:   view_fa ✓(assigned), create_fa ✓(assigned), view_pa ✓(all), create_pa ✓(any), view_budget ✓, manage_users ✗, manage_categories ✓(custom only), global_search ✓, view_reports ✓, manage_terms ✗
```

---

## 3. DATA FLOW — How roles interact

```
┌─────────────┐     creates FA/PA      ┌──────────────┐
│  Secretary   │ ─────────────────────► │  FA/PA Store │
│  (encoder)   │                        │ (localStorage)│
└──────┬───────┘                        └──────┬───────┘
       │                                       │
       │ assigned to BM via                    │ records linked
       │ SecretaryAssignment                   │ via bm_id
       │                                       │
┌──────▼───────┐     views own data     ┌──────▼───────┐
│ Board Member │ ◄──────────────────── │   Dashboard   │
│ (reads only) │                        │ (role-filtered)│
└──────┬───────┘                        └──────────────┘
       │ requests archive                      ▲
       │                                       │ views everything
┌──────▼───────┐     approves/denies    ┌──────┴───────┐
│   SysAdmin   │ ◄───────────────────► │  SysAdmin     │
│ (god mode)   │                        │  Dashboard    │
└──────────────┘                        └──────────────┘
```

**Key wiring:**
- `SecretaryAssignment` maps `secretary_user_id` → `bm_id` (M:N)
- FA records: `bm_id` + `encoded_by` (the secretary who created it)
- PA records: `bm_id` + `encoded_by` — but visible cross-BM
- Budget: FA is monthly per BM (`MonthlyBudget`), PA is pool-based per BM (`PABudgetEntry`)
- Frequency: `MonthlyFrequency` tracks per-beneficiary request counts across BMs

---

## 4. ROUTING & PAGE MAP

**Strategy:** File-based (no SPA). Each HTML page loads shared scripts; `App.init()` → `Router.getCurrentPage()` → dispatches to module.

| Page | Module | Role guard | Notes |
|------|--------|-----------|-------|
| `pages/dashboard.html` | `DashboardModule.init()` | Any authed | Branches by role internally |
| `pages/fa-new.html` | `FAModule.initNewForm()` | Secretary only | BM dropdown = assigned BMs only |
| `pages/fa-list.html` | `FAModule.initList()` | Any authed | Filtered by role (assigned/own/all) |
| `pages/pa-new.html` | `PAModule.initNewForm()` | Secretary only | BM dropdown = ALL active BMs |
| `pages/pa-list.html` | `PAModule.initList()` | Any authed | Secretary sees all, BM sees own |
| `pages/categories.html` | `CategoryManager.init()` | Any authed | Secretary: custom only |
| `pages/term-management.html` | `TermManager.init()` | Any authed | Branches: BM requests, SysAdmin approves |
| `pages/global-search.html` | `SearchModule.init()` | Any authed | BM has `global_search: false` in perms |
| `pages/reports.html` | `ReportsModule.init()` | Any authed | |
| `pages/activity-logs.html` | `App.initActivityLogs()` | Any authed | Non-admin sees own only |
| `pages/budget.html` | `App.initBudgetPage()` | Any authed | |
| `sysadmin/bm-management.html` | `SysAdminModule.initBMManagement()` | **NO GUARD** ⚠️ | Should be SysAdmin only |
| `sysadmin/staff-management.html` | `SysAdminModule.initStaffManagement()` | **NO GUARD** ⚠️ | Should be SysAdmin only |
| `boardmember/my-fa-budget.html` | `BoardMemberModule.initMyBudget()` | **NO GUARD** ⚠️ | Should be BM only |
| `boardmember/my-pa-budget.html` | `BoardMemberModule.initPABudget()` | **NO GUARD** ⚠️ | Should be BM only |

---

## 5. KNOWN ISSUES & GAPS

### Security
- [ ] **No role guard on sysadmin/ and boardmember/ pages** — only `Auth.requireAuth()` is called globally. Secretary could navigate to `sysadmin/bm-management.html`.
- [ ] **Plaintext passwords** in localStorage (MVP acknowledged)
- [ ] **No session expiration** — session persists until manual logout

### Data Flow Bugs
- [ ] **Field name mismatch:** `staff.js` filters by `created_by` but records use `encoded_by`
- [ ] **bm_003 has no secretary assigned** in seed data — District 3 can't get FA records created
- [ ] **Board Member sidebar shows "Global Search"** but their permission matrix says `global_search: false`
- [ ] **Secretary sidebar missing Budget link** — has permission `view_budget: true` but no nav link

### Missing Features
- [ ] **No CRUD UI for user management** in SysAdmin pages — only read-only tables are rendered
- [ ] No "Add Board Member" or "Add Staff" forms in sysadmin module

---

## 6. STORAGE KEYS (14 total)

| Key | Constant | What's stored |
|-----|----------|---------------|
| `bataan_sp_users` | `KEYS.USERS` | All user accounts |
| `bataan_sp_board_members` | `KEYS.BOARD_MEMBERS` | BM profiles + term/archive info |
| `bataan_sp_secretary_assignments` | `KEYS.SECRETARY_ASSIGNMENTS` | Secretary → BM mappings |
| `bataan_sp_beneficiaries` | `KEYS.BENEFICIARIES` | Master beneficiary list |
| `bataan_sp_fa_records` | `KEYS.FA_RECORDS` | FA transactions |
| `bataan_sp_pa_records` | `KEYS.PA_RECORDS` | PA transactions |
| `bataan_sp_fa_categories` | `KEYS.FA_CATEGORIES` | FA case types |
| `bataan_sp_pa_categories` | `KEYS.PA_CATEGORIES` | PA categories |
| `bataan_sp_monthly_budgets` | `KEYS.MONTHLY_BUDGETS` | FA budget per BM per month |
| `bataan_sp_pa_budgets` | `KEYS.PA_BUDGETS` | PA budget pool entries |
| `bataan_sp_activity_logs` | `KEYS.ACTIVITY_LOGS` | Audit trail |
| `bataan_sp_monthly_frequency` | `KEYS.MONTHLY_FREQUENCY` | Beneficiary frequency tracking |
| `bataan_sp_current_user` | `KEYS.CURRENT_USER` | Active session |
| `bataan_sp_settings` | `KEYS.SETTINGS` | System config |

---

## 7. FILE STRUCTURE QUICK REFERENCE

```
index.html                    ← Landing page (public)
pages/login.html              ← Staff + BM login
sysadmin/login.html           ← SysAdmin login
pages/dashboard.html          ← Shared dashboard (role-filtered)
pages/fa-new.html             ← FA creation form (secretary)
pages/fa-list.html            ← FA records list (role-filtered)
pages/pa-new.html             ← PA creation form (secretary)
pages/pa-list.html            ← PA records list
pages/categories.html         ← Category management
pages/term-management.html    ← Term archive flow
pages/global-search.html      ← Cross-record search
pages/reports.html            ← Analytics & reports
pages/activity-logs.html      ← Audit logs
pages/budget.html             ← Budget overview
boardmember/my-fa-budget.html ← BM's FA budget management
boardmember/my-pa-budget.html ← BM's PA budget management
sysadmin/bm-management.html   ← SysAdmin BM management
sysadmin/staff-management.html← SysAdmin staff management
```

### Key JS modules:
```
assets/js/auth.js             ← Login, logout, permissions, role checks
assets/js/storage.js          ← All localStorage CRUD + seed data
assets/js/app.js              ← Init, routing dispatch, sidebar
assets/js/router.js           ← Page detection, sidebar link generation
assets/js/utils.js            ← Formatting, pagination, odometer, empty states
assets/js/icons.js            ← SVG icon library
assets/js/notifications.js    ← Toasts, confirm modals
assets/js/activity-logger.js  ← Audit log writer
assets/js/export.js           ← CSV/data export
assets/js/validators.js       ← Form validation helpers
assets/js/modules/dashboard.js      ← Dashboard role-branching
assets/js/modules/fa-module.js      ← FA CRUD + list + form
assets/js/modules/pa-module.js      ← PA CRUD + list + form
assets/js/modules/category-manager.js ← Category CRUD
assets/js/modules/term-manager.js   ← Term archive flow
assets/js/modules/search-module.js  ← Global search
assets/js/modules/reports.js        ← Analytics
sysadmin/js/sysadmin.js             ← SysAdmin-specific pages
boardmember/js/boardmember.js       ← BM-specific pages
staff/js/staff.js                   ← Staff utility helpers
```

---

## 8. CSS ARCHITECTURE

**Design tokens:** All in `assets/css/main.css` — `--space-*`, `--text-*`, `--font-*`, `--neutral-*`, `--primary-*`, `--secondary-*`, `--accent-*`, `--success-*`, `--danger-*`, `--radius-*`, `--shadow-*`, `--z-*`, `--transition-*`

**Component CSS:** `assets/css/components.css` — Buttons, badges, forms, cards, modals, tables, odometer, toasts, sidebar

**Layout CSS:** `assets/css/layout.css` — Sidebar (260px/64px collapsed), main content, header, responsive breakpoints

**Page-specific CSS:** `assets/css/pages/*.css` — One file per page feature

**Approach:** Light theme (`#F8FAFC` bg), Inter font, professional government aesthetic, mobile-first breakpoints at 1024/768/480/320px

---

## 9. QUESTIONS FOR THE USER (Endpoints needing clarification)

1. **SysAdmin user management:** The sysadmin pages (`bm-management.html`, `staff-management.html`) currently seem read-only. Should I implement full CRUD (add/edit/deactivate board members and staff) or is that already done and I'm missing it?

2. **Secretary ↔ BM assignment UI:** How does a SysAdmin assign a secretary to a board member? Is there a UI for this or is it seed-data only for now?

3. **Board Member "skip waiting" approval flow:** Where does the BM approve a secretary's request to skip the cooling-off period? Is it a notification/modal on their dashboard, or a separate page?

4. **PA transparency scope:** "All secretaries see all PA records" — does this mean secretaries from ALL board members, or only active/non-archived ones?

5. **Login page redesign:** What specific improvements do you want for the admin, board member, and staff login pages? Same structural layout but better visuals? Or a complete redesign? Any specific branding/color direction?

6. **Mobile sidebar behavior:** Currently at ≤768px the collapse button is hidden. Does the sidebar become a hamburger slide-out, or is it always visible on mobile?

---

## 10. CHANGE LOG

| Date | What changed | Files modified |
|------|-------------|----------------|
| 2026-02-25 | Fixed mockup stat value alignment (% suffix, digit centering) | `assets/css/pages/landing.css` |
| 2026-02-25 | Fixed hero logo clamp (inverted min/max → proper responsive) | `assets/css/pages/landing.css` |
| 2026-02-25 | Enhanced stats band with deeper frosted glass + diagonal lines | `assets/css/pages/landing.css` |
| 2026-02-25 | Added colored left-borders to 6 feature cards | `assets/css/pages/landing.css` |
| 2026-02-25 | Story strip rows animate on scroll reveal (scale + stagger) | `assets/css/pages/landing.css` |
| 2026-02-25 | Mockup card pulses with glow on each live-feed row update | `assets/css/pages/landing.css`, `assets/js/landing.js` |
| 2026-02-25 | Mobile stat grid keeps 3 columns (reduced padding) vs orphan | `assets/css/pages/landing.css` |
| 2026-02-25 | CTA section gets mesh gradient + conic-gradient pattern | `assets/css/pages/landing.css` |
| 2026-02-25 | Created this living context document | `claude/LIVING-CONTEXT.md` |

---

## 11. NEXT PLANNED WORK

- [ ] Improve login pages (admin, board member, staff) — design + UX polish
- [ ] Add role guards to sysadmin/ and boardmember/ pages
- [ ] Fix `created_by` vs `encoded_by` field mismatch in staff.js
- [ ] Wire SysAdmin CRUD for board member & staff management
- [ ] Address Board Member sidebar showing Global Search (permission mismatch)
- [ ] Add Budget link to Secretary sidebar nav
