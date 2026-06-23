# Resume Universal Role Parsing Bugfix Design

## Overview

The resume parsing system is exclusively designed for tech roles, causing non-tech applicants (chefs, nurses, teachers, mechanics, etc.) to receive zero extracted skills from the local fallback, biased AI extraction, no auto-population of profile data, and zero career goal matches. This fix expands the skill database, AI prompt categories, profile auto-save logic, and career goals data to support all industries while preserving existing tech-role functionality.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug — when a non-tech resume is uploaded or a non-tech career goal is selected, the system fails to extract skills, populate profile data, or calculate role readiness
- **Property (P)**: The desired behavior — non-tech skills are extracted accurately, profile data is auto-saved, and career goals support all industries
- **Preservation**: Existing tech skill extraction, AI parsing pipeline, manual profile entry, tech role readiness calculations, and database persistence must remain unchanged
- **extractSkillsLocally()**: The fallback function in `src/app/api/resume/parse/route.ts` that pattern-matches skills from resume text when AI extraction fails — currently only contains tech skills in its `skillDB`
- **extractSkillsWithAI()**: The function in `src/app/api/resume/parse/route.ts` that calls Gemini to extract skills — currently prompts with only tech-oriented categories
- **extractResumeProfile()**: The function in `src/app/api/resume/parse/route.ts` that extracts structured profile data (experience, education, certifications) — currently not saved to database
- **POPULAR_ROLES**: The constant in `career-goals/page.tsx` listing suggested career roles — currently tech-only
- **ROLE_EXPECTED_SKILLS**: The constant in `career-goals/page.tsx` and `applicant/page.tsx` mapping roles to expected skills — currently tech-only

## Bug Details

### Bug Condition

The bug manifests when an applicant with a non-tech background (culinary, healthcare, education, trades, hospitality, etc.) interacts with the system in four distinct ways: uploading a resume, receiving AI-based extraction, expecting profile auto-population, or selecting career goals. The system is unable to recognize, extract, or match non-tech skills and roles.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { resumeText: string, careerGoal: string, aiExtractionResult: Skill[] }
  OUTPUT: boolean
  
  CASE 1 - Local Fallback Failure:
    RETURN input.aiExtractionResult.length == 0
           AND resumeContainsNonTechSkills(input.resumeText)
           AND extractSkillsLocally(input.resumeText).length == 0

  CASE 2 - AI Prompt Bias:
    RETURN resumeContainsNonTechSkills(input.resumeText)
           AND aiPromptCategories DO NOT INCLUDE non-tech categories

  CASE 3 - Profile Not Auto-Saved:
    RETURN extractResumeProfile(input.resumeText) returns non-empty data
           AND database skill_profiles record does NOT contain work_experience/education/certifications from parse

  CASE 4 - Career Goals Gap:
    RETURN input.careerGoal NOT IN POPULAR_ROLES
           AND input.careerGoal IS a valid non-tech role (Chef, Nurse, Teacher, Mechanic, etc.)
           AND ROLE_EXPECTED_SKILLS[input.careerGoal] == undefined
END FUNCTION
```

### Examples

- **Chef uploads resume**: Resume contains "culinary arts, food safety, menu planning, kitchen management" → AI extraction biased toward tech → local fallback finds 0 skills because `skillDB` has no culinary entries → applicant sees empty skill profile
- **Nurse uploads resume**: Resume contains "patient care, medication administration, vital signs, CPR certified" → same pipeline failure → 0 skills extracted
- **Teacher uploads resume**: Resume lists "curriculum development, classroom management, lesson planning, special education" → 0 skills found
- **Any applicant with work experience**: `extractResumeProfile()` successfully parses 3 jobs and 2 education entries → only `resume_file_path` and `raw_resume_text` saved → work experience / education sections remain empty in profile
- **Mechanic selects career goal**: Types "Mechanic" in career goals → no match in POPULAR_ROLES → no entry in ROLE_EXPECTED_SKILLS → no role readiness calculation shown

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Tech skill extraction via AI (Gemini) must continue to return accurate tech skills with correct proficiency levels
- Tech skill extraction via local fallback must continue to match all existing `skillDB` entries (programming languages, frameworks, databases, DevOps, etc.)
- The existing database schema (`skill_profiles`, `skills`, `match_results` tables) must not be altered in ways that break existing records
- Mouse/manual interactions on Career Goals and Profile pages must continue functioning identically
- The resume upload flow (file validation, storage upload, text extraction, skill insertion, match calculation) must remain intact
- Manually entered work experience, education, and certifications must NOT be overwritten by auto-population from resume parsing
- Existing tech roles in POPULAR_ROLES and ROLE_EXPECTED_SKILLS must retain their exact skill lists

**Scope:**
All inputs that involve tech-only resumes, tech career goals, and manual profile entry should be completely unaffected by this fix. This includes:
- Uploading a resume with exclusively tech skills (JavaScript, Python, React, etc.)
- Selecting existing tech roles (Software Developer, Data Analyst, etc.)
- Manually adding work experience, education, and certifications via the Profile page
- All HR dashboard functionality

## Hypothesized Root Cause

Based on the bug description and code analysis, the root causes are:

1. **Tech-Only Local Skill Database**: The `skillDB` array in `extractSkillsLocally()` (line ~765+ in route.ts) contains only tech-related entries: programming languages, frontend/backend frameworks, AI/ML tools, databases, DevOps tools, design tools, testing, and soft skills. There are zero entries for culinary, healthcare, education, trades, hospitality, finance, or any other non-tech industry.

2. **Tech-Biased AI Prompt**: The `extractSkillsWithAI()` function's user prompt lists "SKILL CATEGORIES TO LOOK FOR" as exclusively tech-oriented: "Programming languages, Frontend frameworks, Backend frameworks, AI/ML tools, Databases, DevOps/Cloud, Design tools, Testing, Soft skills, Other tools." This biases Gemini to ignore non-tech professional skills even when present in the resume text.

3. **Profile Data Not Persisted**: In the POST handler (step 4), the upsert to `skill_profiles` explicitly only saves `resume_file_path` and `raw_resume_text`. The comment states "Work experience, education, and certifications are entered manually by the user." The `extractResumeProfile()` result is returned in the response but never written to the database.

4. **Hardcoded Tech-Only Career Goals**: The `POPULAR_ROLES` array contains only 10 tech roles. The `ROLE_EXPECTED_SKILLS` object maps only those 10 tech roles to expected skills. This is duplicated in both `career-goals/page.tsx` and `applicant/page.tsx`.

## Correctness Properties

Property 1: Bug Condition - Non-Tech Skills Are Extracted

_For any_ resume text containing non-tech professional skills (culinary, healthcare, education, trades, hospitality, finance, marketing) where the AI extraction fails or returns 0 skills, the fixed `extractSkillsLocally()` function SHALL extract at least one relevant skill from the expanded skill database, and when AI extraction is active, the updated prompt SHALL instruct Gemini to recognize and extract non-tech skills with the same accuracy as tech skills.

**Validates: Requirements 2.1, 2.2**

Property 2: Bug Condition - Profile Auto-Population

_For any_ resume parse operation where `extractResumeProfile()` returns non-empty work experience, education, or certifications data AND the user's existing profile does NOT already have manually-entered data in those sections, the fixed system SHALL auto-save the extracted profile data to the `skill_profiles` database record.

**Validates: Requirements 2.3**

Property 3: Bug Condition - Non-Tech Career Goal Support

_For any_ career goal input that is a valid non-tech role (Chef, Nurse, Teacher, Mechanic, Electrician, etc.), the fixed system SHALL display that role in popular suggestions AND SHALL calculate role readiness using a defined set of expected skills for that role.

**Validates: Requirements 2.4**

Property 4: Preservation - Tech Skill Extraction Unchanged

_For any_ resume text containing tech skills (programming languages, frameworks, databases, DevOps) processed through the extraction pipeline, the fixed system SHALL produce the same set of extracted skills with the same proficiency assessments as the original system, preserving full backward compatibility for tech resumes.

**Validates: Requirements 3.1, 3.2, 3.5**

Property 5: Preservation - Manual Profile Data Not Overwritten

_For any_ user who has manually entered work experience, education, or certifications prior to uploading a resume, the fixed auto-population logic SHALL NOT overwrite those existing manual entries, preserving user-entered data.

**Validates: Requirements 3.3**

Property 6: Preservation - Tech Career Goals Unchanged

_For any_ user selecting a tech role (Software Developer, Data Analyst, Cybersecurity, etc.) on the Career Goals page, the fixed system SHALL display the same expected skills and calculate the same role readiness percentage as the original system.

**Validates: Requirements 3.4**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `src/app/api/resume/parse/route.ts`

**Function**: `extractSkillsLocally()` — Expand `skillDB`

**Specific Changes**:
1. **Add Culinary/Hospitality Skills**: Add entries for food safety, menu planning, kitchen management, HACCP, ServSafe, pastry arts, catering, hospitality management, event planning, front-of-house, POS systems
2. **Add Healthcare/Nursing Skills**: Add entries for patient care, medication administration, vital signs, CPR, HIPAA compliance, electronic health records (EHR), phlebotomy, wound care, triage, nursing assessment
3. **Add Education/Teaching Skills**: Add entries for curriculum development, classroom management, lesson planning, special education, differentiated instruction, student assessment, IEP development, educational technology
4. **Add Skilled Trades Skills**: Add entries for HVAC, plumbing, electrical wiring, blueprint reading, welding, automotive repair, carpentry, masonry, safety compliance, OSHA
5. **Add Business/Finance Skills**: Add entries for accounting, bookkeeping, financial analysis, budgeting, QuickBooks, payroll, tax preparation, auditing, compliance
6. **Add Marketing/Sales Skills**: Add entries for digital marketing, SEO, SEM, social media marketing, content strategy, copywriting, CRM (Salesforce, HubSpot), market research, brand management

**Function**: `extractSkillsWithAI()` — Expand AI prompt

**Specific Changes**:
7. **Broaden SKILL CATEGORIES**: Update the user prompt's "SKILL CATEGORIES TO LOOK FOR" section to include: Culinary Arts, Healthcare/Nursing, Education/Teaching, Skilled Trades, Hospitality/Tourism, Business/Finance, Marketing/Sales, Legal, Agriculture, Transportation/Logistics, in addition to existing tech categories

**Function**: `POST handler` (step 4) — Auto-save profile data

**Specific Changes**:
8. **Conditionally Auto-Populate**: After `extractResumeProfile()`, check if the user's existing `skill_profiles` record has empty `work_experience`, `education`, and `certifications` fields. If empty (or null/[]), auto-save the extracted data. If fields already have data, do NOT overwrite (preserving manual entries).

**File**: `src/app/(dashboard)/applicant/career-goals/page.tsx`

**Constants**: `POPULAR_ROLES` and `ROLE_EXPECTED_SKILLS`

**Specific Changes**:
9. **Expand POPULAR_ROLES**: Add non-tech roles: "Chef", "Nurse", "Teacher", "Mechanic", "Electrician", "Accountant", "Marketing Manager", "Graphic Designer" (or a curated cross-industry selection)
10. **Expand ROLE_EXPECTED_SKILLS**: Add corresponding expected skill arrays for each new role

**File**: `src/app/(dashboard)/applicant/page.tsx`

**Constants**: Duplicate `ROLE_EXPECTED_SKILLS`

**Specific Changes**:
11. **Sync with career-goals page**: Update the duplicate `ROLE_EXPECTED_SKILLS` to include the same non-tech roles, OR refactor to import from a shared module to avoid future drift

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that simulate resume text containing non-tech skills being processed through `extractSkillsLocally()` and verify that zero skills are returned. Also test that `ROLE_EXPECTED_SKILLS` returns undefined for non-tech roles. Run these tests on the UNFIXED code to observe failures.

**Test Cases**:
1. **Chef Resume Local Extraction**: Pass resume text containing "culinary arts, food safety, menu planning" to `extractSkillsLocally()` → expect 0 skills returned (will fail on unfixed code)
2. **Nurse Resume Local Extraction**: Pass resume text containing "patient care, CPR, medication administration" to `extractSkillsLocally()` → expect 0 skills returned (will fail on unfixed code)
3. **Teacher Resume Local Extraction**: Pass resume text containing "curriculum development, classroom management, lesson planning" → expect 0 skills (will fail on unfixed code)
4. **Non-Tech Career Goal Lookup**: Access `ROLE_EXPECTED_SKILLS["Chef"]` → expect undefined (will fail on unfixed code)
5. **Profile Auto-Save Check**: After `extractResumeProfile()` returns data, check `skill_profiles` record → expect work_experience remains null (will fail on unfixed code)

**Expected Counterexamples**:
- `extractSkillsLocally("experienced chef with culinary arts and food safety certification")` returns `[]`
- `ROLE_EXPECTED_SKILLS["Nurse"]` returns `undefined`
- Possible causes: skillDB contains zero non-tech entries, ROLE_EXPECTED_SKILLS is hardcoded to 10 tech roles only

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL resumeText WHERE containsNonTechSkills(resumeText) DO
  result := extractSkillsLocally_fixed(resumeText)
  ASSERT result.length > 0
  ASSERT each skill in result is relevant to the resume content
END FOR

FOR ALL role WHERE role IN nonTechRoles DO
  ASSERT ROLE_EXPECTED_SKILLS_fixed[role] IS defined
  ASSERT ROLE_EXPECTED_SKILLS_fixed[role].length >= 5
END FOR

FOR ALL parseResult WHERE extractResumeProfile returns non-empty AND user has no existing manual data DO
  ASSERT skill_profiles.work_experience IS populated after fix
  ASSERT skill_profiles.education IS populated after fix
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL resumeText WHERE containsOnlyTechSkills(resumeText) DO
  ASSERT extractSkillsLocally_original(resumeText) = extractSkillsLocally_fixed(resumeText)
END FOR

FOR ALL role WHERE role IN originalTechRoles DO
  ASSERT ROLE_EXPECTED_SKILLS_original[role] = ROLE_EXPECTED_SKILLS_fixed[role]
END FOR

FOR ALL user WHERE user.work_experience IS NOT empty DO
  ASSERT after resume parse, user.work_experience is unchanged
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain (random tech resume texts)
- It catches edge cases that manual unit tests might miss (skill name collisions between tech and non-tech)
- It provides strong guarantees that behavior is unchanged for all tech-related inputs

**Test Plan**: Observe behavior on UNFIXED code first for tech resumes and tech career goals, then write property-based tests capturing that behavior. Specifically, snapshot the output of `extractSkillsLocally()` for a set of tech resume samples and assert the fixed version produces identical output.

**Test Cases**:
1. **Tech Resume Preservation**: Verify that a resume containing "JavaScript, React, Python, Docker" extracts the same skills with the same proficiency levels on both unfixed and fixed code
2. **Tech Career Goal Preservation**: Verify `ROLE_EXPECTED_SKILLS["Software Developer"]` returns the exact same array as before
3. **Manual Data Preservation**: Verify that a user with existing work_experience entries does not have those entries overwritten after resume upload
4. **Existing Pipeline Preservation**: Verify the full parse flow (upload → extract text → AI/fallback → save skills → trigger matches) continues to work for tech resumes

### Unit Tests

- Test `extractSkillsLocally()` with non-tech resume samples (culinary, healthcare, education, trades) — expect skills found
- Test `extractSkillsLocally()` with tech resume samples — expect identical results to current code
- Test profile auto-save logic: empty profile gets populated, non-empty profile is preserved
- Test `ROLE_EXPECTED_SKILLS` contains entries for all new non-tech roles
- Test edge cases: resume with mixed tech and non-tech skills extracts both categories

### Property-Based Tests

- Generate random resume text containing skills from the expanded `skillDB` and verify `extractSkillsLocally()` extracts at least one matching skill
- Generate random tech resume text from existing `skillDB` entries and verify the fixed function produces identical output to the original
- Generate random combinations of existing/empty profile fields and verify auto-population logic only fills empty fields
- Generate random career goal strings from the expanded `POPULAR_ROLES` and verify `ROLE_EXPECTED_SKILLS` returns a non-empty array

### Integration Tests

- Full flow: upload a non-tech resume (PDF with culinary skills) → verify skills appear in database and match calculation runs
- Full flow: upload a tech resume → verify results are identical to current behavior
- Career goals: select "Nurse" → verify role readiness calculation appears with relevant expected skills
- Profile page: verify auto-populated work experience appears after resume upload for a new user
- Profile page: verify manually entered data is NOT replaced after re-uploading a resume
