# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Non-Tech Resume Skills Not Extracted
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists across all four bug conditions
  - **Scoped PBT Approach**: Scope the property to concrete failing cases:
    - `extractSkillsLocally("experienced chef with culinary arts and food safety certification")` should return >= 1 skill
    - `extractSkillsLocally("registered nurse with patient care, CPR, medication administration")` should return >= 1 skill
    - `extractSkillsLocally("teacher with curriculum development, classroom management, lesson planning")` should return >= 1 skill
    - `extractSkillsLocally("mechanic skilled in HVAC, plumbing, electrical wiring, blueprint reading")` should return >= 1 skill
    - `ROLE_EXPECTED_SKILLS["Chef"]` should be defined and non-empty
    - `ROLE_EXPECTED_SKILLS["Nurse"]` should be defined and non-empty
    - `ROLE_EXPECTED_SKILLS["Teacher"]` should be defined and non-empty
    - `ROLE_EXPECTED_SKILLS["Mechanic"]` should be defined and non-empty
  - Test that for any resume text containing non-tech skills (culinary, healthcare, education, trades), `extractSkillsLocally()` returns at least one relevant extracted skill (from Bug Condition in design: `isBugCondition` Case 1)
  - Test that `ROLE_EXPECTED_SKILLS` returns a defined entry with >= 5 skills for non-tech roles (from Bug Condition in design: `isBugCondition` Case 4)
  - Run test on UNFIXED code - expect FAILURE (this confirms the bug exists)
  - Document counterexamples found (e.g., `extractSkillsLocally("culinary arts, food safety, menu planning")` returns `[]`, `ROLE_EXPECTED_SKILLS["Nurse"]` returns `undefined`)
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.4, 2.1, 2.2, 2.4_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Tech Skill Extraction and Tech Career Goals Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe: `extractSkillsLocally("experienced software developer with JavaScript, React, Python, Docker, SQL, Git")` returns skills on unfixed code — record exact output
  - Observe: `extractSkillsLocally("data analyst proficient in SQL, Python, Excel, Tableau, Power BI, R programming")` returns skills on unfixed code — record exact output
  - Observe: `ROLE_EXPECTED_SKILLS["Software Developer"]` returns exact array on unfixed code
  - Observe: `ROLE_EXPECTED_SKILLS["Data Analyst"]` returns exact array on unfixed code
  - Observe: `ROLE_EXPECTED_SKILLS["Cybersecurity"]` returns exact array on unfixed code
  - Write property-based test: for all tech resume texts composed from existing `skillDB` entries, `extractSkillsLocally()` returns the same set of skills with the same proficiency levels as observed on unfixed code (from Preservation Requirements in design)
  - Write property-based test: for all existing tech roles in original `POPULAR_ROLES`, `ROLE_EXPECTED_SKILLS[role]` returns the exact same skill array as the original
  - Write test: for a user with existing `work_experience` data, after resume parse the `work_experience` field is unchanged (manual data preservation)
  - Verify tests pass on UNFIXED code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Fix for non-tech resume skill extraction and career goal support

  - [x] 3.1 Expand `skillDB` in `extractSkillsLocally()` with Culinary/Hospitality skills
    - Add entries: Food Safety, Menu Planning, Kitchen Management, HACCP, ServSafe, Pastry Arts, Catering, Hospitality Management, Event Planning, Front of House, POS Systems, Culinary Arts, Food Preparation, Inventory Management (food service)
    - File: `src/app/api/resume/parse/route.ts`
    - _Bug_Condition: isBugCondition(input) where resumeContainsNonTechSkills AND extractSkillsLocally returns 0_
    - _Expected_Behavior: extractSkillsLocally SHALL return >= 1 culinary/hospitality skill_
    - _Preservation: Existing tech skill entries in skillDB must remain unchanged_
    - _Requirements: 1.1, 2.1_

  - [x] 3.2 Expand `skillDB` in `extractSkillsLocally()` with Healthcare/Nursing skills
    - Add entries: Patient Care, Medication Administration, Vital Signs, CPR, HIPAA Compliance, Electronic Health Records (EHR), Phlebotomy, Wound Care, Triage, Nursing Assessment, First Aid, Medical Terminology
    - File: `src/app/api/resume/parse/route.ts`
    - _Bug_Condition: isBugCondition(input) where resumeContainsNonTechSkills (healthcare)_
    - _Expected_Behavior: extractSkillsLocally SHALL return >= 1 healthcare skill_
    - _Preservation: Existing tech skill entries in skillDB must remain unchanged_
    - _Requirements: 1.1, 2.1_

  - [x] 3.3 Expand `skillDB` in `extractSkillsLocally()` with Education/Teaching skills
    - Add entries: Curriculum Development, Classroom Management, Lesson Planning, Special Education, Differentiated Instruction, Student Assessment, IEP Development, Educational Technology, Tutoring, Academic Advising
    - File: `src/app/api/resume/parse/route.ts`
    - _Bug_Condition: isBugCondition(input) where resumeContainsNonTechSkills (education)_
    - _Expected_Behavior: extractSkillsLocally SHALL return >= 1 education skill_
    - _Preservation: Existing tech skill entries in skillDB must remain unchanged_
    - _Requirements: 1.1, 2.1_

  - [x] 3.4 Expand `skillDB` in `extractSkillsLocally()` with Skilled Trades skills
    - Add entries: HVAC, Plumbing, Electrical Wiring, Blueprint Reading, Welding, Automotive Repair, Carpentry, Masonry, Safety Compliance, OSHA, Forklift Operation, CNC Machining
    - File: `src/app/api/resume/parse/route.ts`
    - _Bug_Condition: isBugCondition(input) where resumeContainsNonTechSkills (trades)_
    - _Expected_Behavior: extractSkillsLocally SHALL return >= 1 trades skill_
    - _Preservation: Existing tech skill entries in skillDB must remain unchanged_
    - _Requirements: 1.1, 2.1_

  - [x] 3.5 Expand `skillDB` in `extractSkillsLocally()` with Business/Finance skills
    - Add entries: Accounting, Bookkeeping, Financial Analysis, Budgeting, QuickBooks, Payroll, Tax Preparation, Auditing, Compliance, Financial Reporting, Accounts Payable, Accounts Receivable
    - File: `src/app/api/resume/parse/route.ts`
    - _Bug_Condition: isBugCondition(input) where resumeContainsNonTechSkills (finance)_
    - _Expected_Behavior: extractSkillsLocally SHALL return >= 1 business/finance skill_
    - _Preservation: Existing tech skill entries in skillDB must remain unchanged_
    - _Requirements: 1.1, 2.1_

  - [x] 3.6 Expand `skillDB` in `extractSkillsLocally()` with Marketing/Sales skills
    - Add entries: Digital Marketing, SEO, SEM, Social Media Marketing, Content Strategy, Copywriting, CRM (Salesforce), CRM (HubSpot), Market Research, Brand Management, Lead Generation, Email Marketing
    - File: `src/app/api/resume/parse/route.ts`
    - _Bug_Condition: isBugCondition(input) where resumeContainsNonTechSkills (marketing)_
    - _Expected_Behavior: extractSkillsLocally SHALL return >= 1 marketing skill_
    - _Preservation: Existing tech skill entries in skillDB must remain unchanged_
    - _Requirements: 1.1, 2.1_

  - [x] 3.7 Broaden AI prompt categories in `extractSkillsWithAI()`
    - Update the "SKILL CATEGORIES TO LOOK FOR" section in the user prompt to include: Culinary Arts, Healthcare/Nursing, Education/Teaching, Skilled Trades (HVAC, Plumbing, Electrical), Hospitality/Tourism, Business/Finance/Accounting, Marketing/Sales, Legal, Agriculture, Transportation/Logistics — in addition to existing tech categories
    - File: `src/app/api/resume/parse/route.ts`
    - _Bug_Condition: isBugCondition(input) where aiPromptCategories DO NOT INCLUDE non-tech categories_
    - _Expected_Behavior: AI prompt SHALL instruct Gemini to recognize non-tech skills_
    - _Preservation: Existing tech categories must remain in the prompt unchanged_
    - _Requirements: 1.2, 2.2_

  - [x] 3.8 Add conditional auto-populate logic for profile data in POST handler
    - After `extractResumeProfile()` returns data, fetch the user's existing `skill_profiles` record
    - Check if `work_experience`, `education`, and `certifications` fields are empty/null/[]
    - If empty: auto-save the extracted data from `extractResumeProfile()` to those fields
    - If not empty: do NOT overwrite (preserve manual entries)
    - File: `src/app/api/resume/parse/route.ts` (step 4 in POST handler)
    - _Bug_Condition: isBugCondition(input) where extractResumeProfile returns non-empty AND database does NOT contain that data_
    - _Expected_Behavior: empty profile fields SHALL be auto-populated from resume parse_
    - _Preservation: Non-empty profile fields (manual entries) SHALL NOT be overwritten_
    - _Requirements: 1.3, 2.3, 3.3_

  - [x] 3.9 Expand `POPULAR_ROLES` and `ROLE_EXPECTED_SKILLS` in career-goals page
    - Add to `POPULAR_ROLES`: "Chef", "Nurse", "Teacher", "Mechanic", "Electrician", "Accountant", "Marketing Manager", "Graphic Designer"
    - Add corresponding entries to `ROLE_EXPECTED_SKILLS` with >= 7 expected skills per role:
      - Chef: Culinary Arts, Food Safety, Menu Planning, Kitchen Management, HACCP, Inventory Management, Team Leadership, Time Management
      - Nurse: Patient Care, Medication Administration, Vital Signs, CPR, HIPAA Compliance, EHR, Communication, Critical Thinking
      - Teacher: Curriculum Development, Classroom Management, Lesson Planning, Student Assessment, Communication, Educational Technology, Differentiated Instruction, Patience
      - Mechanic: Automotive Repair, Diagnostics, Blueprint Reading, Electrical Systems, OSHA, Welding, Problem-Solving, Preventive Maintenance
      - Electrician: Electrical Wiring, Blueprint Reading, NEC Code, Safety Compliance, Troubleshooting, PLC Programming, Conduit Bending, Circuit Design
      - Accountant: Accounting, Financial Analysis, QuickBooks, Tax Preparation, Auditing, Excel, Budgeting, Compliance
      - Marketing Manager: Digital Marketing, SEO, Content Strategy, Social Media Marketing, Analytics, Brand Management, CRM, Market Research
      - Graphic Designer: Adobe Photoshop, Adobe Illustrator, Figma, Typography, Brand Identity, Layout Design, Color Theory, Communication
    - File: `src/app/(dashboard)/applicant/career-goals/page.tsx`
    - _Bug_Condition: isBugCondition(input) where careerGoal NOT IN POPULAR_ROLES AND is a valid non-tech role_
    - _Expected_Behavior: Non-tech roles SHALL appear in suggestions and have role readiness calculation_
    - _Preservation: Existing tech roles and their expected skills arrays must remain unchanged_
    - _Requirements: 1.4, 2.4, 3.4_

  - [x] 3.10 Sync duplicate `ROLE_EXPECTED_SKILLS` in applicant dashboard page
    - Update the `ROLE_EXPECTED_SKILLS` constant in `src/app/(dashboard)/applicant/page.tsx` to include the same non-tech roles added in task 3.9
    - OR refactor both files to import from a shared module (e.g., `src/lib/constants/roles.ts`) to prevent future drift
    - _Bug_Condition: Duplicate constants drift out of sync_
    - _Expected_Behavior: Both pages use identical role-to-skills mapping_
    - _Preservation: Existing tech role entries must remain identical_
    - _Requirements: 2.4, 3.4_

  - [x] 3.11 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Non-Tech Skills Are Extracted
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied:
      - `extractSkillsLocally()` returns >= 1 skill for culinary, healthcare, education, and trades resumes
      - `ROLE_EXPECTED_SKILLS["Chef"]`, `["Nurse"]`, `["Teacher"]`, `["Mechanic"]` are all defined with >= 5 skills
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.4_

  - [x] 3.12 Verify preservation tests still pass
    - **Property 2: Preservation** - Tech Skills and Career Goals Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm that:
      - Tech resume extraction produces identical results
      - All original tech role entries in `ROLE_EXPECTED_SKILLS` are unchanged
      - Manual profile data is not overwritten by auto-population
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4. Checkpoint - Ensure all tests pass
  - Run full test suite to confirm no regressions
  - Verify exploration test (task 1) passes on fixed code
  - Verify preservation tests (task 2) pass on fixed code
  - Verify build compiles without errors
  - Ensure all tests pass, ask the user if questions arise.
