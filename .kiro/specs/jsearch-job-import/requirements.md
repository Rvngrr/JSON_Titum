# Requirements Document

## Introduction

This feature adds the ability to import real job listings from the JSearch API (RapidAPI) into CareerFlow, the AI Job Matching Platform. Currently, job listings are created manually by HR users. By integrating with JSearch, CareerFlow can be populated with real-world tech job postings from the Philippines job market, giving applicants access to actual opportunities for skill matching. Additionally, CareerFlow provides intelligent career insights including skill proficiency detection, ATS scoring, hidden gem job detection, and skill ROI analysis to help applicants optimize their career growth.

## Glossary

- **CareerFlow**: The AI-powered job matching platform that connects applicants with job listings through intelligent skill matching and career insights.
- **Import_Service**: The server-side module responsible for fetching, parsing, and storing job listings from the JSearch API into the CareerFlow database.
- **JSearch_API**: The external job search API (jobs-api14.p.rapidapi.com) accessed via RapidAPI that provides real job listings including title, description, company, location, employment type, qualifications, and highlights.
- **Indeed_API**: An alternative external job search API (indeed12.p.rapidapi.com) accessed via RapidAPI that provides job listings by company or search query.
- **Raw_Response_Cache**: A local storage mechanism (database table or JSON file) that persists the full raw API response from a fetch operation, enabling the system to reuse cached data without making additional API calls.
- **Job_Link**: The original URL or application link for a job listing as provided by the external API response.
- **Skill_Extractor**: The component that analyzes imported job descriptions and qualifications text to extract required and preferred skills using the local skill matcher.
- **Proficiency_Analyzer**: The component that determines an applicant's skill proficiency level (beginner, intermediate, or expert) by analyzing the context surrounding skill mentions in the resume text.
- **ATS_Scorer**: The component that calculates an Applicant Tracking System compatibility score (0-100) for a resume against a specific job description based on keyword coverage.
- **Hidden_Gem_Detector**: The component that identifies job listings where an applicant has a 60-79% match score but the missing skills are classified as easy-to-learn, indicating a high-growth opportunity with less competition.
- **Skill_ROI_Analyzer**: The component that simulates adding each missing skill to an applicant's profile and calculates the resulting match score improvement to recommend the highest-impact skills to learn first.
- **HR_Dashboard**: The existing web interface used by HR users and admins to manage job postings and platform settings.
- **Imported_Job**: A job listing record in the job_descriptions table that originated from the JSearch API rather than being manually created by an HR user.
- **Deduplication_Check**: The process of determining whether a job from the JSearch API already exists in the database to prevent duplicate entries.
- **System_User**: A designated HR user account (or equivalent identifier) used as the owner of imported job records in the job_descriptions table.
- **Rate_Limiter**: The component that tracks and enforces the 200 requests/month free tier limit for JSearch API calls.
- **Easy_Skill**: A skill classified as quick to learn (typically soft skills or tool-based skills like Excel, Git, or Public Speaking) used by the Hidden_Gem_Detector to identify high-growth opportunities.
- **Hard_Skill**: A skill classified as requiring significant time investment to learn (e.g., Machine Learning, System Architecture) used by the Hidden_Gem_Detector as a contrast to Easy_Skills.

## Requirements

### Requirement 1: Fetch Job Listings from External API

**User Story:** As an HR admin, I want to trigger a job import from the external job API, so that the platform is populated with real tech job listings from the Philippines.

#### Acceptance Criteria

1. WHEN an HR admin triggers the import action, THE Import_Service SHALL send a GET request to the configured external API endpoint (JSearch_API or Indeed_API) with Philippines-based locality filters and the configured search query.
2. THE Import_Service SHALL authenticate requests using the RAPIDAPI_KEY environment variable in the `x-rapidapi-key` header and the appropriate `x-rapidapi-host` header for the target API.
3. WHEN the external API returns a successful response, THE Import_Service SHALL extract ALL available fields from each job listing, including: title, description, company name, location, employment type, qualifications, highlights, application link (Job_Link), salary information, and any other metadata returned by the API.
4. IF the external API returns an error response or is unreachable, THEN THE Import_Service SHALL log the error details and return a descriptive error message to the caller without crashing.
5. IF the RAPIDAPI_KEY environment variable is missing or empty, THEN THE Import_Service SHALL reject the import request with a configuration error message before making any external calls.
6. THE Import_Service SHALL minimize the number of API requests by fetching the maximum number of results per request as allowed by the API pagination parameters.

### Requirement 2: Cache Raw API Responses Locally

**User Story:** As a system admin, I want the full API response stored locally after the first fetch, so that the system does not waste limited API requests on data it already has.

#### Acceptance Criteria

1. WHEN the Import_Service receives a successful response from the external API, THE Import_Service SHALL store the complete raw JSON response in the Raw_Response_Cache before processing individual job listings.
2. WHEN an import is triggered, THE Import_Service SHALL first check the Raw_Response_Cache for existing cached data matching the same query and locality parameters.
3. IF valid cached data exists for the requested query, THEN THE Import_Service SHALL use the cached data to process job listings without making a new external API call.
4. THE Raw_Response_Cache SHALL preserve all fields from the API response including job links, company information, qualifications, highlights, salary data, and any other metadata.
5. WHEN an HR admin explicitly requests a fresh import (force refresh), THE Import_Service SHALL bypass the cache and fetch new data from the external API, then update the cache with the new response.
6. THE Raw_Response_Cache SHALL store the timestamp of when the data was fetched to allow the HR admin to see how fresh the cached data is.

### Requirement 3: Store Imported Jobs in Database

**User Story:** As a system admin, I want imported jobs stored in the existing job_descriptions table with clear source attribution and all available data, so that they integrate seamlessly with manually posted jobs while remaining distinguishable.

#### Acceptance Criteria

1. WHEN the Import_Service processes a valid job listing from the cached or freshly fetched API response, THE Import_Service SHALL insert a record into the `job_descriptions` table with the job title, description, qualifications, company name, location, employment type, and application link (Job_Link) mapped from the API response.
2. THE Import_Service SHALL assign each imported job record to the designated System_User as the `hr_user_id`.
3. THE Import_Service SHALL set the status of each imported job record to `published` so that applicants can see the listing immediately.
4. THE Import_Service SHALL store source attribution metadata (the original company name, "via JSearch" or "via Indeed" indicator, and the original Job_Link) in the job record.
5. WHEN storing an imported job, THE Import_Service SHALL record the external job identifier from the API response to support Deduplication_Check operations.
6. THE Import_Service SHALL store all available metadata fields from the API response (highlights, salary range, employment type, location details) in the job record.

### Requirement 4: Extract Skills from Imported Jobs

**User Story:** As an applicant, I want imported jobs to have extracted skill requirements, so that the AI matching engine can compare my skills against these real listings.

#### Acceptance Criteria

1. WHEN the Import_Service stores a new imported job, THE Skill_Extractor SHALL analyze the job description and qualifications text to identify required and preferred skills.
2. THE Skill_Extractor SHALL insert extracted skills into the `job_required_skills` table linked to the imported job record.
3. THE Skill_Extractor SHALL classify each extracted skill as `required` or `preferred` based on the context in the job description (e.g., "must have" vs "nice to have" language).
4. THE Skill_Extractor SHALL normalize extracted skill names using the local skill matcher synonym map before storage to ensure consistent matching with applicant skills.

### Requirement 5: Prevent Duplicate Imports

**User Story:** As a system admin, I want the import process to be idempotent, so that running the import multiple times does not create duplicate job listings.

#### Acceptance Criteria

1. WHEN the Import_Service processes a job listing, THE Deduplication_Check SHALL compare the external job identifier from the JSearch_API response against existing imported job records in the database.
2. IF the Deduplication_Check finds a matching external job identifier already stored, THEN THE Import_Service SHALL skip that job listing without inserting a duplicate record.
3. WHEN the import completes, THE Import_Service SHALL report the count of newly imported jobs and the count of skipped duplicates in the response.

### Requirement 6: Enforce API Rate Limits

**User Story:** As a system admin, I want the import process to respect the JSearch API free tier limit, so that the platform does not exhaust its monthly API quota.

#### Acceptance Criteria

1. THE Rate_Limiter SHALL track the number of JSearch_API requests made in the current calendar month.
2. WHEN the Rate_Limiter detects that the monthly request count has reached 180 (90% of the 200 limit), THE Import_Service SHALL include a warning in the import response indicating the quota is nearly exhausted.
3. IF the Rate_Limiter detects that the monthly request count has reached 200, THEN THE Import_Service SHALL reject the import request with a quota exhaustion error without making an external API call.
4. WHEN a new calendar month begins, THE Rate_Limiter SHALL reset the request counter to zero.

### Requirement 7: HR Dashboard Import Trigger

**User Story:** As an HR admin, I want a button on the HR dashboard to manually trigger the job import, so that I can control when new listings are fetched.

#### Acceptance Criteria

1. THE HR_Dashboard SHALL display an "Import Jobs" button accessible to users with the `hr_user` role.
2. WHEN the HR admin clicks the "Import Jobs" button, THE HR_Dashboard SHALL send a request to the import API endpoint and display a loading indicator.
3. WHEN the import completes successfully, THE HR_Dashboard SHALL display a success message with the count of newly imported jobs and skipped duplicates.
4. IF the import fails, THEN THE HR_Dashboard SHALL display an error message describing the failure reason.
5. WHILE an import operation is in progress, THE HR_Dashboard SHALL disable the "Import Jobs" button to prevent concurrent import requests.
6. THE HR_Dashboard SHALL display the timestamp of the last cached API fetch so the HR admin knows how fresh the data is.
7. THE HR_Dashboard SHALL provide a "Force Refresh" option that bypasses the cache and fetches new data from the external API.

### Requirement 8: Imported Jobs Visibility for Applicants

**User Story:** As an applicant, I want to see imported job listings alongside HR-posted jobs, so that I can match my skills against real-world opportunities.

#### Acceptance Criteria

1. THE applicant job listings page SHALL display imported jobs alongside manually posted jobs without distinction in the primary listing view.
2. WHEN an applicant views a job detail page for an imported job, THE system SHALL display the source attribution (original company name and "via JSearch" indicator).
3. THE system SHALL include imported jobs in all match calculation operations identically to manually posted jobs.

### Requirement 9: Import API Route

**User Story:** As a developer, I want a dedicated API route for the import operation, so that it can be triggered programmatically or from the HR dashboard.

#### Acceptance Criteria

1. THE system SHALL expose a POST endpoint at `/api/jobs/import` that triggers the import operation.
2. WHEN a request is received at `/api/jobs/import`, THE system SHALL verify the caller has the `hr_user` role before proceeding.
3. THE endpoint SHALL accept an optional request body with `query` (search term, default: "software developer"), `location` (default: "Philippines"), and `forceRefresh` (boolean, default: false) parameters.
4. WHEN `forceRefresh` is true, THE endpoint SHALL bypass the Raw_Response_Cache and fetch fresh data from the external API.
5. WHEN the import operation completes, THE endpoint SHALL return a JSON response containing the counts of imported jobs, skipped duplicates, cache status (used cache vs fresh fetch), and any warnings.
6. IF an unauthenticated or unauthorized request is received, THEN THE endpoint SHALL return a 401 or 403 status code respectively.

### Requirement 10: Manual Job Listing Creation by HR

**User Story:** As an HR user, I want to manually create and post my own job listings, so that I can advertise positions specific to my organization alongside imported listings.

#### Acceptance Criteria

1. THE HR_Dashboard SHALL provide a job creation form where HR users can input job title, description, qualifications, and required skills.
2. WHEN an HR user submits a new job listing, THE system SHALL insert the record into the `job_descriptions` table with the HR user's ID as the `hr_user_id`.
3. THE system SHALL set manually created jobs to `draft` status by default, allowing the HR user to review before publishing.
4. WHEN an HR user publishes a manually created job, THE system SHALL set the status to `published` and make the job visible to applicants.
5. THE system SHALL distinguish manually created jobs from imported jobs by the absence of an external job identifier and source attribution metadata.
6. THE HR_Dashboard SHALL allow HR users to edit and update their own manually created job listings after creation.
7. THE HR_Dashboard SHALL allow HR users to close their own job listings by setting the status to `closed`.

### Requirement 11: Skill Proficiency Level Detection

**User Story:** As an applicant, I want CareerFlow to automatically determine how well I know each skill based on my resume context, so that my profile reflects my actual expertise levels rather than just listing skill names.

#### Acceptance Criteria

1. WHEN the Resume Parser extracts a skill from the applicant's resume, THE Proficiency_Analyzer SHALL examine the surrounding text context to determine proficiency level.
2. THE Proficiency_Analyzer SHALL classify a skill as `expert` when the context contains indicators such as "led," "architected," "5+ years," "mentored," "senior," or "principal."
3. THE Proficiency_Analyzer SHALL classify a skill as `intermediate` when the context contains indicators such as "used," "developed," "2-4 years," "implemented," or "contributed."
4. THE Proficiency_Analyzer SHALL classify a skill as `beginner` when the context contains indicators such as "familiar," "basic," "course," "1 year," "learning," or "exposure."
5. IF the Proficiency_Analyzer cannot determine proficiency from context, THEN THE Proficiency_Analyzer SHALL default to `intermediate` as the classification.
6. THE system SHALL store the determined proficiency level in the applicant's skill profile and display the level as a visual badge on the applicant's profile page.
7. THE system SHALL use proficiency levels as a factor in match score calculations, weighting expert-level matches higher than beginner-level matches.

### Requirement 12: Resume ATS Score

**User Story:** As an applicant, I want to see an ATS compatibility score for my resume against a specific job, so that I know whether my resume would pass automated screening and what keywords to add.

#### Acceptance Criteria

1. WHEN an applicant views a job listing detail page, THE ATS_Scorer SHALL calculate a score from 0 to 100 representing how well the applicant's resume matches the job's keyword requirements.
2. THE ATS_Scorer SHALL extract the top keywords from the job description and qualifications fields (minimum 10 keywords when available).
3. THE ATS_Scorer SHALL compare the extracted job keywords against the applicant's raw resume text using exact keyword matching.
4. THE ATS_Scorer SHALL calculate the score using the formula: (number of keywords found in resume / total job keywords) multiplied by 100, rounded to the nearest integer.
5. WHEN the ATS score is below 80, THE system SHALL display specific keyword suggestions showing which missing keywords the applicant should add to their resume.
6. THE system SHALL display the ATS score prominently on the job detail page alongside the existing match percentage.
7. THE ATS_Scorer SHALL update the score automatically when the applicant updates their resume.

### Requirement 13: Hidden Gem Job Detection

**User Story:** As an applicant, I want CareerFlow to highlight jobs where I am a 60-79% match but the missing skills are easy to learn, so that I can discover high-growth opportunities with less competition.

#### Acceptance Criteria

1. WHEN the match calculation produces a score between 60 and 79 (inclusive) for an applicant-job pair, THE Hidden_Gem_Detector SHALL evaluate the missing skills for learnability.
2. THE Hidden_Gem_Detector SHALL classify each missing skill as either an Easy_Skill or a Hard_Skill based on a predefined skill difficulty catalog.
3. IF all missing skills for a 60-79% match are classified as Easy_Skills, THEN THE Hidden_Gem_Detector SHALL tag the job as a "Hidden Gem."
4. IF the majority (more than 50%) of missing skills are classified as Easy_Skills, THEN THE Hidden_Gem_Detector SHALL tag the job as a "Hidden Gem."
5. THE applicant job listings page SHALL display a "🔥 Hidden Gem" badge on jobs identified by the Hidden_Gem_Detector.
6. WHEN an applicant views a Hidden Gem job detail, THE system SHALL display a message indicating how many easy skills are missing (e.g., "Only 1 skill away!").
7. THE system SHALL allow applicants to filter the job listings to show only Hidden Gem jobs.

### Requirement 14: Skill ROI Analysis

**User Story:** As an applicant, I want to know which missing skill to learn first for the biggest improvement in my match scores, so that I can prioritize my learning for maximum career impact.

#### Acceptance Criteria

1. WHEN an applicant requests skill ROI analysis for a specific job, THE Skill_ROI_Analyzer SHALL simulate adding each missing skill to the applicant's profile one at a time.
2. FOR EACH missing skill simulation, THE Skill_ROI_Analyzer SHALL recalculate the match score using the existing matching algorithm and compute the score delta (new score minus current score).
3. THE Skill_ROI_Analyzer SHALL sort the simulated skills by score delta in descending order (highest improvement first).
4. THE system SHALL display the ranked skill recommendations to the applicant showing each skill name and the projected match score improvement (e.g., "Learn SQL first → +15% match").
5. WHEN an applicant views the Skill ROI analysis, THE system SHALL display the top 5 highest-impact skills to learn.
6. THE Skill_ROI_Analyzer SHALL complete the simulation and return results within 3 seconds for jobs with up to 15 missing skills.

### Requirement 15: "Ready Now" vs "High Potential" Candidate Scoring

**User Story:** As an HR user, I want to see which applicants are ready to hire today and which could be ready in two weeks with minimal learning, so that I can hire for potential and not just perfection.

#### Acceptance Criteria

1. THE CareerFlow system SHALL calculate a "Ready Now" score for each applicant-job pair equal to the current match percentage.
2. THE CareerFlow system SHALL calculate a "High Potential" score by simulating the addition of the 2 easiest missing skills (Easy_Skills) to the applicant's profile and recalculating the match percentage.
3. WHEN an HR user views the applicant rankings for a job, THE HR_Dashboard SHALL display both the "Ready Now" score and the "High Potential" score side by side for each applicant.
4. THE HR_Dashboard SHALL allow HR users to sort applicants by either "Ready Now" or "High Potential" score.
5. WHEN the "High Potential" score exceeds the "Ready Now" score by 10 or more percentage points, THE HR_Dashboard SHALL highlight the applicant with a "High Growth" indicator.
6. THE system SHALL identify the 2 easiest missing skills used in the High Potential calculation and display them to the HR user (e.g., "Could reach 90% by learning: Excel, Git").

### Requirement 16: "At Risk" Candidate Alerts

**User Story:** As an HR user, I want to be alerted when a top candidate matches highly with multiple other jobs in the system, so that I can fast-track them before they accept another offer.

#### Acceptance Criteria

1. WHEN an applicant has a match score of 85% or higher against 3 or more published job listings in the database, THE CareerFlow system SHALL flag that applicant as "At Risk."
2. THE HR_Dashboard SHALL display a 🚨 "At Risk" badge next to flagged applicants in the rankings view.
3. WHEN an HR user views an "At Risk" applicant, THE system SHALL show the count of other jobs the applicant matches highly with (e.g., "Also matches 4 other roles at 85%+").
4. THE system SHALL recalculate "At Risk" status whenever new match scores are computed or new job listings are published.
5. THE HR_Dashboard SHALL provide a filter to show only "At Risk" applicants across all job listings.

### Requirement 17: One-Click Smart Filters for HR

**User Story:** As an HR user, I want pre-built smart filters to instantly surface the right candidates without manual screening, so that I save hours of repetitive filtering work.

#### Acceptance Criteria

1. THE HR_Dashboard SHALL provide a "🏆 90%+ Matches" smart filter that displays applicants with a match score of 90 or higher for the selected job.
2. THE HR_Dashboard SHALL provide a "🚀 Fast Learners" smart filter that displays applicants who have added 3 or more new skills to their profile in the last 30 days.
3. THE HR_Dashboard SHALL provide a "💼 Industry Veterans" smart filter that displays applicants with 5 or more years of total work experience.
4. THE HR_Dashboard SHALL provide a "🎓 Recent Grads" smart filter that displays applicants who graduated within the last 2 years.
5. THE HR_Dashboard SHALL provide a "🏅 Certified" smart filter that displays applicants who have at least one certification on their profile.
6. WHEN an HR user clicks a smart filter button, THE HR_Dashboard SHALL apply the filter immediately and update the applicant list without a full page reload.
7. THE HR_Dashboard SHALL allow HR users to combine multiple smart filters simultaneously.

### Requirement 18: Pipeline Health Dashboard

**User Story:** As an HR user, I want an at-a-glance view of how many qualified candidates exist for each job listing, so that I know instantly whether I have enough applicants or need to post more.

#### Acceptance Criteria

1. THE HR_Dashboard SHALL display a pipeline health summary for each published job listing showing applicant counts grouped by match percentage ranges.
2. THE pipeline health summary SHALL group applicants into the following tiers: 🟢 Top Tier (90%+), 🟡 Good Fit (75-89%), 🟠 Potential (60-74%), and 🔴 Gap (below 60%).
3. THE HR_Dashboard SHALL display the tier counts using color-coded visual indicators (green, yellow, orange, red).
4. WHEN an HR user clicks on a tier count, THE HR_Dashboard SHALL navigate to the filtered applicant list showing only applicants in that tier for that job.
5. THE pipeline health summary SHALL update automatically when new match scores are calculated or new applicants apply.
6. THE HR_Dashboard SHALL display the pipeline health summary on the main HR dashboard page as an overview across all published jobs.

### Requirement 19: Enhanced Applicant Data Collection

**User Story:** As an applicant, I want to provide comprehensive profile information including work experience, education, certifications, preferences, and learning activity, so that CareerFlow can provide accurate matching and HR users can find me through smart filters.

#### Acceptance Criteria

1. THE system SHALL collect and store the following applicant profile data: full name, email, phone, location, work experience (titles, companies, dates, descriptions, industry), education (degrees, institutions, graduation years, field of study), and external profile URLs (LinkedIn, GitHub, portfolio).
2. THE system SHALL track learning activity by recording timestamps when skills are added or updated on the applicant's profile.
3. THE system SHALL calculate total years of experience from the work experience entries and store the computed value for efficient filtering.
4. WHEN an applicant uploads a resume, THE Resume Parser SHALL extract structured data including skills with proficiency, work experience, education, and certifications automatically.
5. THE system SHALL provide a manual input form for applicants to add or edit: skills with proficiency levels, certifications (name, issuer, date), work preferences (remote/on-site/hybrid, willingness to relocate, target industries), and external profile URLs.
6. THE system SHALL store certifications with the certification name, issuing organization, and date obtained.
7. THE system SHALL track the "last used" date for each skill to support recency-based matching and filtering.
8. WHEN an applicant's profile data changes, THE system SHALL trigger recalculation of relevant match scores, ATS scores, Hidden Gem status, and At Risk status.

### Requirement 20: Application Flow for External and Internal Jobs

**User Story:** As an applicant, I want to apply to both imported and HR-posted jobs through a clear process, so that I can track my applications regardless of the job source.

#### Acceptance Criteria

1. WHEN an applicant clicks "Apply" on an imported job that has an external Job_Link, THE system SHALL open the external link in a new browser tab and then display a confirmation dialog asking "Did you apply through the external site?"
2. IF the applicant confirms they applied externally, THEN THE system SHALL record an application entry in the `applications` table with the applicant's ID and the job's ID, marking the application status as "applied_externally."
3. IF the applicant declines the confirmation (did not apply externally), THEN THE system SHALL not record an application entry and the job's apply status remains unchanged.
4. WHEN an applicant clicks "Apply" on a job posted by an HR user (no external Job_Link), THE system SHALL directly insert an application record in the `applications` table linking the applicant to the HR user's job listing.
5. WHEN an HR user views applicants for their job listing, THE system SHALL display all applicants who applied directly (internal applications) in the rankings view.
6. THE system SHALL visually distinguish between "Applied" (internal) and "Applied Externally" statuses on the applicant's job listing view.

### Requirement 21: Job Search and Filtering for Applicants

**User Story:** As an applicant, I want to search and filter job listings by multiple criteria, so that I can quickly find relevant opportunities matching my preferences.

#### Acceptance Criteria

1. THE applicant job listings page SHALL provide a keyword search input that filters jobs by matching against job title, description, company name, and skills.
2. THE applicant job listings page SHALL provide filter options for: employment type (full-time, part-time, contract, internship), location (city or remote), minimum match percentage, and salary range (when available).
3. WHEN the applicant applies one or more filters, THE system SHALL update the displayed job listings in real-time without a full page reload.
4. THE applicant job listings page SHALL support sorting by: match percentage (default, descending), date posted (newest first), salary (highest first when available), and company name (alphabetical).
5. WHEN filters produce zero results, THE system SHALL display a "No jobs match your criteria" message with a suggestion to broaden the search.
6. THE system SHALL preserve the applicant's active filters and sort preference during the session so they persist when navigating back from a job detail page.
7. THE applicant job listings page SHALL display active filter tags that can be individually removed with a click.

### Requirement 22: Salary Data Display

**User Story:** As an applicant, I want to see salary information when it's available, so that I can assess whether a job meets my compensation expectations.

#### Acceptance Criteria

1. WHEN a job listing has salary data from the API response, THE system SHALL display the salary range on the job card in the listings view.
2. WHEN a job listing has salary data, THE job detail page SHALL display the full salary information including minimum, maximum, and currency/period (e.g., "₱30,000 - ₱50,000/month").
3. IF a job listing does not have salary data, THEN THE system SHALL display nothing in the salary field (leave blank, no "N/A" or placeholder text).
4. THE applicant SHALL be able to filter job listings by salary range only when salary data is available for those jobs.

### Requirement 23: Notification System

**User Story:** As a user, I want clear visual notifications for system events and errors, so that I know when actions succeed or fail without confusion.

#### Acceptance Criteria

1. WHEN a critical error occurs (authentication failure, server error, data loss risk), THE system SHALL display a centered modal popup with the error message and a dismiss button that requires explicit user acknowledgment.
2. WHEN a non-critical notification occurs (success message, warning, info), THE system SHALL display a toast notification in the top-right corner that auto-dismisses after 5 seconds.
3. THE notification toast SHALL include an icon indicating severity: green checkmark for success, yellow triangle for warning, blue "i" for informational.
4. THE centered error modal SHALL prevent interaction with the rest of the page until dismissed (modal overlay).
5. WHEN multiple non-critical notifications occur in sequence, THE system SHALL stack them vertically in the top-right corner with the newest on top.

### Requirement 24: Data Analytics and Reporting

**User Story:** As an HR admin, I want comprehensive analytics on job listings, applicant activity, and matching performance, so that I can make data-driven hiring decisions.

#### Acceptance Criteria

1. THE HR_Dashboard SHALL display a "Total Active Listings" count showing the number of published job listings (both imported and manual).
2. THE HR_Dashboard SHALL display a "Total Applicants" count showing the total number of registered applicants in the system.
3. THE HR_Dashboard SHALL display an "Average Match Score" metric showing the mean match percentage across all applicant-job pairs.
4. THE HR_Dashboard SHALL display a "Top Skills in Demand" list showing the 10 most frequently required skills across all published job listings with their occurrence count.
5. THE HR_Dashboard SHALL display an "Applicant Growth" trend showing the number of new applicant registrations per week for the last 4 weeks.
6. THE HR_Dashboard SHALL display a "Skill Gap Analysis" showing the top 5 skills that are most frequently required by jobs but least frequently held by applicants.
7. THE HR_Dashboard SHALL display a "Conversion Rate" metric showing the percentage of applicants who have applied to at least one job.
8. THE HR_Dashboard SHALL provide an export option to download the analytics data as a CSV file.
9. ALL analytics metrics SHALL update in real-time as new data is added (new jobs imported, new applicants register, new matches calculated).

### Requirement 25: Responsive Design (Future Enhancement)

**User Story:** As a user, I want the platform to be usable on mobile and tablet devices, so that I can access CareerFlow on any screen size.

#### Acceptance Criteria

1. ALL new UI components (HR dashboard, applicant listings, job detail pages, filters, notifications) SHALL be designed with a mobile-first responsive layout using Tailwind CSS breakpoints.
2. ON screens smaller than 768px, THE navigation sidebar SHALL collapse into a hamburger menu.
3. ON screens smaller than 768px, THE job listing cards SHALL stack vertically in a single column.
4. ON screens smaller than 768px, THE HR pipeline health dashboard SHALL display tiers vertically instead of horizontally.
5. THIS requirement is marked as a future enhancement and SHALL NOT block the initial implementation of other requirements.


### Requirement 26: Pre-Application Gap Summary

**User Story:** As an applicant, I want to see a summary of my skill gaps and qualifications before finalizing my application, so that I can make an informed decision about whether to apply while still being able to proceed if I choose.

#### Acceptance Criteria

1. WHEN an applicant clicks the "Apply" button for any job listing, THE system SHALL display a pre-application summary dialog before processing the application.
2. THE pre-application summary dialog SHALL display: the applicant's current match percentage for that job, the ATS compatibility score, a list of missing required skills, a list of missing preferred skills, and any qualification gaps identified from the job description.
3. THE pre-application summary dialog SHALL include a "Proceed with Application" button that allows the applicant to continue and submit the application regardless of the gap analysis.
4. THE pre-application summary dialog SHALL include a "Cancel" button that returns the applicant to the job detail page without submitting an application.
5. IF the applicant's match percentage is 90% or higher, THE pre-application summary dialog SHALL display an encouraging message (e.g., "You're a strong match for this role!") alongside the gap analysis.
6. IF the applicant's match percentage is below 60%, THE pre-application summary dialog SHALL display a gentle advisory (e.g., "You may want to develop these skills first, but you can still apply.") without blocking the application.
7. THE pre-application summary dialog SHALL display the top 3 recommended skills to learn (from the Skill_ROI_Analyzer) with projected match improvement percentages.
8. THE pre-application gap summary SHALL NOT block or prevent the applicant from proceeding with the application under any circumstance — it is informational only.
