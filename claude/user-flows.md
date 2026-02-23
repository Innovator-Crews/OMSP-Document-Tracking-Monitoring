# User Flows

## 1. Authentication Flow
```
LOGIN PAGE
├── Email + Password input
├── Submit → Validate credentials
├── Auto-detect role → Redirect:
│   ├── sysadmin → /sysadmin/admin-dashboard.html
│   ├── board_member → /boardmember/bm-dashboard.html
│   └── secretary → /staff/my-dashboard.html
├── First-time staff login → Banner: "Update your email"
└── Failed login → Toast error + 3-attempt lockout
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
│       ├── Budget check (sufficient funds?)
│       ├── Deduct amount from monthly budget
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
│   └── Auto-updates running balance
│
└── [SUBMIT] → Record visible to ALL secretaries
```

## 4. Global Search Flow
```
SEARCH ICON (Header) → Quick search overlay
├── Type name → Live results dropdown
├── Click result → View beneficiary detail
└── [ADVANCED SEARCH] → Full search page

FULL SEARCH PAGE
├── Search by: Name / Address / Contact / Case ID
├── Filters: Date range, Type (FA/PA), Category, BM, Status, Frequency
├── Results: Cards with frequency badges
│   ├── 🟢 Normal (1-2 requests/month)
│   ├── 🟡 Monitor (3-4 requests/month)
│   └── 🔴 High (5+ requests/month)
├── Click result → Full history + office notes
└── [EXPORT RESULTS]
```

## 5. Category Management Flow
```
MANAGE CATEGORIES PAGE
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
TIMELINE BANNERS (Board Member sees):
├── 90 days before: Info banner (blue) - dismissible
├── 30 days before: Warning banner (yellow) - pending count
├── 7 days before: Critical banner (orange)
└── Term ended: Locked banner (red) - read-only mode

BM REQUESTS ARCHIVE:
├── [REQUEST ARCHIVE] button appears when term ended
├── Confirmation modal: shows record counts, budget status
├── Confirm → Status = "Pending Archive"
├── Notification to SysAdmin
└── BM sees: "Archive request sent. Pending approval."

SYSADMIN APPROVES:
├── Admin Panel → Pending Archives
├── Review: BM info, record counts, budget, last activity
├── [APPROVE] → Records move to historical archive
├── [REJECT] → BM notified, remains read-only
└── After approval: BM sees read-only past term view

RE-ELECTION:
├── SysAdmin creates new term (Term 2/3)
├── Fresh ₱70k budget
├── Clean record slate
├── Past terms viewable in read-only tab
└── BM toggles between current/past terms
```

## 7. Budget Management Flow
```
BUDGET PAGE (Secretary/BM view)
├── Current Month Card: Base + Rollover = Total
├── Used: ₱XX,XXX | Remaining: ₱XX,XXX
├── Progress bar (green/yellow/red)
├── Monthly History table
├── Rollover Toggle (BM decides)
└── [ADD PA ALLOWANCE] (BM only for PA)

END OF MONTH:
├── Auto-close month budget log
├── If rollover ON: carry remaining to next month
├── If rollover OFF: remaining resets to ₱0
└── New month: base ₱70k + rollover (if any)
```
