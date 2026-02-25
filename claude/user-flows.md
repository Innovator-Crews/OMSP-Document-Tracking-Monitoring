# User Flows

## 1. Authentication Flow
```
LOGIN PAGE (pages/login.html OR sysadmin/login.html)
├── Email + Password input
├── Submit → Auth.login() validates credentials
├── Auto-detect role → Redirect:
│   ├── sysadmin → pages/dashboard.html (shared dashboard, role-filtered)
│   ├── board_member → pages/dashboard.html (BM-specific stat cards)
│   └── secretary → pages/dashboard.html (staff-specific view)
├── First-time staff login → Banner: "Update your email"
├── Failed login → Toast error + 3-attempt lockout
└── Session stored in bataan_sp_current_user
```

### Logout Flow
```
SIDEBAR → "Sign Out" link
├── Click → Notifications.confirm() modal appears
│   ├── Title: "Sign Out"
│   ├── Message: "Are you sure you want to sign out? Any unsaved changes will be lost."
│   ├── [Cancel] → dismiss modal, stay on page
│   └── [Sign Out] → Auth.logout() → redirect to login page
└── Session cleared from localStorage
```

## 2. Financial Assistance (FA) Flow
```
SECRETARY DASHBOARD → [+ NEW FA REQUEST]
├── STEP 1: CLIENT INFORMATION
│   ├── Full Name * (live duplicate search)
│   ├── Date of Birth *
│   ├── Barangay * (dropdown)
│   ├── Municipality * (dropdown - 12 Bataan towns)
│   ├── Contact Number *
│   └── [Duplicate warning if match found]
│
├── STEP 2: PATIENT INFORMATION (if different from client)
│   └── Patient Name
│
├── STEP 3: CASE DETAILS
│   ├── Case Type * [Dropdown: permanent + custom categories]
│   ├── If "Other": Custom Case Name field
│   ├── Status * [Ongoing / Successful / Denied]
│   └── Amount Requested *
│
├── STEP 4: DURATION SETTING
│   ├── "How long before client can request again?"
│   ├── Options: [3 months] [6 months] [Custom]
│   └── If Custom: reason field
│
├── STEP 5: REVIEW & SUBMIT
│   └── Summary → [SUBMIT]
│       ├── Budget check (sufficient funds in MonthlyBudget?)
│       ├── Deduct amount from monthly budget via Storage.deductFromBudget()
│       ├── Calculate next_available_date
│       ├── Update frequency tracker
│       └── Log activity
```

## 3. Personal Assistance (PA) Flow
```
SECRETARY DASHBOARD → [+ NEW PA REQUEST]
├── STEP 1: CLIENT INFORMATION
│   ├── Full Name * (live duplicate search)
│   ├── Address (Barangay, Municipality)
│   └── Event/Purpose description
│
├── STEP 2: CATEGORIZATION
│   ├── Category * [Dropdown: permanent + custom]
│   ├── Action Taken * [Dropdown]:
│   │   ├── For assessments-verification
│   │   ├── Provided status of financial assistance
│   │   ├── Informed BM
│   │   ├── Accomplished
│   │   ├── Forwarded to designated office
│   │   ├── Calendared-Informed BM
│   │   ├── Inquiry
│   │   └── Provided assistance
│   └── [+ Manage Categories] link
│
├── STEP 3: COOLING-OFF CHECK (Auto)
│   ├── System checks last PA request date
│   ├── If within cooling period:
│   │   ├── ☐ Skip Waiting Period?
│   │   ├── If checked: Reason field
│   │   └── ☐ BM Noted
│   └── If eligible: "Client is eligible" badge
│
├── STEP 4: AMOUNT (Optional)
│   ├── Amount Provided (for tracking)
│   ├── Deducted from PA budget pool via Storage.deductFromPABudget()
│   └── If insufficient pool: shows error, blocks submission
│
└── [SUBMIT] → Record visible to ALL secretaries (cross-BM transparency)
```

## 4. Global Search Flow
```
FULL SEARCH PAGE (pages/global-search.html)
├── Search by: Name / Address / Contact / Case ID
├── Filters: Date range, Type (FA/PA), Category, BM, Status, Frequency
├── Results: Cards with frequency badges
│   ├── 🟢 Normal (1-2 requests/month)
│   ├── 🟡 Monitor (3-4 requests/month)
│   └── 🔴 High (5+ requests/month)
├── Pagination via Utils.paginate() + Utils.renderPagination()
├── Empty state via Utils.renderEmptyState() when no results
├── Click result → Full history + office notes
└── [EXPORT RESULTS] → CSV download via Export module
```

## 5. Category Management Flow
```
MANAGE CATEGORIES PAGE (pages/categories.html)
├── Tabs: [FA Case Types] [PA Categories]
├── Legend: 🔒 Permanent | 📝 Custom | 🗂️ Archived
├── List with columns: Name, Status, Record Count, Actions
├── [+ ADD NEW CATEGORY] → Modal
│   ├── Category Name
│   ├── Make permanent? (SysAdmin only can check yes)
│   └── [SAVE]
├── [Archive] custom category:
│   ├── Check: records using this category?
│   ├── If yes: warning → change records first
│   └── If no: confirm → soft archive
└── [Restore] / [Delete] (SysAdmin only)
```

## 6. End of Term / Archive Flow
```
TIMELINE BANNERS (Board Member sees on dashboard):
├── 90 days before: Info banner (blue) - dismissible
├── 30 days before: Warning banner (yellow) - pending count
├── 7 days before: Critical banner (orange)
└── Term ended: Locked banner (red) - read-only mode

BM REQUESTS ARCHIVE (pages/term-management.html):
├── BM sees: Current Term Information card
│   ├── Term Number, Start/End dates, Days Remaining
│   ├── FA/PA record counts, Archive Status
│   └── [REQUEST ARCHIVE] button (only if archive_status = 'none')
├── Confirmation modal: "This will send a request to archive all your records"
├── Confirm → archive_status = 'pending', archive_requested = true
├── Toast: "Archive request submitted"
└── BM now sees: "Archive Request Pending" banner with date

SYSADMIN REVIEWS (pages/term-management.html):
├── BM section hidden → Sees: Pending Requests + Term Overview
├── Pending Requests:
│   ├── Card per BM: name, district, term#, FA/PA counts, budget used
│   ├── [Approve Archive] → Confirm modal
│   │   ├── Archives ALL FA records for BM (is_archived = true)
│   │   ├── Archives ALL PA records for BM (is_archived = true)
│   │   ├── BM record: is_archived = true, archive_status = 'approved'
│   │   └── Activity logged
│   └── [Deny] → archive_status = 'denied', archive_requested = false
├── Term Overview:
│   ├── Stat cards: Active BMs, Pending Archives, Archived Terms
│   ├── Active BMs grid: name, district, term#, days remaining badge
│   └── Archived BMs grid: name, district, completed term, [Start New Term] button
```

## 7. Multi-Term (New Term) Flow ← NEW
```
SYSADMIN → Term Overview → Archived BMs section
├── [Start New Term] button on each archived BM card
├── Opens modal:
│   ├── Shows BM name, district, next term number (auto-calculated)
│   ├── Term Start Date (default: today)
│   ├── Term End Date (default: +3 years)
│   ├── FA Monthly Budget (default: ₱70,000)
│   └── Info banner: "Previous term records remain archived"
├── [Start New Term] →
│   ├── BM record updated:
│   │   ├── current_term_number++ (e.g., 1 → 2)
│   │   ├── term_start/term_end = new dates
│   │   ├── fa_monthly_budget = new amount
│   │   ├── is_archived = false
│   │   ├── is_active = true
│   │   ├── archive_status = 'none'
│   │   └── pa_balance = 0
│   ├── New monthly FA budget auto-created via Storage.getCurrentBudget()
│   ├── Activity logged: "Started 2nd term for [BM Name]"
│   └── Toast: "2nd term started successfully"
└── BM can now log in and see fresh dashboard with:
    ├── Clean ₱70k FA budget
    ├── Empty PA budget pool (can add new entries)
    └── Previous archived records NOT visible in active lists
```

## 8. FA Budget Management Flow (Board Member)
```
BM SIDEBAR → "My FA Budget" → boardmember/my-fa-budget.html
├── Header: "My FA Budget"
├── [Edit Base Budget] button → Opens modal:
│   ├── Current base amount shown
│   ├── Input: New Monthly Budget (₱)
│   ├── [Cancel] / [Save Changes]
│   └── On save: Storage.updateFABaseBudget() recalculates totals
├── Stat Cards Row:
│   ├── Total Budget (base + rollover)
│   ├── Used Amount
│   └── Remaining Amount
├── Budget Usage Progress Bar (green/yellow/red based on %)
├── Budget History Table:
│   ├── Columns: Month, Base, Rollover, Total, Used, Remaining, Status
│   ├── Status badge: Active / Closed
│   ├── Pagination via Utils.paginate()
│   └── Empty state if no history
└── If no current budget: empty state with "Budget will be created when FA records are added"
```

## 9. PA Budget Management Flow (Board Member) ← NEW
```
BM SIDEBAR → "My PA Budget" → boardmember/my-pa-budget.html
├── Header: "My PA Budget"
├── [+ Add Budget] button → Opens modal:
│   ├── Amount (₱) input
│   ├── Description/Purpose input
│   ├── [Cancel] / [Add Budget]
│   └── On save: Storage.addPABudget() creates new pool entry
├── Stat Cards Row:
│   ├── Total Budget Pool (sum of all entries)
│   ├── Total Used (sum of PA record amounts)
│   └── Remaining Balance
├── Budget Pool Progress Bar
├── Budget Entries Table:
│   ├── Columns: Date Added, Amount, Description, Actions
│   ├── Actions per row: [Edit] [Remove]
│   ├── Edit → Modal with pre-filled values → Storage.updatePABudget()
│   ├── Remove → Confirm dialog → entry removed from PA_BUDGETS
│   ├── Pagination via Utils.paginate()
│   └── Empty state: "No PA budget entries yet"
└── BM Dashboard also shows PA budget card with progress bar
```

## 10. Sidebar Navigation Flow
```
SIDEBAR (260px, dark neutral-900 background)
├── Header:
│   ├── 🏛️ Logo
│   ├── Brand: "OMSP Tracker" / "Document Tracking"
│   └── [Collapse] button (chevron-left icon)
├── Nav Links (role-specific, built by Router.buildSidebar()):
│   ├── board_member:
│   │   ├── Dashboard, FA Records, PA Records
│   │   ├── My FA Budget, My PA Budget ← NEW
│   │   ├── Budget Overview, Search
│   │   └── Term / Archive
│   ├── secretary:
│   │   ├── Dashboard, New FA, FA Records
│   │   ├── New PA, PA Records
│   │   ├── Budget Overview, Search
│   │   ├── Categories, Activity Logs
│   │   └── Reports
│   └── sysadmin:
│       ├── Dashboard, FA Records, PA Records
│       ├── Budget Overview, Search
│       ├── Categories, Activity Logs
│       ├── Reports, Term / Archive
│       ├── Manage BMs, Manage Staff
│       └── (via sysadmin/ pages)
├── Profile Section (bottom):
│   ├── Avatar circle with initials (36px, primary-600 bg)
│   ├── Name (semibold, neutral-200)
│   ├── Role label (xs, neutral-500)
│   └── CSS: flex row, border-top, styled via layout.css
├── Sign Out link:
│   ├── Red hover state (danger-400 text, rgba red bg)
│   ├── Click → Logout confirmation modal
│   └── Confirm → Auth.logout()
└── Collapse Behavior:
    ├── [◀] button toggles `.collapsed` class on sidebar
    ├── Collapsed: 64px width, icons only (text hidden)
    ├── Brand, nav-text, profile-info, section labels → opacity: 0, width: 0
    ├── Collapse button SVG rotates 180° when collapsed
    ├── .main-content margin-left transitions from 260px → 64px
    ├── State persisted in localStorage ('omsp_sidebar_collapsed')
    ├── Mobile (≤768px): Collapse disabled, button hidden
    └── CSS transitions: width + margin-left use var(--transition-slow)
```

## 11. Dashboard Flow (Role-Specific)
```
pages/dashboard.html → Dashboard.init()
├── SysAdmin Dashboard:
│   ├── Welcome banner with role badge
│   ├── Stat cards: Total BMs, Total Staff, FA Records, PA Records
│   ├── FA records by status chart area
│   └── Recent activity feed
├── Board Member Dashboard:
│   ├── Welcome banner
│   ├── Stat cards: FA Budget Remaining, PA Budget Remaining, Total Records
│   ├── 2-column budget cards:
│   │   ├── FA Budget Usage (progress bar, base + rollover breakdown)
│   │   └── PA Budget Usage (progress bar, pool total, used, remaining) ← NEW
│   └── Term info summary
└── Secretary Dashboard:
    ├── Welcome banner
    ├── Stat cards: My FA Records, My PA Records, Pending items
    └── Quick action buttons (New FA, New PA)
```

## 12. Utility Functions (utils.js)

### Pagination ← NEW
```
Utils.paginate(items, page, pageSize)
├── Input: array of items, current page (1-based), items per page
├── Output: { data[], page, totalPages, totalItems, hasNext, hasPrev }
└── Used in FA list, PA list, budget history, PA budget entries

Utils.renderPagination(paginatedResult, callbackFnName)
├── Generates HTML: [← Prev] [1] [2] ... [5] [Next →]
├── Ellipsis for large page counts
├── Active page highlighted
└── Calls window[callbackFnName](pageNumber) on click
```

### Empty States ← NEW
```
Utils.renderEmptyState(icon, title, description, actionHtml?)
├── Renders centered empty state with:
│   ├── SVG icon (from Icons module)
│   ├── Title text
│   ├── Description text
│   └── Optional action button HTML
└── Used when: no budget entries, no records, no search results
```
