# Requirements Document

## Introduction

The Job Application System extends the existing AI-Powered Job Matching Platform to add explicit job application functionality. Currently, the HR rankings view shows all applicants ranked by match percentage regardless of interest. This feature introduces an "Apply" action that allows applicants to explicitly express interest in specific job postings. Only applicants who have applied will appear in the HR user's screening and rankings view, making the hiring pipeline more actionable and focused.

## Glossary

- **Platform**: The AI-Powered Job Matching Platform web application
- **Applicant**: A registered user who uploads resumes and skillsets to find matching job opportunities
- **HR_User**: A registered user (HR professional or job poster) who creates job descriptions and reviews ranked applicants
- **Job_Description**: A structured posting created by an HR_User containing role requirements, required skills, and qualifications
- **Application**: A record representing an Applicant's explicit intent to be considered for a specific Job_Description
- **Application_Service**: The component responsible for creating, retrieving, and managing job applications
- **Applications_Table**: The database table storing application records with applicant, job, and timestamp data
- **Ranking_List**: An ordered list of applied Applicants for a specific Job_Description, sorted by Match_Percentage from highest to lowest

## Requirements

### Requirement 1: Submit Job Application

**User Story:** As an Applicant, I want to apply to a job posting by clicking an "Apply" button, so that the HR user can see my profile in their screening list for that position.

#### Acceptance Criteria

1. WHEN an Applicant clicks the "Apply" button on a Job_Description detail page, THE Application_Service SHALL create an Application record linking the Applicant to that Job_Description
2. WHEN an Applicant clicks the "Apply" button on a Job_Description listing card, THE Application_Service SHALL create an Application record linking the Applicant to that Job_Description
3. WHEN an Applicant clicks the "Apply" button, THE Platform SHALL disable the button immediately to prevent duplicate submissions until the Application_Service responds
4. WHEN an Application is successfully created, THE Platform SHALL display a confirmation message indicating the application was submitted and the message SHALL remain visible until the user dismisses it or navigates away from the page
5. WHEN an Application is successfully created, THE Platform SHALL update the button state from "Apply" to "Applied" without requiring a page refresh
6. IF the Application_Service fails to create an Application record, THEN THE Platform SHALL display an error message indicating the submission failed, re-enable the "Apply" button to its original clickable state, and retain all page content without data loss
7. IF an Applicant attempts to apply to a Job_Description that is not in "published" status, THEN THE Application_Service SHALL reject the request and THE Platform SHALL not display the "Apply" button for that Job_Description

### Requirement 2: Prevent Duplicate Applications

**User Story:** As an Applicant, I want the system to prevent me from applying to the same job twice, so that I do not accidentally submit duplicate applications.

#### Acceptance Criteria

1. THE Applications_Table SHALL enforce a unique constraint on the combination of applicant identifier and job description identifier
2. IF an Applicant has an existing Application record for a Job_Description, THEN THE Platform SHALL display the "Apply" button in a disabled "Applied" state on both the job listing card and the job detail page
3. IF an Applicant attempts to submit a duplicate Application, THEN THE Application_Service SHALL reject the request, display a message indicating the Applicant has already applied to that job, and update the button state to the disabled "Applied" state
4. WHILE an Application submission request is in progress, THE Platform SHALL disable the "Apply" button to prevent additional submission attempts for the same Job_Description

### Requirement 3: Display Application Status to Applicants

**User Story:** As an Applicant, I want to see which jobs I have already applied to, so that I can track my application activity and avoid confusion.

#### Acceptance Criteria

1. WHEN an Applicant views the job listings page, THE Platform SHALL display a status label of either "Applied" or "Not Applied" for each Job_Description in the list
2. WHEN an Applicant views a Job_Description detail page, THE Platform SHALL display the application status within the job header section adjacent to the job title
3. THE Platform SHALL visually distinguish between jobs the Applicant has applied to and jobs the Applicant has not applied to on the listings page by displaying a persistent text-based status indicator with a distinct background color for each state
4. IF the Platform fails to retrieve application status data, THEN THE Platform SHALL display the job listings without status indicators and show a message indicating that application status is temporarily unavailable

### Requirement 4: Filter HR Rankings to Applied Applicants

**User Story:** As an HR_User, I want to see only applicants who have explicitly applied to my job posting in the rankings view, so that I can focus on candidates who have expressed genuine interest.

#### Acceptance Criteria

1. WHEN an HR_User views the Ranking_List for a Job_Description, THE Platform SHALL display only Applicants who have an Application record for that Job_Description
2. THE Platform SHALL sort applied Applicants by Match_Percentage from highest to lowest in the Ranking_List
3. WHEN two or more applied Applicants share the same Match_Percentage, THE Platform SHALL assign them the same rank and sort them alphabetically by the Applicant's name field in ascending order
4. WHEN no Applicants have applied to a Job_Description, THE Platform SHALL display a message indicating no applications have been received
5. THE Platform SHALL display the total count of applications received for each Job_Description in the HR rankings view
6. THE Platform SHALL display each applied Applicant's name and Match_Percentage in the Ranking_List
7. IF an Applicant has an Application record but no corresponding match_result record exists for that Job_Description, THEN THE Platform SHALL display that Applicant in the Ranking_List with a pending status indicator instead of a Match_Percentage, positioned after all Applicants with calculated percentages

### Requirement 5: Application Data Storage

**User Story:** As a system administrator, I want application data stored reliably with proper access controls, so that application records are secure and consistent.

#### Acceptance Criteria

1. THE Applications_Table SHALL store each Application with the applicant identifier, job description identifier, and a timestamp of when the application was submitted
2. THE Platform SHALL enforce Row-Level Security so that Applicants can only insert and read their own Application records
3. THE Platform SHALL enforce Row-Level Security so that HR_Users can only read Application records for Job_Descriptions they own
4. WHEN a Job_Description is deleted, THE Platform SHALL remove all associated Application records via CASCADE deletion
5. WHEN an Applicant account is deleted, THE Platform SHALL remove all associated Application records via CASCADE deletion
6. THE Applications_Table SHALL not permit updates to existing Application records after creation to ensure application immutability
