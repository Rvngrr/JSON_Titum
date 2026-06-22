# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Hardcoded Light Classes in Dark Mode
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists in all 7 components
  - **Scoped PBT Approach**: For each of the 7 components, render in a dark-mode context and assert that no hardcoded light-mode Tailwind classes (`bg-white`, `bg-gray-50`, `bg-gray-100`, `border-gray-200`, `border-gray-300`, `text-gray-900`, `text-gray-700`, `text-gray-600`, `text-gray-500`, `text-gray-400`) are present on container, card, input, or text elements
  - Test that rendering SkillProfile, ResumeUpload, WorkExperienceForm, EducationForm, CertificationsForm, WorkPreferencesForm, and ExternalProfilesForm in dark mode produces only CSS variable-based color classes
  - Bug condition from design: `isBugCondition(X) = X.isDarkModeActive AND X.component IN [SkillProfile, ResumeUpload, WorkExperienceForm, EducationForm, CertificationsForm, WorkPreferencesForm, ExternalProfilesForm] AND componentContainsHardcodedLightClasses(X.component)`
  - Expected behavior: all backgrounds use `bg-[var(--bg-card-solid)]` or `bg-[var(--bg-input)]`, borders use `border-[var(--border-input)]` or `border-[var(--border-subtle)]`, text uses `text-[var(--text-primary)]`, `text-[var(--text-secondary)]`, or `text-[var(--text-muted)]`
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists in all 7 components)
  - Document counterexamples: which components contain which hardcoded classes
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Light Mode Visual and Functional Equivalence
  - **IMPORTANT**: Follow observation-first methodology
  - Observe: render each of the 7 components in light mode on UNFIXED code, record that form functionality works (add, edit, remove, save), semantic status colors (success green, error red) are distinguishable, focus states produce visible rings, and proficiency badges retain distinct colors
  - Write property-based tests asserting: for all non-dark-mode render contexts, form interactions (add/edit/remove/save) produce correct state changes, inputs accept and display values, buttons trigger expected callbacks, and semantic colors remain on status elements
  - Preservation from design: light-mode CSS variables resolve to equivalent values (`--bg-card-solid: #FFFFFF` ≈ `bg-white`, `--border-input: #E5E7EB` ≈ `border-gray-200`, `--text-primary: #1A1A2E` ≈ `text-gray-900`)
  - Verify tests PASS on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 3. Fix SkillProfile.tsx - Replace hardcoded light classes with theme-aware CSS variables

  - [ ] 3.1 Convert SkillProfile.tsx to theme-aware styling
    - Replace `bg-white` on form container and skills list container → `bg-[var(--bg-card-solid)]`
    - Replace `border-gray-200` → `border-[var(--border-input)]`
    - Replace `text-gray-900`/`text-gray-700` → `text-[var(--text-primary)]`
    - Replace `text-gray-600` → `text-[var(--text-secondary)]`
    - Replace `text-gray-500`/`text-gray-400` → `text-[var(--text-muted)]`
    - Replace input field styles with `input-glass` class or equivalent CSS variable pattern
    - Replace `bg-blue-600 hover:bg-blue-700` buttons → `bg-[var(--accent)] hover:bg-[var(--accent-hover)]`
    - Replace `hover:bg-gray-50` → `hover:bg-[var(--accent-light)]`
    - _Bug_Condition: isBugCondition(X) where X.isDarkModeActive=TRUE AND X.component=SkillProfile_
    - _Expected_Behavior: backgrounds use var(--bg-card-solid)/var(--bg-input), borders use var(--border-input), text uses var(--text-primary)/var(--text-secondary)/var(--text-muted)_
    - _Preservation: Light mode renders equivalently since CSS variables resolve to same values_
    - _Requirements: 2.1, 2.4, 2.5, 3.1, 3.2, 3.5_

- [ ] 4. Fix ResumeUpload.tsx - Replace hardcoded light classes with theme-aware CSS variables

  - [ ] 4.1 Convert ResumeUpload.tsx to theme-aware styling
    - Replace `bg-gray-50` on drop zone → `bg-[var(--bg-input)]`
    - Replace `border-gray-300` → `border-[var(--border-input)]`
    - Replace `text-gray-900`/`text-gray-700` → `text-[var(--text-primary)]`
    - Replace `text-gray-600` → `text-[var(--text-secondary)]`
    - Replace `text-gray-500`/`text-gray-400` → `text-[var(--text-muted)]`
    - Replace `bg-green-50 text-green-700` → `bg-[var(--success-bg)] text-[var(--success-text)]`
    - Replace `bg-red-50 text-red-700` → `bg-[var(--error-bg)] text-[var(--error-text)]`
    - Replace `bg-blue-600 hover:bg-blue-700` buttons → `bg-[var(--accent)] hover:bg-[var(--accent-hover)]`
    - _Bug_Condition: isBugCondition(X) where X.isDarkModeActive=TRUE AND X.component=ResumeUpload_
    - _Expected_Behavior: drop zone uses var(--bg-input) with var(--border-input), status displays use semantic vars_
    - _Preservation: Light mode renders equivalently; semantic colors remain distinguishable_
    - _Requirements: 2.2, 2.4, 2.5, 3.1, 3.2, 3.4_

- [ ] 5. Fix WorkExperienceForm.tsx - Replace hardcoded light classes with theme-aware CSS variables

  - [ ] 5.1 Convert WorkExperienceForm.tsx to theme-aware styling
    - Replace `bg-gray-50` on entry cards → `bg-[var(--bg-card-solid)]`
    - Replace `border-gray-200` → `border-[var(--border-input)]`
    - Replace `text-gray-900`/`text-gray-700` → `text-[var(--text-primary)]`
    - Replace `text-gray-600` → `text-[var(--text-secondary)]`
    - Replace `text-gray-500`/`text-gray-400` → `text-[var(--text-muted)]`
    - Replace input field styles with `input-glass` class or equivalent CSS variable pattern
    - Replace `bg-blue-600 hover:bg-blue-700` buttons → `bg-[var(--accent)] hover:bg-[var(--accent-hover)]`
    - Replace `hover:bg-gray-50` → `hover:bg-[var(--accent-light)]`
    - _Bug_Condition: isBugCondition(X) where X.isDarkModeActive=TRUE AND X.component=WorkExperienceForm_
    - _Expected_Behavior: entry cards use var(--bg-card-solid) with var(--border-input), inputs use input-glass styling_
    - _Preservation: Light mode renders equivalently; form add/edit/remove/save behavior unchanged_
    - _Requirements: 2.3, 2.4, 2.5, 3.1, 3.2, 3.5_

- [ ] 6. Fix EducationForm.tsx - Replace hardcoded light classes with theme-aware CSS variables

  - [ ] 6.1 Convert EducationForm.tsx to theme-aware styling
    - Replace `bg-gray-50` on entry cards → `bg-[var(--bg-card-solid)]`
    - Replace `border-gray-200` → `border-[var(--border-input)]`
    - Replace `text-gray-900`/`text-gray-700` → `text-[var(--text-primary)]`
    - Replace `text-gray-600` → `text-[var(--text-secondary)]`
    - Replace `text-gray-500`/`text-gray-400` → `text-[var(--text-muted)]`
    - Replace input field styles with `input-glass` class or equivalent CSS variable pattern
    - Replace `bg-blue-600 hover:bg-blue-700` buttons → `bg-[var(--accent)] hover:bg-[var(--accent-hover)]`
    - Replace `hover:bg-gray-50` → `hover:bg-[var(--accent-light)]`
    - _Bug_Condition: isBugCondition(X) where X.isDarkModeActive=TRUE AND X.component=EducationForm_
    - _Expected_Behavior: entry cards use var(--bg-card-solid) with var(--border-input), inputs use input-glass styling_
    - _Preservation: Light mode renders equivalently; form add/edit/remove/save behavior unchanged_
    - _Requirements: 2.3, 2.4, 2.5, 3.1, 3.2, 3.5_

- [ ] 7. Fix CertificationsForm.tsx - Replace hardcoded light classes with theme-aware CSS variables

  - [ ] 7.1 Convert CertificationsForm.tsx to theme-aware styling
    - Replace `bg-gray-50` on entry cards → `bg-[var(--bg-card-solid)]`
    - Replace `border-gray-200` → `border-[var(--border-input)]`
    - Replace `text-gray-900`/`text-gray-700` → `text-[var(--text-primary)]`
    - Replace `text-gray-600` → `text-[var(--text-secondary)]`
    - Replace `text-gray-500`/`text-gray-400` → `text-[var(--text-muted)]`
    - Replace input field styles with `input-glass` class or equivalent CSS variable pattern
    - Replace `bg-blue-600 hover:bg-blue-700` buttons → `bg-[var(--accent)] hover:bg-[var(--accent-hover)]`
    - Replace `hover:bg-gray-50` → `hover:bg-[var(--accent-light)]`
    - _Bug_Condition: isBugCondition(X) where X.isDarkModeActive=TRUE AND X.component=CertificationsForm_
    - _Expected_Behavior: entry cards use var(--bg-card-solid) with var(--border-input), inputs use input-glass styling_
    - _Preservation: Light mode renders equivalently; form add/edit/remove/save behavior unchanged_
    - _Requirements: 2.3, 2.4, 2.5, 3.1, 3.2, 3.5_

- [ ] 8. Fix WorkPreferencesForm.tsx - Replace hardcoded light classes with theme-aware CSS variables

  - [ ] 8.1 Convert WorkPreferencesForm.tsx to theme-aware styling
    - Replace `bg-white` on radio button cards → `bg-[var(--bg-card-solid)]`
    - Replace `border-gray-200` → `border-[var(--border-input)]`
    - Replace `text-gray-900`/`text-gray-700` → `text-[var(--text-primary)]`
    - Replace `text-gray-600` → `text-[var(--text-secondary)]`
    - Replace `text-gray-500`/`text-gray-400` → `text-[var(--text-muted)]`
    - Replace active radio card `border-blue-500 bg-blue-50 text-blue-700` → `border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)]`
    - Replace industry tags `bg-gray-100 text-gray-700` → `bg-[var(--accent-light)] text-[var(--text-primary)]`
    - Replace input field styles with `input-glass` class or equivalent CSS variable pattern
    - Replace `bg-blue-600 hover:bg-blue-700` buttons → `bg-[var(--accent)] hover:bg-[var(--accent-hover)]`
    - Replace `hover:bg-gray-50` → `hover:bg-[var(--accent-light)]`
    - _Bug_Condition: isBugCondition(X) where X.isDarkModeActive=TRUE AND X.component=WorkPreferencesForm_
    - _Expected_Behavior: radio cards use var(--bg-card-solid)/var(--accent-light) for selected, tags use var(--accent-light), inputs use input-glass_
    - _Preservation: Light mode renders equivalently; radio selection and tag behavior unchanged_
    - _Requirements: 2.6, 2.7, 2.4, 2.5, 3.1, 3.2, 3.5_

- [ ] 9. Fix ExternalProfilesForm.tsx - Replace hardcoded light classes with theme-aware CSS variables

  - [ ] 9.1 Convert ExternalProfilesForm.tsx to theme-aware styling
    - Replace `border-gray-200`/`border-gray-300` on inputs → `border-[var(--border-input)]`
    - Replace `text-gray-900`/`text-gray-700` → `text-[var(--text-primary)]`
    - Replace `text-gray-600` → `text-[var(--text-secondary)]`
    - Replace `text-gray-500`/`text-gray-400` → `text-[var(--text-muted)]`
    - Replace input field styles with `input-glass` class or equivalent CSS variable pattern
    - Replace `bg-blue-600 hover:bg-blue-700` save button → `bg-[var(--accent)] hover:bg-[var(--accent-hover)]`
    - _Bug_Condition: isBugCondition(X) where X.isDarkModeActive=TRUE AND X.component=ExternalProfilesForm_
    - _Expected_Behavior: inputs use var(--bg-input) with var(--border-input), text uses var(--text-primary)/var(--text-secondary)_
    - _Preservation: Light mode renders equivalently; form save behavior unchanged_
    - _Requirements: 2.4, 2.5, 3.1, 3.2, 3.5_

- [ ] 10. Verify bug condition exploration test now passes

  - [ ] 10.1 Re-run bug condition exploration test
    - **Property 1: Expected Behavior** - Dark Mode Visual Consistency
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior (no hardcoded light classes present)
    - When this test passes, it confirms all 7 components now use CSS variable references in dark mode
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed across all 7 components)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [ ] 10.2 Verify preservation tests still pass
    - **Property 2: Preservation** - Light Mode Visual and Functional Equivalence
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions in light mode or functionality)
    - Confirm all tests still pass after fix (no regressions)

- [ ] 11. Checkpoint - Ensure all tests pass
  - Run the full test suite to verify no regressions across the codebase
  - Verify both bug condition and preservation tests pass
  - Ensure all 7 components render correctly in both light and dark mode
  - Ask the user if questions arise
