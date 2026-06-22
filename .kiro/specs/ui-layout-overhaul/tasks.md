## Tasks

- [x] 1. Rewrite FloatingOrbs component to be non-obstructive
  - Rewrite `src/components/shared/FloatingOrbs.tsx`
  - Change container from `absolute` to `fixed inset-0 -z-10`
  - Add `hidden md:block` to hide on mobile
  - Set container opacity to `opacity-25`
  - Keep only 3 orbs (pink, blue, lavender) with exact design system radial gradients
  - Set each orb size to max `h-72 w-72`
  - Use `blur(80px)` filter on each orb
  - Position orbs at negative offsets: `-top-40 -right-40`, `-bottom-32 -left-32`, `top-1/2 -left-20`
  - Set animation duration to 20s+ for very slow subtle movement
  - Remove all dot accent elements

- [x] 2. Fix profile page grid to content-fit bento layout
  - In `src/app/(dashboard)/applicant/profile/page.tsx`
  - Add `items-start` to the grid container class: `grid grid-cols-1 gap-5 md:grid-cols-2 items-start`
  - Remove `h-full` from every `glass-card` div
  - Remove `flex flex-col` from every `glass-card` div
  - Remove all `<div className="flex-1">...</div>` wrapper elements (unwrap their children)
  - Ensure External Profiles section keeps `md:col-span-2` on its parent motion element

- [x] 3. Fix applicant dashboard grid to content-fit bento layout
  - In `src/app/(dashboard)/applicant/page.tsx`
  - Add `items-start` to the dashboard grid container
  - Remove any `h-full` classes from card elements
  - Ensure Quick Actions card has `md:col-span-2` class (spans full width)

- [x] 4. Verify internal card alignment consistency
  - Confirm all cards use `glass-card p-6` (no h-full, no flex-col)
  - Confirm all card headers follow pattern: icon (h-4 w-4 text-accent) + uppercase label (text-xs tracking-[0.15em] text-muted) + mb-4
  - Confirm content is direct child of card div without intermediate wrappers
  - Visual test in both light and dark mode
