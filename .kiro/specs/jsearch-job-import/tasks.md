# Implementation Plan: JSearch Job Import & Career Intelligence

## Overview

This implementation plan covers the full CareerFlow feature set: importing real job listings from external APIs (JSearch/Indeed via RapidAPI), enriching them with LLM-powered skill extraction, and providing intelligent career insights. The system uses a multi-provider LLM service (OpenAI, Gemini, LLM7) with cascading fallback and DB-backed caching for four key LLM operations (skill extraction, proficiency analysis, ATS keyword extraction, ATS intelligent matching + suggestions), while gracefully degrading to local algorithms when LLM is unavailable. All other intelligence features (Hidden Gem, Skill ROI, Candidate Scorer, Pipeline Health) remain pure local algorithms.

## Tasks

- [x] 1. Database schema and core types
  - [x] 1.1 Create database migration for new tables and extended columns
    - Create SQL migration file at `src/lib/db/migrations/` adding: `api_response_cache`, `api_rate_limits`, `skill_difficulty_catalog`, `applications`, and `llm_results_cache` tables
    - `llm_results_cache` table: id (uuid PK), cache_key (text NOT NULL), operation_type (text NOT NULL — values: 'skill_extraction', 'proficiency_analysis', 'ats_keywords', 'ats_analysis'), source_id (uuid NULL FK), source_hash (text NOT NULL), result_json (jsonb NOT NULL), provider (text NOT NULL), created_at, updated_at
    - Unique constraint on `llm_results_cache`: `(cache_key, operation_type)`
    - Index: `idx_llm_cache_source` on `(source_id, operation_type)`
    - Add extended columns to `job_descriptions`: `external_job_id`, `source`, `source_company`, `job_link`, `salary_min`, `salary_max`, `salary_currency`, `salary_period`, `employment_type`, `location_city`, `location_state`, `highlights`, `imported_at`
    - Add extended columns to `skill_profiles`: `total_years_experience`, `work_experience`, `education`, `certifications`, `external_urls`, `work_preferences`
    - Add extended columns to `skills`: `last_used_at`, `added_at`
    - Add unique constraints: `(query, location, api_source)` on `api_response_cache`, `(applicant_id, job_description_id)` on `applications`
    - _Requirements: 2.1, 3.1, 3.5, 3.6, 6.1, 19.1, 19.6, 20.2_

  - [x] 1.2 Create TypeScript interfaces and types for the import system
    - Create `src/lib/import/types.ts` with interfaces: `ImportOptions`, `ImportResult`, `JSearchJob`, `JSearchResponse`, `CachedResponse`, `RateLimitStatus`, `ExtractedSkill`, `SkillExtractionSource`, `SkillExtractionResult`
    - Create `src/lib/career-intelligence/types.ts` with interfaces: `ProficiencyResult`, `ProficiencyAnalysisSource`, `ProficiencyBatchResult`, `ATSScoreResult`, `ATSKeywordMatch`, `ATSSuggestion`, `CachedKeywords`, `CachedATSAnalysis`, `HiddenGemResult`, `SkillROIResult`, `CandidateScore`, `AtRiskStatus`
    - `ATSKeywordMatch`: keyword (string), matchedText (string), matchType ('exact' | 'synonym' | 'contextual')
    - `ATSSuggestion`: keyword (string), section (string), suggestion (string), impact ('high' | 'medium' | 'low')
    - `CachedATSAnalysis`: matchedKeywords (ATSKeywordMatch[]), missingKeywords (string[]), suggestions (ATSSuggestion[]), analysisSource ('llm' | 'local')
    - Create `src/lib/llm/types.ts` with interfaces: `LLMProvider`, `LLMConfig`, `LLMRequest`, `LLMResponse`, `LLMError`, `LLMUnavailableError`
    - _Requirements: 1.3, 3.1, 9.5, 4.1, 11.1, 12.2, 12.5_

- [x] 2. LLM Service — provider-agnostic abstraction with fallback and caching
  - [x] 2.1 Implement the LLM Service core and provider adapters
    - Create `src/lib/llm/llm-service.ts` implementing `complete()` and `completeWithCache()`
    - Implement cascading fallback logic: try primary provider (default: OpenAI) → if rate limited, auth error, or timeout → try next fallback (Gemini) → then LLM7
    - Implement `callOpenAI()`, `callGemini()`, `callLLM7()` provider adapters
    - Always request structured JSON responses with temperature 0.1 for deterministic outputs
    - Per-request timeout of 30000ms, maxRetries of 1 per provider
    - Throw `LLMUnavailableError` when all providers fail (callers handle graceful degradation)
    - Read `OPENAI_API_KEY`, `GEMINI_API_KEY`, `LLM7_TOKEN` from environment
    - _Requirements: 4.1, 11.1, 12.2_

  - [x] 2.2 Implement LLM result caching layer
    - Implement `completeWithCache()` that checks `llm_results_cache` table before making LLM call
    - Cache key: hash of input text + operation type
    - Store `source_hash` (SHA-256 of source text) to detect changes for invalidation
    - On cache hit with matching `source_hash`: return cached result (no LLM call)
    - On cache miss or `source_hash` mismatch: make fresh LLM call, store/update result in cache
    - Support new operation_type `'ats_analysis'` keyed by `resume_hash + job_id`
    - _Requirements: 4.1, 11.1, 12.2, 12.7_

  - [x] 2.3 Write property tests for LLM Service
    - **Property 15: LLM Provider Fallback Correctness** — verify fallback sequence when primary fails
    - **Property 16: LLM Result Cache Idempotence** — verify identical inputs return cached result without new LLM call
    - **Property 18: LLM Cache Invalidation on Source Change** — verify stale cache is refreshed when source hash changes
    - **Property 19: LLM Response JSON Parsing Robustness** — verify malformed responses trigger local fallback
    - **Validates: Requirements 4.1, 11.1, 12.2**

- [x] 3. Import service core — rate limiter and response cache
  - [x] 3.1 Implement the Rate Limiter service
    - Create `src/lib/import/rate-limiter.ts` implementing `checkRateLimit()`, `incrementRequestCount()`, `resetIfNewMonth()`
    - Track monthly request count in `api_rate_limits` table
    - Return warning when count >= 180 (90% of 200 limit)
    - Reject requests when count >= 200
    - Reset counter when calendar month changes
    - Fail open with warning if database is unreachable
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 3.2 Write property tests for Rate Limiter
    - **Property 5: Rate Limit Enforcement** — verify rejection at >= 200 and warning at >= 180
    - **Property 6: Rate Limit Monthly Reset** — verify counter resets on new calendar month
    - **Validates: Requirements 6.2, 6.3, 6.4**

  - [x] 3.3 Implement the Response Cache service
    - Create `src/lib/import/response-cache.ts` implementing `getCachedResponse()`, `storeCachedResponse()`
    - Query `api_response_cache` table by query, location, and api_source
    - Store complete raw JSON response with timestamp
    - Support force refresh by bypassing cache read
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 3.4 Write property test for Response Cache
    - **Property 1: Cache Round-Trip Preservation** — verify storing and retrieving produces JSON-equal data
    - **Validates: Requirements 2.1, 2.4**

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. JSearch API client and deduplication
  - [x] 5.1 Implement the JSearch API client
    - Create `src/lib/import/jsearch-client.ts` implementing `fetchJobs()`
    - Send GET request to `jobs-api14.p.rapidapi.com` with `x-rapidapi-key` and `x-rapidapi-host` headers
    - Include Philippines locality filters and search query as params
    - Validate RAPIDAPI_KEY env var is present before making requests
    - Handle error responses and timeouts gracefully, returning descriptive error messages
    - Maximize results per request using API pagination parameters
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x] 5.2 Implement the Deduplication Checker
    - Create `src/lib/import/deduplication.ts` implementing `findExistingExternalIds()` and `isNewJob()`
    - Query `job_descriptions` table for existing `external_job_id` values
    - Return a Set of already-imported external IDs for O(1) lookup
    - _Requirements: 5.1, 5.2_

  - [x] 5.3 Write property test for Import Idempotence
    - **Property 3: Import Idempotence** — verify importing the same set twice produces no new records on second run
    - **Property 4: Import Count Invariant** — verify importedCount + skippedDuplicates = total jobs
    - **Validates: Requirements 5.1, 5.2, 5.3, 9.5**

- [x] 6. Skill Extractor (LLM primary, local fallback)
  - [x] 6.1 Implement the Skill Extractor service with LLM integration
    - Create `src/lib/import/skill-extractor.ts` implementing `extractSkillsFromJob()` and `extractSkillsLocal()`
    - Primary path: call LLM Service with structured prompt to extract skills with contextual understanding (importance classification: "required" vs "preferred")
    - Use `completeWithCache()` with cache key based on job description hash + "skill_extraction" operation type
    - Parse LLM JSON response into `ExtractedSkill[]` array
    - If LLM response is malformed JSON, fall back to local extraction
    - Fallback path: local keyword matching using the existing synonym map (analyze description, qualifications, highlights for skill mentions)
    - Normalize all skill names using the synonym map regardless of extraction method
    - Insert extracted skills into `job_required_skills` table
    - Return `SkillExtractionResult` with `source.method` indicating 'llm' or 'local'
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 6.2 Write property tests for Skill Extraction
    - **Property 14: Skill Extraction and Normalization** — verify synonym normalization and importance classification based on context
    - **Property 17: LLM Graceful Degradation (Skill Extractor)** — verify valid result using local fallback when all LLM providers unavailable
    - **Validates: Requirements 4.1, 4.3, 4.4**

- [x] 7. Import Service orchestrator
  - [x] 7.1 Implement the Import Service orchestrator
    - Create `src/lib/import/import-service.ts` implementing `importJobs()`
    - Orchestrate the full pipeline: validate config → check rate limit → check cache → fetch from API (if needed) → store cache → deduplicate → map and store jobs → extract skills (LLM with fallback)
    - Assign each imported job to the designated System_User with `published` status
    - Store source attribution (company name, "via JSearch"/"via Indeed", job_link) in the record
    - Map all available metadata fields (highlights, salary, employment type, location)
    - Return `ImportResult` with counts of imported, skipped, cache status, and warnings
    - Include warning in response if LLM was unavailable and local fallback was used for skill extraction
    - Handle partial failures: continue processing remaining jobs on individual job errors
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 2.3, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 5.3, 6.2, 6.3_

  - [x] 7.2 Write property test for Job Mapping Completeness
    - **Property 2: Job Mapping Completeness** — verify all JSearchJob fields map correctly to job_descriptions columns
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 10.5**

  - [ ]* 7.3 Write unit tests for Import Service
    - Test happy path with mocked API and mocked LLM returning skills
    - Test error handling when API key is missing
    - Test force refresh bypassing cache
    - Test partial failure (one job fails, others succeed)
    - Test LLM unavailable scenario: import succeeds with local skill extraction and warning in response
    - _Requirements: 1.4, 1.5, 2.5, 4.1_

- [x] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Import API route and auth
  - [x] 9.1 Implement the POST /api/jobs/import route
    - Create `src/app/api/jobs/import/route.ts` implementing the POST handler
    - Verify caller has `hr_user` role; return 401 for unauthenticated, 403 for unauthorized
    - Accept optional body params: `query` (default: "software developer"), `location` (default: "Philippines"), `forceRefresh` (default: false)
    - Call Import Service `importJobs()` and return JSON response with counts, cache status, warnings
    - Handle errors with appropriate HTTP status codes (400, 429, 500, 502, 504)
    - Return 200 with warnings array if LLM was unavailable but import succeeded via local fallback
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

  - [x] 9.2 Write unit tests for import API route
    - Test 401 response for unauthenticated requests
    - Test 403 response for non-HR users
    - Test successful import with default params
    - Test request body parameter parsing
    - Test error response shapes
    - _Requirements: 9.2, 9.6_

- [x] 10. Career Intelligence — Proficiency Analyzer (LLM primary, local fallback)
  - [x] 10.1 Implement the Proficiency Analyzer with LLM integration
    - Create `src/lib/career-intelligence/proficiency-analyzer.ts` implementing `analyzeSkillProficiency()`, `analyzeProficiencyBatch()`, `analyzeProficiencyLocal()`, and `analyzeProficiencyBatchLocal()`
    - Primary path: call LLM Service with structured prompt to analyze resume context for proficiency levels (batch all skills in single call)
    - Use `completeWithCache()` with cache key based on resume text hash + "proficiency_analysis" operation type
    - Parse LLM JSON response into `ProficiencyResult[]` array with evidence snippets
    - If LLM is unavailable or returns malformed JSON, fall back to local keyword matching
    - Fallback path (local): classify `expert` when context contains "led", "architected", "5+ years", "mentored", "senior", "principal"
    - Classify `intermediate` when context contains "used", "developed", "2-4 years", "implemented", "contributed"
    - Classify `beginner` when context contains "familiar", "basic", "course", "1 year", "learning", "exposure"
    - Default to `intermediate` when no indicators found
    - Return `ProficiencyBatchResult` with `source.method` indicating 'llm' or 'local'
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [x] 10.2 Write property tests for Proficiency Analyzer
    - **Property 7: Proficiency Classification from Context** — verify each indicator set maps to correct proficiency level and default is intermediate (test local fallback path)
    - **Property 17: LLM Graceful Degradation (Proficiency Analyzer)** — verify valid result using local fallback when all LLM providers unavailable
    - **Validates: Requirements 11.2, 11.3, 11.4, 11.5**

- [x] 11. Career Intelligence — ATS Scorer (2-step LLM pipeline with intelligent matching)
  - [x] 11.1 Implement the ATS Scorer Step 1: LLM keyword extraction (cached per job)
    - Create `src/lib/career-intelligence/ats-scorer.ts` implementing `calculateATSScore()` orchestrator and `extractKeywords()`
    - Primary path for keyword extraction: call LLM Service with structured prompt to extract 10-20 ATS keywords ordered by importance
    - Use `completeWithCache()` with cache key based on `SHA256(job_description_text) + "ats_keywords"` operation type
    - Cache extracted keywords in `llm_results_cache` keyed by job description hash + "ats_keywords"
    - Re-extract only when job description text changes (source_hash mismatch)
    - If LLM is unavailable or returns malformed JSON, fall back to local TF-IDF keyword extraction (`extractKeywordsLocal()`)
    - Handle edge case of zero keywords (return score 0 with appropriate message)
    - _Requirements: 12.2, 12.3_

  - [x] 11.2 Implement the ATS Scorer Step 2: LLM intelligent matching + actionable suggestions (cached per applicant-job pair)
    - Implement `analyzeResumeMatch()` function in `src/lib/career-intelligence/ats-scorer.ts`
    - Call LLM with structured prompt providing job keywords and resume text
    - LLM performs synonym-aware matching: "React.js" = "React" = "ReactJS", "CI/CD pipelines" = "continuous integration and deployment", abbreviation equivalence ("AWS" = "Amazon Web Services"), contextual evidence ("managed a team of 5 engineers" implies "leadership")
    - LLM generates actionable suggestions for each missing keyword: WHERE in resume to add (specific section), HOW to phrase it naturally, and impact level (high/medium/low)
    - Suggestions ordered by impact: high first, then medium, then low
    - Use `completeWithCache()` with cache key: `SHA256(resume_text) + job_id + "ats_analysis"` operation type
    - Cache invalidated when resume text changes (different SHA-256 hash) OR job description changes
    - First page view for a new applicant-job pair triggers LLM call; subsequent views served from cache
    - _Requirements: 12.2, 12.3, 12.5, 12.7_

  - [x] 11.3 Implement the ATS Scorer local fallback (all 3 LLMs unavailable)
    - Implement `matchKeywordsLocal()` — exact case-insensitive text search (no synonym/contextual awareness)
    - Implement `extractKeywordsLocal()` — TF-IDF based keyword extraction
    - Generate generic suggestions: "Add '{keyword}' to your resume" without section-specific advice or impact levels
    - Set `analysisSource` to `'local'` to signal reduced accuracy to the UI
    - Scoring formula (always local math): `Math.round((matchedKeywords.length / totalKeywords) * 100)`, clamped to [0, 100]
    - Score is always computed fresh from cached match data — the score itself is not cached
    - _Requirements: 12.1, 12.4, 12.5_

  - [x] 11.4 Write property tests for ATS Scorer
    - **Property 8: ATS Score Formula** — verify score formula correctness and range [0, 100], same result regardless of analysisSource
    - **Property 20: ATS Intelligent Matching Consistency** — verify every keyword appears in exactly one of matchedKeywords or missingKeywords; sum equals totalKeywords
    - **Property 21: ATS Suggestion Coverage** — verify every missing keyword has at least one suggestion with valid section, suggestion text, and impact ('high'|'medium'|'low'); suggestions ordered by impact
    - **Property 22: ATS Cache Invalidation on Resume or Job Change** — verify fresh LLM request when resume hash changes or job description changes
    - **Property 17: LLM Graceful Degradation (ATS Scorer)** — verify valid result using local TF-IDF + exact matching fallback when all LLM providers unavailable
    - **Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5, 12.7**

- [x] 12. Career Intelligence — Hidden Gem Detector (pure local)
  - [x] 12.1 Implement the Hidden Gem Detector
    - Create `src/lib/career-intelligence/hidden-gem-detector.ts` implementing `detectHiddenGem()` and `classifySkillDifficulty()`
    - Create initial `skill_difficulty_catalog` seed data with common easy and hard skills
    - Evaluate missing skills for learnability when match is in [60, 79]
    - Tag as Hidden Gem when >50% of missing skills are Easy_Skills
    - Return detailed breakdown: easy skills, hard skills, ratio
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

  - [ ]* 12.2 Write property test for Hidden Gem Detector
    - **Property 9: Hidden Gem Detection Logic** — verify detection only triggers for [60, 79] match range with >50% easy skills
    - **Validates: Requirements 13.1, 13.3, 13.4**

- [x] 13. Career Intelligence — Skill ROI Analyzer (pure local)
  - [x] 13.1 Implement the Skill ROI Analyzer
    - Create `src/lib/career-intelligence/skill-roi-analyzer.ts` implementing `analyzeSkillROI()`
    - Simulate adding each missing skill one at a time to applicant's profile
    - Recalculate match score for each simulation using existing matching algorithm
    - Compute score delta and sort results by delta descending (highest improvement first)
    - Return top N results (default: 5)
    - Ensure computation completes within 3 seconds for up to 15 missing skills
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6_

  - [ ]* 13.2 Write property test for Skill ROI Analyzer
    - **Property 10: Skill ROI Monotonicity and Ordering** — verify each scoreDelta >= 0 and results sorted descending by delta
    - **Validates: Requirements 14.2, 14.3**

- [x] 14. Career Intelligence — Candidate Scorer (pure local)
  - [x] 14.1 Implement the Candidate Scorer
    - Create `src/lib/career-intelligence/candidate-scorer.ts` implementing `calculateCandidateScores()` and `checkAtRiskStatus()`
    - Calculate "Ready Now" score as current match percentage
    - Calculate "High Potential" score by simulating addition of 2 easiest missing skills
    - Set `isHighGrowth` when difference >= 10 points
    - Check "At Risk" status: flag when applicant matches 85%+ on 3 or more published jobs
    - _Requirements: 15.1, 15.2, 15.5, 16.1_

  - [ ]* 14.2 Write property tests for Candidate Scorer
    - **Property 11: High Potential Score Monotonicity and High Growth Threshold** — verify highPotentialScore >= readyNowScore and isHighGrowth threshold logic
    - **Property 12: At Risk Threshold Logic** — verify isAtRisk is true iff highMatchJobCount >= 3
    - **Validates: Requirements 15.2, 15.5, 16.1**

- [x] 15. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 16. Pipeline Health and Analytics utilities
  - [x] 16.1 Implement Pipeline Health tier classifier
    - Create `src/lib/career-intelligence/pipeline-health.ts` implementing tier classification
    - Classify match percentages: 🟢 Top Tier (90-100), 🟡 Good Fit (75-89), 🟠 Potential (60-74), 🔴 Gap (0-59)
    - Aggregate applicant counts by tier for each published job listing
    - _Requirements: 18.1, 18.2, 18.3_

  - [ ]* 16.2 Write property test for Pipeline Tier Classification
    - **Property 13: Pipeline Tier Classification** — verify mutual exclusivity and exhaustive coverage over [0, 100]
    - **Validates: Requirements 18.2**

  - [x] 16.3 Implement Analytics data aggregation service
    - Create `src/lib/analytics/analytics-service.ts`
    - Implement queries for: total active listings, total applicants, average match score, top skills in demand, applicant growth trend, skill gap analysis, conversion rate
    - Support CSV export format
    - _Requirements: 24.1, 24.2, 24.3, 24.4, 24.5, 24.6, 24.7, 24.8_

- [x] 17. API routes for career intelligence features
  - [x] 17.1 Implement GET /api/jobs/:id/ats-score route
    - Create `src/app/api/jobs/[id]/ats-score/route.ts`
    - Verify authenticated applicant, fetch job and applicant resume
    - Call ATS Scorer `calculateATSScore()` — triggers 2-step LLM pipeline on first view (keyword extraction if not cached + intelligent matching if not cached), subsequent views served from cache
    - Return `ATSScoreResult` including score, matchedKeywords with matchType, missingKeywords, actionable suggestions with section/impact, and analysisSource
    - If LLM unavailable, return local fallback result with `analysisSource: 'local'` and warning
    - _Requirements: 12.1, 12.5, 12.6_

  - [x] 17.2 Implement GET /api/jobs/:id/skill-roi route
    - Create `src/app/api/jobs/[id]/skill-roi/route.ts`
    - Verify authenticated applicant, fetch job skills and applicant skills, call Skill ROI Analyzer, return top 5 results
    - _Requirements: 14.4, 14.5_

  - [x] 17.3 Implement POST /api/applications route
    - Create `src/app/api/applications/route.ts`
    - Handle both internal applications and external application confirmations
    - Insert application record with appropriate status ('applied' or 'applied_externally')
    - Prevent duplicate applications via unique constraint
    - _Requirements: 20.2, 20.3, 20.4_

  - [x] 17.4 Implement GET /api/analytics route
    - Create `src/app/api/analytics/route.ts`
    - Verify HR user role, call analytics service, return aggregated metrics
    - Support CSV export via query parameter
    - _Requirements: 24.1, 24.8_

- [x] 18. Notification system
  - [x] 18.1 Implement the Notification UI components
    - Create `src/components/notifications/Toast.tsx` — top-right positioned toast with auto-dismiss after 5 seconds, severity icons (green checkmark, yellow triangle, blue "i")
    - Create `src/components/notifications/ErrorModal.tsx` — centered modal with overlay, dismiss button, blocks page interaction
    - Create `src/components/notifications/NotificationProvider.tsx` — context provider managing toast stack (newest on top) and modal state
    - _Requirements: 23.1, 23.2, 23.3, 23.4, 23.5_

- [x] 19. HR Dashboard — Import trigger and job management
  - [x] 19.1 Implement HR Import Jobs UI
    - Create or update the HR dashboard page to add "Import Jobs" button visible to `hr_user` role
    - Show loading indicator during import
    - Display success message with counts (imported, skipped) or error message on failure
    - Display warning toast if LLM was unavailable and local fallback was used for skill extraction
    - Disable button while import is in progress to prevent concurrent requests
    - Display last cached fetch timestamp
    - Add "Force Refresh" option that passes `forceRefresh: true`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [x] 19.2 Implement HR Manual Job Creation form
    - Create job creation form in HR dashboard with fields: title, description, qualifications, required skills
    - Insert job with HR user's ID as `hr_user_id`, status as `draft`
    - Implement publish, edit, and close actions for manually created jobs
    - Distinguish manual jobs from imported by absence of external_job_id and source
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

  - [x] 19.3 Implement HR Candidate Scoring and Rankings UI
    - Display "Ready Now" and "High Potential" scores side by side for each applicant
    - Allow sorting by either score
    - Show "High Growth" indicator when difference >= 10 points
    - Display the 2 easiest missing skills used in High Potential calculation
    - Show 🚨 "At Risk" badge when applicant matches 85%+ on 3+ jobs
    - Display count of other highly-matched jobs for At Risk applicants
    - Add filter for "At Risk" applicants only
    - _Requirements: 15.3, 15.4, 15.5, 15.6, 16.2, 16.3, 16.4, 16.5_

  - [x] 19.4 Implement HR Smart Filters
    - Create smart filter buttons: "🏆 90%+ Matches", "🚀 Fast Learners", "💼 Industry Veterans", "🎓 Recent Grads", "🏅 Certified"
    - Apply filters immediately without full page reload
    - Support combining multiple smart filters simultaneously
    - Implement filter logic: 90%+ match, 3+ skills in last 30 days, 5+ years experience, graduated within 2 years, has certifications
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7_

  - [x] 19.5 Implement Pipeline Health Dashboard
    - Display pipeline health summary for each published job with color-coded tier counts
    - 🟢 Top Tier (90%+), 🟡 Good Fit (75-89%), 🟠 Potential (60-74%), 🔴 Gap (below 60%)
    - Make tier counts clickable to navigate to filtered applicant list
    - Display as overview on main HR dashboard page
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6_

- [x] 20. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 21. Applicant experience — Job listings and search
  - [x] 21.1 Implement Applicant Job Listings with search and filters
    - Display imported jobs alongside manually posted jobs without distinction in primary view
    - Implement keyword search filtering against title, description, company, skills
    - Add filter options: employment type, location, minimum match percentage, salary range
    - Implement sorting: match percentage (default, desc), date posted, salary, company name
    - Show active filter tags removable with click
    - Display "No jobs match" message with suggestion when filters produce zero results
    - Preserve filters during session navigation
    - Display salary range on job cards when available
    - _Requirements: 8.1, 21.1, 21.2, 21.3, 21.4, 21.5, 21.6, 21.7, 22.1, 22.3, 22.4_

  - [x] 21.2 Implement Applicant Job Detail page enhancements
    - Display source attribution ("via JSearch") for imported jobs
    - Show ATS compatibility score alongside match percentage — includes matched keywords with match type (exact/synonym/contextual), missing keywords, and actionable suggestions with section/impact
    - Display "Score calculated using basic matching" notice when `analysisSource` is `'local'`
    - Display full salary information when available (min, max, currency/period)
    - Show "🔥 Hidden Gem" badge on qualifying jobs
    - For Hidden Gem jobs, display message about easy missing skills (e.g., "Only 1 skill away!")
    - Add "Hidden Gem" filter option to job listings
    - Display Skill ROI analysis — top 5 highest-impact skills with projected improvement
    - _Requirements: 8.2, 12.5, 12.6, 13.5, 13.6, 13.7, 14.4, 14.5, 22.2_

  - [x] 21.3 Implement Application Flow with gap summary
    - For imported jobs with Job_Link: open external link in new tab, show confirmation dialog "Did you apply?"
    - If confirmed: record application as 'applied_externally'
    - If declined: do not record application
    - For internal jobs (no Job_Link): show pre-application gap summary dialog
    - Gap summary shows: match %, ATS score, missing required/preferred skills, top 3 skills to learn
    - Show encouraging message for 90%+ match, gentle advisory for <60% match
    - "Proceed with Application" and "Cancel" buttons — never blocks application
    - Insert application record on proceed
    - Visually distinguish "Applied" vs "Applied Externally" in applicant's view
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6, 26.1, 26.2, 26.3, 26.4, 26.5, 26.6, 26.7, 26.8_

- [x] 22. Applicant profile enhancements
  - [x] 22.1 Implement enhanced applicant data collection
    - Add form for work experience (titles, companies, dates, descriptions, industry)
    - Add form for education (degrees, institutions, graduation years, field of study)
    - Add form for certifications (name, issuer, date)
    - Add form for work preferences (remote/on-site/hybrid, relocate, target industries)
    - Add external profile URLs (LinkedIn, GitHub, portfolio)
    - Calculate and store total years of experience from work entries
    - Track skill added/updated timestamps for learning activity
    - Display proficiency levels as visual badges on profile page
    - _Requirements: 19.1, 19.2, 19.3, 19.5, 19.6, 19.7, 11.6_

  - [x] 22.2 Implement profile change triggers
    - When applicant profile data changes, trigger recalculation of match scores, ATS scores, Hidden Gem status, and At Risk status
    - On resume text change: invalidate `llm_results_cache` entries for proficiency_analysis AND ats_analysis (source_hash mismatch triggers fresh LLM call on next access)
    - Invalidation for ats_analysis: all cache entries matching the applicant's resume_hash are invalidated when resume changes
    - Update ATS score automatically when resume is updated (next page view triggers fresh LLM matching step)
    - _Requirements: 19.8, 12.7_

- [x] 23. HR Dashboard — Analytics page
  - [x] 23.1 Implement Analytics Dashboard UI
    - Display: Total Active Listings, Total Applicants, Average Match Score, Top Skills in Demand (top 10), Applicant Growth trend (4 weeks), Skill Gap Analysis (top 5), Conversion Rate
    - Add CSV export button for analytics data
    - Metrics update in real-time as data changes
    - _Requirements: 24.1, 24.2, 24.3, 24.4, 24.5, 24.6, 24.7, 24.8, 24.9_

- [x] 24. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document (Properties 1-22)
- Unit tests validate specific examples and edge cases
- The implementation uses TypeScript throughout, with Next.js 16 App Router, Supabase, Vitest, and fast-check
- **LLM Integration**: The LLM Service (task 2) supports OpenAI, Gemini, and LLM7 with cascading fallback
- **LLM is used for 4 operations**: Skill Extraction, Proficiency Analysis, ATS Keyword Extraction (Step 1), and ATS Intelligent Matching + Suggestions (Step 2)
- **ATS 2-step pipeline**: Step 1 (keyword extraction) is cached per job; Step 2 (intelligent matching + actionable suggestions) is cached per applicant-job pair with key `resume_hash + job_id + "ats_analysis"`
- **Intelligent matching**: Uses synonym awareness ("React.js" = "React"), phrase equivalence ("CI/CD" = "continuous integration"), contextual evidence ("managed a team" → "leadership"), abbreviation equivalence ("AWS" = "Amazon Web Services")
- **Actionable suggestions**: Specify WHERE in resume to add keyword, HOW to phrase it, and impact level (high/medium/low)
- **Graceful degradation**: If all 3 LLM providers (OpenAI → Gemini → LLM7) are unavailable, ATS falls back to exact text matching + generic suggestions with `analysisSource: 'local'`
- **Cache invalidation**: ATS analysis cache invalidated when resume text changes (different SHA-256 hash) OR job description changes
- **LLM result caching**: All LLM results are cached in `llm_results_cache` table with SHA-256 hash-based invalidation when source data changes
- **Pure local algorithms** (no LLM): Hidden Gem Detector, Skill ROI Analyzer, Candidate Scorer, Pipeline Health — these never call LLM
- Requirement 25 (Responsive Design) is marked as a future enhancement and is not included as blocking tasks — Tailwind responsive utilities should be applied as components are built

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "3.1", "3.3"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.2", "3.4", "5.1", "5.2"] },
    { "id": 3, "tasks": ["5.3", "6.1"] },
    { "id": 4, "tasks": ["6.2", "7.1"] },
    { "id": 5, "tasks": ["7.2", "7.3", "9.1", "10.1", "11.1"] },
    { "id": 6, "tasks": ["9.2", "10.2", "11.2", "12.1", "13.1", "14.1"] },
    { "id": 7, "tasks": ["11.3", "12.2", "13.2", "14.2", "16.1", "16.3"] },
    { "id": 8, "tasks": ["11.4", "16.2", "17.1", "17.2", "17.3", "17.4", "18.1"] },
    { "id": 9, "tasks": ["19.1", "19.2", "19.3", "19.4", "19.5", "21.1", "22.1"] },
    { "id": 10, "tasks": ["21.2", "21.3", "22.2", "23.1"] }
  ]
}
```
