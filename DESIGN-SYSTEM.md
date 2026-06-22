# AI Job Matching Platform - Design System
## Pastel Glass Morphism & Soft Gradient Aesthetic

## Introduction
This design system documents the visual language for the AI Job Matching Platform. The aesthetic combines glass morphism, soft pastel gradients, modern sans-serif typography, and clean minimalist principles with a light lavender, baby blue, soft pink, and white color palette. The overall feel is airy, approachable, and professional.

## Color Palette

### Primary Colors:
| Color | Hex Value | Usage |
|-------|-----------|-------|
| **Soft Lavender** | #E8DEFF | Background gradients, decorative blobs, accent areas |
| **Pale Periwinkle** | #C9B8F7 | Secondary gradient tones, hover highlights |
| **Baby Blue** | #C4E4F9 | Background washes, gradient endpoints, light accents |
| **Ice Blue** | #DFF1FB | Card tints, subtle surface backgrounds |
| **Blush Pink** | #F8D0E0 | Gradient accents, decorative orbs, warm highlights |
| **Soft Peach** | #FDDDE6 | Secondary warm accents, badge backgrounds |
| **Pure White** | #FFFFFF | Card surfaces, primary backgrounds, text areas |
| **Light Gray** | #F7F8FA | Page canvas, subtle section separators |
| **Dark Charcoal** | #1A1A2E | Primary text, headings, strong contrast |
| **Medium Gray** | #6B7280 | Secondary text, labels, captions |
| **Accent Teal** | #5BC0BE | Primary CTA buttons, active states, links |
| **Deep Teal** | #3A8F8F | CTA hover state, pressed buttons |

### Gradient Definitions:
| Gradient | Value | Usage |
|----------|-------|-------|
| **Hero Background** | `linear-gradient(135deg, #DFF1FB 0%, #E8DEFF 40%, #F8D0E0 100%)` | Main page backgrounds, hero sections |
| **Decorative Orb (Pink)** | `radial-gradient(circle, #F8D0E0, #FDDDE6, transparent)` | Floating blob accents |
| **Decorative Orb (Blue)** | `radial-gradient(circle, #C4E4F9, #DFF1FB, transparent)` | Floating blob accents |
| **Decorative Orb (Lavender)** | `radial-gradient(circle, #C9B8F7, #E8DEFF, transparent)` | Floating blob accents |
| **Card Shine** | `linear-gradient(135deg, rgba(255,255,255,0.8), rgba(255,255,255,0.4))` | Glass card internal highlights |

## Typography
- **Font Family:** Inter, SF Pro Display, Helvetica Neue, sans-serif
- **Design Principles:** Clean, geometric, highly legible letterforms. Emphasis on large bold headings paired with lightweight body copy for strong visual hierarchy.
- **Heading Style:** Bold/Black weight, dark charcoal, large scale with tight letter-spacing for impact.
- **Body Style:** Regular/Medium weight, medium gray, comfortable line-height for readability.
- **Labels/Caps:** Small uppercase tracking (letter-spacing: 0.1em) for category labels and section identifiers.

## Glass Morphism Components
- **Card Elements:** White or near-white frosted containers with strong backdrop blur, very subtle borders, and soft drop shadows. Cards appear to float above the pastel gradient background.
  - CSS Properties: `background: rgba(255, 255, 255, 0.75); backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.6); border-radius: 20px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);`
- **Elevated Cards:** Slightly tilted or rotated cards with higher shadows for a 3D floating effect.
  - CSS Properties: `transform: rotate(-3deg); box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);`
- **Navigation:** Light transparent navigation with minimal styling, clean text links, and a bordered "Sign up" pill button.

## Decorative Elements
- **Floating Orbs:** Soft, blurred circles of pastel colors (pink, lavender, blue) scattered across backgrounds to create depth and visual interest.
  - Implementation: Absolutely positioned divs with `border-radius: 50%; filter: blur(40px); opacity: 0.6;`
- **Gradient Blobs:** Organic, amorphous shapes with multi-color pastel fills, positioned behind content cards.
- **Dot Accents:** Small colored circles (6-10px) scattered sparingly for subtle decoration.

## Minimalist Principles
- **Whitespace:** Generous spacing between elements to create an open, breathable layout.
- **Clarity First:** Content hierarchy is immediately apparent through size, weight, and color contrast.
- **Soft Edges:** All containers and buttons use large border-radius (12px-24px) for a friendly, approachable feel.
- **Depth Through Layering:** Visual depth achieved via overlapping glass cards and soft shadows rather than borders or heavy colors.

## Landing Page Components
- **Hero Section:** Left-aligned headline with supporting text, right side features floating glass cards showcasing platform features (profile card, match card). Pastel gradient background with decorative orbs.
- **CTA Buttons:**
  - Primary: Rounded pill shape, teal/accent background (#5BC0BE), white text, soft shadow. Example: "UPLOAD RESUME"
  - Secondary: Rounded pill shape, white/transparent background, dark border, dark text. Example: "JOB LISTINGS"
- **Navigation:** Minimal top bar, logo left, text links center-right, bordered pill "Sign up" button far right. No heavy background — sits on the gradient.
- **Feature Cards:** Glass morphism cards with rounded corners, showing applicant profiles, skill badges, and match percentages. Slightly rotated/tilted for a dynamic, playful arrangement.

## Component Styles

### Badges & Pills
- Skill tags: Light gray or white background, subtle border, rounded pill shape, small text.
- Match percentage: Bold text with a circular gauge/meter graphic using gradient strokes.

### Cards
- Profile Card: White glass surface, avatar, name in bold, skill pills beneath.
- Job Match Card: White glass surface, job title bold, company name regular, match percentage prominent.

### Buttons
- Border-radius: 24px (full pill)
- Padding: 12px 28px
- Font-weight: 600
- Text-transform: uppercase for primary CTAs
- Transition: smooth color and shadow on hover

## Implementation Guidelines
- **Responsive Behavior:** Floating cards stack vertically on mobile. Decorative orbs are hidden or reduced on smaller screens.
- **Accessibility:** Ensure dark charcoal text on light backgrounds maintains WCAG AA contrast (minimum 4.5:1). Teal buttons on white must pass contrast checks.
- **Performance:** Limit backdrop-filter usage to key cards. Use CSS gradients over image assets for background effects. Lazy-load decorative elements.
- **Animation:** Subtle floating/bobbing animation on decorative orbs. Cards may have gentle parallax on scroll. Keep motion minimal and respect `prefers-reduced-motion`.

## Conclusion
This design system creates a light, modern, and welcoming interface. The soft pastel gradients paired with glass morphism cards produce a premium, polished feel without heaviness. The airy color palette and generous whitespace make the platform feel approachable and trustworthy — ideal for a job matching experience where users should feel optimistic and supported.
