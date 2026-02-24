# OMSP Document Tracking / Monitoring

## Sangguniang Panlalawigan — Province of Bataan

A web-based system for tracking and monitoring Financial Assistance (FA) and Personal Assistance (PA) records for the Office of the Majority & Secretary of the Panlalawigan.

---

## Tech Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Storage:** localStorage (no backend required)
- **Deployment:** Vercel static hosting
- **Font:** Inter (Google Fonts)

---

## User Roles

| Role | Description |
| ------ | ------------- |
| **SysAdmin** | Full system access, user/BM management, cannot create FA/PA |
| **Board Member** | Views own FA/PA, budget info, can request end-of-term archive |
| **Secretary/Staff** | Creates FA (assigned BMs only) and PA (all BMs), primary data entry |

---

## Demo Accounts

| Role | Email | Password |
| ------ | ------- | ---------- |
| SysAdmin | `admin@omsp.gov.ph` | admin123 |
| Board Member | `cruz@omsp.gov.ph` | bm123 |
| Secretary | `secretary1@omsp.gov.ph` | sec123 |

---

## Project Structure

```text
├── index.html              # Public landing page
├── pages/                  # Shared pages (login, dashboard, FA/PA, search, etc.)
│   └── login.html          # Staff / Board Member login
├── sysadmin/               # SysAdmin-only pages
├── boardmember/            # Board Member-only pages
├── assets/
│   ├── css/                # Stylesheets (main, components, layout, animations)
│   │   └── pages/          # Page-specific CSS
│   └── js/                 # JavaScript
│       └── modules/        # Feature modules (dashboard, FA, PA, search, etc.)
├── claude/                 # Design & alignment documentation
├── vercel.json             # Vercel deployment config
└── .gitignore
```

---

## Key Features

- **FA Tracking** — Private per Board Member, ₱70,000/month budget with rollover
- **PA Tracking** — Transparent across all secretaries
- **Duplicate Detection** — Beneficiary name matching with frequency tracking
- **Cooling Period** — Configurable wait time between FA for same beneficiary
- **Budget Management** — Real-time budget tracking with rollover support
- **End-of-Term Archive** — BM requests → SysAdmin approval workflow
- **Global Search** — Cross-record search with beneficiary history timeline
- **Reports** — Budget summary, FA/PA summaries, frequency reports, BM performance
- **Activity Logging** — Full audit trail of all system actions
- **CSV Export & Print** — Export records and reports

---

## Getting Started

1. Clone or download the repository
2. Open `index.html` in a browser (or serve with any static server)
3. Log in with a demo account
4. Data is stored in localStorage and persists in the browser

---

## Deployment

Push to GitHub and connect to Vercel for automatic deployment:

```bash
git add .
git commit -m "Initial deploy"
git push origin main
```

---

*Built for the Province of Bataan, Sangguniang Panlalawigan.*
