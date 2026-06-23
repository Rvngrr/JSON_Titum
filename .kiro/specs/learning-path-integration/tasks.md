# Implementation Plan: Learning Path Integration

## Overview

This plan implements the Learning Paths feature for the CareerFlow applicant dashboard. The feature adds a dedicated page at `/applicant/learning-paths` that recommends legitimate online courses based on skill gaps identified through match results and career goal analysis. Implementation follows a bottom-up approach: core logic modules first (URL validator, course catalog, skill gap aggregator), then the API route, then frontend components, and finally navigation/dashboard integration.

## Tasks

- [x] 1. Create core logic modules and interfaces
  - [x] 1.1 Create shared TypeScript interfaces and types for the learning paths feature
    - Create `src/lib/learning-paths/types.ts` with all interfaces: `CatalogCourseEntry`, `CoursePlatform`, `ApprovedUrlPattern`, `AggregatedSkillGap`, `LearningPathResponse`, `SkillGapGroup`, `CourseRecommendation`
    - Export the `APPROVED_URL_PATTERNS` constant array with all 7 platform domain/path entries
    - _Requirements: 2.3, 6.1, 6.4, 7.2_

  - [x] 1.2 Implement the URL validator module
    - Create `src/lib/learning-paths/url-validator.ts`
    - Implement `isValidCourseUrl(url: string): boolean` that checks the URL starts with `https://` and matches one of the approved domain + path prefix combinations
    - Implement `filterValidUrls(urls: string[]): string[]` helper that filters an array of URLs
    - _Requirements: 7.2, 7.3_

  - [ ]* 1.3 Write property test for URL validator (Property 1)
    - **Property 1: URL validation filters to approved domains only**
    - Generate random URL strings with fast-check; verify only approved patterns pass and all others are rejected
    - **Validates: Requirements 2.3, 6.4, 7.2, 7.3**

  - [x] 1.4 Implement the course catalog module
    - Create `src/lib/learning-paths/course-catalog.ts`
    - Define `COURSE_CATALOG: CatalogCourseEntry[]` with pre-verified course entries covering common skills (Python, JavaScript, SQL, React, Data Analysis, Machine Learning, TypeScript, Node.js, Git, CSS, etc.)
    - Implement `getCoursesForSkill(skill: string): CatalogCourseEntry[]` — case-insensitive matching of skill against catalog entries' `skills` arrays, returns 1-5 entries
    - Implement `mapSkillsToCourses(skills: string[]): Map<string, CatalogCourseEntry[]>` — maps multiple skills, omitting skills with no catalog match
    - _Requirements: 7.1, 7.4, 6.7_

  - [ ]* 1.5 Write property tests for course catalog mapper (Properties 4, 5, 10)
    - **Property 4: Course recommendations per skill gap are capped at 3 from the API**
    - **Property 5: Skills without catalog entries are omitted from the response**
    - **Property 10: Catalog mapping returns 1-5 courses per matched skill**
    - **Validates: Requirements 6.3, 6.7, 7.1, 7.4**

  - [x] 1.6 Implement the skill gap aggregator module
    - Create `src/lib/learning-paths/skill-gap-aggregator.ts`
    - Implement `aggregateSkillGaps(matchResults: MatchResult[], roleReadiness: { missing: string[] } | null): AggregatedSkillGap[]`
    - Merge skills from match results and career goal, deduplicate case-insensitively, label sources ("Job Matches", "Career Goal", "Both")
    - Rank by job count descending, cap at 10
    - Implement `formatJobCount(jobCount: number, totalJobs: number): string` returning "{N} of {M} jobs"
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ]* 1.7 Write property tests for skill gap aggregator (Properties 2, 3, 8)
    - **Property 2: Skill gap ranking is sorted descending by job frequency and capped at 10**
    - **Property 3: Skill merge produces case-insensitive deduplication with correct source labels**
    - **Property 8: Job count format produces "N of M jobs" string**
    - **Validates: Requirements 3.2, 3.3, 3.4**

- [x] 2. Implement display utility functions
  - [x] 2.1 Create display utilities module
    - Create `src/lib/learning-paths/display-utils.ts`
    - Implement `truncateTitle(title: string): string` — if title > 80 chars, return first 80 chars + "...", otherwise return unchanged
    - Implement `sortAndCapRecommendations(courses: CourseRecommendation[], maxItems?: number): CourseRecommendation[]` — sort by impactScore descending, cap at maxItems (default 10)
    - Implement `generateAriaLabel(title: string, platform: string): string` — returns aria-label containing both course title (possibly truncated) and platform name
    - _Requirements: 1.6, 2.1, 2.6_

  - [ ]* 2.2 Write property tests for display utilities (Properties 6, 7, 9)
    - **Property 6: Course title truncation preserves content up to 80 characters**
    - **Property 7: Display sorting caps at 10 per skill and orders by impact score descending**
    - **Property 9: Accessible link labels contain course title and platform**
    - **Validates: Requirements 1.6, 2.1, 2.6**

- [x] 3. Checkpoint - Core modules verified
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement the Learning Path API route
  - [x] 4.1 Create the API route handler at `/api/learning-paths`
    - Create `src/app/api/learning-paths/route.ts`
    - Implement GET handler: authenticate user via Supabase, return 401 if unauthenticated
    - Fetch match_results for the user from Supabase
    - Fetch work_preferences (career goal) from skill_profiles table
    - Call skill gap aggregator to merge and rank skills
    - Call course catalog module to map skills to courses
    - Filter all URLs through URL validator
    - Cap at 3 courses per skill gap
    - Return `LearningPathResponse` with grouped recommendations (200), or empty array if no skills (200), or error (500)
    - Ensure complete response within 5 seconds
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_

  - [ ]* 4.2 Write unit tests for the API route
    - Test 401 response for unauthenticated requests
    - Test 200 with empty array when user has no missing skills
    - Test 200 with grouped course recommendations for user with skill gaps
    - Test that max 3 courses per skill are returned
    - Test 500 response on internal error
    - _Requirements: 6.1, 6.2, 6.3, 6.5, 6.6_

- [x] 5. Implement frontend components
  - [x] 5.1 Create the CourseCard component
    - Create `src/components/applicant/CourseCard.tsx`
    - Display course title (truncated via display util), platform name, duration (e.g., "4h"), and certificate badge if applicable
    - Render course link opening in new tab with `rel="noopener noreferrer"` and ARIA label containing title + platform
    - Show "Certificate Available" badge when `hasCertificate` is true, omit when false/unknown
    - Apply visible focus indicator (2px solid accent outline, 2px offset) on keyboard focus
    - Use glass-card styling, CSS custom properties, Tailwind CSS
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 8.6_

  - [x] 5.2 Create the SkillGapSection component
    - Create `src/components/applicant/SkillGapSection.tsx`
    - Render skill name as section heading, display job count format ("N of M jobs"), source label
    - Render list of CourseCard components (max 10, sorted by impact score descending)
    - Use semantic HTML (section, h3 heading)
    - Apply framer-motion entrance animation, respect prefers-reduced-motion
    - _Requirements: 1.1, 1.6, 3.4, 8.4, 8.5, 8.7_

  - [x] 5.3 Create the LearningPathsPage component
    - Create `src/app/(dashboard)/applicant/learning-paths/page.tsx`
    - Display page title "Learning Paths" and description (≤150 chars) about recommended skills based on job match gaps
    - Fetch data from `/api/learning-paths` on mount
    - Show animated skeleton loading state using same pattern as dashboard (`SkeletonCard`)
    - Show empty state when no skill gaps found (prompt user to complete profile or apply to jobs)
    - Show error state with retry button on network/server failure
    - Render `SkillGapSection` components for each skill gap group
    - Responsive layout: single-column <768px, tablet 768-1023px (44x44 touch targets), multi-column ≥1024px
    - Use semantic HTML (main, section, heading hierarchy), ARIA labels, glass-card components
    - Disable animations when prefers-reduced-motion is enabled
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 3.5, 3.6, 8.1, 8.2, 8.3, 8.4, 8.5, 8.7_

  - [ ]* 5.4 Write unit tests for frontend components
    - Test LearningPathsPage renders loading skeleton
    - Test LearningPathsPage renders empty state when no skill gaps
    - Test LearningPathsPage renders error state with retry
    - Test LearningPathsPage renders populated state with SkillGapSections
    - Test CourseCard renders with and without certificate badge
    - Test CourseCard link has correct aria-label, target, and rel attributes
    - _Requirements: 1.3, 1.4, 1.5, 2.4, 2.5, 2.6_

- [x] 6. Checkpoint - Page functionality verified
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Integrate navigation and dashboard quick action
  - [x] 7.1 Add Learning Paths entry to the applicant sidebar navigation
    - Modify `src/app/(dashboard)/applicant/layout.tsx`
    - Add a "Learning Paths" nav item to `NAV_ITEMS` array with an education/book SVG icon, linking to `/applicant/learning-paths`
    - Ensure active state styling and `aria-current="page"` apply correctly when on the learning paths route
    - Entry is visible in both desktop sidebar and mobile drawer
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 7.2 Add Learning Paths quick action to the applicant dashboard
    - Modify `src/app/(dashboard)/applicant/page.tsx`
    - Add "Learning Paths" as the last quick action pill after "Applied Jobs"
    - Use an education/learning SVG icon with a distinct color (e.g., rose-400/pink-400)
    - Link to `/applicant/learning-paths`
    - Style as rounded-full pill matching existing quick action dimensions, font size, border, and hover pattern
    - Only display when `hasProfile` is true (not shown in onboarding state)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ]* 7.3 Write unit tests for navigation integration
    - Test sidebar includes "Learning Paths" nav item with correct href
    - Test quick action is present after "Applied Jobs" when user has profile
    - Test quick action is not displayed in no-profile/onboarding state
    - _Requirements: 4.5, 5.1_

- [x] 8. Final checkpoint - Full feature verified
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document using fast-check
- Unit tests validate specific examples and edge cases using vitest
- The course catalog is static (no DB migration needed) and updated via code deployments
- All frontend components use the existing design system (glass-card, CSS custom properties, Tailwind CSS 4, Framer Motion)
- The implementation reuses existing Supabase client patterns from other dashboard pages

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.4", "1.6", "2.1"] },
    { "id": 2, "tasks": ["1.3", "1.5", "1.7", "2.2"] },
    { "id": 3, "tasks": ["4.1"] },
    { "id": 4, "tasks": ["4.2", "5.1"] },
    { "id": 5, "tasks": ["5.2"] },
    { "id": 6, "tasks": ["5.3"] },
    { "id": 7, "tasks": ["5.4", "7.1", "7.2"] },
    { "id": 8, "tasks": ["7.3"] }
  ]
}
```
