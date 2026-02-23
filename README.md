# OMSP — Bataan SP Financial & Personal Assistance System

> **MVP** · localStorage-based · Deployable to Vercel  
> After successful supervisor feedback, the data layer will migrate to **Firebase**.

---

## 📋 Overview

The **Office of the Members of the Sangguniang Panlalawigan (OMSP)** system tracks and monitors **Financial Assistance (FA)** and **Personal Assistance (PA)** records for Board Members in the Province of Bataan.

### Key Features

| Feature | Description |
|---|---|
| **Role-Based Access** | Admin, Board Member, Secretary — each with different permissions |
| **Financial Assistance** | Track FA records with budget management (₱70,000/month per BM) |
| **Personal Assistance** | Log PA records with categories and actions taken |
| **Beneficiary Management** | Duplicate detection, frequency monitoring |
| **Term Management** | End-of-term warnings, archive system |
| **Budget Tracking** | Monthly budget with real-time deduction |
| **Activity Logging** | Full audit trail of system actions |
| **Search** | Global search across all entity types |

---

## 🚀 Quick Start

### Local Development

1. **Clone** the repository
2. **Open** `index.html` in any browser (no build step needed)
3. **Login** with any demo account below

> No server, no npm, no build tools required. Just HTML + CSS + JS.

### Deploy to Vercel

1. Push to GitHub
2. Import the repo in [vercel.com](https://vercel.com)
3. Vercel auto-detects the static site — deploy completes in seconds

---

## 🔑 Demo Credentials

| Role | Email | Password |
|---|---|---|
| **Admin** | admin@omsp.gov.ph | admin123 |
| **Board Member** (District 1) | cruz@omsp.gov.ph | bm123 |
| **Board Member** (District 2) | santos@omsp.gov.ph | bm123 |
| **Board Member** (District 3) | reyes@omsp.gov.ph | bm123 |
| **Secretary** | secretary1@omsp.gov.ph | sec123 |

---

## 📁 Folder Structure

```
OMSP-Document-Tracking-Monitoring/
│
├── index.html                  ← Login page (entry point)
├── dashboard.html              ← Main dashboard
├── fa-list.html                ← Financial Assistance list
├── fa-create.html              ← Create/edit FA record (wizard)
├── pa-list.html                ← Personal Assistance list
├── pa-create.html              ← Create/edit PA record
├── categories.html             ← Manage FA types & PA categories
├── search.html                 ← Global search
├── admin-users.html            ← User management (admin only)
├── admin-archives.html         ← Archived BM data (admin only)
├── admin-logs.html             ← Activity logs (admin only)
├── vercel.json                 ← Vercel deployment config
├── README.md                   ← You are here
│
├── css/
│   ├── variables.css           ← Design tokens (colors, spacing, fonts)
│   ├── base.css                ← CSS reset, typography, utilities
│   ├── layout.css              ← App shell, sidebar, header
│   ├── components.css          ← Buttons, cards, badges, tabs
│   ├── forms.css               ← Inputs, selects, wizards, filters
│   ├── tables.css              ← Data tables, pagination
│   └── modal-toast-banner.css  ← Modals, toasts, term banners
│
├── js/
│   ├── lib/
│   │   ├── constants.js        ← Storage keys, municipalities, enums
│   │   ├── utils.js            ← Formatting, dates, helpers
│   │   ├── storage.js          ← localStorage CRUD (generic + entity)
│   │   ├── seed.js             ← Default data seeding on first visit
│   │   └── auth.js             ← Login, session, role checks
│   │
│   ├── components/
│   │   ├── sidebar.js          ← Sidebar navigation (role-filtered)
│   │   ├── header.js           ← Top header bar with breadcrumb
│   │   ├── modal.js            ← Modal dialogs (confirm, alert)
│   │   ├── toast.js            ← Toast notifications
│   │   ├── banner.js           ← Term warning banners
│   │   └── table.js            ← Reusable data table component
│   │
│   └── pages/
│       ├── login.js            ← Login page controller
│       ├── dashboard.js        ← Dashboard page controller
│       ├── fa-list.js          ← FA list page controller
│       ├── fa-create.js        ← FA create/edit controller
│       ├── pa-list.js          ← PA list page controller
│       ├── pa-create.js        ← PA create/edit controller
│       ├── categories.js       ← Categories management controller
│       ├── search.js           ← Global search controller
│       ├── admin-users.js      ← User management controller
│       ├── admin-archives.js   ← Archives viewer controller
│       └── admin-logs.js       ← Activity logs controller
│
└── docs/
    ├── architecture.md         ← System architecture & data flow
    ├── system-connections.md   ← Entity relationships & visibility
    └── folder-structure.md     ← Detailed file descriptions
```

---

## 🗄 Data Storage

All data is stored in the browser's **localStorage** as JSON arrays:

| Key | Contents |
|---|---|
| `omsp_users` | User accounts (admin, BM, secretary) |
| `omsp_board_members` | Board Member profiles & term dates |
| `omsp_secretary_assignments` | Secretary → BM assignments |
| `omsp_fa_case_types` | FA case types (Medical, Burial, etc.) |
| `omsp_pa_categories` | PA categories (Personal, Hospital, etc.) |
| `omsp_beneficiaries` | Beneficiary records |
| `omsp_financial_assistance` | FA records with amounts & status |
| `omsp_personal_assistance` | PA records with category & action |
| `omsp_monthly_budget_logs` | Monthly budget tracking per BM |
| `omsp_activity_logs` | Audit trail of all actions |
| `omsp_monthly_frequency` | Beneficiary visit frequency |
| `omsp_initialized` | Flag to prevent re-seeding |

> **Note:** Clearing browser data will reset everything. The seed data re-creates automatically on next visit.

---

## 🎨 Design System

| Token | Value | Usage |
|---|---|---|
| Primary Blue | `#1D4ED8` | Main brand color, primary buttons |
| Secondary Teal | `#14B8A6` | Secondary actions, PA elements |
| Accent Amber | `#F59E0B` | Warnings, highlights |
| Danger Red | `#EF4444` | Errors, destructive actions |
| Success Green | `#10B981` | Confirmations, active status |
| Info Blue | `#3B82F6` | Informational elements |

---

## 🔄 Role Permissions

| Feature | Admin | Board Member | Secretary |
|---|---|---|---|
| View Dashboard | ✅ All data | ✅ Own data | ✅ Assigned BMs |
| Create FA/PA | ✅ | ✅ | ✅ (for assigned BMs) |
| Change FA Status | ✅ | ✅ Own | ✅ Assigned |
| Manage Users | ✅ | ❌ | ❌ |
| Manage Categories | ✅ | ❌ | ❌ |
| View Archives | ✅ | ❌ | ❌ |
| View Activity Logs | ✅ | ❌ | ❌ |
| Search Records | ✅ All | ✅ Own | ✅ Assigned |

---

## 📝 Future Plans

- [ ] Migrate from localStorage to **Firebase** (after MVP feedback)
- [ ] Add data export (CSV/PDF)
- [ ] Add password hashing
- [ ] Add email notifications
- [ ] Add dashboard charts/analytics
- [ ] Mobile-responsive improvements

---

## 🛠 Tech Stack

- **HTML5** — Semantic markup
- **CSS3** — Custom properties, Flexbox, Grid
- **Vanilla JavaScript** — No frameworks, no build tools
- **localStorage** — Browser-based data persistence
- **Vercel** — Static site hosting

---

*Built for the Office of the Members of the Sangguniang Panlalawigan, Province of Bataan.*