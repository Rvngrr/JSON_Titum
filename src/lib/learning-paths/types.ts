/**
 * Shared TypeScript interfaces and types for the Learning Paths feature.
 *
 * These types define the data contracts for course recommendations,
 * skill gap analysis, URL validation, and API responses used across
 * the learning paths modules and components.
 */

// ============================================================================
// Platform and Catalog Types
// ============================================================================

/**
 * Supported online learning platform identifiers.
 * Each platform has approved URL patterns for course link validation.
 */
export type CoursePlatform =
  | 'Coursera'
  | 'Udemy'
  | 'DataCamp'
  | 'LinkedIn Learning'
  | 'edX'
  | 'Pluralsight'
  | 'Codecademy';

/**
 * A single course entry in the static catalog.
 * Represents a pre-verified course from a supported platform.
 */
export interface CatalogCourseEntry {
  /** Course title as displayed on the platform */
  title: string;
  /** Platform hosting the course */
  platform: CoursePlatform;
  /** Direct URL to the course page */
  url: string;
  /** Skills this course covers (used for skill-to-course mapping) */
  skills: string[];
  /** Estimated duration in hours */
  durationHours: number;
  /** Whether the course offers a certificate upon completion */
  hasCertificate: boolean;
}

// ============================================================================
// URL Validation Types
// ============================================================================

/**
 * Approved URL pattern for a learning platform.
 * Used to validate that course links point to legitimate platform pages.
 */
export interface ApprovedUrlPattern {
  /** Domain of the platform (e.g., "coursera.org") */
  domain: string;
  /** Required path prefix for course URLs (e.g., "/learn/") */
  pathPrefix: string;
}

// ============================================================================
// Skill Gap Types
// ============================================================================

/**
 * Aggregated skill gap with metadata about its source and frequency.
 * Produced by merging missing skills from match results and career goals.
 */
export interface AggregatedSkillGap {
  /** Name of the missing skill */
  skillName: string;
  /** Number of matched jobs requiring this skill */
  jobCount: number;
  /** Total number of matched jobs for the applicant */
  totalJobs: number;
  /** Source of the skill gap identification */
  source: 'Job Matches' | 'Career Goal' | 'Both';
}

// ============================================================================
// Hidden Gem / Urgency Types
// ============================================================================

/**
 * A job the applicant is "almost qualified for" — would unlock by learning one skill.
 * Used to create urgency and FOMO on the Learning Paths page.
 */
export interface HiddenGemJob {
  /** Job ID for linking */
  jobId: string;
  /** Job title */
  title: string;
  /** Current match percentage */
  currentMatch: number;
  /** Projected match after learning the skill */
  projectedMatch: number;
}

/**
 * Hidden gem urgency data for a specific skill gap.
 * Shows how many near-miss jobs would be unlocked by learning this skill.
 */
export interface HiddenGemInfo {
  /** Number of jobs where this is the only (or one of few) missing skills */
  unlockableJobCount: number;
  /** Top near-miss jobs that would be unlocked (max 3) */
  topJobs: HiddenGemJob[];
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * API response shape for GET /api/learning-paths.
 * Contains grouped course recommendations organized by skill gap.
 */
export interface LearningPathResponse {
  /** Whether the request completed successfully */
  success: boolean;
  /** Array of skill gap groups with their course recommendations */
  data: SkillGapGroup[];
  /** Summary urgency stats */
  urgency?: UrgencySummary;
  /** Error message if the request failed */
  error?: string;
}

/**
 * Top-level urgency summary for the page hero banner.
 */
export interface UrgencySummary {
  /** Total hidden gem jobs across all skill gaps */
  totalHiddenGems: number;
  /** The single most impactful skill to learn */
  topSkill: string;
  /** How many jobs the top skill would unlock */
  topSkillUnlocks: number;
}

/**
 * A skill gap group containing the skill metadata and its course recommendations.
 */
export interface SkillGapGroup {
  /** The aggregated skill gap information */
  skill: AggregatedSkillGap;
  /** Course recommendations for this skill gap */
  courses: CourseRecommendation[];
  /** Hidden gem urgency data — jobs that would be unlocked by learning this skill */
  hiddenGems?: HiddenGemInfo;
}

/**
 * A single course recommendation with scoring and display metadata.
 */
export interface CourseRecommendation {
  /** Course title as displayed on the platform */
  title: string;
  /** Platform hosting the course */
  platform: CoursePlatform;
  /** Direct URL to the course page (validated against approved patterns) */
  url: string;
  /** The specific skill this course addresses */
  skill: string;
  /** Estimated duration in hours */
  durationHours: number;
  /** Whether the course offers a certificate upon completion */
  hasCertificate: boolean;
  /** Calculated relevance/impact score for ranking recommendations */
  impactScore: number;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Approved URL patterns for all supported learning platforms.
 * Course URLs must match one of these domain + path prefix combinations
 * to be included in recommendations.
 */
export const APPROVED_URL_PATTERNS: ApprovedUrlPattern[] = [
  { domain: "coursera.org", pathPrefix: "/learn/" },
  { domain: "udemy.com", pathPrefix: "/course/" },
  { domain: "datacamp.com", pathPrefix: "/courses/" },
  { domain: "linkedin.com", pathPrefix: "/learning/" },
  { domain: "edx.org", pathPrefix: "/learn/" },
  { domain: "pluralsight.com", pathPrefix: "/courses/" },
  { domain: "codecademy.com", pathPrefix: "/learn/" },
];
