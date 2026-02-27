# OMSP SysAdmin Role — Gap Analysis, Questions & Recommendations

> **Date:** February 27, 2026  
> **Author:** GitHub Copilot  
> **Scope:** SysAdmin role — missing features, logic issues, and improvement suggestions  
> **Status:** Awaiting your answers

---

## SUMMARY OF FINDINGS

After reviewing all claude/ docs (`project-brief.md`, `data-models.md`, `user-flows.md`, `api-contract.md`, `checklist.md`, `component-library.md`) and the current sysadmin implementation (`sysadmin.js`, `bm-management.html`, `staff-management.html`, `login.html`, `sysadmin.css`, `auth.js`, `router.js`, `storage.js`), here are the **gaps, issues, and recommendations** I found:

---

## 🔴 CRITICAL GAPS — Not Yet Implemented

### GAP 1: SysAdmin Cannot Add/Edit/Delete Board Members
**Current:** `bm-management.html` only **displays** active/archived BMs in a read-only table.  
**Expected (per project-brief):** SysAdmin should be able to:
- ➕ **Add new Board Member** (create user + BM profile + initial budget)
- ✏️ **Edit BM details** (district, term dates, budget)
- 🔄 **Activate/Deactivate** a BM account
- 🗑️ **Archive** a BM (separate from term archive flow)

**Question 1:** Do you want me to implement full CRUD for Board Members on the BM Management page? This would include:
- An "Add Board Member" button → modal with fields: Full Name, Email, Password, District, Term Start, Term End, FA Monthly Budget
- Edit button per BM row → modal with editable fields
- Toggle active/inactive button
- Should adding a BM also auto-create their user account and first monthly budget?

---

### GAP 2: SysAdmin Cannot Add/Edit/Delete Staff Accounts
**Current:** `staff-management.html` only **displays** staff in a read-only table with their BM assignments.  
**Expected (per project-brief):** SysAdmin should be able to:
- ➕ **Create staff/secretary accounts** (with temp password)
- ✏️ **Edit staff details** (name, email, reset password)
- 🔗 **Assign/unassign staff to Board Members**
- 🔒 **Set permission flags** (`can_add_allowance`, `can_make_permanent_category`)
- 🗑️ **Deactivate** staff accounts

**Question 2:** Do you want me to implement full Staff CRUD? This would include:
- "Add Staff" button → modal: Full Name, Email, Temp Password, Assign to BM(s) (multi-select), Permission checkboxes
- Edit button per staff row → editable fields
- Remove assignment / Add assignment actions
- Deactivate toggle
- Should we show a "Reset Password" button that sets a new temp password?

---

### GAP 3: No Secretary Assignment Management UI
**Current:** `SecretaryAssignment` records exist in data model, seed data has 2 assignments, but there's **no UI to create/edit/remove assignments**.  
**Expected:** SysAdmin should manage which secretary is assigned to which BM(s).

**Question 3:** Should secretary-to-BM assignment be:
- **(A)** Part of the Staff Management page (inline assignment per staff row), OR
- **(B)** A separate "Assignments" page/tab, OR
- **(C)** A modal inside Staff Management with a multi-select of BMs?

---

### GAP 4: No System Settings Page
**Current:** `SystemSettings` data model exists but there's **no UI to configure** it.  
**Settings include:** default FA budget, term warning days, frequency thresholds, default wait months, allow rollover.

**Question 4:** Do you want a System Settings page for SysAdmin? It would allow configuring:
- Default FA monthly budget (₱70,000)
- Default cooling-off period (3/6/custom months)
- Frequency thresholds (normal, monitor, high)
- Term warning banner timing (90/30/7 days)
- Enable/disable rollover
- **(Or should these remain hardcoded for the MVP?)**

---

## 🟡 LOGIC ISSUES & INCONSISTENCIES

### ISSUE 1: SysAdmin Login Allows Non-Admin Users
**File:** `sysadmin/login.html` uses the same `Auth.login()` as the staff login.  
**Problem:** If a secretary or BM enters their credentials on the admin login page, they can log in and get redirected to the main dashboard. There's **no role check** on the admin login page that blocks non-sysadmin users.

**Recommendation:** After successful login on `sysadmin/login.html`, check if `user.role === 'sysadmin'` and reject with an error if not.

**Question 5:** Should I fix this so the admin login page **only** accepts sysadmin credentials?

---

### ISSUE 2: SysAdmin Permission Matrix Says `create_fa: false` and `create_pa: false`
**Current:** The permission matrix in `auth.js` correctly blocks SysAdmin from creating FA/PA records, but the sysadmin sidebar still shows links to FA Records and PA Records list pages.

**Minor concern:** SysAdmin can view all records (correct per brief), but the sidebar **doesn't** have "New FA" or "New PA" links (also correct). This seems intentional. Just confirming.

**Question 6:** Is it correct that SysAdmin can VIEW all FA/PA records but CANNOT create new ones? (The current implementation seems correct, just verifying.)

---

### ISSUE 3: No Action Buttons on Archived BM Cards
**Current:** In `sysadmin.js` → `initBMManagement()`, archived BMs are shown in a collapsible `<details>` section but there's **no "Start New Term" button**.  
**Expected (per user-flows.md):** Archived BMs should have a `[Start New Term]` button.

**This functionality exists in `term-manager.js`** (Term/Archive page), but the BM Management page doesn't offer this action.

**Question 7:** Should the "Start New Term" button be:
- **(A)** Only on the Term/Archive page (current state — keep as is), OR
- **(B)** Also duplicated on BM Management page for convenience, OR
- **(C)** Only on BM Management page (and remove from Term page)?

---

### ISSUE 4: Seed Data Only Has 2 Staff + 2 BM Assignments
**Current:** `seedDefaultData()` creates 3 BMs but only 2 secretaries with assignments. BM #3 has no secretary assigned.

**Question 8:** Should I update seed data to:
- Add a 3rd secretary assigned to BM #3?
- Or is this intentional to show the "no assignment" state?

---

## 🟢 RECOMMENDATIONS & SUGGESTIONS

### REC 1: Add "View Details" / "Profile" Action Per BM
Instead of just a table, each BM could have an expandable card or a "View" action that shows:
- Term info, budget summary, FA/PA record counts
- Assigned staff list
- Archive history
- Quick links: "View FA Records", "View Budget"

### REC 2: Add Staff Account Password Visibility
Staff accounts created by SysAdmin should have a "Show generated password" feature or a copy-to-clipboard for the initial temp password, since the secretary needs it to log in.

### REC 3: Add a "Quick Actions" Row to SysAdmin Dashboard
The SysAdmin dashboard (`dashboard.js`) shows stats but lacks quick action buttons like:
- "Add Board Member"
- "Add Staff"
- "View Pending Archives"
- "System Settings"

### REC 4: Add Data Export on Management Pages
The BM Management and Staff Management pages don't have export buttons. Adding "Export to CSV" for the BM list and staff list would be useful for reports.

### REC 5: Activity Log Filtering for SysAdmin Actions
SysAdmin should be able to filter activity logs by:
- Action type (user created, BM archived, term started, etc.)  
- User who performed the action
- Date range

**This may already work if `activity-logs.html` has proper filters — confirm with testing.**

### REC 6: SysAdmin Dashboard Should Show Pending Archive Count as Alert
If there are pending archive requests, the SysAdmin dashboard should show a prominent alert/banner with a link to the Term/Archive page.

### REC 7: Add Confirmation Modals for Destructive Actions
When SysAdmin deactivates a BM or staff account, there should be a confirmation modal warning about the consequences.

---

## 📋 QUESTIONS SUMMARY (Need Your Answers)

| # | Question | Options |
|---|----------|---------|
| 1 | Implement full BM CRUD on BM Management page? | Yes / No / Partial |
| 2 | Implement full Staff CRUD on Staff Management page? | Yes / No / Partial |
| 3 | Where should secretary-to-BM assignment management live? | A: Inline / B: Separate page / C: Modal |
| 4 | Create a System Settings page for SysAdmin? | Yes / No / Later |
| 5 | Fix admin login to reject non-sysadmin users? | Yes / No |
| 6 | Confirm: SysAdmin can view but NOT create FA/PA? | Correct / Change it |
| 7 | Where should "Start New Term" button appear? | A: Term page only / B: Both / C: BM page only |
| 8 | Update seed data with 3rd secretary? | Yes / No |

---

## 🎯 PRIORITY ORDER (Suggested)

1. **Fix admin login role check** (ISSUE 1) — security fix, quick win
2. **BM CRUD** (GAP 1) — core admin functionality
3. **Staff CRUD + Assignments** (GAP 2 + GAP 3) — core admin functionality
4. **SysAdmin dashboard quick actions** (REC 3) — UX improvement
5. **System Settings page** (GAP 4) — nice to have for MVP
6. **Seed data updates** (ISSUE 4) — polish

---

*Please answer the questions above so I can start implementing. Reply with the question numbers and your choices.*

