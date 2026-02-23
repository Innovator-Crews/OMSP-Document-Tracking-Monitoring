# Folder Structure

## Complete Project Tree

```
OMSP-Document-Tracking-Monitoring/
│
├── index.html                  ← Login page (entry point)
├── dashboard.html              ← Main dashboard with stats & term warnings
├── fa-list.html                ← Financial Assistance records table
├── fa-create.html              ← New FA request form (multi-step)
├── pa-list.html                ← Personal Assistance records table
├── pa-create.html              ← New PA request form
├── categories.html             ← Category management (FA types + PA categories)
├── search.html                 ← Global search with filters
├── admin-users.html            ← SysAdmin: manage users & assignments
├── admin-archives.html         ← SysAdmin: approve/reject archive requests
├── admin-logs.html             ← Activity log viewer
│
├── css/
│   ├── variables.css           ← Design tokens (colors, spacing, fonts)
│   ├── base.css                ← CSS reset, typography, global styles
│   ├── components.css          ← Buttons, cards, badges, progress bars
│   ├── layout.css              ← Sidebar, header, page grid, responsive
│   ├── forms.css               ← Inputs, selects, checkboxes, form groups
│   └── tables.css              ← Data tables, pagination, sorting
│
├── js/
│   ├── lib/
│   │   ├── constants.js        ← All system constants (municipalities, actions, keys)
│   │   ├── utils.js            ← Helper functions (format currency, dates, IDs)
│   │   ├── storage.js          ← localStorage CRUD wrapper for all entities
│   │   ├── seed.js             ← Default data initializer (users, categories)
│   │   └── auth.js             ← Login, logout, session management, role checks
│   │
│   ├── components/
│   │   ├── sidebar.js          ← Navigation sidebar builder (role-filtered)
│   │   ├── header.js           ← Top header with user info & search
│   │   ├── modal.js            ← Reusable modal system (confirm, form, alert)
│   │   ├── toast.js            ← Notification toast system (success, error, warning)
│   │   ├── banner.js           ← Term warning banner system (90/30/7/0 days)
│   │   └── table.js            ← Dynamic data table builder with sorting
│   │
│   └── pages/
│       ├── login.js            ← Login form handler & validation
│       ├── dashboard.js        ← Dashboard stats, charts, recent activity
│       ├── fa-list.js          ← FA records list, filtering, actions
│       ├── fa-create.js        ← FA multi-step form logic
│       ├── pa-list.js          ← PA records list, filtering, actions
│       ├── pa-create.js        ← PA form logic with cooling-off check
│       ├── categories.js       ← Category CRUD, archive/restore
│       ├── search.js           ← Global search with advanced filters
│       ├── admin-users.js      ← User management, create BM/secretary
│       ├── admin-archives.js   ← Archive request review & approval
│       └── admin-logs.js       ← Activity log filtering & display
│
├── docs/
│   ├── architecture.md         ← System architecture diagram & layer map
│   ├── system-connections.md   ← Data relationships & module connections
│   └── folder-structure.md     ← This file
│
├── vercel.json                 ← Vercel deployment config
└── README.md                   ← Project overview, setup, usage guide
```

## File Naming Conventions

| Pattern | Example | Purpose |
|---------|---------|---------|
| `[entity]-list.html` | `fa-list.html` | Record listing page |
| `[entity]-create.html` | `fa-create.html` | New record form page |
| `admin-[feature].html` | `admin-users.html` | Admin-only pages |
| `css/[scope].css` | `css/forms.css` | Scoped style sheets |
| `js/lib/[utility].js` | `js/lib/storage.js` | Shared utility modules |
| `js/components/[name].js` | `js/components/modal.js` | Reusable UI components |
| `js/pages/[page].js` | `js/pages/dashboard.js` | Page-specific controllers |

## Script Loading Order (per page)

```html
<!-- 1. Library layer (order matters) -->
<script src="js/lib/constants.js"></script>
<script src="js/lib/utils.js"></script>
<script src="js/lib/storage.js"></script>
<script src="js/lib/seed.js"></script>
<script src="js/lib/auth.js"></script>

<!-- 2. Component layer (any order) -->
<script src="js/components/sidebar.js"></script>
<script src="js/components/header.js"></script>
<script src="js/components/modal.js"></script>
<script src="js/components/toast.js"></script>
<script src="js/components/banner.js"></script>
<script src="js/components/table.js"></script>

<!-- 3. Page-specific controller (last) -->
<script src="js/pages/dashboard.js"></script>
```
