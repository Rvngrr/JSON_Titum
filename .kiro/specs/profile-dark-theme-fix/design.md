# Profile Dark Theme Fix — Bugfix Design

## Overview

Seven applicant profile components render with hardcoded light-mode Tailwind classes (`bg-white`, `bg-gray-50`, `border-gray-200`, `text-gray-700`, etc.) that produce stark white boxes in dark mode. The fix replaces these static color classes with CSS custom property references (`--bg-card-solid`, `--bg-input`, `--border-input`, `--text-primary`, etc.) that already exist in `globals.css` and adapt to both light and dark themes. This is a purely visual/styling change with zero behavioral impact.

## Glossary

- **Bug_Condition (C)**: Dark mode is active (`.dark` class on root) AND one of the 7 affected profile components is rendered — causing hardcoded light colors to clash with the dark background
- **Property (P)**: All background, border, and text colors in the affected components use CSS custom properties that resolve correctly in both light and dark themes
- **Preservation**: Light-mode appearance remains visually identical (CSS variables map to equivalent values), all form functionality is unchanged, semantic status colors remain distinguishable
- **CSS Custom Properties**: Theme-aware variables defined in `globals.css` under `:root` (light) and `.dark` (dark) selectors
- **`input-glass`**: A utility class in `globals.css` that styles inputs with `var(--bg-input)`, `var(--border-input)`, 12px radius, and accent focus ring

## Bug Details

### Bug Condition

The bug manifests when the `.dark` class is active on the root element and any of the 7 applicant profile components is rendered. These components use hardcoded Tailwind color classes that resolve to fixed light-mode values regardless of theme context.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type ComponentRenderContext
  OUTPUT: boolean
  
  RETURN input.isDarkModeActive = TRUE
         AND input.component IN [SkillProfile, ResumeUpload, WorkExperienceForm,
                                  EducationForm, CertificationsForm,
                                  WorkPreferencesForm, ExternalProfilesForm]
         AND componentContainsHardcodedLightClasses(input.component)
END FUNCTION
```

### Examples

- **SkillProfile "Add a Skill" form**: Has `bg-white border-gray-200` → renders as a bright white box on dark `#0F0F1A` background. Expected: uses `bg-[var(--bg-card-solid)]` which resolves to `#1A1A2E` in dark mode.
- **ResumeUpload drop zone**: Has `bg-gray-50 border-gray-300` → light gray area on dark card. Expected: uses `bg-[var(--bg-input)]` resolving to `#1A1A2E` with `border-[var(--border-input)]` resolving to `#2D2D4A`.
- **WorkExperienceForm entry card**: Has `bg-gray-50 border-gray-200` → bright card on dark surface. Expected: uses `bg-[var(--bg-card-solid)]` with `border-[var(--border-input)]`.
- **WorkPreferencesForm unselected radio card**: Has `bg-white border-gray-200 text-gray-700` → white card with dark text. Expected: uses theme-aware variables for all three properties.
- **WorkPreferencesForm industry tags**: Has `bg-gray-100 text-gray-700` → bright pills. Expected: uses `bg-[var(--accent-light)]` with `text-[var(--text-primary)]`.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Light-mode appearance remains visually identical — CSS variables under `:root` map to equivalent light values (`--bg-card-solid: #FFFFFF`, `--border-input: #E5E7EB`, `--text-primary: #1A1A2E`)
- All form submission logic, validation, data handling, and Supabase interactions remain untouched
- Proficiency-level badge colors in SkillProfile (beginner=gray, intermediate=blue, advanced=purple, expert=green) continue using their distinct palette
- Semantic status colors (success green, error red, warning yellow) in ResumeUpload remain distinguishable
- Hover/focus states continue providing visible feedback
- Component layout, spacing, and responsive behavior remain unchanged
- Accessibility attributes (aria-labels, roles, focus management) remain unchanged

**Scope:**
All inputs that do NOT involve the 7 affected components rendering in dark mode should be completely unaffected by this fix. This includes:
- Any component outside the 7 listed ones
- Light-mode rendering of the same components (CSS vars resolve to same values)
- All JavaScript logic, event handlers, and state management
- All API calls and data transformations

## Hypothesized Root Cause

Based on the bug description, the root cause is straightforward:

1. **Hardcoded Tailwind Color Classes**: The components were written with static Tailwind classes (`bg-white`, `bg-gray-50`, `border-gray-200`, `text-gray-900`, `text-gray-700`, `text-gray-600`, `text-gray-500`, `text-gray-400`) that do not respond to theme changes.

2. **Missing Design System Integration**: The `globals.css` file defines a complete set of theme-aware CSS custom properties and utility classes (`input-glass`, `glass-card`, etc.), but these 7 components were never updated to use them.

3. **No Tailwind Dark Variant Usage**: The components also don't use Tailwind's `dark:` variant prefix, meaning they have no dark-mode override mechanism at all.

4. **Inconsistency with Parent Layout**: The parent page (`applicant/profile/page.tsx`) and layout likely use glass-card or theme-aware classes, creating a visual mismatch when child components render with fixed light colors.

## Correctness Properties

Property 1: Bug Condition - Dark Mode Visual Consistency

_For any_ component render where dark mode is active and the component is one of the 7 affected profile components, the fixed component SHALL render using only CSS custom property references for backgrounds (`--bg-card-solid`, `--bg-input`), borders (`--border-input`, `--border-subtle`), and text (`--text-primary`, `--text-secondary`, `--text-muted`) — no hardcoded `bg-white`, `bg-gray-*`, `border-gray-*`, `text-gray-*` classes shall remain in the component's styling for container, card, input, or text elements.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7**

Property 2: Preservation - Light Mode and Functional Equivalence

_For any_ render context where dark mode is NOT active (light mode), the fixed components SHALL produce visually equivalent output to the original components since the CSS custom properties resolve to the same values as the original hardcoded classes. All form functionality, data handling, and interactive behavior SHALL remain identical regardless of theme.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct (hardcoded Tailwind classes need replacement with CSS variable references):

**Files**: All 7 components in `src/components/applicant/`

**Replacement Strategy** (applied consistently across all components):

1. **Container/Card Backgrounds**:
   - `bg-white` → `bg-[var(--bg-card-solid)]`
   - `bg-gray-50` (on cards/containers) → `bg-[var(--bg-card-solid)]`
   - `bg-gray-50` (on input areas) → `bg-[var(--bg-input)]`

2. **Border Colors**:
   - `border-gray-200` → `border-[var(--border-input)]`
   - `border-gray-300` → `border-[var(--border-input)]`
   - `border-gray-100` → `border-[var(--border-subtle)]`

3. **Text Colors**:
   - `text-gray-900` → `text-[var(--text-primary)]`
   - `text-gray-700` → `text-[var(--text-primary)]`
   - `text-gray-600` → `text-[var(--text-secondary)]`
   - `text-gray-500` → `text-[var(--text-muted)]`
   - `text-gray-400` → `text-[var(--text-muted)]`
   - `placeholder-gray-400` → `placeholder-[var(--text-muted)]`

4. **Input Fields**:
   - Replace `border border-gray-300 ... focus:border-blue-500 focus:ring-1 focus:ring-blue-500` with `input-glass` class or equivalent `bg-[var(--bg-input)] border-[var(--border-input)] text-[var(--text-primary)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]`

5. **Accent/Action Colors**:
   - `bg-blue-600 hover:bg-blue-700` (primary buttons) → `bg-[var(--accent)] hover:bg-[var(--accent-hover)]`
   - `text-blue-600` / `hover:text-blue-600` → `text-[var(--accent)]`
   - `border-blue-500 bg-blue-50 text-blue-700` (active radio) → `border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)]`
   - `hover:border-blue-400` → `hover:border-[var(--accent)]`

6. **Tag/Badge Backgrounds**:
   - `bg-gray-100 text-gray-700` (industry tags) → `bg-[var(--accent-light)] text-[var(--text-primary)]`

7. **Hover State Backgrounds**:
   - `hover:bg-gray-50` → `hover:bg-[var(--accent-light)]`
   - `hover:bg-gray-100` → `hover:bg-[var(--accent-light)]`
   - `hover:bg-gray-200` → `hover:bg-[var(--accent-light)]`

**Components and specific changes:**

| Component | Key replacements |
|-----------|-----------------|
| `SkillProfile.tsx` | Form container `bg-white border-gray-200` → CSS vars; skills list container; inputs; buttons |
| `ResumeUpload.tsx` | Drop zone `bg-gray-50 border-gray-300`; status displays `bg-green-50`; text colors |
| `WorkExperienceForm.tsx` | Entry cards `bg-gray-50 border-gray-200`; all inputs; text labels; buttons |
| `EducationForm.tsx` | Entry cards `bg-gray-50 border-gray-200`; all inputs; text labels; buttons |
| `CertificationsForm.tsx` | Entry cards `bg-gray-50 border-gray-200`; all inputs; text labels; buttons |
| `WorkPreferencesForm.tsx` | Radio cards `bg-white border-gray-200`; industry tags; inputs; buttons |
| `ExternalProfilesForm.tsx` | All inputs; labels; save button |

**Note on semantic colors**: Error/success states (`bg-red-50 text-red-700`, `bg-green-50 text-green-700`) should be replaced with the semantic CSS variables (`var(--error-bg)`, `var(--error-text)`, `var(--success-bg)`, `var(--success-text)`) which also adapt to dark mode.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, confirm the bug exists by verifying hardcoded classes are present in unfixed code, then verify the fix applies theme-aware classes and maintains light-mode equivalence.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm that the hardcoded classes exist and produce incorrect colors in dark mode.

**Test Plan**: Write tests that render each component with a `.dark` class ancestor and inspect computed styles or class names for hardcoded light-mode references. Run these tests on the UNFIXED code to observe failures.

**Test Cases**:
1. **SkillProfile Container Test**: Render SkillProfile in dark mode context, assert no `bg-white` or `bg-gray-50` classes on container elements (will fail on unfixed code)
2. **ResumeUpload Drop Zone Test**: Render ResumeUpload in dark mode, assert drop zone does not have `bg-gray-50 border-gray-300` (will fail on unfixed code)
3. **Entry Card Test**: Render WorkExperienceForm with entries in dark mode, assert cards don't have `bg-gray-50 border-gray-200` (will fail on unfixed code)
4. **Input Field Test**: Render any form component in dark mode, assert input borders are not `border-gray-300` (will fail on unfixed code)

**Expected Counterexamples**:
- All 7 components contain hardcoded `bg-white`, `bg-gray-50`, `border-gray-200/300`, `text-gray-*` classes
- These classes resolve to fixed light-mode colors regardless of theme context

### Fix Checking

**Goal**: Verify that for all components rendered in dark mode, the fixed version uses CSS custom property references instead of hardcoded colors.

**Pseudocode:**
```
FOR ALL component WHERE isBugCondition(component) DO
  renderedOutput := render(component, {darkMode: true})
  classNames := extractClassNames(renderedOutput)
  ASSERT NOT containsAny(classNames, ['bg-white', 'bg-gray-50', 'bg-gray-100'])
  ASSERT NOT containsAny(classNames, ['border-gray-200', 'border-gray-300'])
  ASSERT NOT containsAny(classNames, ['text-gray-900', 'text-gray-700', 'text-gray-600'])
  ASSERT containsAny(classNames, ['bg-[var(--bg-card-solid)]', 'bg-[var(--bg-input)]'])
  ASSERT containsAny(classNames, ['border-[var(--border-input)]'])
  ASSERT containsAny(classNames, ['text-[var(--text-primary)]', 'text-[var(--text-secondary)]'])
END FOR
```

### Preservation Checking

**Goal**: Verify that for all renders in light mode, the fixed function produces the same visual result as the original function (CSS variables resolve to equivalent light values).

**Pseudocode:**
```
FOR ALL component WHERE NOT isBugCondition(component) DO
  // In light mode, --bg-card-solid=#FFFFFF (same as bg-white)
  // --border-input=#E5E7EB (same as border-gray-200)
  // --text-primary=#1A1A2E (equivalent to text-gray-900)
  ASSERT computedStyles_fixed(component, lightMode) ≈ computedStyles_original(component, lightMode)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It can generate many component states (empty forms, forms with entries, editing vs viewing mode)
- It catches edge cases where a specific combination of state might reveal a missed class replacement
- It provides strong guarantees that light-mode appearance and behavior is unchanged

**Test Plan**: Observe rendered output on UNFIXED code in light mode first, then write tests asserting the fixed code produces equivalent computed styles in light mode.

**Test Cases**:
1. **Light Mode Visual Equivalence**: Verify that `--bg-card-solid` resolves to `#FFFFFF` in light mode (equivalent to `bg-white`)
2. **Form Functionality Preservation**: Verify adding/removing entries, saving, and validation continue to work after class changes
3. **Focus State Preservation**: Verify focus rings still appear on inputs using `var(--accent)` (which is the same `#5BC0BE` teal in both themes)
4. **Semantic Color Preservation**: Verify error/success messages still display with correct semantic colors

### Unit Tests

- Test that each fixed component renders without hardcoded light-mode color classes
- Test that CSS variable references are present in rendered output
- Test that form interactions (add, edit, remove, save) still work after styling changes
- Test error states render with semantic color variables

### Property-Based Tests

- Generate random form states (0-N entries, editing/viewing, with/without errors) and verify no hardcoded light classes appear in any render
- Generate random theme contexts and verify CSS variable references resolve to appropriate values
- Generate random user interactions and verify functional behavior is unchanged

### Integration Tests

- Test full applicant profile page in dark mode — all 7 components render with consistent dark styling
- Test switching between light and dark mode — components adapt colors smoothly
- Test full form workflow (add entry → edit → save → view) in dark mode with correct styling throughout
