## Introduction

The dashboard pages (applicant profile, applicant dashboard) need a layout overhaul to fix three issues: obstructive decorative orbs, cards forced to equal height creating empty space, and inconsistent internal card alignment. All changes must strictly follow the project's DESIGN-SYSTEM.md specifications for the pastel glass morphism aesthetic.

## Requirements

### Requirement 1

**User Story:** As a user browsing the dashboard, I want decorative background orbs to not obstruct content, so that I can read and interact with all UI elements clearly.

1. Orbs use `position: fixed` with negative offsets so they sit at screen edges only
2. Maximum opacity is 0.25 (reduced from current 0.6)
3. Blur filter is 80px minimum for a soft, distant appearance
4. Orbs are hidden on screens smaller than 768px
5. Orbs use exact design system radial gradients (pink, blue, lavender)
6. No small dot accents placed within the content area
7. Orbs never overlap the main content column

### Requirement 2

**User Story:** As a user viewing my profile page, I want each card to be sized to fit its content without excess empty space, so that the layout looks proportionate and professional.

1. CSS Grid uses `items-start` alignment so cards are not stretched to row height
2. No `h-full` class on any card element
3. Desktop layout uses 2-column grid with `gap-5` (20px spacing)
4. Mobile layout uses single column with same `gap-5` spacing
5. Wide-content cards (External Profiles) span 2 columns using `md:col-span-2`
6. Content area is constrained to `max-w-5xl` and centered with `mx-auto`
7. Each card is only as tall as its content requires

### Requirement 3

**User Story:** As a user scanning multiple cards, I want consistent internal structure and spacing in every card, so that the interface feels cohesive.

1. Every card uses `p-6` (24px) padding uniformly on all sides
2. Card header is always: teal icon (h-4 w-4) followed by uppercase label (text-xs, tracking 0.15em, muted color)
3. Spacing between card header and content body is exactly `mb-4` (16px)
4. No nested `flex-col flex-1` wrapper divs inside cards — content is direct children
5. Form inputs span full width of the card
6. Vertical lists use `space-y-3` spacing
7. Badge/pill groups use `flex flex-wrap gap-2`

### Requirement 4

**User Story:** As a designer, I want the cards to follow the exact glass morphism specification from the design system, so that the visual output is correct.

1. Card background: `rgba(255, 255, 255, 0.75)` light mode, `rgba(26, 26, 46, 0.75)` dark mode
2. Card border: `1px solid rgba(255, 255, 255, 0.6)` light mode
3. Card border-radius: exactly `20px`
4. Card box-shadow: `0 8px 32px rgba(0, 0, 0, 0.08)` light mode
5. Card uses `backdrop-filter: blur(16px)`
6. All text uses design system tokens: primary (#1A1A2E), secondary (#6B7280), muted (#9CA3AF)
7. Accent color #5BC0BE for icons, links, and active states

### Requirement 5

**User Story:** As an applicant viewing my dashboard, I want the bento grid cards sized proportionately to their content, so that compact cards (scores, lists) don't have wasted space.

1. ATS Score card must have compact constrained height with the gauge graphic centered within that short space
2. Skills card uses a fixed height when displaying the maximum 5 skill bars; when fewer skills are present, height is content-determined; includes a "View all" link when more than 5 skills exist
3. Hidden Gems and Skill ROI cards are compact list layouts
4. Quick Actions card spans full width with horizontal button row
5. Grid uses `items-start` so short cards align to top without stretching
6. No forced equal heights between adjacent cards

### Requirement 6

**User Story:** As an applicant managing my profile, I want each profile section card to size naturally to its form content, so that the page layout is visually balanced.

1. Resume Upload card contains drag-drop zone at natural height
2. Profile Completeness card is compact (percentage display + short checklist)
3. Skills card grows with number of skills; when zero skills exist, the card collapses to minimal height showing only an empty state message
4. Learning Activity card shows max 6 items compactly; when more than 6 items exist, truncates to 6 with a "View all" link below the list
5. Work Experience and Education cards grow naturally with form content
6. Certifications and Work Preferences cards are compact form sections
7. External Profiles card spans full width as it contains multiple URL inputs
