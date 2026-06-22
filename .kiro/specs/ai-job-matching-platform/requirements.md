# Requirements Document

## Introduction

The AI-Powered Job Matching Platform is a web application that connects job applicants with HR professionals through intelligent skill-based matching. The platform uses AI to analyze applicant resumes and job descriptions, calculate match percentages, rank applicants for HR users, and provide actionable improvement suggestions to applicants. The system supports two distinct user roles: Applicants who upload their skills and view job matches, and HR/Job Posters who create job listings and view ranked applicant pools.

The platform is designed to be built by a team of 2 developers (Front-end/AI integration and Back-end/Database). The core flow centers around individual job postings: each Job_Description has its own Ranking_List visible to the HR_User, and each Job_Description has its own set of AI improvement suggestions visible to the Applicant viewing that posting.

## Glossary

- **Platform**: The AI-Powered Job Matching Platform web application
- **Applicant**: A registered user who uploads resumes and skillsets to find matching job opportunities
- **HR_User**: A registered user (HR professional or job poster) who creates job descriptions and reviews ranked applicants
- **Authentication_Service**: The component responsible for user registration, login, and session management
- **Resume_Parser**: The component that extracts structured skill and experience data from uploaded resumes
- **Job_Description**: A structured posting created by an HR_User containing role requirements, required skills, and qualifications
- **Skill_Profile**: A structured representation of an Applicant's skills, experience, and qualifications extracted from their resume and manual input
- **Match_Engine**: The AI component that compares Skill_Profiles against Job_Descriptions to calculate match percentages
- **Match_Percentage**: A numerical score (0-100) representing how well an Applicant's Skill_Profile aligns with a Job_Description's requirements
- **Recommendation_Engine**: The AI component that generates actionable suggestions for Applicants to improve their Match_Percentage
- **Ranking_List**: An ordered list of Applicants for a specific Job_Description, sorted by Match_Percentage from highest to lowest

## Requirements

### Requirement 1: User Registration

**User Story:** As a new user, I want to register an account with a designated role, so that I can access role-specific features of the platform.

#### Acceptance Criteria

1. WHEN a new user submits a registration form with email, password, and selected role (Applicant or HR_User), THE Authentication_Service SHALL create a new account and assign the selected role
2. WHEN a user attempts to register with an email that already exists, THE Authentication_Service SHALL reject the registration and display an error message indicating the email is already in use
3. THE Authentication_Service SHALL require a password of at least 8 characters containing at least one uppercase letter, one lowercase letter, and one number
4. WHEN a user selects a role during registration, THE Authentication_Service SHALL restrict that account to the selected role's permissions and views

### Requirement 2: User Login

**User Story:** As a registered user, I want to log into my account, so that I can access the platform features assigned to my role.

#### Acceptance Criteria

1. WHEN a registered user submits valid credentials (email and password), THE Authentication_Service SHALL authenticate the user and redirect to the role-appropriate dashboard
2. WHEN a user submits invalid credentials, THE Authentication_Service SHALL reject the login attempt and display a generic error message without revealing which field is incorrect
3. IF a user fails to authenticate 5 times consecutively, THEN THE Authentication_Service SHALL lock the account for 15 minutes
4. WHEN an authenticated session expires after 60 minutes of inactivity, THE Authentication_Service SHALL redirect the user to the login page

### Requirement 3: Applicant Skill Profile Management

**User Story:** As an Applicant, I want to input my resume and skillset, so that the platform can match me with relevant job postings.

#### Acceptance Criteria

1. WHEN an Applicant uploads a resume file (PDF or DOCX format, maximum 5MB), THE Resume_Parser SHALL extract skills, experience, and qualifications into a structured Skill_Profile
2. WHEN an Applicant manually adds or removes skills from their Skill_Profile, THE Platform SHALL update the Skill_Profile immediately
3. IF the Resume_Parser fails to extract data from an uploaded file, THEN THE Platform SHALL display an error message and prompt the Applicant to upload a different file or enter skills manually
4. THE Platform SHALL allow Applicants to view and edit their current Skill_Profile at any time
5. WHEN an Applicant updates their Skill_Profile, THE Match_Engine SHALL recalculate all Match_Percentages for that Applicant within 30 seconds

### Requirement 4: Job Description Management

**User Story:** As an HR_User, I want to create and manage job descriptions, so that the platform can match qualified applicants to my openings.

#### Acceptance Criteria

1. WHEN an HR_User submits a new job description containing a title, description, required skills, and qualifications, THE Platform SHALL create and publish the Job_Description
2. THE Platform SHALL require that each Job_Description contains at least one required skill
3. WHEN an HR_User edits an existing Job_Description, THE Match_Engine SHALL recalculate all Match_Percentages for that Job_Description within 30 seconds
4. WHEN an HR_User deletes a Job_Description, THE Platform SHALL remove the posting and all associated Match_Percentages and rankings
5. THE Platform SHALL allow an HR_User to view all Job_Descriptions they have created

### Requirement 5: AI Match Percentage Calculation (Per Job Posting)

**User Story:** As an Applicant, I want to see how well I match each individual job posting, so that I can focus on the most relevant opportunities and understand what to improve per posting.

#### Acceptance Criteria

1. WHEN a new Job_Description is published, THE Match_Engine SHALL calculate a Match_Percentage for every active Applicant Skill_Profile against that Job_Description
2. THE Match_Engine SHALL produce a Match_Percentage value between 0 and 100 (inclusive) for each Applicant-Job_Description pair
3. THE Match_Engine SHALL weight required skills higher than preferred qualifications when calculating the Match_Percentage
4. WHEN an Applicant views the job listings page, THE Platform SHALL display each Job_Description with its corresponding Match_Percentage
5. THE Platform SHALL sort job listings for Applicants by Match_Percentage in descending order by default
6. WHEN an Applicant selects a specific Job_Description, THE Platform SHALL display the detailed job information, the Applicant's Match_Percentage for that posting, and AI-generated improvement suggestions specific to that posting

### Requirement 6: Applicant Ranking Per Job Posting (HR View)

**User Story:** As an HR_User, I want to view applicants ranked by match percentage for each of my job postings, so that I can prioritize the most qualified candidates per position.

#### Acceptance Criteria

1. WHEN an HR_User selects a specific Job_Description from their list, THE Platform SHALL display a Ranking_List of all Applicants for that Job_Description sorted by Match_Percentage from highest to lowest
2. THE Platform SHALL display the rank position, Applicant name, and Match_Percentage for each entry in the Ranking_List
3. WHEN two or more Applicants share the same Match_Percentage for a Job_Description, THE Platform SHALL assign them the same rank and sort them alphabetically by name
4. WHEN a new Applicant's Skill_Profile is created or updated, THE Platform SHALL update the Ranking_List for all affected Job_Descriptions within 30 seconds
5. THE Platform SHALL maintain a separate Ranking_List for each Job_Description created by the HR_User

### Requirement 7: AI Improvement Recommendations Per Job Posting (Applicant View)

**User Story:** As an Applicant, I want to receive AI-generated suggestions specific to each job posting, so that I know exactly what skills to improve or add to increase my match for that particular role.

#### Acceptance Criteria

1. WHEN an Applicant views a specific Job_Description detail page, THE Recommendation_Engine SHALL generate a list of actionable suggestions to improve the Applicant's Match_Percentage for that specific Job_Description
2. THE Recommendation_Engine SHALL categorize each suggestion as either "Skill to Add" (a new skill to acquire) or "Skill to Improve" (an existing skill to strengthen)
3. THE Recommendation_Engine SHALL prioritize suggestions by potential impact on Match_Percentage, with highest-impact suggestions listed first
4. THE Recommendation_Engine SHALL provide at least one suggestion for any Applicant with a Match_Percentage below 100 for a given Job_Description
5. IF an Applicant has a Match_Percentage of 100 for a Job_Description, THEN THE Recommendation_Engine SHALL display a message indicating the profile fully matches the job requirements
6. THE Recommendation_Engine SHALL generate suggestions that are specific to the gap between the Applicant's Skill_Profile and the selected Job_Description's requirements

### Requirement 8: Job Posting Detail View for Applicants

**User Story:** As an Applicant, I want to view detailed information about each job posting along with my match percentage and personalized suggestions, so that I can make informed decisions about which roles to pursue.

#### Acceptance Criteria

1. WHEN an Applicant selects a Job_Description from the listings page, THE Platform SHALL display the full job details including title, description, required skills, and qualifications
2. THE Platform SHALL display the Applicant's Match_Percentage prominently on the Job_Description detail page
3. THE Platform SHALL display the AI-generated improvement suggestions specific to that Job_Description on the same detail page
4. THE Platform SHALL provide navigation allowing the Applicant to browse between different Job_Description detail pages without returning to the listings page

### Requirement 9: Job Listings Browsing for Applicants

**User Story:** As an Applicant, I want to browse all available job postings with match information, so that I can explore opportunities and understand the job market.

#### Acceptance Criteria

1. WHEN an Applicant navigates to the job listings page, THE Platform SHALL display all published Job_Descriptions with title, summary, and Match_Percentage
2. THE Platform SHALL provide search functionality allowing Applicants to filter Job_Descriptions by keyword, required skills, or Match_Percentage range
3. WHEN no Job_Descriptions match the applied filters, THE Platform SHALL display a message indicating no results were found and suggest broadening the search criteria
