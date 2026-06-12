/**
 * Shared TypeScript types and interfaces for the AI-Powered Job Matching Platform.
 *
 * These types map directly to the Supabase PostgreSQL database schema
 * and define API request/response contracts for Next.js API routes.
 */

// ============================================================================
// Domain Types (Database Models)
// ============================================================================

/**
 * User profile extending Supabase auth.users.
 * Stores role, login security fields, and user metadata.
 */
export interface Profile {
  /** UUID primary key referencing auth.users(id) */
  id: string;
  /** User's email address */
  email: string;
  /** User's display name */
  name: string;
  /** User role determining platform access and views */
  role: 'applicant' | 'hr_user';
  /** Counter for consecutive failed login attempts (default 0) */
  failed_login_attempts: number;
  /** ISO timestamp until which the account is locked, null if not locked */
  locked_until: string | null;
  /** ISO timestamp of profile creation */
  created_at: string;
  /** ISO timestamp of last profile update */
  updated_at: string;
}

/**
 * Applicant's skill profile containing resume data and metadata.
 * Each applicant has exactly one skill profile (unique on user_id).
 */
export interface SkillProfile {
  /** UUID primary key */
  id: string;
  /** UUID referencing the owning profile */
  user_id: string;
  /** Path to the uploaded resume file in Supabase Storage */
  resume_file_path?: string | null;
  /** Raw text content extracted from the resume */
  raw_resume_text?: string | null;
  /** ISO timestamp of skill profile creation */
  created_at: string;
  /** ISO timestamp of last skill profile update */
  updated_at: string;
}

/**
 * Individual skill linked to an applicant's skill profile.
 */
export interface Skill {
  /** UUID primary key */
  id: string;
  /** UUID referencing the parent skill_profile */
  skill_profile_id: string;
  /** Name of the skill (e.g., "React", "Python") */
  name: string;
  /** Self-assessed or parsed proficiency level */
  proficiency_level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  /** How this skill was added to the profile */
  source: 'resume_parsed' | 'manual';
  /** ISO timestamp of when the skill was added */
  created_at: string;
}

/**
 * Job description posted by an HR user.
 */
export interface JobDescription {
  /** UUID primary key */
  id: string;
  /** UUID of the HR user who created this job posting */
  hr_user_id: string;
  /** Job title */
  title: string;
  /** Full job description text */
  description: string;
  /** Optional qualifications text */
  qualifications?: string | null;
  /** Current publication status of the job posting */
  status: 'draft' | 'published' | 'closed';
  /** ISO timestamp of job creation */
  created_at: string;
  /** ISO timestamp of last job update */
  updated_at: string;
}

/**
 * A required or preferred skill for a job description.
 */
export interface JobRequiredSkill {
  /** UUID primary key */
  id: string;
  /** UUID of the parent job description */
  job_description_id: string;
  /** Name of the required/preferred skill */
  skill_name: string;
  /** Whether this skill is required or merely preferred */
  importance: 'required' | 'preferred';
  /** ISO timestamp of when this skill requirement was added */
  created_at: string;
}

/**
 * Result of matching an applicant's skill profile against a job description.
 * Unique constraint on (applicant_id, job_description_id).
 */
export interface MatchResult {
  /** UUID primary key */
  id: string;
  /** UUID of the matched applicant */
  applicant_id: string;
  /** UUID of the matched job description */
  job_description_id: string;
  /** Calculated match score, integer between 0 and 100 inclusive */
  match_percentage: number;
  /** Skills from the applicant's profile that matched the job requirements */
  matched_skills: string[];
  /** Skills required by the job that the applicant is missing */
  missing_skills: string[];
  /** ISO timestamp of when this match was calculated */
  calculated_at: string;
}

/**
 * AI-generated recommendation for an applicant to improve their match
 * against a specific job description.
 */
export interface Recommendation {
  /** UUID primary key */
  id: string;
  /** UUID of the applicant receiving the recommendation */
  applicant_id: string;
  /** UUID of the job description this recommendation targets */
  job_description_id: string;
  /** Type of suggestion: add a new skill or improve an existing one */
  suggestion_type: 'skill_to_add' | 'skill_to_improve';
  /** Name of the skill to add or improve */
  skill_name: string;
  /** Detailed description of the recommendation */
  description: string;
  /** Estimated impact on match percentage (1-10 scale, 10 = highest impact) */
  impact_score: number;
  /** ISO timestamp of when this recommendation was generated */
  created_at: string;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * Request body for POST /api/match/calculate.
 * Triggers match calculation for a specific applicant-job pair or in batch mode.
 */
export interface MatchCalculationRequest {
  /** UUID of the applicant to calculate match for (optional for batch mode) */
  applicant_id?: string;
  /** UUID of the job description to calculate match against (optional for batch mode) */
  job_description_id?: string;
}

/**
 * Response body for POST /api/match/calculate.
 */
export interface MatchCalculationResponse {
  /** Whether the calculation completed successfully */
  success: boolean;
  /** Array of calculated match results */
  results: MatchResult[];
  /** Error message if calculation failed */
  error?: string;
}

/**
 * Request body for POST /api/recommendations/generate.
 * Generates AI recommendations for an applicant-job pair.
 */
export interface RecommendationGenerateRequest {
  /** UUID of the applicant to generate recommendations for */
  applicant_id: string;
  /** UUID of the job description to generate recommendations against */
  job_description_id: string;
}

/**
 * Response body for POST /api/recommendations/generate.
 */
export interface RecommendationGenerateResponse {
  /** Whether the generation completed successfully */
  success: boolean;
  /** Array of generated recommendations, sorted by impact_score descending */
  recommendations: Recommendation[];
  /** Error message if generation failed */
  error?: string;
}

/**
 * Response body for POST /api/resume/parse.
 * Returns extracted skills from a parsed resume file.
 */
export interface ResumeParseResponse {
  /** Whether the parsing completed successfully */
  success: boolean;
  /** Array of extracted skills with proficiency levels */
  skills: Array<{
    /** Extracted skill name */
    name: string;
    /** Inferred proficiency level */
    proficiency_level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  }>;
  /** Raw text extracted from the resume */
  raw_text?: string;
  /** Error message if parsing failed */
  error?: string;
}
