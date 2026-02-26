# OMSP Tracker — Living Context Document

> **Purpose:** This is a living reference that Claude reads before every change and updates after every session.  
> **Last updated:** 2026-02-26  
> **Session:** SysAdmin CRUD, BM enhancements, Frequency tracking, Incoming Letters module

---

## 1. SYSTEM OVERVIEW

**What it is:** A document tracking & monitoring system for the Office of the Majority & Secretary of the Panlalawigan (OMSP), Province of Bataan. Tracks Financial Assistance (FA), Personal Assistance (PA), and Incoming Letters for 12 Board Members.

**Tech stack:** Static HTML/CSS/JS (vanilla ES6+), localStorage for data, deployed on Vercel.  
**Future:** localStorage → Firebase after MVP supervisor feedback.

---

## 2. ROLE MAP & PERMISSIONS

### Three roles, one dashboard page branching by role:

| Role | Login Page | Can Create | Can View | Special Powers | Demo Creds |
|------|-----------|-----------|---------|----------------|------------|
| **SysAdmin** | `sysadmin/login.html` | Users, Assignments | ALL data | CRUD BMs & staff, approve archives, manage terms, make categories permanent | `admin@omsp.gov.ph` / `admin123` |
| **Board Member** | `pages/login.html` | Budget entries only | Own FA/PA/Letters + own budget | Edit own FA base budget, manage own PA budget pool, request term archive, view secretary logs, browse archives | `cruz@omsp.gov.ph` / `bm123` |
| **Secretary** | `pages/login.html` | FA + PA + Incoming Letters | Assigned BMs' FA, ALL PA, assigned Letters | Add custom categories, export data | `secretary1@omsp.gov.ph` / `sec123` |

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

## 9. RESOLVED QUESTIONS

1. **SysAdmin user management:** ✅ RESOLVED — Implementing full CRUD (Add/Edit/Deactivate) for BMs and Staff.
2. **Secretary ↔ BM assignment UI:** ✅ RESOLVED — Building assignment management into Staff Management page.
3. **Re-election concept:** ✅ RESOLVED — Same account re-used. BM gets "Re-elected" badge + archives page for past terms.
4. **Term history for BM:** ✅ RESOLVED — Dedicated Archives page with FA/PA/Letters grouped by term.
5. **Frequency badges in lists:** ✅ RESOLVED — New column in FA/PA tables + which BMs gave assistance.
6. **Cross-BM alert:** ✅ RESOLVED — All of the above: (a) list row badge, (b) form warning, (c) dashboard section, (d) search results.
7. **Global search scope:** ✅ RESOLVED — Global Search = current term only. Separate "Search Archives" for all terms.

### Still open:
- **Board Member "skip waiting" approval flow:** Where does the BM approve? Notification/modal on dashboard or separate page?
- **PA transparency scope:** Secretaries from ALL board members, or only active/non-archived ones?
- **Login page redesign:** Specific improvements wanted? Same layout + better visuals, or full redesign?
- **Mobile sidebar behavior:** Hamburger slide-out, or always visible?

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
| 2026-02-26 | Created `claude/roles.md` — full role interaction docs | `claude/roles.md` |
| 2026-02-26 | SysAdmin CRUD: Add/Edit/Deactivate BMs with modals | `sysadmin/js/sysadmin.js` |
| 2026-02-26 | SysAdmin CRUD: Add/Edit/Deactivate Staff + assignment mgmt | `sysadmin/js/sysadmin.js` |
| 2026-02-26 | BM: Term badge + Re-elected badge on dashboard/sidebar | Multiple |
| 2026-02-26 | BM: Secretary activity logs page | `boardmember/` |
| 2026-02-26 | BM: Archives page for past term records | `boardmember/` |
| 2026-02-26 | Frequency badges in FA/PA list tables + cross-BM info | `fa-module.js`, `pa-module.js` |
| 2026-02-26 | Cross-BM alerts: list rows, form banners, dashboard section | Multiple |
| 2026-02-26 | Incoming Letters module (new feature) | New files |
| 2026-02-26 | Storage: added INCOMING_LETTERS key + seed data | `storage.js` |
| 2026-02-26 | Router: updated sidebar nav for all roles + new pages | `router.js` |

---

## 11. CURRENT SESSION WORK (2026-02-26)

- [x] Create `claude/roles.md` documentation
- [x] Update LIVING-CONTEXT.md & checklist.md
- [ ] SysAdmin CRUD: Full Add/Edit/Deactivate for BMs
- [ ] SysAdmin CRUD: Full Add/Edit/Deactivate for Staff + assignment UI
- [ ] BM: Term badges (1st/2nd/3rd) + Re-elected badge
- [ ] BM: Secretary activity logs page
- [ ] BM: Archives page for past term records
- [ ] Frequency badges in FA/PA list tables + cross-BM info
- [ ] Cross-BM alerts (list rows, form banners, dashboard flagged section)
- [ ] Incoming Letters module (new feature — Cultural Activities / Solicitations / Invitation Letters)
- [ ] Storage: new key INCOMING_LETTERS + data model + seed data
- [ ] Router: update sidebar nav for all roles + new pages
- [ ] Search Archives feature (separate from Global Search)

## 12. FUTURE WORK

- [ ] Improve login pages (admin, board member, staff) — design + UX polish
- [ ] Add role guards to sysadmin/ and boardmember/ pages
- [ ] Fix `created_by` vs `encoded_by` field mismatch in staff.js
- [ ] Page-by-page quality audit (Phase 5 checklist)
- [ ] Responsive verification on all authenticated pages
