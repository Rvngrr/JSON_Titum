# Bugfix Requirements Document

## Introduction

The applicant profile page uses seven child components that contain hardcoded light-mode Tailwind utility classes (`bg-white`, `bg-gray-50`, `border-gray-200`, `text-gray-700`, `text-gray-600`, `text-gray-900`, etc.) instead of referencing the CSS custom properties defined in `src/app/globals.css`. When dark mode is active (`.dark` class on the root element), these components render as stark white boxes against the dark glass-card backgrounds, breaking visual consistency across the entire theme.

Affected components:
1. `SkillProfile.tsx` — "Add a Skill" form container & "Your Skills" list container
2. `ResumeUpload.tsx` — Drop zone and status displays
3. `WorkExperienceForm.tsx` — Entry cards (view and edit modes)
4. `EducationForm.tsx` — Entry cards (view and edit modes)
5. `CertificationsForm.tsx` — Entry cards (view and edit modes)
6. `WorkPreferencesForm.tsx` — Radio button cards, inputs, industry tags
7. `ExternalProfilesForm.tsx` — Input fields

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN dark mode is active AND the user views the SkillProfile component THEN the "Add a Skill" form and "Your Skills" list render with `bg-white` and `border-gray-200` backgrounds, appearing as bright white boxes against the dark page

1.2 WHEN dark mode is active AND the user views the ResumeUpload component THEN the drop zone renders with `bg-gray-50` and `border-gray-300`, appearing as a light-colored area against the dark card background

1.3 WHEN dark mode is active AND the user views entry cards in WorkExperienceForm, EducationForm, or CertificationsForm THEN the cards render with `bg-gray-50` and `border-gray-200`, creating bright rectangular areas that clash with the surrounding dark glass-card

1.4 WHEN dark mode is active AND the user views input fields in any of the affected components THEN inputs render with `border-gray-300` and implicit white backgrounds, appearing as bright form controls on a dark surface

1.5 WHEN dark mode is active AND text labels/values are displayed in these components THEN text renders with `text-gray-700`, `text-gray-600`, `text-gray-900`, or `text-gray-400` classes which have poor contrast or incorrect appearance against the dark backgrounds

1.6 WHEN dark mode is active AND the user views WorkPreferencesForm radio button cards THEN unselected cards render with `bg-white`, `border-gray-200`, and `text-gray-700`, appearing as light-mode elements

1.7 WHEN dark mode is active AND the user views industry tags in WorkPreferencesForm THEN tags render with `bg-gray-100` and `text-gray-700`, appearing as bright pills against the dark surface

### Expected Behavior (Correct)

2.1 WHEN dark mode is active AND the user views the SkillProfile component THEN the "Add a Skill" form and "Your Skills" list SHALL use `var(--bg-card-solid)` for backgrounds and `var(--border-input)` for borders, blending seamlessly with the dark theme

2.2 WHEN dark mode is active AND the user views the ResumeUpload component THEN the drop zone SHALL use `var(--bg-input)` for its background and `var(--border-input)` for its border, appearing consistent with the dark theme

2.3 WHEN dark mode is active AND the user views entry cards in WorkExperienceForm, EducationForm, or CertificationsForm THEN the cards SHALL use `var(--bg-input)` or `var(--bg-card-solid)` for backgrounds and `var(--border-input)` for borders

2.4 WHEN dark mode is active AND the user views input fields in any of the affected components THEN inputs SHALL use `var(--bg-input)` for background, `var(--border-input)` for borders, and `var(--text-primary)` for text color, matching the design system's `input-glass` styling

2.5 WHEN dark mode is active AND text labels/values are displayed in these components THEN text SHALL use `var(--text-primary)` for headings/values, `var(--text-secondary)` for labels, and `var(--text-muted)` for hints, ensuring proper contrast on dark surfaces

2.6 WHEN dark mode is active AND the user views WorkPreferencesForm radio button cards THEN unselected cards SHALL use `var(--bg-card-solid)` for background, `var(--border-input)` for borders, and `var(--text-primary)` for text

2.7 WHEN dark mode is active AND the user views industry tags in WorkPreferencesForm THEN tags SHALL use theme-aware colors (e.g., `var(--accent-light)` background with `var(--text-primary)` text) so they blend with the dark surface

### Unchanged Behavior (Regression Prevention)

3.1 WHEN light mode is active AND the user views any of the affected components THEN the system SHALL CONTINUE TO render with the same visual appearance as before (white backgrounds, gray borders, standard text colors) since the CSS variables map to equivalent light-mode values

3.2 WHEN the user interacts with forms in any theme (adding skills, uploading resumes, editing entries) THEN all functionality SHALL CONTINUE TO work identically — no behavioral changes to form submission, validation, or data handling

3.3 WHEN the user views proficiency-level badges in SkillProfile THEN the colored badges (beginner/intermediate/advanced/expert) SHALL CONTINUE TO use their distinct color-coding for differentiation

3.4 WHEN the user views status indicators (success/error messages, progress bars) in ResumeUpload THEN those feedback elements SHALL CONTINUE TO use semantic colors (green for success, red for error) that remain distinguishable

3.5 WHEN the user triggers hover and focus states on interactive elements THEN the system SHALL CONTINUE TO provide visible hover/focus feedback consistent with the design system's transition and shadow patterns

---

## Bug Condition (Formal)

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type ComponentRenderContext
  OUTPUT: boolean
  
  // The bug manifests when dark mode is active and one of the 7 affected
  // profile components is rendered
  RETURN X.isDarkModeActive = TRUE
         AND X.component IN {SkillProfile, ResumeUpload, WorkExperienceForm,
                             EducationForm, CertificationsForm,
                             WorkPreferencesForm, ExternalProfilesForm}
END FUNCTION
```

```pascal
// Property: Fix Checking — Dark mode visual consistency
FOR ALL X WHERE isBugCondition(X) DO
  renderedStyles ← renderComponent(X)
  ASSERT renderedStyles.backgroundColors ⊆ {var(--bg-card-solid), var(--bg-input), var(--bg-card)}
  ASSERT renderedStyles.borderColors ⊆ {var(--border-input), var(--border-subtle), var(--border-glass)}
  ASSERT renderedStyles.textColors ⊆ {var(--text-primary), var(--text-secondary), var(--text-muted)}
  ASSERT no_hardcoded_light_classes(renderedStyles)
END FOR
```

```pascal
// Property: Preservation Checking — Light mode unchanged
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT renderComponent_fixed(X) = renderComponent_original(X)
END FOR
```
