# Roles & Permissions — How Each Role Interacts

## Role Summary

| Role | Count | Login Page | Creates Data | Primary Purpose |
|------|-------|------------|-------------|-----------------|
| **SysAdmin** | 1+ | `sysadmin/login.html` | Users, Assignments, Categories (permanent) | System governance, user management, archive approvals |
| **Board Member (BM)** | 12 | `pages/login.html` | Budget entries only | Views own office data, manages budgets, requests archives |
| **Secretary/Staff** | Multiple | `pages/login.html` | FA, PA, Incoming Letters, Custom Categories | Primary data encoder for assigned BMs |

---

## 1. SysAdmin — System Governor

### What they CAN do:
- **User Management**
  - Add / Edit / Deactivate Board Member accounts
  - Add / Edit / Deactivate Secretary/Staff accounts
  - Assign secretaries to Board Members (M:N mapping)
  - Remove secretary-BM assignments
- **Category Management**
  - View all FA and PA categories
  - Make custom categories permanent (system-wide)
  - Archive / Restore / Delete categories
- **Term & Archive Management**
  - View all pending archive requests from BMs
  - Approve or Deny archive requests (archives all BM's FA/PA records)
  - Start new term for re-elected BMs (reactivates account, increments term #)
- **View Everything**
  - All FA records (all BMs, all terms)
  - All PA records (all BMs)
  - All budgets (FA monthly + PA pool for every BM)
  - All activity logs (entire system)
  - All reports & analytics
  - Global search across current term records
  - Search archives across all terms
- **Incoming Letters** (read-only view of all letters logged by staff)

### What they CANNOT do:
- Create FA or PA records (only secretaries encode data)
- Edit FA/PA record content (they can view only)
- Create Incoming Letters
- Modify budgets directly (BMs manage their own)

### Pages accessible:
| Page | Purpose |
|------|---------|
| Dashboard | System-wide stats overview |
| Board Members (CRUD) | Add/Edit/Deactivate BMs, view term badges |
| Staff (CRUD) | Add/Edit/Deactivate staff, manage assignments |
| FA Records List | View all FA across all BMs |
| PA Records List | View all PA across all BMs |
| Incoming Letters | View all incoming letters (read-only) |
| Categories | Manage all categories, promote to permanent |
| Term / Archive | Approve archives, start new terms |
| Reports | Analytics across the system |
| Activity Logs | Full system audit trail |
| Budget Overview | All BM budgets at a glance |
| Global Search | Search current term records |
| Search Archives | Search across all archived terms |

---

## 2. Board Member (BM) — Office Head / Read-Only Consumer

### What they CAN do:
- **View own records**
  - FA records created for their office (current term)
  - PA records created for their office (current term)
  - Incoming Letters for their office (current term)
- **Budget Management**
  - Edit their FA monthly base budget
  - Add / Edit / Remove PA budget pool entries
  - Set rollover preference for FA budget
- **Term & Archive**
  - View their current term info (term #, dates, days remaining)
  - Request term archive when term ends
  - View archives of all past terms (FA, PA, Letters separately)
- **Secretary Monitoring**
  - View activity logs of their assigned secretary(s)
  - See what their staff encoded, when, and for whom
- **Profile indicators**
  - Term badge: "1st Term", "2nd Term", "3rd Term"
  - Re-elected badge (if `current_term_number > 1`)

### What they CANNOT do:
- Create FA, PA, or Incoming Letter records
- View other BMs' FA records (FA is private per BM)
- View other BMs' PA records (PA transparency is for secretaries only)
- Manage users, categories, or system settings
- Approve archives (that's SysAdmin)
- Access Global Search (their permission is `global_search: false`)

### Pages accessible:
| Page | Purpose |
|------|---------|
| Dashboard | Own stats, budget cards, term info |
| FA Records List | Own FA records (current term, filtered) |
| PA Records List | Own PA records (current term, filtered) |
| Incoming Letters | Own office letters (current term) |
| My FA Budget | Edit base, rollover, usage chart, history |
| My PA Budget | Pool entries CRUD, usage chart |
| Term / Archive | View term info, request archive |
| My Archives | Browse past term FA/PA/Letters |
| Secretary Logs | Activity logs of assigned staff |
| Activity Logs | Own activity only |

---

## 3. Secretary/Staff — Primary Data Encoder

### What they CAN do:
- **FA Records**
  - Create FA for **assigned BMs only** (dropdown limited to assigned BMs)
  - View FA for **assigned BMs only** (private per BM)
  - Edit FA status (Ongoing → Successful / Denied)
  - Export FA records to CSV
- **PA Records**
  - Create PA for **any active BM** (PA is transparent)
  - View **all PA records across all BMs** (transparency for fraud detection)
  - Export PA records to CSV
- **Incoming Letters**
  - Create Incoming Letters for assigned BMs
  - View Incoming Letters for assigned BMs
  - Categorize as: Cultural Activities / Solicitations / Invitation Letters
- **Category Management**
  - Create custom FA/PA categories
  - Archive custom categories (if no active records use them)
  - Cannot make categories permanent (SysAdmin only)
- **Search & Reports**
  - Global Search across current term records (respects FA privacy)
  - Search Archives (cross-term, respects FA privacy)
  - View reports for assigned BMs
  - Export data to CSV
- **Frequency awareness**
  - See frequency badges on beneficiary names in lists
  - See cross-BM warnings when creating FA/PA
  - Beneficiary duplicate detection on forms

### What they CANNOT do:
- View FA records for non-assigned BMs (FA is private)
- Create FA for non-assigned BMs
- Manage users or BM accounts
- Approve archives or manage terms
- Make categories permanent
- Edit budgets
- View other users' activity logs

### Pages accessible:
| Page | Purpose |
|------|---------|
| Dashboard | Stats for assigned BMs, quick actions |
| New FA | Create Financial Assistance record |
| FA Records List | View assigned BMs' FA records |
| New PA | Create Personal Assistance record |
| PA Records List | View ALL PA records (transparent) |
| New Incoming Letter | Log incoming correspondence |
| Incoming Letters List | View assigned BMs' incoming letters |
| Categories | Manage custom categories |
| Global Search | Search current term records |
| Search Archives | Search archived term records |
| Reports | Analytics for assigned BMs |
| Activity Logs | Own activity only |
| Budget Overview | View assigned BMs' budgets |

---

## Access Control Matrix

| Feature | SysAdmin | Board Member | Secretary |
|---------|----------|-------------|-----------|
| View Dashboard | ✅ All | ✅ Own | ✅ Assigned |
| Create FA | ❌ | ❌ | ✅ Assigned BMs |
| View FA | ✅ All | ✅ Own | ✅ Assigned BMs |
| Create PA | ❌ | ❌ | ✅ Any Active BM |
| View PA | ✅ All | ✅ Own | ✅ All (transparent) |
| Create Incoming | ❌ | ❌ | ✅ Assigned BMs |
| View Incoming | ✅ All | ✅ Own | ✅ Assigned BMs |
| Edit FA Budget | ❌ | ✅ Own | ❌ |
| Edit PA Budget | ❌ | ✅ Own | ❌ |
| Manage Users | ✅ | ❌ | ❌ |
| Manage Categories | ✅ All | ❌ | ✅ Custom only |
| Approve Archives | ✅ | ❌ | ❌ |
| Request Archive | ❌ | ✅ | ❌ |
| Start New Term | ✅ | ❌ | ❌ |
| Global Search | ✅ | ❌ | ✅ |
| Search Archives | ✅ | ✅ Own | ✅ (FA: assigned) |
| View All Logs | ✅ | ❌ | ❌ |
| View Secretary Logs | ❌ | ✅ Assigned staff | ❌ |
| Export CSV | ✅ | ✅ | ✅ |
| Reports | ✅ | ❌ | ✅ |

---

## Data Privacy Rules

### FA (Financial Assistance) — PRIVATE
- Only the BM + their assigned secretary + SysAdmin can see FA records
- FA records are siloed per BM office
- When searching, FA results are filtered by assignment

### PA (Personal Assistance) — TRANSPARENT
- All secretaries can see all PA records across all BMs
- This is intentional for fraud/duplicate detection
- BMs can only see their own PA
- SysAdmin can see all PA

### Incoming Letters — PRIVATE per BM (same as FA)
- Only the BM + their assigned secretary + SysAdmin can see
- Letters are tied to a specific BM office

---

## Frequency Tracking & Cross-BM Detection

### Where frequency badges appear:
1. **FA/PA list tables** — Frequency column with color-coded badge + which BMs gave assistance
2. **FA/PA creation forms** — Warning banner when beneficiary has high frequency or visited 3+ BMs
3. **Dashboard** — "Flagged Beneficiaries" section showing high-frequency beneficiaries
4. **Global Search** — Frequency badge on beneficiary result cards
5. **FA/PA detail modals** — Frequency info with BM breakdown

### Badge levels:
| Level | Total Requests/Month | Badge Color | Action |
|-------|---------------------|-------------|--------|
| Normal | 1-2 | 🟢 Green | No action |
| Monitor | 3-4 | 🟡 Yellow | Staff should review |
| High | 5+ | 🔴 Red | Flagged for review |

### Cross-BM indicator:
- Shows which BMs the beneficiary has received FA/PA from
- Example: "BM Cruz, BM Santos" next to the frequency badge
- If 3+ different BMs → additional "Cross-BM" warning badge

---

## Term Lifecycle

```
Fresh BM Account → 1st Term (Active)
                        ↓
              BM requests archive
                        ↓
              SysAdmin approves
                        ↓
              1st Term (Archived) → Records preserved, read-only
                        ↓
              SysAdmin starts new term (re-elected)
                        ↓
              2nd Term (Active) → "Re-elected" badge
                        ↓
              [Cycle repeats for 3rd term, etc.]
```

### Term badges on BM profile:
- "1st Term" / "2nd Term" / "3rd Term" — based on `current_term_number`
- "Re-elected" — shown when `current_term_number > 1`
- These appear on: dashboard, BM management page, sidebar profile area

### Archives access:
- BM can view their past term records in a dedicated Archives page
- Records are grouped by term: "1st Term (Jan 2022 – Jun 2025)"
- Each term shows: FA records, PA records, Incoming Letters, budget summary
- Search Archives allows searching across all terms
