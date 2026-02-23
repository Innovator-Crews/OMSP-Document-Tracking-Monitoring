# Component Library

## Color Tokens
| Token | Hex | Usage |
|-------|-----|-------|
| --primary-50 | #EFF6FF | Light backgrounds |
| --primary-100 | #DBEAFE | Active backgrounds |
| --primary-500 | #3B82F6 | Links, icons |
| --primary-700 | #1D4ED8 | Primary buttons |
| --primary-800 | #1E40AF | Headers, active nav |
| --secondary-500 | #14B8A6 | Success states, PA |
| --secondary-600 | #0D9488 | Secondary actions |
| --accent-500 | #F59E0B | Warnings |
| --accent-600 | #D97706 | Warning badges |
| --danger-500 | #EF4444 | Errors, archive |
| --danger-600 | #DC2626 | Delete actions |
| --neutral-50 | #F8FAFC | Page background |
| --neutral-100 | #F1F5F9 | Card backgrounds |
| --neutral-200 | #E2E8F0 | Borders |
| --neutral-500 | #64748B | Secondary text |
| --neutral-700 | #334155 | Headings |
| --neutral-800 | #1E293B | Primary text |

## Typography
| Element | Size | Weight | Line Height |
|---------|------|--------|-------------|
| H1 | 28px | 700 | 1.2 |
| H2 | 22px | 600 | 1.3 |
| H3 | 18px | 600 | 1.4 |
| Body | 14px | 400 | 1.5 |
| Label | 12px | 600 | 1.4 |
| Button | 14px | 600 | 1 |
| Caption | 12px | 500 | 1.4 |

## Component Specs

### Buttons
- **Primary**: bg #1D4ED8, hover #1E40AF, white text, translateY(-1px), shadow
- **Secondary**: white bg, #1D4ED8 border + text, hover light blue bg
- **Success**: bg #10B981, hover #059669
- **Warning**: bg #FEF3C7, text #92400E
- **Danger**: bg #FEE2E2, text #991B1B, hover bg #DC2626 + white text
- **Ghost**: transparent, hover neutral-100 bg
- **Icon**: 40x40px, rounded, icon centered
- **Sizes**: sm (32px), md (40px), lg (48px)
- **Loading state**: spinner + "Loading..." text, disabled

### Cards
- Background: white, Border: 1px solid #E2E8F0
- Border-radius: 8px, Shadow: var(--shadow)
- Padding: 24px, Hover: translateY(-2px) + shadow-md
- Stat card: icon + label + value + subtext + optional progress bar

### Forms
- Input height: 44px, padding: 0 12px
- Border: 1px solid #E2E8F0, radius: 6px
- Focus: #3B82F6 border + ring shadow
- Error: #EF4444 border + #FEF2F2 bg + error message below
- Label: 12px uppercase semibold, margin-bottom 6px
- Select: same height, custom arrow
- Textarea: min-height 100px, resize vertical

### Tables
- Header: #F8FAFC bg, uppercase 11px text, semibold
- Row hover: #F8FAFC
- Border: 1px solid #E2E8F0
- Cell padding: 12px 16px
- Sortable: header click, arrow indicator
- Responsive: horizontal scroll on mobile

### Modals
- Overlay: rgba(15, 23, 42, 0.5) + backdrop-blur(4px)
- Container: white, 12px radius, max-width 480px
- Animation: scale(0.95)→scale(1), translateY(10px)→0
- Header: title + close button
- Footer: action buttons right-aligned

### Toasts
- Position: top-right, stacked
- Types: success (green), error (red), warning (amber), info (blue)
- Auto-dismiss: 5 seconds
- Animation: slide in from right, fade out

### Badges
- Frequency: 🟢 Normal, 🟡 Monitor, 🔴 High
- Status: ongoing (blue), successful (green), denied (red)
- Role: sysadmin (purple), board_member (blue), secretary (teal)
- Category: 🔒 permanent (gray), 📝 custom (blue), 🗂️ archived (amber)

### Empty States
- Centered icon + title + description + optional action button
- Gray tones, friendly messaging

### Banners
- Full-width, sticky at top of content
- Info (blue), Warning (yellow), Critical (orange), Locked (red)
- Icon + title + message + optional action + dismiss button
