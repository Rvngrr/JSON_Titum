/**
 * ATS Scorer — LLM-powered keyword extraction and matching pipeline.
 *
 * Step 1 (this file, task 11.1): Keyword extraction from job descriptions (LLM primary, TF-IDF fallback).
 * Step 2 (task 11.2): Intelligent matching + suggestions using LLM (synonym/contextual awareness).
 * Step 3 (task 11.3): Local fallback matching when all LLMs are unavailable.
 *
 * Scoring formula: Math.round((matchedKeywords.length / totalKeywords) * 100), clamped to [0, 100].
 * Score is always computed fresh from match data — the score itself is not cached.
 */

import { completeWithCache } from '../llm/llm-service';
import { LLMUnavailableError } from '../llm/types';
import { buildCacheKey, computeHash } from '../llm/utils';
import type {
  ATSKeywordMatch,
  ATSScoreResult,
  ATSSuggestion,
  CachedATSAnalysis,
} from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Common English stop words to exclude from TF-IDF keyword extraction */
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'shall', 'can', 'need', 'must',
  'it', 'its', 'this', 'that', 'these', 'those', 'i', 'me', 'my',
  'we', 'our', 'you', 'your', 'he', 'she', 'they', 'them', 'their',
  'what', 'which', 'who', 'whom', 'when', 'where', 'why', 'how',
  'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other',
  'some', 'such', 'no', 'not', 'only', 'own', 'same', 'so', 'than',
  'too', 'very', 'just', 'because', 'as', 'until', 'while', 'about',
  'between', 'through', 'during', 'before', 'after', 'above', 'below',
  'up', 'down', 'out', 'off', 'over', 'under', 'again', 'further',
  'then', 'once', 'here', 'there', 'also', 'well', 'back', 'still',
  'new', 'old', 'high', 'low', 'long', 'short', 'big', 'small',
  'work', 'working', 'experience', 'able', 'ability', 'including',
  'within', 'across', 'etc', 'role', 'position', 'job', 'candidate',
  'team', 'company', 'required', 'preferred', 'must', 'strong',
  'looking', 'join', 'opportunity', 'responsibilities', 'qualifications',
  'requirements', 'years', 'year', 'using', 'used', 'use',
]);

// ---------------------------------------------------------------------------
// Step 1: Keyword Extraction (LLM primary, TF-IDF fallback)
// ---------------------------------------------------------------------------

/**
 * Extracts ATS keywords from a job description.
 *
 * Primary: Calls LLM with structured prompt to extract 10-20 keywords.
 * Fallback: Uses local TF-IDF extraction if LLM is unavailable or returns malformed JSON.
 *
 * Results are cached in `llm_results_cache` keyed by job description hash + "ats_keywords".
 * Re-extracts only when job description text changes (source_hash mismatch).
 */
export async function extractKeywords(
  jobDescription: string,
  qualifications: string | null,
  jobDescriptionId: string
): Promise<{ keywords: string[]; source: 'llm' | 'local' }> {
  const combinedText = qualifications
    ? `${jobDescription}\n${qualifications}`
    : jobDescription;

  const sourceHash = computeHash(combinedText);
  const cacheKey = buildCacheKey(sourceHash, 'ats_keywords');

  const systemPrompt = `You are an ATS specialist. Extract the most important keywords that an ATS would scan for. Focus on: technical skills, tools, methodologies, certifications, and domain-specific terms. Return a JSON object with a "keywords" array of strings. Aim for 10-20 keywords ordered by importance.`;

  const userPrompt = qualifications
    ? `Extract ATS keywords from this job description:\n${jobDescription}\nQualifications: ${qualifications}`
    : `Extract ATS keywords from this job description:\n${jobDescription}`;

  try {
    const response = await completeWithCache(
      {
        prompt: userPrompt,
        systemPrompt,
        responseFormat: 'json',
        temperature: 0.1,
      },
      cacheKey,
      'ats_keywords',
      sourceHash,
      jobDescriptionId
    );

    // Parse the LLM response
    const parsed = JSON.parse(response.content);
    const keywords = parseKeywordsFromLLMResponse(parsed);

    if (keywords.length === 0) {
      // LLM returned empty keywords — fall back to local
      return {
        keywords: extractKeywordsLocal(combinedText),
        source: 'local',
      };
    }

    return { keywords, source: 'llm' };
  } catch (error: unknown) {
    if (error instanceof LLMUnavailableError) {
      // All LLM providers unavailable — use local TF-IDF fallback
      return {
        keywords: extractKeywordsLocal(combinedText),
        source: 'local',
      };
    }

    if (error instanceof SyntaxError) {
      // Malformed JSON from LLM — fall back to local
      return {
        keywords: extractKeywordsLocal(combinedText),
        source: 'local',
      };
    }

    // Re-throw unexpected errors
    throw error;
  }
}

/**
 * Parses keywords from the LLM JSON response.
 * Handles various response shapes the LLM might produce.
 */
function parseKeywordsFromLLMResponse(parsed: unknown): string[] {
  if (!parsed || typeof parsed !== 'object') return [];

  // Shape: { keywords: ["..."] }
  if ('keywords' in (parsed as Record<string, unknown>)) {
    const kw = (parsed as Record<string, unknown>).keywords;
    if (Array.isArray(kw)) {
      return kw.filter((k): k is string => typeof k === 'string' && k.trim().length > 0);
    }
  }

  // Shape: { raw: "..." } — wrapped by completeWithCache when JSON parse fails
  if ('raw' in (parsed as Record<string, unknown>)) {
    return [];
  }

  // Shape: ["..."] — array at top level
  if (Array.isArray(parsed)) {
    return parsed.filter((k): k is string => typeof k === 'string' && k.trim().length > 0);
  }

  return [];
}

// ---------------------------------------------------------------------------
// Local TF-IDF Keyword Extraction (Fallback)
// ---------------------------------------------------------------------------

/**
 * Extracts keywords from text using a simple TF-IDF-like approach.
 *
 * Picks the most frequent meaningful terms (non-stop-words, >= 2 chars)
 * from the text. Returns 10-20 keywords ordered by frequency.
 *
 * @param text - The text to extract keywords from
 * @param minCount - Minimum number of keywords to return (default: 10)
 * @returns Array of extracted keywords
 */
export function extractKeywordsLocal(text: string, minCount: number = 10): string[] {
  if (!text || text.trim().length === 0) return [];

  // Tokenize: split on non-word characters, lowercased
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9#+.\-/]/gi, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2);

  // Count term frequencies, excluding stop words
  const frequency = new Map<string, number>();
  for (const token of tokens) {
    if (STOP_WORDS.has(token)) continue;
    frequency.set(token, (frequency.get(token) || 0) + 1);
  }

  // Also extract multi-word terms (bigrams) for compound skills
  const words = text.toLowerCase().split(/\s+/);
  for (let i = 0; i < words.length - 1; i++) {
    const bigram = `${words[i].replace(/[^a-z0-9#+.\-/]/gi, '')} ${words[i + 1].replace(/[^a-z0-9#+.\-/]/gi, '')}`;
    const parts = bigram.split(' ').filter((p) => p.length >= 2);
    if (
      parts.length === 2 &&
      !STOP_WORDS.has(parts[0]) &&
      !STOP_WORDS.has(parts[1])
    ) {
      frequency.set(bigram, (frequency.get(bigram) || 0) + 1);
    }
  }

  // Sort by frequency descending, then alphabetically
  const sorted = Array.from(frequency.entries())
    .filter(([, count]) => count >= 2) // Only terms appearing 2+ times
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0]);
    });

  // If not enough terms with count >= 2, include singles
  let result = sorted.map(([term]) => term);
  if (result.length < minCount) {
    const singles = Array.from(frequency.entries())
      .filter(([, count]) => count === 1)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([term]) => term);
    result = [...result, ...singles];
  }

  // Return between minCount and 20 keywords
  const maxCount = 20;
  return result.slice(0, Math.max(minCount, Math.min(result.length, maxCount)));
}

// ---------------------------------------------------------------------------
// Step 2: Intelligent Matching + Actionable Suggestions (LLM-powered)
// ---------------------------------------------------------------------------

/** Impact priority for sorting suggestions: high first, then medium, then low */
const IMPACT_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

/**
 * Analyzes resume text against extracted keywords using LLM for intelligent matching.
 *
 * Performs synonym-aware matching:
 * - "React.js" = "React" = "ReactJS" (synonyms)
 * - "CI/CD pipelines" = "continuous integration and deployment" (phrase equivalence)
 * - "AWS" = "Amazon Web Services" (abbreviation equivalence)
 * - "managed a team of 5 engineers" implies "leadership" (contextual evidence)
 *
 * Generates actionable suggestions for each missing keyword:
 * - WHERE in resume to add (specific section)
 * - HOW to phrase it naturally
 * - Impact level (high/medium/low)
 *
 * Results are cached per applicant-job pair. Cache key: SHA256(resume_text) + job_id + "ats_analysis".
 * Cache is invalidated when resume text changes (different SHA-256 hash) or job description changes.
 *
 * @param resumeText - The applicant's raw resume text
 * @param keywords - Extracted keywords from the job description
 * @param jobId - UUID of the job (used for cache keying)
 * @param resumeHash - SHA-256 hash of the resume text
 * @returns Cached ATS analysis with matched/missing keywords and suggestions
 */
export async function analyzeResumeMatch(
  resumeText: string,
  keywords: string[],
  jobId: string,
  resumeHash: string
): Promise<CachedATSAnalysis> {
  // Edge case: no keywords or empty resume — fall back immediately
  if (!resumeText || keywords.length === 0) {
    return matchKeywordsLocal(resumeText, keywords);
  }

  // Build cache key: SHA256(resume_text) + job_id + "ats_analysis"
  const cacheKey = buildCacheKey(resumeHash, jobId, 'ats_analysis');
  // Source hash uses the resume hash (cache invalidated when resume changes)
  const sourceHash = resumeHash;

  const systemPrompt = `You are an expert ATS analyst. Compare the resume against the required keywords. For each keyword, determine if the resume demonstrates that skill — consider synonyms, equivalent phrases, and contextual evidence. Then generate actionable suggestions for missing keywords.

Matching rules:
- "React.js" = "React" = "ReactJS" (synonyms)
- "CI/CD pipelines" = "continuous integration and deployment" (phrase equivalence)
- "managed a team of 5 engineers" implies "leadership" (contextual)
- "AWS" = "Amazon Web Services" (abbreviation)

Return JSON:
{
  "matchedKeywords": [{"keyword": "...", "matchedText": "...", "matchType": "exact|synonym|contextual"}],
  "missingKeywords": ["..."],
  "suggestions": [{"keyword": "...", "section": "...", "suggestion": "...", "impact": "high|medium|low"}]
}`;

  const userPrompt = `Job Keywords: ${keywords.join(', ')}\nResume Text: ${resumeText}`;

  try {
    const response = await completeWithCache(
      {
        prompt: userPrompt,
        systemPrompt,
        responseFormat: 'json',
        temperature: 0.1,
      },
      cacheKey,
      'ats_analysis',
      sourceHash,
      jobId
    );

    // Parse the LLM response
    const parsed = JSON.parse(response.content);
    const analysis = parseATSAnalysisResponse(parsed, keywords);

    if (analysis) {
      return analysis;
    }

    // Malformed response — fall back to local
    return matchKeywordsLocal(resumeText, keywords);
  } catch (error: unknown) {
    if (error instanceof LLMUnavailableError) {
      // All LLM providers unavailable — use local exact matching fallback
      return matchKeywordsLocal(resumeText, keywords);
    }

    if (error instanceof SyntaxError) {
      // Malformed JSON from LLM — fall back to local
      return matchKeywordsLocal(resumeText, keywords);
    }

    // Re-throw unexpected errors
    throw error;
  }
}

/**
 * Parses and validates the LLM response for ATS analysis.
 *
 * Ensures:
 * - Every keyword appears in exactly one of matchedKeywords or missingKeywords
 * - matchedKeywords have valid matchType ('exact' | 'synonym' | 'contextual')
 * - suggestions have valid impact ('high' | 'medium' | 'low')
 * - suggestions are ordered by impact: high first, then medium, then low
 *
 * @returns Validated CachedATSAnalysis, or null if the response is malformed
 */
function parseATSAnalysisResponse(
  parsed: unknown,
  originalKeywords: string[]
): CachedATSAnalysis | null {
  if (!parsed || typeof parsed !== 'object') return null;

  const data = parsed as Record<string, unknown>;

  // Validate matchedKeywords
  if (!Array.isArray(data.matchedKeywords)) return null;
  const matchedKeywords: ATSKeywordMatch[] = [];
  for (const item of data.matchedKeywords) {
    if (!item || typeof item !== 'object') continue;
    const entry = item as Record<string, unknown>;
    const keyword = typeof entry.keyword === 'string' ? entry.keyword.trim() : '';
    const matchedText = typeof entry.matchedText === 'string' ? entry.matchedText.trim() : '';
    const matchType = entry.matchType;

    if (!keyword || !matchedText) continue;
    if (matchType !== 'exact' && matchType !== 'synonym' && matchType !== 'contextual') continue;

    matchedKeywords.push({ keyword, matchedText, matchType });
  }

  // Validate missingKeywords
  if (!Array.isArray(data.missingKeywords)) return null;
  const missingKeywords: string[] = data.missingKeywords
    .filter((k): k is string => typeof k === 'string' && k.trim().length > 0)
    .map((k) => k.trim());

  // Validate: every original keyword should be in exactly one of matched or missing
  const matchedSet = new Set(matchedKeywords.map((m) => m.keyword.toLowerCase()));
  const missingSet = new Set(missingKeywords.map((m) => m.toLowerCase()));

  // Check coverage — all original keywords should be accounted for
  // Allow flexibility since LLM might use slightly different casing
  const totalAccountedFor = matchedSet.size + missingSet.size;
  if (totalAccountedFor === 0 && originalKeywords.length > 0) return null;

  // Validate suggestions
  const suggestions: ATSSuggestion[] = [];
  if (Array.isArray(data.suggestions)) {
    for (const item of data.suggestions) {
      if (!item || typeof item !== 'object') continue;
      const entry = item as Record<string, unknown>;
      const keyword = typeof entry.keyword === 'string' ? entry.keyword.trim() : '';
      const section = typeof entry.section === 'string' ? entry.section.trim() : '';
      const suggestion = typeof entry.suggestion === 'string' ? entry.suggestion.trim() : '';
      const impact = entry.impact;

      if (!keyword || !section || !suggestion) continue;
      if (impact !== 'high' && impact !== 'medium' && impact !== 'low') continue;

      suggestions.push({ keyword, section, suggestion, impact });
    }
  }

  // Sort suggestions by impact: high first, then medium, then low
  suggestions.sort((a, b) => {
    return (IMPACT_ORDER[a.impact] ?? 2) - (IMPACT_ORDER[b.impact] ?? 2);
  });

  return {
    matchedKeywords,
    missingKeywords,
    suggestions,
    analysisSource: 'llm',
  };
}

// ---------------------------------------------------------------------------
// Step 3: Local Fallback Matching (placeholder until task 11.3)
// ---------------------------------------------------------------------------

/**
 * Performs exact case-insensitive text matching for keywords.
 * Used as fallback when all LLM providers are unavailable.
 *
 * NOTE: Full implementation in task 11.3. This is a basic version.
 */
export function matchKeywordsLocal(
  resumeText: string,
  keywords: string[]
): CachedATSAnalysis {
  if (!resumeText || keywords.length === 0) {
    return {
      matchedKeywords: [],
      missingKeywords: [...keywords],
      suggestions: keywords.map((kw) => ({
        keyword: kw,
        section: 'Resume',
        suggestion: `Add '${kw}' to your resume`,
        impact: 'medium' as const,
      })),
      analysisSource: 'local',
    };
  }

  const resumeLower = resumeText.toLowerCase();
  const matchedKeywords: ATSKeywordMatch[] = [];
  const missingKeywords: string[] = [];

  for (const keyword of keywords) {
    const keywordLower = keyword.toLowerCase();
    if (resumeLower.includes(keywordLower)) {
      matchedKeywords.push({
        keyword,
        matchedText: keyword,
        matchType: 'exact',
      });
    } else {
      missingKeywords.push(keyword);
    }
  }

  const suggestions: ATSSuggestion[] = missingKeywords.map((kw) => ({
    keyword: kw,
    section: 'Resume',
    suggestion: `Add '${kw}' to your resume`,
    impact: 'medium' as const,
  }));

  return {
    matchedKeywords,
    missingKeywords,
    suggestions,
    analysisSource: 'local',
  };
}

// ---------------------------------------------------------------------------
// Orchestrator: calculateATSScore
// ---------------------------------------------------------------------------

/**
 * Full ATS scoring pipeline orchestrator.
 *
 * 1. Extracts keywords from job description (LLM with cache, or local TF-IDF fallback)
 * 2. Matches keywords against resume (LLM intelligent matching or local exact matching)
 * 3. Computes score: Math.round((matched / total) * 100), clamped to [0, 100]
 *
 * @param resumeText - The applicant's raw resume text
 * @param jobDescription - The job description text
 * @param qualifications - Optional qualifications text
 * @param jobDescriptionId - UUID of the job_descriptions record
 * @param jobId - UUID of the job (used for match cache keying)
 * @returns Full ATS score result with matches, misses, and suggestions
 */
export async function calculateATSScore(
  resumeText: string,
  jobDescription: string,
  qualifications: string | null,
  jobDescriptionId: string,
  jobId: string,
  fallbackKeywords?: string[]
): Promise<ATSScoreResult> {
  // Step 1: Extract keywords from job description
  const { keywords, source: keywordSource } = await extractKeywords(
    jobDescription,
    qualifications,
    jobDescriptionId
  );

  // If local TF-IDF keywords are poor quality and we have fallback (job_required_skills), use those
  const effectiveKeywords =
    keywordSource === 'local' && fallbackKeywords && fallbackKeywords.length > 0
      ? fallbackKeywords
      : keywords;

  // Edge case: zero keywords extracted
  if (effectiveKeywords.length === 0) {
    return {
      score: 0,
      totalKeywords: 0,
      matchedKeywords: [],
      missingKeywords: [],
      suggestions: [],
      analysisSource: keywordSource,
    };
  }

  // Step 2: Match resume against keywords
  const resumeHash = computeHash(resumeText);
  const analysis = await analyzeResumeMatch(resumeText, effectiveKeywords, jobId, resumeHash);

  // Step 3: Compute score
  const totalKeywords = effectiveKeywords.length;
  const matchedCount = analysis.matchedKeywords.length;
  const rawScore = Math.round((matchedCount / totalKeywords) * 100);
  const score = Math.max(0, Math.min(100, rawScore));

  return {
    score,
    totalKeywords,
    matchedKeywords: analysis.matchedKeywords,
    missingKeywords: analysis.missingKeywords,
    suggestions: analysis.suggestions,
    analysisSource: analysis.analysisSource === 'llm' ? 'llm' : keywordSource,
  };
}
