# Implementation Plan: Job Application System


## Overview

This plan implements explicit job application functionality for the AI-Powered Job Matching Platform. The implementation adds a database migration for the `applications` table with RLS policies, a service layer for application management, UI components (ApplyButton, ApplicationStatusBadge), modifications to existing components (JobDetail, JobListings, ApplicantRankings), and an API route for application submission.

## Tasks

- [x] 1. Database migration and application types
  - [x] 1.1 Create the `applications` table migration
    - Create `supabase/migrations/009_create_applications.sql`
    - Define the `applications` table with columns: `id` (UUID PK), `applicant_id` (UUID FK → profiles), `job_description_id` (UUID FK → job_descriptions), `created_at` (TIMESTAMPTZ)
    - Add UNIQUE constraint on `(applicant_id, job_description_id)`
    - Add ON DELETE CASCADE for both foreign keys
    - Enable RLS and create policies: applicants insert/read own, HR reads applications for own jobs, no UPDATE policy
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 2.1_

  - [x] 1.2 Define the Application TypeScript interface and service types
    - Create `src/lib/applications/types.ts`
    - Define `Application` interface with `id`, `applicant_id`, `job_description_id`, `created_at`
    - Define `ApplicationService` interface with methods: `createApplication`, `hasApplied`, `getAppliedJobIds`, `getApplicationsForJob`
    - _Requirements: 5.1_

- [x] 2. Application service layer
  - [x] 2.1 Implement the ApplicationService
    - Create `src/lib/applications/service.ts`
    - Implement `createApplication(applicantId, jobId)`: validate job is published, insert into `applications` table, handle duplicate conflict (unique constraint violation returns appropriate error)
    - Implement `hasApplied(applicantId, jobId)`: query for existence of application record
    - Implement `getAppliedJobIds(applicantId, jobIds)`: batch query returning a Set of applied job IDs
    - Implement `getApplicationsForJob(jobId)`: fetch all applications for a given job (HR use)
    - Create `src/lib/applications/index.ts` barrel export
    - _Requirements: 1.1, 1.2, 1.7, 2.1, 2.3, 3.1, 4.1_

  - [ ]* 2.2 Write property test: Non-published job application rejection
    - **Property 1: Non-published job application rejection**
    - Generate arbitrary job statuses (draft, closed, published) and verify that `createApplication` rejects all non-published jobs
    - **Validates: Requirements 1.7**

  - [ ]* 2.3 Write property test: Duplicate application rejection
    - **Property 3: Duplicate application rejection**
    - For any applicant-job pair where an application exists, verify that a second `createApplication` call is rejected
    - **Validates: Requirements 2.3**

  - [ ]* 2.4 Write property test: Application status derivation accuracy
    - **Property 2: Application status derivation accuracy**
    - Generate arbitrary lists of jobs and application records, verify `getAppliedJobIds` returns correct applied/not-applied statuses for every job
    - **Validates: Requirements 2.2, 3.1**

- [x] 3. API route for application submission
  - [x] 3.1 Create the POST /api/applications route
    - Create `src/app/api/applications/route.ts`
    - Authenticate user via Supabase session, extract applicant_id
    - Validate request body contains `job_description_id`
    - Check job status is "published" before proceeding
    - Call `ApplicationService.createApplication()`
    - Return 201 on success, 409 on duplicate, 422 on non-published job, 401 on unauthenticated
    - _Requirements: 1.1, 1.2, 1.7, 2.3_

  - [ ]* 3.2 Write unit tests for the applications API route
    - Test successful creation (201 response)
    - Test duplicate application (409 response)
    - Test non-published job (422 response)
    - Test unauthenticated request (401 response)
    - _Requirements: 1.1, 1.7, 2.3_

- [x] 4. Checkpoint - Ensure service layer and API tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. ApplyButton component
  - [x] 5.1 Implement the ApplyButton component
    - Create `src/components/applicant/ApplyButton.tsx`
    - Accept props: `jobId`, `initialStatus`, `jobStatus`, `onApplicationSuccess`
    - Implement states: idle (enabled "Apply"), submitting (disabled + loading), applied (disabled "Applied" with checkmark), error (re-enabled + error message)
    - Do not render button if `jobStatus` is not "published"
    - On click: disable immediately (optimistic), POST to `/api/applications`, update state based on response
    - On 409 (duplicate): treat as success, show "Applied" state
    - On error: re-enable button, display error message
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 2.4_

  - [ ]* 5.2 Write unit tests for ApplyButton component
    - Test renders "Apply" in idle state
    - Test button disables on click (submitting state)
    - Test transitions to "Applied" on success
    - Test re-enables on error with error message
    - Test does not render for non-published jobs
    - Test treats 409 as success (shows Applied)
    - _Requirements: 1.3, 1.4, 1.5, 1.6, 1.7_

- [x] 6. ApplicationStatusBadge component
  - [x] 6.1 Implement the ApplicationStatusBadge component
    - Create `src/components/applicant/ApplicationStatusBadge.tsx`
    - Accept prop: `applied: boolean`
    - Render "Applied" with green/success background when true
    - Render "Not Applied" with neutral/gray background when false
    - Use text-based status indicator with distinct background color for each state
    - _Requirements: 3.1, 3.3_

  - [ ]* 6.2 Write unit tests for ApplicationStatusBadge
    - Test renders "Applied" with correct styling when `applied` is true
    - Test renders "Not Applied" with correct styling when `applied` is false
    - _Requirements: 3.1, 3.3_

- [x] 7. Integrate application features into existing pages
  - [x] 7.1 Modify JobDetail page to include ApplyButton and application status
    - Update `src/app/(dashboard)/applicant/jobs/[id]/page.tsx` and/or `src/components/applicant/JobDetail.tsx`
    - Fetch application status for the current job on mount using `ApplicationService.hasApplied()`
    - Add `ApplyButton` to the job header section
    - Display application status adjacent to job title
    - Handle status fetch failure gracefully (show button in idle state)
    - _Requirements: 1.1, 1.5, 3.2_

  - [x] 7.2 Modify JobListings page to show ApplicationStatusBadge on each card
    - Update `src/app/(dashboard)/applicant/jobs/page.tsx` and/or `src/components/applicant/JobListings.tsx`
    - Batch-fetch application statuses using `ApplicationService.getAppliedJobIds()`
    - Add `ApplicationStatusBadge` to each job card
    - Add `ApplyButton` to each job listing card
    - Handle status fetch failure: render listings without badges, show info message about status being unavailable
    - _Requirements: 1.2, 2.2, 3.1, 3.3, 3.4_

- [x] 8. Checkpoint - Ensure applicant-side UI tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. HR Rankings filtering and display
  - [x] 9.1 Modify ApplicantRankings to filter by applied applicants only
    - Update `src/components/hr/ApplicantRankings.tsx`
    - Fetch applications for the job using `ApplicationService.getApplicationsForJob()`
    - Pre-filter match results to include only applicants with application records
    - For applicants with application records but no match_result, display with "Pending" status indicator and position them after scored applicants
    - Display total application count
    - Display empty state message when no applications received
    - Preserve existing `computeRanks` sorting logic (match percentage descending, alphabetical tie-breaking)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [ ]* 9.2 Write property test: Ranking filter to applied applicants only
    - **Property 4: Ranking filter to applied applicants only**
    - Generate arbitrary sets of applicants (some with applications, some without), verify filter returns only applied applicants
    - **Validates: Requirements 4.1**

  - [ ]* 9.3 Write property test: Ranking sort with tie-breaking
    - **Property 5: Ranking sort with tie-breaking**
    - Generate arbitrary lists of applied applicants with match percentages, verify sort is descending by percentage with alphabetical tie-breaking and equal rank assignment
    - **Validates: Requirements 4.2, 4.3**

  - [ ]* 9.4 Write property test: Pending status positioning for unscored applicants
    - **Property 6: Pending status positioning for unscored applicants**
    - Generate mixed lists of scored and unscored applicants, verify all unscored appear after all scored in the final ordering
    - **Validates: Requirements 4.7**

- [x] 10. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document using `fast-check`
- Unit tests use Vitest with React Testing Library for component testing
- The implementation uses TypeScript throughout, consistent with the existing codebase
- Migration follows existing naming convention (`009_create_applications.sql`)
- Service layer follows existing pattern in `src/lib/` directory

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "6.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "3.1", "5.1", "6.2"] },
    { "id": 3, "tasks": ["3.2", "5.2", "7.1", "7.2"] },
    { "id": 4, "tasks": ["9.1"] },
    { "id": 5, "tasks": ["9.2", "9.3", "9.4"] }
  ]
}
```
