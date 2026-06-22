import type { LLMProvider } from '../llm/types';

/**
 * Result of analyzing proficiency for a single skill.
 */
export interface ProficiencyResult {
  skillName: string;
  level: 'beginner' | 'intermediate' | 'expert';
  /** The text snippet that determined the proficiency level */
  evidence: string;
  /** 0-1, confidence from LLM or local analysis */
  confidence: number;
}

/**
 * Metadata about the method used for proficiency analysis.
 */
export interface ProficiencyAnalysisSource {
  method: 'llm' | 'local';
  provider?: LLMProvider;
}

/**
 * Batch result of proficiency analysis for multiple skills.
 */
export interface ProficiencyBatchResult {
  results: ProficiencyResult[];
  source: ProficiencyAnalysisSource;
}

/**
 * Dimension scores for multi-dimensional ATS scoring.
 * Each dimension is an integer in [0, 100].
 */
export interface DimensionScores {
  keywordMatch: number;        // 0-100
  sectionCompleteness: number; // 0-100
  experienceQuality: number;   // 0-100
  educationRelevance: number;  // 0-100
  formatting: number;          // 0-100
}

/**
 * Full ATS score result including matches, misses, and suggestions.
 */
export interface ATSScoreResult {
  /** Score from 0-100 */
  score: number;
  totalKeywords: number;
  matchedKeywords: ATSKeywordMatch[];
  missingKeywords: string[];
  suggestions: ATSSuggestion[];
  /** Whether LLM or local fallback was used */
  analysisSource: 'llm' | 'local';
  /** Optional multi-dimensional breakdown, omitted if not requested */
  dimensions?: DimensionScores;
}

/**
 * A single keyword match between a job requirement and the resume.
 */
export interface ATSKeywordMatch {
  /** The job keyword that was matched */
  keyword: string;
  /** What in the resume matched this keyword */
  matchedText: string;
  /** How the match was determined */
  matchType: 'exact' | 'synonym' | 'contextual';
}

/**
 * An actionable suggestion for improving ATS compatibility.
 */
export interface ATSSuggestion {
  /** The missing keyword to address */
  keyword: string;
  /** Where to add it (e.g., "Skills", "Experience at Company X") */
  section: string;
  /** Specific actionable text */
  suggestion: string;
  /** How much this would improve the score */
  impact: 'high' | 'medium' | 'low';
}

/**
 * Cached keywords extracted from a job description.
 */
export interface CachedKeywords {
  jobDescriptionId: string;
  keywords: string[];
  extractedAt: string;
  source: 'llm' | 'local';
}

/**
 * Cached ATS analysis result for an applicant-job pair.
 */
export interface CachedATSAnalysis {
  matchedKeywords: ATSKeywordMatch[];
  missingKeywords: string[];
  suggestions: ATSSuggestion[];
  analysisSource: 'llm' | 'local';
}

/**
 * Result of Hidden Gem detection for an applicant-job pair.
 */
export interface HiddenGemResult {
  isHiddenGem: boolean;
  matchPercentage: number;
  missingSkills: string[];
  easySkills: string[];
  hardSkills: string[];
  /** Ratio of easy skills to total missing skills (e.g., 0.75 = 75%) */
  easySkillRatio: number;
}

/**
 * Result of simulating the addition of a single skill.
 */
export interface SkillROIResult {
  skillName: string;
  currentScore: number;
  projectedScore: number;
  scoreDelta: number;
}

/**
 * Combined candidate scoring for "Ready Now" and "High Potential".
 */
export interface CandidateScore {
  /** Current match percentage */
  readyNowScore: number;
  /** Match after simulating 2 easiest skills */
  highPotentialScore: number;
  /** True when difference >= 10 points */
  isHighGrowth: boolean;
  easiestSkillsToLearn: string[];
}

/**
 * At Risk status for a candidate who matches highly with multiple jobs.
 */
export interface AtRiskStatus {
  isAtRisk: boolean;
  /** Number of jobs with 85%+ match */
  highMatchJobCount: number;
  /** Threshold for "At Risk" (3) */
  threshold: number;
}
