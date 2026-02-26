# Implementation Checklist

## Phase 1: Foundation ✅
- ✅ Project structure created
- ✅ Claude alignment docs complete (`claude/` folder: project-brief, data-models, user-flows, api-contract, component-library, checklist)
- ✅ CSS variables & reset defined (`main.css` — design tokens, reset, base, utilities)
- ✅ CSS components (`components.css` — buttons, cards, forms, tables, badges, modals, toasts)
- ✅ CSS layout (`layout.css` — sidebar, app shell, header, grid, responsive breakpoints)
- ✅ CSS animations (`animations.css` — keyframes, skeletons, transition utilities, reduced-motion)
- ✅ CSS page-specific styles (9 page CSS files created in `assets/css/pages/`)
- ✅ LocalStorage wrapper (`storage.js`) working
- ✅ Utility functions (`utils.js`) complete
- ✅ Form validation (`validators.js`) working
- ✅ Authentication (`auth.js`) functional — login, logout, role-based guards, session mgmt
- ✅ Notifications/toast (`notifications.js`)
- ✅ Router/navigation (`router.js`) — sidebar rendering, page routing, SVG icon nav
- ✅ App entry point (`app.js`) — init, routing, shell icon injection, login handling
- ✅ SVG icon system (`icons.js`) — 90+ Lucide-style icons, `Icons.render()` / `Icons.nav()` API
- ✅ Landing page (`index.html`) — public-facing with hero, features, roles, team, CTA
- ✅ Staff/BM login page (`pages/login.html`) — 2-column layout, demo accounts
- ✅ Admin login page (`sysadmin/login.html`) — dark admin branding, separate flow

## Phase 2: Core Features ✅
- ✅ Dashboard module (`dashboard.js`) renders role-specific views (admin, BM, staff)
- ✅ FA module — create with budget deduction (`fa-module.js`, `fa-new.html`)
- ✅ FA module — list with filters (`fa-module.js`, `fa-list.html`)
- ✅ FA module — duplicate beneficiary detection
- ✅ PA module — create with waiting period check (`pa-module.js`, `pa-new.html`)
- ✅ PA module — list visible to all secretaries (`pa-module.js`, `pa-list.html`)
- ✅ PA module — skip waiting with reason
- ✅ Global search with frequency badges (`search-module.js`, `global-search.html`)
- ✅ Category management — permanent vs custom (`category-manager.js`, `categories.html`)
- ✅ Category archive/restore flow
- ✅ Budget tracking & rollover
- ✅ Activity logging on all actions (`activity-logger.js`, `activity-logs.html`)
- ✅ Monthly frequency tracker
- ✅ Export to CSV (`export.js`)

## Phase 3: Admin & Role Pages ✅
- ✅ SysAdmin module (`sysadmin/js/sysadmin.js`) — manages BM & staff pages
- ✅ BM management page (`sysadmin/bm-management.html`) — card grid, stat cards
- ✅ Staff management page (`sysadmin/staff-management.html`) — assignment, accounts
- ✅ Term & archive management (`term-manager.js`, `term-management.html`)
- ✅ Board Member module (`boardmember/js/boardmember.js`)
- ✅ BM budget view (`boardmember/my-fa-budget.html`)
- ✅ Reports page (`reports.js`, `reports.html`)
- ✅ Budget overview page (`budget.html`)

## Phase 4: Polish & UX Enhancements ✅
- ✅ All animations smooth & light theme consistent (cubic-bezier transitions across landing, login, components)
- ✅ Empty states designed (SVG icons + text) + `Utils.renderEmptyState()` utility
- ✅ Pagination utility (`Utils.paginate()` + `Utils.renderPagination()`)
- ✅ Loading states implemented (spinners, skeletons)
- ✅ Error handling graceful (banners, toasts)
- ✅ Export to CSV working
- ✅ Responsive at 320px, 480px, 768px, 1024px, 1440px — landing + login pages
- ✅ Overflow containment — global (layout, components, landing, login)
- ✅ Sidebar collapse to icon-only mode (64px, CSS transitions, localStorage persistence)
- ✅ Sidebar profile CSS (avatar circle, name, role text, flex row)
- ✅ Sidebar logout CSS (danger hover state, icon alignment)
- ✅ Logout confirmation modal (Notifications.confirm before Auth.logout)
- ✅ Role-based theming via `data-role` attribute (blue/amber/teal)
- ⬜ Responsive verified on all authenticated pages
- ⬜ No console errors
- ✅ README documentation complete
- ✅ vercel.json deployment config

## Phase 5: Budget & Term Features ✅
- ✅ PA budget system (`Storage.getPABudgets`, `addPABudget`, `updatePABudget`, `removePABudget`)
- ✅ PA budget page (`boardmember/my-pa-budget.html`) with full CRUD UI
- ✅ PA budget pool-based model (not monthly like FA)
- ✅ PA budget deduction validation (`Storage.deductFromPABudget`)
- ✅ PA budget dashboard integration (BM dashboard shows PA budget card + progress bar)
- ✅ FA budget editing by BM (`Storage.updateFABaseBudget`, edit modal in my-fa-budget)
- ✅ FA budget rollover bug fix (`budget.rollover` → `budget.rollover_amount`)
- ✅ End Term visible in BM account (`TermManager.init()` role routing fix)
- ✅ Multi-term logic (SysAdmin starts new term for archived BM, `TermManager.showNewTermModal`)
- ✅ "My PA Budget" sidebar link for board_member role
- ✅ `credit-card` icon added to icons.js

## Phase 6: SysAdmin CRUD, BM Enhancements, Frequency & Incoming Letters 🔧
- ⬜ `claude/roles.md` created — comprehensive role documentation
- ⬜ `claude/LIVING-CONTEXT.md` updated with session changes
- ⬜ `claude/checklist.md` updated with Phase 6 items

### 6A: SysAdmin Full CRUD
- ⬜ SysAdmin: Add Board Member (modal form, generates user + BM record + empty budgets)
- ⬜ SysAdmin: Edit Board Member (name, district, contact info)
- ⬜ SysAdmin: Deactivate Board Member (soft-delete, preserves records)
- ⬜ SysAdmin: Add Staff (modal form, generates user + staff record)
- ⬜ SysAdmin: Edit Staff (name, position, contact info)
- ⬜ SysAdmin: Deactivate Staff (soft-delete, preserves records)
- ⬜ SysAdmin: Assign/Reassign Secretary to Board Member
- ⬜ SysAdmin: Activity logging for all CRUD actions

### 6B: Board Member Enhancements
- ⬜ Term badges (1st Term / 2nd Term / 3rd Term) — computed from `board_members[].terms[]` length
- ⬜ Re-elected badge — shown when BM has >1 term
- ⬜ BM: View Secretary Activity Logs page (`boardmember/secretary-logs.html`)
- ⬜ BM: Archives page to view past-term FA/PA records (`boardmember/archives.html`)
- ⬜ BM sidebar: Add Secretary Logs + Archives links, remove Global Search

### 6C: Frequency & Cross-BM Tracking
- ⬜ FA list table: Add frequency column with badge per beneficiary
- ⬜ PA list table: Add frequency column with badge per beneficiary
- ⬜ PA detail modal: Show frequency badge
- ⬜ Cross-BM alert: Banner in FA/PA new record forms when beneficiary got aid from other BMs
- ⬜ Cross-BM alert: Flagged row indicator in FA/PA list tables
- ⬜ Cross-BM alert: Dashboard section showing flagged beneficiaries
- ⬜ Cross-BM alert: Search results show cross-BM info

### 6D: Incoming Letters Module (NEW)
- ⬜ Data model: `INCOMING_LETTERS` localStorage key + CRUD methods in `storage.js`
- ⬜ Seed data: Sample incoming letters for demo
- ⬜ New page: `pages/incoming-list.html` — list with filters
- ⬜ New page: `pages/incoming-new.html` — create form
- ⬜ New CSS: `assets/css/pages/incoming.css`
- ⬜ New module: `assets/js/modules/incoming-module.js`
- ⬜ Fields: date_received, name, address, event, purpose, action_taken, date_of_event, date_released, concerned_office, remarks
- ⬜ Categories: Cultural Activities, Solicitations, Invitation Letters
- ⬜ Router: Add Incoming Letters links for secretary & staff sidebar
- ⬜ App.js: Add route dispatch for incoming pages
- ⬜ Auth: Add permissions for incoming letters

### 6E: Search Archives
- ⬜ New page: Search Archives (`pages/search-archives.html`) — searches across archived term records
- ⬜ Global Search: Limited to current term records only
- ⬜ Secretary sidebar: Add Search Archives link, fix missing Budget Overview link

---

## Phase 7: Page-by-Page Quality Audit

Each page must pass: **HTML structure** ✔ | **CSS styling** ✔ | **JS wiring** ✔ | **Responsive** ✔ | **Overflow-safe** ✔

### Public Pages (no auth)
| # | Page | HTML | CSS | JS | Responsive | Status |
|---|------|------|-----|-----|------------|--------|
| 1 | `index.html` (Landing) | `index.html` | `landing.css` | inline script (nav scroll, mobile toggle) | 320–1440px | ⬜ |
| 2 | `pages/login.html` (Staff/BM Login) | `pages/login.html` | `login.css` | `app.js → initLoginPage()` | 320–1440px | ⬜ |
| 3 | `sysadmin/login.html` (Admin Login) | `sysadmin/login.html` | `login.css` + inline overrides | `app.js → initLoginPage()` | 320–1440px | ⬜ |

### Authenticated Pages — Staff/Secretary
| # | Page | HTML | CSS | JS Module | Responsive | Status |
|---|------|------|-----|-----------|------------|--------|
| 4 | Dashboard | `pages/dashboard.html` | `dashboard.css` | `dashboard.js` | 320–1440px | ⬜ |
| 5 | FA Records List | `pages/fa-list.html` | `fa-list.css` | `fa-module.js` | 320–1440px | ⬜ |
| 6 | FA New Record | `pages/fa-new.html` | `forms.css` + `fa-new.css` | `fa-module.js` | 320–1440px | ⬜ |
| 7 | PA Records List | `pages/pa-list.html` | `pa-list.css` | `pa-module.js` | 320–1440px | ⬜ |
| 8 | PA New Record | `pages/pa-new.html` | `forms.css` + `pa-new.css` | `pa-module.js` | 320–1440px | ⬜ |
| 9 | Global Search | `pages/global-search.html` | `search.css` | `search-module.js` | 320–1440px | ⬜ |
| 10 | Categories | `pages/categories.html` | `admin.css` + `categories.css` | `category-manager.js` | 320–1440px | ⬜ |
| 11 | Term & Archive | `pages/term-management.html` | `admin.css` + `term-management.css` | `term-manager.js` | 320–1440px | ⬜ |
| 12 | Reports | `pages/reports.html` | `reports.css` | `reports.js` | 320–1440px | ⬜ |
| 13 | Activity Logs | `pages/activity-logs.html` | `activity-logs.css` | `activity-logger.js` (via `app.js`) | 320–1440px | ⬜ |
| 14 | Budget Overview | `pages/budget.html` | `budget.css` | `dashboard.js` (budget section) | 320–1440px | ⬜ |

### Authenticated Pages — SysAdmin
| # | Page | HTML | CSS | JS Module | Responsive | Status |
|---|------|------|-----|-----------|------------|--------|
| 15 | BM Management | `sysadmin/bm-management.html` | `sysadmin.css` | `sysadmin.js` | 320–1440px | ⬜ |
| 16 | Staff Management | `sysadmin/staff-management.html` | `sysadmin.css` | `sysadmin.js` | 320–1440px | ⬜ |

### Authenticated Pages — Board Member
| # | Page | HTML | CSS | JS Module | Responsive | Status |
|---|------|------|-----|-----------|------------|--------|
| 17 | My FA Budget | `boardmember/my-fa-budget.html` | `boardmember.css` | `boardmember.js` | 320–1440px | ⬜ |
| 18 | My PA Budget | `boardmember/my-pa-budget.html` | `boardmember.css` | `boardmember.js` | 320–1440px | ⬜ |
| 19 | Secretary Logs | `boardmember/secretary-logs.html` | `boardmember.css` | `boardmember.js` | 320–1440px | ⬜ |
| 20 | Archives | `boardmember/archives.html` | `boardmember.css` | `boardmember.js` | 320–1440px | ⬜ |

### Authenticated Pages — Secretary/Staff (New)
| # | Page | HTML | CSS | JS Module | Responsive | Status |
|---|------|------|-----|-----------|------------|--------|
| 21 | Incoming Letters List | `pages/incoming-list.html` | `incoming.css` | `incoming-module.js` | 320–1440px | ⬜ |
| 22 | Incoming Letters New | `pages/incoming-new.html` | `forms.css` + `incoming.css` | `incoming-module.js` | 320–1440px | ⬜ |
| 23 | Search Archives | `pages/search-archives.html` | `search.css` | `search-module.js` | 320–1440px | ⬜ |

### Shared Infrastructure (verified across all pages)
| # | Component | Files | Status |
|---|-----------|-------|--------|
| 24 | Sidebar navigation + collapse | `layout.css` + `router.js` + `app.js` | ⬜ |
| 25 | Icons system | `icons.js` (90+ icons incl. credit-card) + `main.css` | ⬜ |
| 26 | Modals & toasts | `components.css` + `notifications.js` | ⬜ |
| 27 | Auth guards & routing | `auth.js` + `app.js` + `router.js` | ⬜ |
| 28 | Sidebar profile + logout | `layout.css` (.sidebar-profile, .sidebar-logout) | ⬜ |
| 29 | Pagination + Empty states | `utils.js` (paginate, renderPagination, renderEmptyState) | ⬜ |

---

### Audit Process (per page)
1. **HTML** — Correct structure, IDs match JS selectors, no orphan elements
2. **CSS** — Light theme consistent, proper spacing, no visual breaks
3. **JS** — Module loads, renders correctly, event listeners wired, no console errors
4. **Responsive** — Test at 320px, 480px, 768px, 1024px, 1440px
5. **Overflow** — No element bleeds outside its container at any breakpoint
