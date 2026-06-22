## Technical Design: UI Layout Overhaul

### Architecture Overview

This overhaul modifies three layers:
1. **FloatingOrbs component** — reduced to subtle, non-obstructive fixed-position decorations
2. **Dashboard page grid layouts** — switch from `h-full` stretched grid to `items-start` content-fit bento
3. **Card internal structure** — standardize to flat content (no flex-col wrappers)

No new dependencies. Changes are CSS/layout only within existing React components.

### Component Changes

#### 1. FloatingOrbs (`src/components/shared/FloatingOrbs.tsx`)

**Current:** Uses `position: absolute`, `opacity: 0.6`, `blur(40px)`, large sizes (h-80, h-64), includes dot accents in content area.

**New design:**
- Container: `fixed inset-0 overflow-hidden pointer-events-none -z-10` with outer opacity `opacity-25`
- Hidden below md: `hidden md:block`
- 3 orbs only (pink, blue, lavender) using exact design system radial gradients
- Each orb positioned with negative offsets (`-top-40 -right-40`, `-bottom-32 -left-32`, `top-1/2 -left-20`)
- Size: `h-72 w-72` max (smaller than current h-80)
- Filter: `blur(80px)` (doubled from current)
- Animation: very slow subtle movement (duration 20s+)
- No dot accents

#### 2. Profile Page Grid (`src/app/(dashboard)/applicant/profile/page.tsx`)

**Current:** `grid grid-cols-1 gap-5 md:grid-cols-2` with `h-full flex flex-col` on every card.

**New design:**
```
className="grid grid-cols-1 gap-5 md:grid-cols-2 items-start"
```

Each card becomes:
```jsx
<div className="glass-card p-6">
  <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)] mb-4 flex items-center gap-2">
    <IconSvg />
    SECTION TITLE
  </h2>
  {/* Content directly here — no flex-1 wrapper */}
  <ComponentOrContent />
</div>
```

Key removals:
- Remove `h-full` from all card divs
- Remove `flex flex-col` from all card divs
- Remove `<div className="flex-1">` wrappers around content
- The `items-start` on the grid ensures cards don't stretch

Full-width card (External Profiles):
```jsx
<motion.section className="md:col-span-2">
  <div className="glass-card p-6">...</div>
</motion.section>
```

#### 3. Applicant Dashboard Grid (`src/app/(dashboard)/applicant/page.tsx`)

Same pattern: add `items-start` to the grid container, remove `h-full` from cards.

The dashboard grid:
```
className="grid gap-5 md:grid-cols-2 items-start"
```

Quick Actions card spans full width:
```jsx
<motion.div className="glass-card p-6 md:col-span-2">
```

#### 4. CSS (already correct in `globals.css`)

The `.glass-card` class already defines:
- `background: var(--bg-card)` — `rgba(255,255,255,0.75)`
- `backdrop-filter: blur(16px)`
- `border: 1px solid var(--border-glass)` — `rgba(255,255,255,0.6)`
- `border-radius: 20px`
- `box-shadow: var(--shadow-glass)` — `0 8px 32px rgba(0,0,0,0.08)`

No CSS changes needed.

### File Change Summary

| File | Change |
|------|--------|
| `src/components/shared/FloatingOrbs.tsx` | Rewrite: fixed position, reduced opacity/size, no dots |
| `src/app/(dashboard)/applicant/profile/page.tsx` | Grid: add `items-start`, remove `h-full`/`flex-col`/`flex-1` from all cards |
| `src/app/(dashboard)/applicant/page.tsx` | Grid: add `items-start`, remove `h-full` from cards |

### Testing Strategy

- Visual inspection in both light and dark modes
- Verify orbs don't overlap any card content
- Verify cards size to content (no empty bottom space)
- Verify responsive behavior: single column on mobile, 2-col on md+
- Verify full-width cards span correctly
