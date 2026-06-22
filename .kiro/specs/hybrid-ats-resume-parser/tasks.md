# Implementation Plan: Hybrid ATS Resume Parser

## Overview

This implementation plan refactors the CareerFlow ATS scoring pipeline and resume parsing endpoint from an AI-primary architecture to a local-first architecture with optional AI enhancement. The plan follows a bottom-up approach: foundational NLP utilities first, then extractors, then orchestrators, then integration with existing API routes. All new modules are pure TypeScript with zero new dependencies.

## Tasks

- [x] 1. Set up NLP foundation modules
  - [x] 1.1 Implement TF-IDF Vectorizer (`src/lib/nlp/tfidf.ts`)
    - Create `src/lib/nlp/tfidf.ts` with all exported functions: `tokenize`, `computeTFIDF`, `extractKeywords`, `detectCollocations`, `buildVector`, `cosineSimilarity`
    - Implement tokenization with configurable special character preservation (`#`, `+`, `.`, `-`, `/`)
    - Implement stop word removal using a shared stop word set constant
    - Implement term frequency computation (count / total tokens)
    - Implement inverse document frequency over two-document corpus: `log(|corpus| / (1 + docsContainingTerm))`
    - Implement bigram/trigram collocation detection with min frequency threshold of 2
    - Implement `DocumentVector` construction using `Float64Array` for weights
    - Implement `cosineSimilarity` with zero-magnitude guard and clamping to [0, 1]
    - Export `TFIDFOptions`, `DocumentVector`, `KeywordResult` interfaces
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.8_

  - [x] 1.2 Write property tests for TF-IDF module
    - **Property 6: Cosine Similarity Symmetry** — For all vectors vecA and vecB: `cosineSimilarity(a, b) === cosineSimilarity(b, a)`
    - **Property 7: Cosine Similarity Identity** — For all non-zero vectors vec: `cosineSimilarity(vec, vec) === 1.0`
    - **Property 8: Bounded Keyword Output** — For all text and options: `extractKeywords(text, options).length <= options.maxKeywords`
    - **Validates: Requirements 1.2, 1.3, 2.2, 9.3**

  - [x] 1.3 Implement Skills Taxonomy (`src/lib/nlp/skills-taxonomy.ts`)
    - Create `src/lib/nlp/skills-taxonomy.ts` with static `SKILLS_TAXONOMY` array of 200+ skill entries
    - Define `SkillEntry`, `SkillCategory`, `IndustryId` types
    - Pre-build `LOOKUP_MAP` (Map<lowercaseName, SkillEntry>) at module load time for O(1) lookups
    - Implement `lookupSkill`, `canonicalize`, `areSynonyms`, `getByCategory`, `getTaxonomySize` functions
    - Include entries across all 8 industry categories: software-engineering, data-science, devops, finance, healthcare, cybersecurity, mobile-development, game-development
    - Cover major skills: programming languages (Python, JavaScript, TypeScript, Java, Go, Rust, C#, C++, etc.), frameworks (React, Angular, Vue, Next.js, Django, Spring, etc.), cloud platforms (AWS, Azure, GCP), databases (PostgreSQL, MongoDB, Redis, etc.), DevOps (Docker, Kubernetes, Terraform, etc.), and more
    - _Requirements: 12.1, 12.2, 12.3, 12.5, 12.7, 12.8_

  - [ ]* 1.4 Write property tests for Skills Taxonomy
    - **Property 5: Synonym Resolution** — For all skillName in taxonomy synonyms: `canonicalize(skillName) === taxonomy.canonical`
    - **Validates: Requirements 12.2, 12.3, 12.4**

- [x] 2. Checkpoint - Ensure NLP foundation tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Implement resume parsing extractors
  - [x] 3.1 Implement Section Detector (`src/lib/resume-parser/section-detector.ts`)
    - Create `src/lib/resume-parser/section-detector.ts`
    - Define `SectionType`, `DetectedSection`, `SectionDetectionResult` types
    - Implement 5-priority header pattern recognition: (1) uppercase + underline, (2) uppercase standalone, (3) title-case + blank line, (4) title-case + colon, (5) inline keyword
    - Implement section type keyword alias mapping (case-insensitive): experience, education, skills, certifications, projects, achievements
    - Implement `detectSections` function that assigns text between headers to preceding section
    - Handle pre-header text as "header-contact" section
    - Handle no-header resumes as "unstructured" single section
    - Implement `getSectionContent` helper function
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [x] 3.2 Write property test for Section Detector
    - **Property 3: Section Coverage** — For all text: `detectSections(text).sections` covers every line exactly once (no gaps, no overlaps)
    - **Validates: Requirements 3.4, 3.5, 3.6**

  - [x] 3.3 Implement Experience Extractor (`src/lib/resume-parser/experience-extractor.ts`)
    - Create `src/lib/resume-parser/experience-extractor.ts`
    - Define `WorkExperienceEntry` interface
    - Implement date pattern detection supporting multiple formats: "Jan 2022 - Present", "2020 - 2023", "March 2021 – December 2022"
    - Implement title/organization separation using delimiters: " - ", " | ", " at ", comma + capitalized word
    - Implement bullet point capture (•, -, *, numbered) with 200-char max
    - Mark current positions via "Present" or "Current" keywords
    - Cap at 20 entries, 20 bullets per entry
    - Handle undetectable entries gracefully (skip lines without date patterns)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [x] 3.4 Implement Education Extractor (`src/lib/resume-parser/education-extractor.ts`)
    - Create `src/lib/resume-parser/education-extractor.ts`
    - Define `EducationEntry` interface
    - Implement degree keyword detection: Bachelor, Master, Ph.D., B.S., M.S., M.A., B.A., Associate, Diploma, Doctor
    - Parse date ranges to extract graduation year (end year)
    - Implement degree/institution splitting using delimiters (dash, comma, pipe, "at"/"from")
    - Handle missing fields gracefully (empty string, not undefined)
    - Cap at 20 entries
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.7_

  - [x] 3.5 Implement Skills Extractor (`src/lib/resume-parser/skills-extractor.ts`)
    - Create `src/lib/resume-parser/skills-extractor.ts`
    - Define `ExtractedSkill`, `CertificationEntry`, `SkillsExtractionInput` interfaces
    - Parse comma-separated, pipe-separated, bullet-point, and categorized skill lists
    - Implement proficiency assignment: advanced (experience/projects with quantified achievements), intermediate (skills section), beginner (certifications only)
    - Implement proficiency promotion when skill appears in multiple sections (highest wins)
    - Canonicalize skill names via skills taxonomy lookup, preserving rawName
    - Implement `extractCertifications` for certification entries
    - Cap at 100 skills, 50 certifications
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.7_

  - [x] 3.6 Write unit tests for resume parsing extractors
    - Test section detection with various header formats
    - Test experience extraction with multiple date formats and delimiters
    - Test education extraction with degree keyword variants
    - Test skills extraction with proficiency assignment and taxonomy canonicalization
    - Test edge cases: empty sections, no headers, missing delimiters
    - _Requirements: 3.1–3.7, 4.1–4.7, 5.1–5.7, 6.1–6.7_

- [x] 4. Checkpoint - Ensure resume parser extractor tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement Resume Parser Orchestrator and ATS Scorer
  - [x] 5.1 Implement Resume Parser Orchestrator (`src/lib/resume-parser/index.ts`)
    - Create `src/lib/resume-parser/index.ts`
    - Define `StructuredProfile`, `ProjectEntry`, `ParseOptions` interfaces
    - Implement `parseResumeLocal` function: section detection → per-section extraction → taxonomy canonicalization
    - Implement `parseResume` async function: local parse → optional AI enhancement → additive merge
    - Ensure output is JSON-safe: no undefined values (use null), no Date objects, no functions, no Infinity/NaN
    - Ensure all text fields are trimmed and control characters stripped (except \n in highlights)
    - Ensure round-trip consistency: `JSON.parse(JSON.stringify(profile))` === profile
    - Enforce max limits: experience ≤ 20, education ≤ 20, skills ≤ 100, certifications ≤ 50
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [ ]* 5.2 Write property test for round-trip serialization
    - **Property 4: Round-Trip Serialization** — For all profile in StructuredProfile: `deepEqual(JSON.parse(JSON.stringify(profile)), profile)`
    - **Validates: Requirements 8.1, 8.4, 8.5**

  - [x] 5.3 Implement Multi-Dimensional ATS Scorer
    - Refactor `src/lib/career-intelligence/ats-scorer.ts` to use local TF-IDF pipeline as primary
    - Implement `computeDimensions` function with all 5 dimensions:
      - Keyword Match (40% weight): TF-IDF cosine similarity percentage
      - Section Completeness (15% weight): 5 expected sections × 20 points each
      - Experience Quality (20% weight): 50% quantified achievements + 30% action verbs + 20% recency
      - Education Relevance (15% weight): degree field alignment to job domain
      - Formatting (10% weight): deduction-based from 100 base
    - Implement `computeCompositeScore` with weighted average formula
    - Implement keyword matching using skills taxonomy for synonym resolution (matchType: "synonym")
    - Maintain existing `calculateATSScore` function signature (backward compatible)
    - Support `fallbackKeywords` parameter: use provided keywords when source is 'local'
    - Add optional `dimensions` field to ATSScoreResult when `includeDimensions` is true
    - Ensure score is deterministic when enhancement is disabled
    - Ensure score is clamped to integer in [0, 100]
    - _Requirements: 1.1–1.6, 2.1–2.8, 9.1–9.5, 10.1, 10.2, 10.5, 11.1–11.8, 12.2, 12.3, 12.6_

  - [ ]* 5.4 Write property tests for ATS scoring
    - **Property 1: Score Clamping** — For all resumeText and jobDescription: score is an integer in [0, 100]
    - **Property 9: Scoring Determinism** — Same inputs with enhancement disabled produce identical scores
    - **Property 11: Composite Score Formula** — `computeCompositeScore(dimensions) === round(KM*0.4 + SC*0.15 + EQ*0.2 + ER*0.15 + F*0.1)`
    - **Validates: Requirements 9.1, 9.5, 11.6**

- [x] 6. Checkpoint - Ensure ATS scorer and parser orchestrator tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement AI Enhancement Layer
  - [x] 7.1 Implement Groq Provider (`src/lib/llm/groq-provider.ts`)
    - Create `src/lib/llm/groq-provider.ts`
    - Implement `callGroq` function using native `fetch` with OpenAI-compatible endpoint
    - Authenticate via `GROQ_API_KEY` environment variable
    - Use Llama 3.3 70B model with JSON response format and low temperature
    - Enforce 10-second timeout using `AbortController`
    - Implement typed error handling: rate_limit (429), auth_error (401/403), timeout, parse_error
    - Add `'groq'` to `LLMProvider` union type in `src/lib/llm/types.ts`
    - _Requirements: 7.7_

  - [x] 7.2 Implement Enhancement Orchestrator
    - Add enhancement logic within `src/lib/career-intelligence/ats-scorer.ts`
    - Implement `isEnhancementAvailable` with per-calendar-hour quota suppression
    - Implement `recordQuotaExceeded` that suppresses until start of next calendar hour
    - Implement provider chain: Gemini → OpenAI → Groq → local-only fallback
    - Implement `enhanceATSResults` for additive-only ATS enhancement (never remove local matches)
    - Implement `mergeEnhancement` ensuring merged matches are superset of local matches
    - Ensure all AI failures are silently absorbed — caller never sees AI errors
    - Set `analysisSource` to 'llm' only if AI added new matches
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.8_

  - [ ]* 7.3 Write property tests for Enhancement Layer
    - **Property 2: Enhancement Additivity** — `localScore(r, jd) <= enhancedScore(r, jd)`
    - **Property 10: Additive Merge Invariant** — `mergeEnhancement(local, ai).matchedKeywords.length >= local.matchedKeywords.length`
    - **Validates: Requirements 7.3, 9.4**

  - [ ]* 7.4 Write unit tests for Groq Provider
    - Test successful API call with mocked fetch
    - Test 429 rate limit error handling
    - Test 401/403 auth error handling
    - Test timeout behavior with AbortController
    - Test malformed response handling
    - _Requirements: 7.7_

- [x] 8. Checkpoint - Ensure enhancement layer tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Integration and API wiring
  - [x] 9.1 Refactor `/api/resume/parse` endpoint
    - Update `src/app/api/resume/parse/route.ts` to use new `parseResume` orchestrator
    - Maintain existing request format: `{ file_path: string, user_id: string }`
    - Maintain existing response shape: `{ success, skills, profile, raw_text, error }`
    - Integrate enhancement layer with proper error suppression
    - Continue persisting to `skill_profiles` and `skills` tables using existing schema
    - Maintain existing HTTP error codes: 400, 404, 422, 500
    - _Requirements: 10.3, 10.4, 10.6_

  - [x] 9.2 Wire `calculateATSScore` to use local-first pipeline
    - Ensure `calculateATSScore` runs local TF-IDF pipeline first, then enhancement
    - Wire skills taxonomy synonym resolution into keyword matching
    - Ensure `fallbackKeywords` parameter works correctly
    - Ensure backward-compatible response shape is maintained
    - Set `analysisSource` correctly based on whether AI contributed
    - _Requirements: 10.1, 10.2, 10.5_

  - [ ]* 9.3 Write integration tests for full pipeline
    - Test end-to-end ATS scoring with sample resume/JD pairs
    - Test full resume parse pipeline with sample resume text
    - Test enhancement layer with mocked AI responses (additive-only verification)
    - Test backward compatibility: verify existing response shapes are preserved
    - Test graceful degradation when all AI providers fail
    - _Requirements: 10.1–10.6, 7.5, 7.6_

- [x] 10. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document using fast-check
- Unit tests validate specific examples and edge cases
- All new modules are pure TypeScript with zero npm additions — TF-IDF is implemented as ~200 lines of math
- The skills taxonomy is a static constant compiled into the bundle — no runtime I/O
- Enhancement layer uses "never fail, always degrade" strategy — AI errors are silently absorbed
- Existing `calculateATSScore` signature and `/api/resume/parse` endpoint shape are preserved exactly

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.3"] },
    { "id": 1, "tasks": ["1.2", "1.4", "3.1"] },
    { "id": 2, "tasks": ["3.2", "3.3", "3.4", "3.5"] },
    { "id": 3, "tasks": ["3.6", "5.1"] },
    { "id": 4, "tasks": ["5.2", "5.3"] },
    { "id": 5, "tasks": ["5.4", "7.1"] },
    { "id": 6, "tasks": ["7.2"] },
    { "id": 7, "tasks": ["7.3", "7.4"] },
    { "id": 8, "tasks": ["9.1", "9.2"] },
    { "id": 9, "tasks": ["9.3"] }
  ]
}
```
