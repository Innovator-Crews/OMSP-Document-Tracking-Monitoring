# OMSP Document Tracking / Monitoring - Project Brief

## System Name
Bataan Sangguniang Panlalawigan Financial & Personal Assistance Tracking System
(OMSP Document Tracking / Monitoring)

## Core Entities
1. **Financial Assistance (FA)** - Government funds, ₱70,000/month per Board Member
2. **Personal Assistance (PA)** - Board Member's own money, tracked but unlimited

## User Roles
| Role | Description | Count |
|------|-------------|-------|
| **SysAdmin** | System administrator, full control | 1+ |
| **Board Member (BM)** | Elected SP members | 12 |
| **Secretary/Staff** | Office staff managing BM operations | Multiple per BM |

### Role Responsibilities
- **SysAdmin**: Manages all users, approves archives, manages permanent categories, views all data
- **Board Member**: Views own office data, approves "skip waiting", requests term archive
- **Secretary/Staff**: Creates FA/PA records for assigned BMs, adds custom categories

## Key Business Rules
1. FA is **private per BM** - only that BM and assigned staff can see it
2. PA is **transparent** - all secretaries can see all PA records (to catch fraud)
3. **Soft delete only** - nothing is permanently deleted
4. **Manual term archive** - BM requests, SysAdmin approves
5. **Multi-term support** - After archive, SysAdmin can start a new term (2nd, 3rd, etc.)
6. Categories: **Default (permanent)** + **Custom (can archive if unused)**
7. **Frequency tracking** - flag beneficiaries with 3+ requests/month
8. Monthly FA budget: ₱70,000 base (editable by BM) with optional rollover
9. PA budget: Pool-based (not monthly) — BM can add/edit/remove entries anytime
10. Duration control: 3/6/custom months cooling-off period
11. **Logout confirmation** - modal before signing out
12. **Sidebar collapse** - icon-only mode (64px), state persisted in localStorage

## Technical Stack
- HTML5 semantic markup
- CSS3 with custom properties (design tokens)
- Vanilla JavaScript (ES6+)
- localStorage for MVP data persistence
- No external frameworks (lightweight, fast)
- Deployable to Vercel as static site

## Design Principles
- Mobile-first responsive design
- White/light theme (#F8FAFC background)
- Professional government aesthetic
- Fast load times, offline capable
- Accessibility: WCAG 2.1 AA compliance

## Future Migration Path
localStorage → Firebase after supervisor MVP feedback
