# Implementation Plan: AI-Powered Job Matching Platform

## Overview

This implementation plan covers the full-stack development of the AI-Powered Job Matching Platform using Next.js (App Router) deployed on Vercel, with Supabase providing authentication, PostgreSQL database with Row-Level Security, and file storage. AI capabilities (match calculation, recommendations, resume parsing) are handled via Next.js API Routes calling OpenAI. Background match recalculation is handled by Supabase Edge Functions triggered by database events.

## Tasks

- [ ] 1. Project Setup and Supabase Configuration
  - [x] 1.1 Initialize Next.js project with TypeScript, App Router, and Tailwind CSS
    - Run `create-next-app` with TypeScript and App Router
    - Configure project structure matching the design (`src/app`, `src/components`, `src/lib`, `src/hooks`, `src/types`)
    - Install dependencies: `@supabase/supabase-js`, `@supabase/ssr`, `openai`, `vitest`, `fast-check`, `@testing-library/react`
    - _Requirements: 1.1, 2.1_

  - [x] 1.2 Configure Supabase project and environment variables
    - Set up `.env.local` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`
    - Create Supabase client utilities: `src/lib/supabase/client.ts` (browser), `src/lib/supabase/server.ts` (server-side for API routes)
    - Create Next.js middleware (`src/middleware.ts`) for auth session refresh
    - _Requirements: 2.1, 2.4_

  - [x] 1.3 Create Supabase database migrations for all tables
    - Write migration `001_create_profiles.sql`: profiles table extending auth.users with role, failed_login_attempts, locked_until
    - Write migration `002_create_skill_profiles.sql`: skill_profiles and skills tables
    - Write migration `003_create_jobs.sql`: job_descriptions and job_required_skills tables
    - Write migration `004_create_matches.sql`: match_results table with unique constraint on (applicant_id, job_description_id)
    - Write migration `005_create_recommendations.sql`: recommendations table
    - Create database triggers for `notify_profile_updated` and `notify_job_updated` functions
    - _Requirements: 3.1, 4.1, 5.1, 6.1_

  - [x] 1.4 Configure Row-Level Security policies on all tables
    - Enable RLS on profiles, skill_profiles, skills, job_descriptions, job_required_skills, match_results, recommendations
    - Create policies: users view own profile, HR users view applicant names, applicants manage own skill profile/skills
    - Create policies: HR users manage own jobs, applicants view published jobs, HR views matches for own jobs
    - Create policies: applicants view own matches and recommendations
    - _Requirements: 1.4, 4.5, 5.4, 6.1_

  - [x] 1.5 Configure Supabase Storage bucket for resume files
    - Create `resumes` bucket with 5MB file size limit and allowed MIME types (PDF, DOCX)
    - Create storage RLS policies: applicants upload/read only their own resumes (folder path = user ID)
    - _Requirements: 3.1_

  - [x] 1.6 Create shared TypeScript types and interfaces
    - Define types in `src/types/index.ts`: Profile, SkillProfile, Skill, JobDescription, JobRequiredSkill, MatchResult, Recommendation
    - Define API request/response types for match calculation and recommendation generation
    - _Requirements: 1.1, 3.1, 4.1, 5.2, 7.2_

- [x] 2. Authentication with Supabase Auth
  - [x] 2.1 Create RegisterForm component with Supabase Auth signUp
    - Build form with email, password, name, and RoleSelector (Applicant/HR_User)
    - Call `supabase.auth.signUp()` with role and name in `user_metadata`
    - Implement client-side password validation (8+ chars, uppercase, lowercase, number)
    - Display validation errors inline and handle duplicate email error
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 2.2 Create a Supabase Auth trigger to auto-create profile row on user signup
    - Write a database function that creates a `profiles` row from `auth.users` metadata on new user creation
    - Configure as a trigger on `auth.users` insert
    - _Requirements: 1.1, 1.4_

  - [x] 2.3 Create LoginForm component with Supabase Auth signInWithPassword
    - Build form with email/password inputs and generic error display (no field-specific hints)
    - Call `supabase.auth.signInWithPassword()` and redirect to role-appropriate dashboard
    - _Requirements: 2.1, 2.2_

  - [x] 2.4 Implement account lockout logic
    - Create a Next.js API route or Supabase Edge Function that checks `failed_login_attempts` and `locked_until` before login
    - Increment counter on failed attempts, lock after 5 consecutive failures for 15 minutes
    - Reset counter on successful login
    - Display lockout message with remaining time to user
    - _Requirements: 2.3_

  - [x] 2.5 Implement Next.js middleware for auth session management and role-based routing
    - Check session on all protected routes using `supabase.auth.getSession()`
    - Redirect unauthenticated users to login page
    - Redirect authenticated users to role-appropriate dashboard (applicant vs HR)
    - Handle session expiry (60 minutes inactivity) with redirect to login
    - _Requirements: 2.1, 2.4, 1.4_

  - [ ]* 2.6 Write property test for password validation
    - **Property 10: Password Validation** - accepts if and only if 8+ chars with uppercase, lowercase, and number
    - **Validates: Requirements 1.3**

- [x] 3. Checkpoint - Ensure authentication flow works
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. HR Job Description Management
  - [x] 4.1 Create JobDescriptionForm component for creating/editing job postings
    - Build form with title, description, qualifications, and dynamic required/preferred skills list
    - Validate at least one required skill before submission
    - Use Supabase client SDK to insert/update `job_descriptions` and `job_required_skills` (protected by RLS)
    - _Requirements: 4.1, 4.2_

  - [x] 4.2 Create JobDescriptionList component showing HR user's job postings
    - Fetch own job descriptions via Supabase client SDK (RLS ensures only own jobs returned)
    - Display title, status, creation date with edit and delete actions
    - Implement delete with cascade (RLS + ON DELETE CASCADE handles cleanup)
    - _Requirements: 4.4, 4.5_

  - [x] 4.3 Create HR Dashboard page with job management integration
    - Build HR dashboard layout with navigation to create new postings, view listings, and view rankings
    - Integrate JobDescriptionList component
    - _Requirements: 4.5, 6.1_

  - [ ]* 4.4 Write property test for job description validation
    - **Property 11: Job Description Requires At Least One Skill** - submission rejected if zero required skills
    - **Validates: Requirements 4.2**

- [ ] 5. Applicant Skill Profile Management
  - [x] 5.1 Create ResumeUpload component with Supabase Storage integration
    - Build drag-and-drop upload UI with client-side validation (PDF/DOCX, max 5MB)
    - Upload file to Supabase Storage `resumes/{user_id}/{filename}` via client SDK
    - On successful upload, call `/api/resume/parse` API route to extract skills
    - Display error and prompt for manual entry on parse failure
    - _Requirements: 3.1, 3.3_

  - [x] 5.2 Implement resume parsing API route (`/api/resume/parse`)
    - Create Next.js API route that downloads resume from Supabase Storage
    - Extract text content from PDF/DOCX file
    - Call OpenAI to extract structured skills (name, proficiency level)
    - Save extracted skills to `skill_profiles` and `skills` tables via Supabase admin client
    - _Requirements: 3.1, 3.3_

  - [~] 5.3 Create SkillProfile component with manual skill management
    - Display current skills with source indicator (parsed vs manual)
    - Implement add/remove skill functionality via Supabase client SDK (RLS enforced)
    - Update skill_profile `updated_at` on changes to trigger recalculation
    - _Requirements: 3.2, 3.4_

  - [~] 5.4 Create Applicant Dashboard page integrating profile and navigation
    - Build applicant dashboard layout with navigation to profile, job listings
    - Integrate SkillProfile and ResumeUpload components on profile page
    - _Requirements: 3.4, 9.1_

  - [ ]* 5.5 Write property test for skill profile round-trip consistency
    - **Property 4: Skill Profile Round-Trip Consistency** - adding a skill then retrieving profile includes that skill with original attributes
    - **Validates: Requirements 3.2**

- [~] 6. Checkpoint - Ensure profile and job management work
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. AI Match Engine
  - [~] 7.1 Implement Match_Engine service (`src/lib/ai/match-engine.ts`)
    - Extract required skills (weight 2x) and preferred skills (weight 1x) from JobDescription
    - Use OpenAI for semantic/fuzzy skill matching (e.g., "React" matches "React.js")
    - Calculate weighted score and normalize to 0-100 integer
    - Return MatchResult with matchPercentage, matchedSkills, missingSkills
    - _Requirements: 5.1, 5.2, 5.3_

  - [~] 7.2 Create match calculation API route (`/api/match/calculate`)
    - Accept applicant_id and job_description_id (or batch mode for all applicants/jobs)
    - Call Match_Engine service and upsert results to `match_results` table via admin client
    - Validate caller authorization (only internal/edge function calls or authenticated users)
    - _Requirements: 5.1, 5.2_

  - [~] 7.3 Create Supabase Edge Function for background match recalculation
    - Implement `calculate-matches` Edge Function triggered by database webhook on job/profile update
    - On job publish/update: recalculate matches for all applicants against that job
    - On profile update: recalculate matches for that applicant against all published jobs
    - Ensure completion within 30 seconds
    - _Requirements: 3.5, 4.3, 5.1_

  - [ ]* 7.4 Write property tests for Match_Engine
    - **Property 1: Match Percentage Range Invariant** - result is always 0-100 inclusive for any valid inputs
    - **Validates: Requirements 5.2**

  - [ ]* 7.5 Write property test for recalculation idempotence
    - **Property 6: Recalculation Idempotence** - same Skill_Profile and Job_Description always produce same Match_Percentage
    - **Validates: Requirements 5.2, 5.3**

  - [ ]* 7.6 Write property test for required skills weight dominance
    - **Property 7: Required Skills Weight Dominance** - a matched required skill contributes more than the same skill marked as preferred
    - **Validates: Requirements 5.3**

- [ ] 8. AI Recommendation Engine
  - [~] 8.1 Implement Recommendation_Engine service (`src/lib/ai/recommendation-engine.ts`)
    - Analyze gap between Skill_Profile and Job_Description requirements using OpenAI
    - Categorize each suggestion as "skill_to_add" or "skill_to_improve"
    - Score each suggestion by potential impact (1-10)
    - Sort suggestions by impact score descending
    - Handle edge case: return "fully matched" message when match is 100%
    - _Requirements: 7.1, 7.2, 7.3, 7.5, 7.6_

  - [~] 8.2 Create recommendation generation API route (`/api/recommendations/generate`)
    - Accept applicant_id and job_description_id
    - Call Recommendation_Engine service and persist results to `recommendations` table
    - Validate that the requesting user is the applicant (or internal call)
    - _Requirements: 7.1, 7.4_

  - [ ]* 8.3 Write property test for Recommendation_Engine
    - **Property 3: Recommendation Completeness** - at least one suggestion produced when match_percentage < 100
    - **Validates: Requirements 7.4, 7.5**

- [~] 9. Checkpoint - Ensure AI engine tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Job Listings and Match Display (Applicant Views)
  - [~] 10.1 Create JobListings page displaying published jobs with match percentages
    - Fetch published job_descriptions via Supabase client SDK (RLS allows applicants to view published)
    - Fetch own match_results via Supabase client SDK (RLS allows own matches)
    - Display title, summary, and MatchPercentageBadge for each job
    - Default sort by match_percentage descending
    - _Requirements: 5.4, 5.5, 9.1_

  - [~] 10.2 Implement search and filter functionality on job listings
    - Add keyword search (title/description), skill filter, and match percentage range filter
    - Display "no results" message with suggestion to broaden criteria when filters yield empty results
    - _Requirements: 9.2, 9.3_

  - [~] 10.3 Create JobDetail page with match info and recommendations
    - Display full job details (title, description, required skills, qualifications)
    - Show applicant's match_percentage prominently
    - Fetch and display AI recommendations specific to that job
    - Trigger recommendation generation if not yet calculated
    - Provide navigation to browse between job detail pages without returning to listings
    - _Requirements: 5.6, 8.1, 8.2, 8.3, 8.4_

  - [~] 10.4 Create RecommendationsList component
    - Display suggestions categorized as "Skill to Add" or "Skill to Improve"
    - Order by impact score (highest first)
    - Show "fully matched" message when match is 100%
    - _Requirements: 7.2, 7.3, 7.5_

  - [ ]* 10.5 Write property test for search filter correctness
    - **Property 12: Search Filter Correctness** - all returned results match applied filter criteria
    - **Validates: Requirements 9.2**

- [ ] 11. Applicant Rankings (HR Views)
  - [~] 11.1 Create ApplicantRankings page for HR users
    - Fetch match_results for a selected job via Supabase client SDK (RLS allows HR to see matches for own jobs)
    - Display ranked list with rank position, applicant name, and match_percentage
    - Sort by match_percentage descending
    - _Requirements: 6.1, 6.2, 6.5_

  - [~] 11.2 Implement tie-handling in rankings display
    - Assign same rank to applicants with equal match_percentage
    - Sort tied applicants alphabetically by name
    - _Requirements: 6.3_

  - [~] 11.3 Integrate rankings into HR Dashboard with job selector
    - Add job description dropdown/selector to navigate between rankings for different postings
    - Show "updated" indicator when rankings change after recalculation
    - _Requirements: 6.1, 6.4, 6.5_

  - [ ]* 11.4 Write property tests for ranking logic
    - **Property 2: Ranking Order Property** - each entry's match_percentage >= next entry's (descending order)
    - **Property 9: Tie-Handling in Rankings** - same rank assigned for equal match_percentage, alphabetical sort within ties
    - **Validates: Requirements 6.1, 6.3**

  - [ ]* 11.5 Write property test for match symmetry across views
    - **Property 5: Match Symmetry Across Views** - match_percentage is identical in applicant job listing view vs HR ranking view
    - **Validates: Requirements 5.4, 6.2**

- [ ] 12. Integration Testing and Polish
  - [ ]* 12.1 Write integration tests for authentication flow
    - Test registration → profile creation → login → session management → lockout via Supabase
    - Test RLS enforcement (applicants can't access other applicants' data)
    - _Requirements: 1.1, 2.1, 2.3, 2.4_

  - [ ]* 12.2 Write integration tests for matching pipeline
    - Test job creation → match calculation trigger → results available within 30s
    - Test profile update → match recalculation → ranking update
    - _Requirements: 5.1, 5.2, 6.1, 6.4_

  - [ ]* 12.3 Write integration tests for recommendation generation
    - Test applicant views job → recommendations generated → displayed correctly
    - Test edge case: 100% match shows "fully matched" message
    - _Requirements: 7.1, 7.4, 7.5_

  - [~] 12.4 Add loading states, error boundaries, and empty state handling
    - Implement loading spinners for async operations (match calculation, AI calls)
    - Add error boundaries for graceful failure handling
    - Display appropriate empty states (no jobs, no matches, no recommendations)
    - _Requirements: 9.3_

  - [~] 12.5 Final UI polish: responsive layout, consistent styling, and navigation
    - Ensure responsive design across device sizes
    - Consistent styling with Tailwind CSS
    - Verify navigation flow between all pages (applicant and HR paths)
    - _Requirements: 8.4_

- [~] 13. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation throughout implementation
- Property tests validate universal correctness properties defined in the design document
- **No custom Express backend** — Supabase handles auth, database, storage, and access control
- **No custom auth endpoints** — Supabase Auth SDK manages registration, login, and sessions directly from the client
- **RLS policies enforce access control** at the database level, eliminating need for custom middleware
- **Next.js API Routes** are only used for AI operations (match calculation, recommendations, resume parsing) that require server-side secrets
- **Supabase Edge Functions** handle background match recalculation triggered by database events
- **Supabase Storage** handles resume file storage with RLS-based access control
- Match recalculation runs asynchronously via Edge Functions and must complete within 30 seconds per requirements
- The AI engines (Match_Engine, Recommendation_Engine) depend on OpenAI API access being configured

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3", "1.4", "1.5", "1.6"] },
    { "id": 1, "tasks": ["2.1", "2.2", "2.3", "2.4", "2.5"] },
    { "id": 2, "tasks": ["2.6"] },
    { "id": 3, "tasks": ["4.1", "4.2", "5.1", "5.2", "5.3"] },
    { "id": 4, "tasks": ["4.3", "4.4", "5.4", "5.5"] },
    { "id": 5, "tasks": ["7.1", "8.1"] },
    { "id": 6, "tasks": ["7.2", "7.3", "8.2"] },
    { "id": 7, "tasks": ["7.4", "7.5", "7.6", "8.3"] },
    { "id": 8, "tasks": ["10.1", "10.2", "11.1", "11.2"] },
    { "id": 9, "tasks": ["10.3", "10.4", "10.5", "11.3", "11.4", "11.5"] },
    { "id": 10, "tasks": ["12.1", "12.2", "12.3", "12.4", "12.5"] }
  ]
}
```
