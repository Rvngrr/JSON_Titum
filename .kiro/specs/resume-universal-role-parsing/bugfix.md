# Bugfix Requirements Document

## Introduction

When an applicant uploads a resume for a non-tech role (e.g., Chef, Nurse, Teacher, Mechanic), the system fails to extract relevant skills and does not populate the user's profile with parsed work experience, education, and certifications. The platform currently only recognizes tech-related skills in both its AI prompt categories and local fallback skill database, and it limits career goal options to tech roles only. This effectively locks out applicants pursuing careers outside of technology.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN an applicant uploads a resume containing non-tech skills (e.g., culinary, healthcare, education, trades) AND the AI extraction fails or returns 0 skills THEN the local fallback `extractSkillsLocally()` returns 0 skills because its `skillDB` only contains tech skills (programming languages, frameworks, databases, DevOps tools, etc.)

1.2 WHEN an applicant uploads a resume AND the AI extraction succeeds THEN the AI prompt's "SKILL CATEGORIES TO LOOK FOR" section lists only tech-oriented categories (Programming languages, Frontend frameworks, Backend frameworks, AI/ML, Databases, DevOps, Design tools, Testing), biasing Gemini away from extracting culinary, healthcare, education, trades, or other non-tech skills

1.3 WHEN the resume is parsed and profile data (work experience, education, certifications) is successfully extracted by `extractResumeProfile()` THEN the system only saves `resume_file_path` and `raw_resume_text` to the database and does NOT auto-populate work experience, education, or certifications into the user's profile

1.4 WHEN an applicant navigates to the Career Goals page and types a non-tech role (e.g., "Chef", "Nurse", "Teacher") THEN the system shows no matching suggestions from POPULAR_ROLES and cannot calculate role readiness because ROLE_EXPECTED_SKILLS has no entries for non-tech roles

### Expected Behavior (Correct)

2.1 WHEN an applicant uploads a resume containing non-tech skills AND the AI extraction fails or returns 0 skills THEN the local fallback SHALL extract relevant non-tech skills (culinary, healthcare, education, trades, hospitality, etc.) by matching against an expanded skill database that covers multiple industries

2.2 WHEN an applicant uploads a resume THEN the AI extraction prompt SHALL include broad skill categories covering all industries (e.g., Culinary Arts, Healthcare/Nursing, Education/Teaching, Skilled Trades, Hospitality, Business/Finance, Marketing, etc.) so that non-tech skills are extracted with the same accuracy as tech skills

2.3 WHEN the resume is parsed and profile data (work experience, education, certifications) is successfully extracted THEN the system SHALL auto-save the extracted work experience, education, and certifications to the user's skill_profiles record so the profile is pre-populated

2.4 WHEN an applicant navigates to the Career Goals page THEN the system SHALL display popular roles spanning multiple industries (including Chef, Nurse, Teacher, Mechanic, Electrician, etc.) and SHALL provide role readiness calculations with expected skills for those non-tech roles

### Unchanged Behavior (Regression Prevention)

3.1 WHEN an applicant uploads a resume containing tech skills (programming, frameworks, databases, DevOps) THEN the system SHALL CONTINUE TO extract those tech skills accurately with correct proficiency assessments

3.2 WHEN the AI extraction (Gemini) succeeds and returns tech skills THEN the system SHALL CONTINUE TO save skills to the database, trigger match calculations, and return the parsed response without regression

3.3 WHEN an applicant has already manually entered work experience, education, or certifications THEN the system SHALL CONTINUE TO preserve those manually-entered entries (auto-population from resume SHALL NOT overwrite existing manual data)

3.4 WHEN an applicant selects a tech role (e.g., "Software Developer", "Data Analyst") on the Career Goals page THEN the system SHALL CONTINUE TO display role readiness with the same expected skills as before

3.5 WHEN a resume is uploaded THEN the system SHALL CONTINUE TO store the resume_file_path and raw_resume_text, delete previously parsed skills before inserting new ones, and trigger match recalculation for published jobs
