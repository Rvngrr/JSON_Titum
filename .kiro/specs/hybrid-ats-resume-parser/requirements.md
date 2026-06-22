# Requirements Document

## Introduction

This feature refactors the CareerFlow ATS scoring pipeline and resume parsing endpoint to use robust local NLP-based methods as the primary processing layer, with AI APIs (Gemini, OpenAI) serving as an optional enhancement. The current system relies heavily on LLM calls for keyword extraction and matching (with weak exact-match fallback) and Gemini for resume profile extraction (with weak regex fallback). This refactor replaces the weak fallbacks with production-quality local algorithms: TF-IDF + cosine similarity for ATS matching, and layout/header-based section detection for resume parsing. The system must produce quality results with zero AI API calls while optionally improving accuracy when AI quota is available.

## Glossary

- **ATS_Scorer**: The module (`ats-scorer.ts`) responsible for extracting keywords from job descriptions and scoring resumes against those keywords
- **Resume_Parser**: The API endpoint (`/api/resume/parse`) responsible for extracting structured profile data (skills, experience, education, certifications) from resume text
- **TF-IDF**: Term Frequency–Inverse Document Frequency, a statistical measure of word importance in a document relative to a corpus
- **Cosine_Similarity**: A metric that measures the angular similarity between two document vectors, yielding a value between 0 (no similarity) and 1 (identical)
- **Document_Vector**: A numerical representation of a text document where each dimension corresponds to a term's TF-IDF weight
- **Section_Detector**: The component that identifies logical sections (Experience, Education, Skills, Certifications, Projects) in resume text by analyzing header patterns and layout cues
- **Enhancement_Layer**: The optional AI-powered processing that improves local results when API quota is available (synonym detection, contextual matching, edge-case resolution)
- **Job_Description**: The text describing a job posting including responsibilities, qualifications, and required skills
- **Resume_Text**: The raw text extracted from a candidate's uploaded resume file (PDF or DOCX)
- **Structured_Profile**: The parsed output containing experience entries (with title, company, dates, bullet points), education entries (with degree, institution, year), and certifications
- **Dimension_Score**: A 0–100 integer score representing one specific aspect of resume quality (keyword match, section completeness, experience quality, education relevance, or formatting)
- **Skills_Taxonomy**: A static TypeScript data structure mapping skill names to their synonyms, abbreviations, categories, and industry relevance, used for local synonym resolution without API calls
- **Groq_Provider**: A third-party LLM inference service offering free-tier access to open-source models (Llama 3.3 70B), used as the final fallback before local-only mode in the Enhancement_Layer provider chain

## Requirements

### Requirement 1: TF-IDF Keyword Extraction

**User Story:** As an applicant, I want job description keywords extracted using statistical term analysis, so that ATS scoring works reliably without consuming AI API quota.

#### Acceptance Criteria

1. WHEN a job description is submitted for keyword extraction, THE ATS_Scorer SHALL compute TF-IDF weights for all terms in the job description text after removing stop words and normalizing tokens to lowercase with non-alphanumeric characters (except #, +, ., -, /) stripped
2. WHEN TF-IDF computation is complete and 10 or more candidate terms remain after filtering, THE ATS_Scorer SHALL extract between 10 and 25 keywords ordered by descending TF-IDF weight as the primary local extraction method
3. IF the job description text is empty or contains fewer than 10 candidate terms after stop-word removal and normalization, THEN THE ATS_Scorer SHALL return all remaining candidate terms (which may be fewer than 10, including zero for empty input) without raising an error
4. WHEN multi-word technical terms appear in the job description (e.g., "machine learning", "continuous integration"), THE ATS_Scorer SHALL detect and preserve them as single keyword units using bigram and trigram collocation analysis, including only collocations that appear at least 2 times in the text
5. WHEN the Enhancement_Layer is available, THE ATS_Scorer SHALL use AI to refine locally extracted keywords by adding domain-specific synonyms and removing terms that are stop words or generic job-posting boilerplate (e.g., "responsibilities", "qualifications", "candidate")
6. IF the Enhancement_Layer is unavailable or returns an error, THEN THE ATS_Scorer SHALL return the locally extracted TF-IDF keywords with the same structure and keyword count range as the AI-refined path, completing extraction within 2 seconds of the original request

### Requirement 2: Cosine Similarity Resume Matching

**User Story:** As an applicant, I want my resume compared to job descriptions using document vectorization, so that I get accurate match scores that reflect semantic overlap rather than simple string matching.

#### Acceptance Criteria

1. WHEN a resume is scored against a job description, THE ATS_Scorer SHALL construct Document_Vectors for both the resume and job description using TF-IDF term weights computed over a vocabulary formed from the union of all normalized terms (after stop word removal) appearing in either document
2. THE ATS_Scorer SHALL compute Cosine_Similarity between the resume Document_Vector and the job description Document_Vector, yielding a similarity score between 0.0 and 1.0
3. THE ATS_Scorer SHALL convert the Cosine_Similarity score to a percentage ATS score using the formula: `Math.round(cosineSimilarity * 100)`, clamped to the range [0, 100]
4. IF the Enhancement_Layer is available, THEN THE ATS_Scorer SHALL augment the matching with synonym detection (e.g., "React" matches "ReactJS"), abbreviation expansion (e.g., "AWS" matches "Amazon Web Services"), and contextual inference (e.g., "managed a team" implies "leadership")
5. IF the Enhancement_Layer is unavailable, THEN THE ATS_Scorer SHALL return the Cosine_Similarity-based score without synonym or contextual augmentation
6. THE ATS_Scorer SHALL identify which keywords from the job description are matched and which are missing by checking whether each job description term with a TF-IDF weight above zero has a non-zero value in the resume Document_Vector; terms present in the resume vector are reported as matched, terms absent are reported as missing
7. IF the resume or job description contains zero meaningful terms after stop word removal and normalization, THEN THE ATS_Scorer SHALL return a score of 0 with an empty matched keywords list and all job description terms (if any) in the missing keywords list
8. THE ATS_Scorer SHALL complete the Cosine_Similarity scoring computation and return results within 500 milliseconds for documents up to 10,000 words each

### Requirement 3: Section Detection for Resume Parsing

**User Story:** As an applicant, I want my resume sections (Experience, Education, Certifications, Skills, Projects) detected by layout and header patterns, so that structured data is extracted reliably without AI dependency.

#### Acceptance Criteria

1. WHEN Resume_Text is provided, THE Section_Detector SHALL identify section boundaries by recognizing header patterns including: uppercase headers (e.g., "EXPERIENCE"), title-case headers (e.g., "Work Experience"), headers followed by a colon (e.g., "Skills:"), headers with underline characters on the following line (e.g., dashes or equals signs), and headers preceded by at least one blank line that appear as standalone lines (not embedded within a sentence)
2. THE Section_Detector SHALL recognize at least the following section types: Experience (including "Work Experience", "Employment", "Internships"), Education (including "Academic Background", "Qualifications"), Skills (including "Technical Skills", "Core Competencies"), Certifications (including "Certificates", "Training", "Seminars"), Projects (including "Portfolio", "Personal Projects"), and Achievements (including "Awards", "Honors")
3. WHEN multiple potential header matches exist for a section boundary, THE Section_Detector SHALL select the match using the following priority order (highest to lowest): (1) uppercase standalone line with underline characters, (2) uppercase standalone line without underline, (3) title-case standalone line preceded by a blank line, (4) title-case standalone line followed by a colon, (5) inline text containing a section keyword
4. THE Section_Detector SHALL assign all text lines between two detected section headers to the preceding section
5. WHEN Resume_Text contains text lines that appear before the first detected section header, THE Section_Detector SHALL assign those lines to a "Header/Contact" section
6. IF no section headers are detected in the Resume_Text, THEN THE Section_Detector SHALL treat the entire text as a single section labeled "Unstructured" and return it without further segmentation
7. THE Section_Detector SHALL perform case-insensitive matching when comparing line text against section type keywords and their aliases

### Requirement 4: Structured Experience Extraction

**User Story:** As an applicant, I want my work experience extracted with job title, company name, employment dates, and bullet point accomplishments, so that my professional history is accurately captured for matching and display.

#### Acceptance Criteria

1. WHEN the Section_Detector identifies an Experience section, THE Resume_Parser SHALL extract individual experience entries by detecting date patterns (e.g., "Jan 2022 - Present", "2020 - 2023", "March 2021 – December 2022"), extracting a maximum of 20 experience entries
2. WHEN an experience entry is detected, THE Resume_Parser SHALL extract the job title, organization name, start date, end date (or "Present"), and a list of accomplishment bullet points with a maximum of 20 bullet points per entry
3. THE Resume_Parser SHALL detect title/organization separation using common delimiters including " - ", " | ", " at ", and comma followed by a capitalized word
4. IF the Resume_Parser cannot separate the title from the organization using known delimiters, THEN THE Resume_Parser SHALL assign the entire text preceding the date range as the title and leave the organization field as an empty string
5. WHEN bullet points follow an experience header, THE Resume_Parser SHALL capture each bullet (lines starting with "•", "-", "*", or numbered items) as a separate string with a maximum length of 200 characters, discarding lines that are empty or exceed 200 characters
6. IF an experience entry has a date range containing "Present" or "Current", THEN THE Resume_Parser SHALL mark the entry as a current position by setting the isCurrent flag to true
7. IF the Experience section contains text lines with no detectable date patterns, THEN THE Resume_Parser SHALL skip those lines without producing an experience entry
8. WHEN the Enhancement_Layer is available, THE Resume_Parser SHALL use AI to resolve ambiguous title/company separation and extract additional bullet points that the local parser could not detect from non-standard formatting

### Requirement 5: Structured Education Extraction

**User Story:** As an applicant, I want my education history extracted with degree, institution, field of study, and graduation year, so that my academic qualifications are properly recorded.

#### Acceptance Criteria

1. WHEN the Section_Detector identifies an Education section, THE Resume_Parser SHALL extract individual education entries (up to a maximum of 20) by detecting degree keywords ("Bachelor", "Master", "Ph.D.", "B.S.", "M.S.", "M.A.", "B.A.", "Associate", "Diploma", "Doctor") or institution names paired with date ranges
2. WHEN an education entry is detected, THE Resume_Parser SHALL extract the degree name, institution name, field of study (if present), and graduation year, storing each as a separate field in the EducationEntry structure
3. WHEN a date range (e.g., "2019 - 2023") is present for an education entry, THE Resume_Parser SHALL use the end year as the graduation year; WHEN only a single year is present, THE Resume_Parser SHALL use that year as the graduation year
4. IF the degree and institution appear on the same line separated by a delimiter (dash, comma, pipe, or "at"/"from" keyword), THEN THE Resume_Parser SHALL split them into separate degree and institution fields
5. IF the Resume_Parser cannot identify a degree name or institution name for a detected education entry, THEN THE Resume_Parser SHALL store the entry with an empty string for the unidentified field and preserve any successfully extracted fields
6. WHEN the Enhancement_Layer is available, THE Resume_Parser SHALL use AI to map degree abbreviations to their full names (e.g., "B.S." to "Bachelor of Science") and to separate institution names from degree text when delimiter-based splitting fails
7. IF no Education section is identified in the resume text, THEN THE Resume_Parser SHALL return an empty education array without raising an error

### Requirement 6: Certifications and Skills Extraction

**User Story:** As an applicant, I want my certifications and skills extracted as structured lists, so that they can be matched against job requirements without depending on AI availability.

#### Acceptance Criteria

1. WHEN the Section_Detector identifies a Certifications section, THE Resume_Parser SHALL extract each certification as an individual entry by detecting list items (bullet points, numbered items, or separate lines longer than 3 characters), up to a maximum of 50 certification entries per resume
2. WHEN the Section_Detector identifies a Skills section, THE Resume_Parser SHALL extract skills by detecting comma-separated lists, pipe-separated lists, bullet-point lists, and categorized skill groups (where a category label is followed by a colon and a list of items), up to a maximum of 100 skill entries per resume
3. THE Resume_Parser SHALL assign proficiency levels to extracted skills using the following heuristic rules: skills mentioned in Experience or Projects sections alongside quantified achievements (e.g., percentages, counts, time savings, or revenue figures) receive "advanced", skills listed in a dedicated Skills section without project context receive "intermediate", and skills mentioned only in Certifications or training contexts receive "beginner"
4. IF a skill appears in multiple sections (e.g., listed in Skills and used in a project), THEN THE Resume_Parser SHALL assign the highest applicable proficiency level according to the hierarchy: advanced > intermediate > beginner
5. IF the Section_Detector identifies a Skills or Certifications section but the section content contains no parseable list items (no bullets, no comma/pipe separators, and no lines longer than 3 characters), THEN THE Resume_Parser SHALL return an empty array for that section without raising an error
6. WHEN the Enhancement_Layer is available, THE Resume_Parser SHALL use AI to normalize extracted skill names to canonical forms (e.g., "JS" to "JavaScript", "k8s" to "Kubernetes") and to reassess proficiency levels based on contextual evidence across all resume sections
7. IF the Enhancement_Layer is unavailable or returns an error during skill extraction, THEN THE Resume_Parser SHALL retain the locally extracted skill names and heuristic-assigned proficiency levels without degradation of service

### Requirement 7: AI Enhancement Layer Integration

**User Story:** As a system operator, I want AI APIs used only as an optional enhancement that improves results when quota is available, so that the system operates within API budget constraints without service degradation.

#### Acceptance Criteria

1. THE ATS_Scorer SHALL execute the local TF-IDF and Cosine_Similarity pipeline to completion first, then invoke the Enhancement_Layer only when the AI API configuration is present and the system has not received a quota-exceeded response within the current calendar hour
2. THE Resume_Parser SHALL execute local Section_Detector and extraction logic to completion first, then invoke the Enhancement_Layer only when the AI API configuration is present and the system has not received a quota-exceeded response within the current calendar hour
3. WHEN the Enhancement_Layer returns a response containing at least one synonym match, abbreviation expansion, or contextual match not already present in local results, THE ATS_Scorer SHALL add those AI-detected matches to the local match results without removing or replacing any existing local matches
4. WHEN the Enhancement_Layer returns a response for parsed fields, THE Resume_Parser SHALL merge AI-refined fields with locally extracted fields by adopting AI values only for fields where the local extraction produced an empty or null value, preserving all non-empty locally extracted values unchanged
5. IF any AI API call fails (quota exceeded, network error, timeout expiry, or malformed response), THEN THE ATS_Scorer SHALL return the local pipeline results unchanged without error propagation to the caller and without retry
6. IF any AI API call fails (quota exceeded, network error, timeout expiry, or malformed response), THEN THE Resume_Parser SHALL return the locally parsed profile unchanged without error propagation to the caller and without retry
7. THE Enhancement_Layer SHALL enforce a request timeout of no more than 10 seconds per AI API call, and IF the timeout elapses before a response is received, THEN THE Enhancement_Layer SHALL abort the request and return a timeout failure to the calling module
8. WHEN the Enhancement_Layer receives a quota-exceeded response from the AI API, THE Enhancement_Layer SHALL record the timestamp and suppress further AI API calls for the remainder of the current calendar hour

### Requirement 8: Round-Trip Consistency for Structured Profile

**User Story:** As a developer, I want the parsed resume profile to be serializable and deserializable without data loss, so that structured profiles can be reliably stored in and retrieved from the database.

#### Acceptance Criteria

1. THE Resume_Parser SHALL produce a Structured_Profile object containing only JSON-safe value types (strings, numbers, booleans, nulls, arrays, and plain objects) with no undefined values, Date objects, functions, or non-finite numeric values (Infinity, NaN)
2. THE Resume_Parser SHALL ensure all date strings in experience entries conform to a free-text duration format (e.g., "Jan 2022 - Present", "2020 - 2023") stored as plain strings, and all date fields in WorkExperienceEntry (startDate, endDate), EducationEntry (graduationYear), and CertificationEntry (date) are stored as non-empty strings that are preserved exactly through JSON serialization and deserialization
3. THE Resume_Parser SHALL ensure all extracted text fields (including title, company, degree, institution, name, description, and bullet point strings) are trimmed of leading/trailing whitespace and contain no control characters (Unicode categories Cc and Cf) other than newline characters (U+000A) within bullet point highlight strings
4. THE Resume_Parser SHALL represent optional fields that have no extracted value as null (not undefined), so that JSON.stringify followed by JSON.parse produces an object with identical keys and values to the original (no key loss from undefined-to-absent conversion)
5. FOR ALL valid Structured_Profile objects produced by the Resume_Parser, THE Resume_Parser SHALL guarantee that `JSON.parse(JSON.stringify(profile))` produces an object that is deeply strict-equal to the original when compared field-by-field recursively, including array element order and null values
6. IF serialization of a Structured_Profile to JSON fails due to a circular reference or unsupported value type, THEN THE Resume_Parser SHALL reject the profile and return an error indicating the serialization failure rather than persisting corrupted data

### Requirement 9: Scoring Consistency and Determinism

**User Story:** As an applicant, I want my ATS score to be consistent across repeated evaluations of the same resume against the same job description, so that I can trust the scoring system.

#### Acceptance Criteria

1. WHEN the same Resume_Text and Job_Description are provided to the ATS_Scorer with the Enhancement_Layer disabled, THE ATS_Scorer SHALL produce the identical score on every invocation (deterministic local scoring)
2. WHEN the Resume_Text and Job_Description share zero non-stop-word tokens after case normalization and stop word removal, THE ATS_Scorer SHALL produce a score of 0
3. WHEN the Resume_Text Document_Vector and the Job_Description Document_Vector yield a Cosine_Similarity of 1.0, THE ATS_Scorer SHALL produce a score of 100
4. WHEN the Enhancement_Layer is enabled, THE ATS_Scorer SHALL produce a Cosine_Similarity value greater than or equal to the local-only Cosine_Similarity value before rounding, ensuring the final integer score is greater than or equal to the local-only integer score
5. THE ATS_Scorer SHALL ensure the final score is always an integer in the range [0, 100], clamping any computed value that falls outside this range to the nearest bound

### Requirement 10: Backward Compatibility

**User Story:** As a developer, I want the refactored modules to maintain the same public API signatures and response shapes, so that existing consumers of the ATS scoring and resume parsing endpoints continue to function without modification.

#### Acceptance Criteria

1. THE ATS_Scorer SHALL maintain the existing `calculateATSScore` function signature accepting positional parameters in this order: `resumeText: string`, `jobDescription: string`, `qualifications: string | null`, `jobDescriptionId: string`, `jobId: string`, and optional `fallbackKeywords?: string[]`
2. THE ATS_Scorer SHALL return an `ATSScoreResult` object containing all of these fields with their original types: `score` (number, 0–100), `totalKeywords` (number), `matchedKeywords` (array of objects each with `keyword`, `matchedText`, and `matchType`), `missingKeywords` (array of strings), `suggestions` (array of objects each with `keyword`, `section`, `suggestion`, and `impact`), and `analysisSource` (`'llm'` or `'local'`)
3. THE Resume_Parser endpoint SHALL continue to accept POST requests at `/api/resume/parse` with `{ file_path: string, user_id: string }` body and return a `ResumeParseResponse` object containing: `success` (boolean), `skills` (array of objects with `name` and `proficiency_level`), optional `profile` (structured resume profile), optional `raw_text` (string), and optional `error` (string)
4. THE Resume_Parser SHALL continue to persist parsed data to `skill_profiles` and `skills` tables using the existing database schema
5. IF existing callers pass `fallbackKeywords` to `calculateATSScore` and the keyword extraction source is `'local'`, THEN THE ATS_Scorer SHALL use the provided `fallbackKeywords` array as the effective keywords in place of the locally extracted keywords
6. IF a request to the ATS score or resume parse endpoint fails, THEN THE System SHALL return the same HTTP status codes (400, 404, 422, 500) and error response shape (`{ success: false, skills: [], error: string }` for resume parse; existing error JSON for ATS score) as the pre-refactor implementation

### Requirement 11: Multi-Dimensional ATS Scoring

**User Story:** As an applicant, I want my ATS score broken down into multiple dimensions (keyword match, section completeness, experience quality, education relevance, and formatting), so that I can understand which specific areas of my resume need improvement rather than seeing only a single opaque number.

#### Acceptance Criteria

1. WHEN a resume is scored against a job description, THE ATS_Scorer SHALL compute five dimension scores each ranging from 0 to 100: Keyword_Match (TF-IDF cosine similarity percentage), Section_Completeness (percentage of expected sections detected), Experience_Quality (quantified achievements and action verb density), Education_Relevance (degree field alignment to job domain), and Formatting (ATS-friendliness of parsed text structure)
2. THE ATS_Scorer SHALL compute the Section_Completeness dimension by checking for the presence of Experience, Education, Skills, Projects, and Certifications sections in the resume; each detected section contributes 20 points to the dimension score (0 sections = 0, all 5 sections = 100)
3. THE ATS_Scorer SHALL compute the Experience_Quality dimension by evaluating: percentage of bullet points containing quantified achievements (numbers, percentages, currency amounts) contributing 50% of the dimension weight, percentage of bullet points beginning with action verbs contributing 30% of the dimension weight, and recency of the most recent experience entry (within 2 years = full 20% credit, 2–5 years = 10% credit, older than 5 years = 0% credit) contributing 20% of the dimension weight
4. THE ATS_Scorer SHALL compute the Education_Relevance dimension by comparing extracted degree fields and institution programs against domain keywords from the job description; an exact or synonym match of the degree field to the job domain yields 100, a partial match (same broad category such as "Computer Science" matching "Software Engineering") yields 60, and no detectable match yields 20 as a baseline
5. THE ATS_Scorer SHALL compute the Formatting dimension by deducting points from a base score of 100: deduct 20 points if the parsed text contains image placeholder markers or embedded binary content, deduct 20 points if the parsed text contains HTML table structures, deduct 20 points if the resume has fewer than 3 detectable section headers, deduct 20 points if more than 30% of lines exceed 120 characters (indicating merged columns), and deduct 20 points if the resume contains fewer than 200 characters of extractable text; the minimum Formatting score is 0
6. THE ATS_Scorer SHALL compute the final composite score as a weighted average of the five dimensions using these weights: Keyword_Match 40%, Section_Completeness 15%, Experience_Quality 20%, Education_Relevance 15%, Formatting 10%; the composite score is rounded to the nearest integer and clamped to [0, 100]
7. THE ATS_Scorer SHALL include an optional `dimensions` field in the ATSScoreResult response object containing an object with keys `keywordMatch`, `sectionCompleteness`, `experienceQuality`, `educationRelevance`, and `formatting`, each holding the corresponding 0–100 integer score; the existing `score` field SHALL contain the composite weighted average
8. IF a caller does not request dimensional scoring (default behavior), THEN THE ATS_Scorer SHALL omit the `dimensions` field from the response and compute only the Keyword_Match dimension as the composite score, maintaining full backward compatibility with Requirement 10

### Requirement 12: Industry Skills Taxonomy

**User Story:** As an applicant, I want the system to recognize that "React", "ReactJS", and "React.js" are the same skill and that "AWS" means "Amazon Web Services", so that my resume is matched accurately without requiring AI API calls for synonym resolution.

#### Acceptance Criteria

1. THE ATS_Scorer SHALL maintain a local skills taxonomy as a static TypeScript data structure (not fetched from an external API) that maps skill synonyms, abbreviations, categories, and industry relevance for at least 200 skill entries across at least 8 industry categories
2. THE ATS_Scorer SHALL use the skills taxonomy to resolve synonym matches during local keyword matching: WHEN a job description keyword has one or more synonym entries in the taxonomy and the resume contains any of those synonyms, THE ATS_Scorer SHALL report the keyword as matched with matchType "synonym" and the matched synonym as the matchedText value
3. THE ATS_Scorer SHALL use the skills taxonomy to resolve abbreviation matches: WHEN a job description keyword is an abbreviation listed in the taxonomy (e.g., "AWS", "k8s", "ML") and the resume contains the expanded form (e.g., "Amazon Web Services", "Kubernetes", "Machine Learning") or vice versa, THE ATS_Scorer SHALL report the keyword as matched with matchType "synonym"
4. THE Resume_Parser SHALL use the skills taxonomy during skill extraction to canonicalize extracted skill names to their primary form as defined in the taxonomy (e.g., extracted "ReactJS" is stored as "React", extracted "k8s" is stored as "Kubernetes"), while preserving the original extracted text in a separate `rawName` field
5. THE skills taxonomy SHALL organize each skill entry with the following fields: `canonical` (primary skill name), `synonyms` (array of alternative names including abbreviations), `category` (skill category such as "Programming Languages", "Cloud Platforms", "DevOps", "Databases", "Frameworks"), and `industries` (array of industry identifiers where the skill has elevated relevance such as "software-engineering", "data-science", "devops", "finance", "healthcare")
6. WHEN the Enhancement_Layer is available, THE ATS_Scorer SHALL still use the local taxonomy for synonym resolution first, then use AI only for matches that the taxonomy does not cover (contextual inference and domain-specific equivalences not in the static taxonomy)
7. IF a skill extracted from the resume does not appear in the taxonomy (neither as a canonical name nor as a synonym), THEN THE Resume_Parser SHALL retain the skill with its original extracted name as the canonical name without modification
8. THE skills taxonomy SHALL be loadable and searchable in under 50 milliseconds at application startup, requiring no network calls, no file system reads at query time (the taxonomy is compiled into the application bundle or loaded once at module initialization)

### Requirement 13: Groq LLM Provider as Additional Fallback

**User Story:** As a system operator, I want Groq added as a third LLM provider in the Enhancement Layer fallback chain, so that the system has three independent free-tier AI providers before falling back to local-only mode, maximizing AI availability without cost.

#### Acceptance Criteria

1. THE Enhancement_Layer SHALL support a provider chain of three LLM providers in this priority order: Gemini (primary), OpenAI (first fallback), Groq with Llama 3.3 70B model (second fallback); each provider is attempted only when all higher-priority providers have failed for the current request
2. WHEN the Gemini provider fails (quota exceeded, network error, timeout, or malformed response) AND the OpenAI provider fails (quota exceeded, network error, timeout, or malformed response), THEN THE Enhancement_Layer SHALL attempt the request using the Groq provider with the Llama 3.3 70B model before falling back to local-only mode
3. THE Enhancement_Layer SHALL authenticate with the Groq API using the `GROQ_API_KEY` environment variable; IF the environment variable is not set or is empty, THEN THE Enhancement_Layer SHALL skip the Groq provider in the chain and proceed directly to local-only fallback after OpenAI failure
4. THE Enhancement_Layer SHALL use the existing `completeWithCache` infrastructure for Groq requests, applying the same caching, timeout (10 seconds maximum), and response parsing logic used for Gemini and OpenAI providers
5. IF the Groq provider returns a quota-exceeded response, THEN THE Enhancement_Layer SHALL record the timestamp and suppress further Groq API calls for the remainder of the current calendar hour, consistent with the quota suppression behavior defined in Requirement 7 acceptance criterion 8
6. IF all three providers (Gemini, OpenAI, Groq) fail or are quota-suppressed, THEN THE Enhancement_Layer SHALL fall back to local-only mode without error propagation to the caller, consistent with Requirement 7 acceptance criteria 5 and 6
7. THE Enhancement_Layer SHALL log provider transitions at the "info" log level, recording which provider was attempted and why it failed (quota, timeout, network error, malformed response), so that operators can monitor provider availability without inspecting individual request logs
8. WHEN the Groq provider is available and processes a request successfully, THE Enhancement_Layer SHALL parse the Groq response using the same JSON extraction and validation logic applied to Gemini and OpenAI responses, requiring no provider-specific response handling in consuming modules (ATS_Scorer and Resume_Parser)
