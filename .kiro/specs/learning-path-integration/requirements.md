# Requirements Document

## Introduction

This feature adds a dedicated Learning Path page to the applicant dashboard that suggests legitimate online courses and certifications based on the applicant's missing skills identified through gap analysis. The page helps applicants bridge skill gaps by recommending real courses from established platforms (Coursera, Udemy, DataCamp, LinkedIn Learning, etc.). A quick action shortcut is also added to the main dashboard for easy access.

## Glossary

- **Learning_Path_Page**: The dedicated applicant-facing page at `/applicant/learning-paths` that displays curated course recommendations organized by missing skills.
- **Course_Recommendation**: A data object representing a single suggested course, including its title, platform, URL, skill coverage, estimated duration, and certification availability.
- **Skill_Gap**: A skill identified as missing or insufficient in the applicant's profile relative to job requirements or their career goal, derived from match results or role readiness analysis.
- **Course_Platform**: An external online learning provider (e.g., Coursera, Udemy, DataCamp, LinkedIn Learning, edX) from which course links are sourced.
- **Quick_Action**: A shortcut link/card displayed in the applicant dashboard's quick actions bar for rapid navigation to key features.
- **Learning_Path_API**: The backend API endpoint at `/api/learning-paths` responsible for generating and returning course recommendations for the authenticated applicant.
- **Recommendation_Engine**: The server-side logic that maps missing skills to legitimate course URLs on supported platforms.

## Requirements

### Requirement 1: Learning Path Page Display

**User Story:** As an applicant, I want a dedicated page to view learning path suggestions for my missing skills, so that I can find relevant courses to improve my qualifications.

#### Acceptance Criteria

1. WHEN an applicant navigates to `/applicant/learning-paths`, THE Learning_Path_Page SHALL display a list of Course_Recommendation items grouped by Skill_Gap, where each group heading shows the skill name and each Course_Recommendation item displays the skill name, description, suggestion type, and impact score.
2. THE Learning_Path_Page SHALL display the page title "Learning Paths" and a description of no more than 150 characters explaining that the page shows recommended skills to develop based on job match gaps.
3. WHILE the Learning_Path_Page is loading course data, THE Learning_Path_Page SHALL display an animated placeholder skeleton using the same skeleton card pattern used on the applicant dashboard.
4. IF no Skill_Gap data is available for the applicant because no match results with missing skills exist, THEN THE Learning_Path_Page SHALL display an empty state message indicating that no skill gaps have been identified and suggesting the applicant complete their profile or apply to jobs.
5. IF the Learning_Path_Page fails to retrieve recommendation data due to a network or server error, THEN THE Learning_Path_Page SHALL display an error message indicating the data could not be loaded and provide an actionable option to retry the request.
6. WHEN the Learning_Path_Page displays Course_Recommendation items, THE Learning_Path_Page SHALL display a maximum of 10 Course_Recommendation items per Skill_Gap, sorted by impact score in descending order.

### Requirement 2: Course Recommendation Content

**User Story:** As an applicant, I want each course recommendation to show relevant details, so that I can make an informed decision about which courses to take.

#### Acceptance Criteria

1. THE Course_Recommendation SHALL display the course title (truncated with an ellipsis if exceeding 80 characters), Course_Platform name, a direct URL to the course, the skill it addresses, estimated duration in hours (e.g., "4h", "12h"), and whether it offers a certificate.
2. THE Course_Recommendation SHALL include a clickable link that opens the course URL in a new browser tab with `rel="noopener noreferrer"` applied to the anchor element.
3. THE Course_Recommendation SHALL only link to courses on verified Course_Platform providers (Coursera, Udemy, DataCamp, LinkedIn Learning, edX, Pluralsight, Codecademy).
4. WHEN a Course_Recommendation includes a certification, THE Course_Recommendation SHALL display a visible "Certificate Available" badge adjacent to the course title.
5. IF a Course_Recommendation does not include certification information or the certification value is unknown, THEN THE Course_Recommendation SHALL omit the certificate badge and not display any certificate indicator.
6. THE Course_Recommendation link SHALL include an accessible label that identifies the course title and the target platform (e.g., aria-label containing the course title and platform name).

### Requirement 3: Skill Gap Integration

**User Story:** As an applicant, I want learning path suggestions to be based on my actual missing skills, so that recommendations are personalized and relevant to my career goals.

#### Acceptance Criteria

1. WHEN the Learning_Path_Page loads and the applicant has at least one match result, THE Recommendation_Engine SHALL retrieve all missing skills from the applicant's match_results records and, if a career goal is set, from their role readiness analysis, within 3 seconds of page load.
2. THE Recommendation_Engine SHALL rank the aggregated missing skills in descending order by the number of job match results that list each skill as missing, and SHALL display a maximum of 10 skill gaps on the Learning_Path_Page.
3. IF the applicant has a career goal set, THEN THE Recommendation_Engine SHALL merge missing skills from role readiness analysis with those from job match results, removing duplicates by case-insensitive comparison, and label each skill's source as "Job Matches", "Career Goal", or "Both".
4. THE Learning_Path_Page SHALL display beside each Skill_Gap the count of jobs (out of the applicant's total matched jobs) that require that skill, formatted as "N of M jobs".
5. IF the applicant has no match results and no career goal set, THEN THE Learning_Path_Page SHALL display a message indicating that the applicant needs to complete their profile or set a career goal before skill gap recommendations can be generated.
6. IF the Recommendation_Engine fails to retrieve match results or role readiness data, THEN THE Learning_Path_Page SHALL display an error message indicating that skill gap data is temporarily unavailable and provide a retry option.

### Requirement 4: Dashboard Quick Action

**User Story:** As an applicant, I want quick access to my learning paths from the dashboard, so that I can easily navigate to course recommendations without searching.

#### Acceptance Criteria

1. THE Quick_Action for learning paths SHALL be displayed in the applicant dashboard's quick actions bar as the last item after the existing quick actions (Matched Jobs, Update Profile, Career Goals, Applied Jobs).
2. WHEN the applicant clicks the Learning Paths Quick_Action, THE Quick_Action SHALL navigate to `/applicant/learning-paths`.
3. THE Quick_Action SHALL display an SVG icon representing education or learning and the exact label text "Learning Paths".
4. THE Quick_Action SHALL be styled as a rounded-full pill element matching the existing quick action dimensions, font size, border, and hover-state pattern (border and text color change on hover).
5. IF the applicant dashboard is in the no-profile or onboarding state, THEN THE Quick_Action SHALL NOT be displayed.

### Requirement 5: Navigation Integration

**User Story:** As an applicant, I want the learning paths page accessible from the sidebar navigation, so that I can reach it from any page in the dashboard.

#### Acceptance Criteria

1. THE Learning_Path_Page SHALL have a navigation entry in the applicant sidebar menu that links to the Learning_Path_Page route and is visible in both the desktop sidebar and the mobile sidebar drawer.
2. THE Learning_Path_Page navigation entry SHALL display an icon distinguishable from other navigation entry icons and the label "Learning Paths".
3. WHILE the applicant is on the Learning_Path_Page, THE navigation entry SHALL display an active state using the same visual styling applied to other active navigation entries and SHALL set the aria-current attribute to "page".
4. WHEN the applicant clicks the "Learning Paths" navigation entry, THE system SHALL navigate to the Learning_Path_Page within 1 second without a full page reload.

### Requirement 6: Learning Path API

**User Story:** As a developer, I want a backend API that generates course recommendations, so that the frontend can fetch personalized learning paths for each applicant.

#### Acceptance Criteria

1. WHEN the Learning_Path_API receives a GET request at `/api/learning-paths` from an authenticated applicant, THE Learning_Path_API SHALL return a 200 status code with an array of Course_Recommendation objects grouped by Skill_Gap, where each Course_Recommendation includes: course title, Course_Platform name, direct URL, target skill name, estimated duration, and certificate availability.
2. IF the request is unauthenticated, THEN THE Learning_Path_API SHALL return a 401 status code with an error message indicating that authentication is required.
3. THE Learning_Path_API SHALL return a maximum of 3 Course_Recommendation items per Skill_Gap.
4. THE Learning_Path_API SHALL only return URLs from approved Course_Platform domains: `coursera.org`, `udemy.com`, `datacamp.com`, `linkedin.com/learning`, `edx.org`, `pluralsight.com`, and `codecademy.com`.
5. WHEN the applicant has no missing skills, THE Learning_Path_API SHALL return an empty array with a 200 status code.
6. IF the Learning_Path_API encounters an internal error while generating recommendations, THEN THE Learning_Path_API SHALL return a 500 status code with an error message indicating that recommendations could not be generated.
7. IF a Skill_Gap cannot be mapped to any verified course, THEN THE Learning_Path_API SHALL omit that Skill_Gap from the response rather than returning unverified links.
8. THE Learning_Path_API SHALL return the complete response within 5 seconds of receiving the request.

### Requirement 7: Course URL Validity

**User Story:** As an applicant, I want all course links to be legitimate and functional, so that I can trust the recommendations lead to real learning resources.

#### Acceptance Criteria

1. THE Recommendation_Engine SHALL map each identified skill gap to at least 1 and at most 5 course URLs sourced from a static, pre-configured catalog of platform-specific course entries.
2. THE Recommendation_Engine SHALL only generate URLs that begin with `https://` and match one of the following approved domain and path patterns: `coursera.org/learn/`, `udemy.com/course/`, `datacamp.com/courses/`, `linkedin.com/learning/`, `edx.org/learn/`, `pluralsight.com/courses/`, `codecademy.com/learn/`.
3. IF a generated URL does not match any approved domain and path pattern, THEN THE Recommendation_Engine SHALL discard that URL and exclude it from the response.
4. IF a skill gap cannot be mapped to any course entry in the pre-configured catalog, THEN THE Recommendation_Engine SHALL omit that skill from the course recommendations and indicate to the applicant that no verified course is currently available for that skill.

### Requirement 8: Responsive Design and Accessibility

**User Story:** As an applicant using various devices, I want the learning paths page to be responsive and accessible, so that I can use it effectively on any device.

#### Acceptance Criteria

1. WHEN the viewport width is less than 768px, THE Learning_Path_Page SHALL stack content into a single-column layout with no horizontal overflow or content truncation.
2. WHEN the viewport width is between 768px and 1023px, THE Learning_Path_Page SHALL render in a tablet-appropriate layout where all interactive elements have a minimum touch target size of 44x44 CSS pixels.
3. WHEN the viewport width is 1024px or greater, THE Learning_Path_Page SHALL render in a multi-column desktop layout with no content exceeding the viewport width.
4. THE Learning_Path_Page SHALL use glass-card components with backdrop-filter blur, CSS custom properties defined in the design system for all color and spacing values, and framer-motion for transition animations.
5. THE Learning_Path_Page SHALL use semantic HTML elements (nav, main, section, heading hierarchy) and provide ARIA labels on all interactive elements that lack visible text labels, achieving WCAG 2.1 Level AA conformance for structure and navigation.
6. WHEN a course link is focused via keyboard navigation, THE Learning_Path_Page SHALL display a visible focus indicator with a minimum 2px solid outline in the accent color and at least 2px offset from the element edge.
7. WHEN the user has enabled prefers-reduced-motion, THE Learning_Path_Page SHALL disable all CSS animations and transition durations, displaying content without motion effects.
