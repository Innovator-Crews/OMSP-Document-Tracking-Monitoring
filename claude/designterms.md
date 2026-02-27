# Design Terms Reference

A glossary of visual design and CSS techniques used across this project.
Intended for developers, collaborators, and AI context.

---

## Glassmorphism

**What it is:** A UI style where elements appear as frosted glass — translucent backgrounds with a blur effect, creating a sense of depth and layering.

**How it's used here:**
- `.landing-about-card` — 10% white background + 16px backdrop blur + subtle white border
- `.login-promo-badge` — semi-transparent white pill badge over the promo panel
- Landing feature cards — `rgba(255,255,255,0.82)` + `backdrop-filter: blur(10px)`

**Key CSS properties:**
```css
background: rgba(255, 255, 255, 0.10);
backdrop-filter: blur(16px);
-webkit-backdrop-filter: blur(16px);
border: 1px solid rgba(255, 255, 255, 0.18);
```

---

## Parallax

**What it is:** A scrolling effect where the background image moves at a different (slower) rate than the foreground content, creating an illusion of depth.

**How it's used here:**
- `.landing-about-section` — `TheBunker-bg.jpg` uses `background-attachment: fixed` so the image stays fixed while the page scrolls over it
- Falls back to `background-attachment: scroll` on mobile (iOS doesn't support `fixed` on scrollable elements reliably)

**Key CSS properties:**
```css
background-attachment: fixed;  /* desktop */
background-attachment: scroll; /* mobile fallback */
```

---

## Dark Overlay

**What it is:** A semi-transparent layer placed over a background image to reduce its visual intensity and ensure text remains legible.

**How it's used here:**
- `.landing-about-section` — `linear-gradient(rgba(15,23,42,0.72), rgba(15,23,42,0.60))` layered above the image
- `.login-promo` — `linear-gradient(135deg, rgba(30,58,138,0.92), rgba(29,78,216,0.88), rgba(3,105,161,0.90))` over the same image
- Admin login promo — darker indigo-tinted gradient overlay

**Key CSS pattern:**
```css
background-image:
  linear-gradient(to bottom, rgba(0,0,0,0.7), rgba(0,0,0,0.5)),
  url('path/to/image.jpg');
background-size: cover;
background-position: center;
```

---

## Bento Grid

**What it is:** A mosaic-style layout inspired by Japanese lunchboxes — cards of varying sizes arranged in a structured but visually interesting grid. Common in modern SaaS landing pages.

**How it's used here:**
- `.landing-bento-grid` on the Features section — uses CSS Grid with `repeat(12, minmax(0, 1fr))` columns and cards assigned different column/row spans

**Key CSS properties:**
```css
display: grid;
grid-template-columns: repeat(12, minmax(0, 1fr));
grid-auto-rows: minmax(150px, auto);
```

---

## Backdrop Blur

**What it is:** Applies a blur filter to everything rendered behind an element, creating the frosted-glass look. Part of the CSS `backdrop-filter` spec.

**How it's used here:**
- All glassmorphism cards and badges throughout the app
- `.modal-overlay` — `backdrop-filter: blur(4px)` to dim and soften the page behind modals
- `.sidebar-overlay` — same effect on mobile sidebar

**Key CSS properties:**
```css
backdrop-filter: blur(10px);
-webkit-backdrop-filter: blur(10px); /* Safari prefix required */
```

---

## Design Token (CSS Custom Property)

**What it is:** A named variable that stores a reusable design value — color, spacing, font size, shadow, etc. Defined in `:root {}` so they cascade through the entire document.

**How it's used here:**
- All colors: `--primary-600`, `--neutral-200`, `--danger-500`, etc.
- Spacing: `--space-4`, `--space-8`, `--space-12`
- Typography: `--text-sm`, `--font-semibold`, `--leading-relaxed`
- Shadows, radii, transitions: `--shadow-sm`, `--radius-lg`, `--transition-fast`

Defined in `assets/css/main.css` `:root` block.

---

## Role-Based Theming

**What it is:** Applying different accent colors to the same UI components depending on the user's role, scoped with a `data-role` attribute on `<body>`.

**How it's used here:**
- `[data-role="board_member"]` → amber (`--accent-*`) sidebar active states
- `[data-role="secretary"]` → teal (`--secondary-*`) sidebar active states
- Default (sysadmin) → blue (`--primary-*`) sidebar

Set in `assets/js/app.js` `setupShell()`, scoped in `assets/css/layout.css`.

---

## Fade-In Animation

**What it is:** A CSS keyframe animation that transitions an element from invisible (`opacity: 0`, slightly translated down) to fully visible and in position.

**How it's used here:**
- `.fade-in` / `.animate-fade-in` — applied to hero sections, login panels, dashboard content
- Staggered via `animation-delay` on sibling elements for sequential reveal

Defined in `assets/css/animations.css`.

---

## Odometer / Counter Animation

**What it is:** A number-counting animation where stats "count up" from zero to their final value on scroll or page load, giving the impression of a live counter.

**How it's used here:**
- `.landing-metric-chip` on the Stats Band section — `data-odometer` attributes with target values (12 board members, 3 roles, 6 modules, 100%)

Implemented in `assets/js/landing.js` using `IntersectionObserver`.

---

## Split-Panel Login Layout

**What it is:** A login page design with two vertical halves — a decorative/branded left panel and a functional right panel containing the form. Common in enterprise SaaS applications.

**How it's used here:**
- `.login-promo` (left) — full-height branded panel with background image overlay, feature highlights, and SP logo watermark
- `.login-form-panel` (right) — clean white form area

Both roles (staff/board member and sysadmin) share this layout via `pages/login.html` and `sysadmin/login.html`, using the same `login.css` with admin-specific color overrides via inline `<style>`.

---

## CSS Logical Layers / Specificity Cascade

**What it is:** Deliberately ordering CSS files and selectors so that general rules load first and role/page-specific overrides come after, relying on specificity and source order to win.

**How it's used here:**
- Load order: `main.css` → `components.css` → `animations.css` → `layout.css` → `pages/*.css`
- Role overrides use `[data-role="..."] .selector` to add specificity without `!important`
- Inline `<style>` in sysadmin login sits after the `<link>` tags, winning via source order

---

## Responsive Breakpoints

**What it is:** CSS `@media` queries that change layout and styles at defined screen widths (breakpoints).

**How it's used in this project:**

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Large desktop | 1440px+ | Content max-width capped |
| Small desktop | ≤1024px | 3-col grids collapse to 2-col |
| Tablet | ≤768px | Sidebar hides, toggles to drawer; 2-col grids to 1-col |
| Mobile | ≤480px | Single-column everything; pagination stacks |
| Small mobile | ≤320px | Compact header and font sizes |

Defined in `assets/css/layout.css`.

---

## Sidebar Collapse / Minimized Mode

**What it is:** A desktop sidebar that can be toggled between a full-width labeled state and a narrow icon-only state.

**How it's used here:**
- `.sidebar.collapsed` — shrinks to 64px wide, hides text (`.nav-text`), hides section labels, centers icons
- In collapsed state, `.sidebar-logo` is hidden and `.sidebar-collapse-btn` takes its place in the header
- State persisted in `localStorage` (`omsp_sidebar_collapsed`)
- No-transition class applied on page load to avoid flicker when restoring state

---

## Orb / Blob Background Animation

**What it is:** Large, softly-blurred radial gradient shapes animated to slowly drift across a background, creating a living ambient effect without heavy assets.

**How it's used here:**
- `.landing-bg-orb-*` on the landing page hero — 5 orbs of different sizes/colors using `@keyframes` with `transform: translate + scale`
- `.login-orb-*` on the login promo panel — 3 orbs for the same effect at smaller scale

Defined in `assets/css/animations.css` and `assets/css/pages/landing.css`.
