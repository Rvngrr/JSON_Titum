/**
 * ATS Scorer — Multi-Dimensional Scoring with local TF-IDF pipeline as primary.
 *
 * Pipeline:
 * 1. Local TF-IDF-based keyword extraction (always runs first)
 * 2. Skills taxonomy synonym resolution for keyword matching
 * 3. Multi-dimensional scoring (5 dimensions with weighted composite)
 * 4. Optional LLM enhancement (additive only)
 *
 * Backward compatible: calculateATSScore signature unchanged.
 * When includeDimensions is not requested, score = matched/total * 100 (legacy behavior).
 */

import { complete, completeWithCache } from '../llm/llm-service';
import type { LLMProvider, LLMRequest, LLMError } from '../llm/types';
import { LLMUnavailableError } from '../llm/types';
import { buildCacheKey, computeHash } from '../llm/utils';
import {
  extractKeywords as extractTFIDFKeywords,
  tokenize,
  buildVector,
  cosineSimilarity,
  computeTFIDF,
} from '../nlp/tfidf';
import { lookupSkill, areSynonyms, canonicalize } from '../nlp/skills-taxonomy';
import { detectSections, getSectionContent } from '../resume-parser/section-detector';
import type { SectionDetectionResult } from '../resume-parser/section-detector';
import type {
  ATSKeywordMatch,
  ATSScoreResult,
  ATSSuggestion,
  CachedATSAnalysis,
  DimensionScores,
} from './types';

// ---------------------------------------------------------------------------
// Enhancement Orchestrator Types
// ---------------------------------------------------------------------------

export interface EnhancementResult {
  additionalMatches: ATSKeywordMatch[];
  refinedKeywords: string[];
  applied: boolean;
  provider: LLMProvider | null;
}

export interface QuotaState {
  suppressedUntil: number | null; // Unix timestamp (end of current calendar hour)
}

// ---------------------------------------------------------------------------
// Enhancement Orchestrator — Quota Suppression (Algorithm 7)
// ---------------------------------------------------------------------------

/** Module-level quota state */
let quotaSuppressedUntil: number | null = null;

/**
 * Check if enhancement is available (quota not suppressed).
 * Returns false if current time is before the suppression expiry.
 * Automatically clears suppression when the next calendar hour arrives.
 */
export function isEnhancementAvailable(): boolean {
  if (quotaSuppressedUntil === null) return true;
  if (Date.now() >= quotaSuppressedUntil) {
    quotaSuppressedUntil = null; // Reset on new hour
    return true;
  }
  return false;
}

/**
 * Record that a rate limit (quota exceeded) was hit.
 * Suppresses enhancement until the start of the next calendar hour.
 */
export function recordQuotaExceeded(): void {
  const now = new Date();
  const nextHour = new Date(now);
  nextHour.setMinutes(0, 0, 0);
  nextHour.setHours(nextHour.getHours() + 1);
  quotaSuppressedUntil = nextHour.getTime();
}

/**
 * Get current quota state (useful for testing/debugging).
 */
export function getQuotaState(): QuotaState {
  return { suppressedUntil: quotaSuppressedUntil };
}

/**
 * Reset quota state (useful for testing).
 */
export function resetQuotaState(): void {
  quotaSuppressedUntil = null;
}

// ---------------------------------------------------------------------------
// Enhancement Orchestrator — Additive Merge (Algorithm 6)
// ---------------------------------------------------------------------------

/**
 * Merges AI-detected matches into local results (additive-only).
 *
 * POSTCONDITIONS:
 * - result.matchedKeywords is a SUPERSET of localResults.matchedKeywords
 * - result.missingKeywords is a SUBSET of localResults.missingKeywords
 * - No local match is ever removed or downgraded
 * - result.analysisSource = 'llm' if any AI matches were added, else 'local'
 */
export function mergeEnhancement(
  localResults: CachedATSAnalysis,
  aiResults: Partial<CachedATSAnalysis>
): CachedATSAnalysis {
  const merged: CachedATSAnalysis = {
    matchedKeywords: [...localResults.matchedKeywords],
    missingKeywords: [...localResults.missingKeywords],
    suggestions: [...localResults.suggestions],
    analysisSource: localResults.analysisSource,
  };

  const existingMatches = new Set(
    localResults.matchedKeywords.map((m) => m.keyword.toLowerCase())
  );

  let aiMatchesAdded = 0;

  // Add AI-detected matches that local processing missed
  if (aiResults.matchedKeywords) {
    for (const aiMatch of aiResults.matchedKeywords) {
      if (!existingMatches.has(aiMatch.keyword.toLowerCase())) {
        merged.matchedKeywords.push(aiMatch);
        existingMatches.add(aiMatch.keyword.toLowerCase());
        aiMatchesAdded++;

        // Remove from missingKeywords since it's now matched
        merged.missingKeywords = merged.missingKeywords.filter(
          (k) => k.toLowerCase() !== aiMatch.keyword.toLowerCase()
        );

        // Remove corresponding suggestion
        merged.suggestions = merged.suggestions.filter(
          (s) => s.keyword.toLowerCase() !== aiMatch.keyword.toLowerCase()
        );
      }
    }
  }

  merged.analysisSource = aiMatchesAdded > 0 ? 'llm' : 'local';
  return merged;
}

// ---------------------------------------------------------------------------
// Enhancement Orchestrator — Provider Chain + AI Enhancement
// ---------------------------------------------------------------------------

/**
 * Enhance local ATS results with AI analysis (additive-only).
 *
 * Uses provider chain: Gemini → OpenAI → Groq → local-only fallback.
 * All AI failures are silently absorbed — caller never sees AI errors.
 * If a 429 (rate_limit) is received, records quota suppression.
 *
 * @returns EnhancementResult with any additional matches found by AI
 */
export async function enhanceATSResults(
  localResults: CachedATSAnalysis,
  resumeText: string,
  jobDescription: string,
  keywords: string[]
): Promise<EnhancementResult> {
  // Default result when no enhancement is applied
  const noEnhancement: EnhancementResult = {
    additionalMatches: [],
    refinedKeywords: [],
    applied: false,
    provider: null,
  };

  // If quota suppressed, skip enhancement
  if (!isEnhancementAvailable()) {
    return noEnhancement;
  }

  // If no missing keywords, nothing to enhance
  if (localResults.missingKeywords.length === 0) {
    return noEnhancement;
  }

  const systemPrompt = `You are an expert ATS keyword matcher. Given a resume and a list of keywords that were NOT matched by simple text matching, determine if the resume actually demonstrates any of these skills through synonyms, contextual evidence, or equivalent experience.

Only report TRUE matches — do not speculate or guess. A match must be clearly evidenced in the resume text.

Return JSON:
{
  "matchedKeywords": [{"keyword": "...", "matchedText": "...", "matchType": "synonym|contextual"}],
  "refinedKeywords": ["..."]
}

Where:
- matchedKeywords: Keywords from the missing list that ARE actually demonstrated in the resume
- refinedKeywords: Better keyword phrasings that would improve future matching`;

  const userPrompt = `Missing Keywords (not matched locally): ${localResults.missingKeywords.join(', ')}
All Job Keywords: ${keywords.join(', ')}
Resume Text: ${resumeText.substring(0, 3000)}`;

  const request: LLMRequest = {
    prompt: userPrompt,
    systemPrompt,
    responseFormat: 'json',
    temperature: 0.1,
  };

  try {
    // Use the complete function with provider chain: Gemini → OpenAI → Groq
    const response = await complete(request, {
      primaryProvider: 'gemini',
      fallbackProviders: ['openai', 'groq'],
      timeout: 30000,
      maxRetries: 1,
    });

    // Parse AI response
    const parsed = JSON.parse(response.content);
    const aiMatches: ATSKeywordMatch[] = [];
    const refinedKeywords: string[] = [];

    if (parsed && typeof parsed === 'object') {
      // Extract matched keywords
      if (Array.isArray(parsed.matchedKeywords)) {
        for (const item of parsed.matchedKeywords) {
          if (!item || typeof item !== 'object') continue;
          const keyword = typeof item.keyword === 'string' ? item.keyword.trim() : '';
          const matchedText = typeof item.matchedText === 'string' ? item.matchedText.trim() : '';
          const matchType = item.matchType;

          if (!keyword || !matchedText) continue;
          if (matchType !== 'synonym' && matchType !== 'contextual') continue;

          aiMatches.push({ keyword, matchedText, matchType });
        }
      }

      // Extract refined keywords
      if (Array.isArray(parsed.refinedKeywords)) {
        for (const kw of parsed.refinedKeywords) {
          if (typeof kw === 'string' && kw.trim().length > 0) {
            refinedKeywords.push(kw.trim());
          }
        }
      }
    }

    return {
      additionalMatches: aiMatches,
      refinedKeywords,
      applied: aiMatches.length > 0,
      provider: response.provider,
    };
  } catch (error: unknown) {
    // Check if any error in the chain was a rate limit
    if (error instanceof LLMUnavailableError) {
      for (const err of error.errors) {
        if (err.errorType === 'rate_limit') {
          recordQuotaExceeded();
          break;
        }
      }
    } else if (isLLMErrorLike(error) && (error as LLMError).errorType === 'rate_limit') {
      recordQuotaExceeded();
    }

    // Silently absorb all AI failures — return no enhancement
    return noEnhancement;
  }
}

/**
 * Type guard to check if an error looks like an LLMError.
 */
function isLLMErrorLike(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === 'object' &&
    'errorType' in (error as Record<string, unknown>) &&
    'provider' in (error as Record<string, unknown>)
  );
}

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

/** Common action verbs for experience quality scoring */
const ACTION_VERBS = new Set([
  'achieved', 'administered', 'analyzed', 'architected', 'automated',
  'built', 'collaborated', 'configured', 'created', 'decreased',
  'delivered', 'deployed', 'designed', 'developed', 'drove',
  'eliminated', 'enabled', 'engineered', 'established', 'executed',
  'expanded', 'facilitated', 'generated', 'grew', 'implemented',
  'improved', 'increased', 'initiated', 'integrated', 'launched',
  'led', 'managed', 'mentored', 'migrated', 'modernized',
  'negotiated', 'optimized', 'orchestrated', 'overhauled', 'pioneered',
  'planned', 'reduced', 'refactored', 'resolved', 'revamped',
  'scaled', 'secured', 'simplified', 'spearheaded', 'streamlined',
  'supervised', 'tested', 'trained', 'transformed', 'upgraded',
]);

// ---------------------------------------------------------------------------
// Step 1: Keyword Extraction (LLM primary, TF-IDF fallback)
// ---------------------------------------------------------------------------

/**
 * Extracts ATS keywords from a job description.
 *
 * Primary: Calls LLM with structured prompt to extract 10-20 keywords.
 * Fallback: Uses local TF-IDF extraction if LLM is unavailable or returns malformed JSON.
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

    const parsed = JSON.parse(response.content);
    const keywords = parseKeywordsFromLLMResponse(parsed);

    if (keywords.length === 0) {
      return {
        keywords: extractKeywordsLocal(combinedText),
        source: 'local',
      };
    }

    return { keywords, source: 'llm' };
  } catch (error: unknown) {
    if (error instanceof LLMUnavailableError || error instanceof SyntaxError) {
      return {
        keywords: extractKeywordsLocal(combinedText),
        source: 'local',
      };
    }
    throw error;
  }
}

/**
 * Parses keywords from the LLM JSON response.
 */
function parseKeywordsFromLLMResponse(parsed: unknown): string[] {
  if (!parsed || typeof parsed !== 'object') return [];

  if ('keywords' in (parsed as Record<string, unknown>)) {
    const kw = (parsed as Record<string, unknown>).keywords;
    if (Array.isArray(kw)) {
      return kw.filter((k): k is string => typeof k === 'string' && k.trim().length > 0);
    }
  }

  if ('raw' in (parsed as Record<string, unknown>)) {
    return [];
  }

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
 */
export function extractKeywordsLocal(text: string, minCount: number = 10): string[] {
  if (!text || text.trim().length === 0) return [];

  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9#+.\-/]/gi, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2);

  const frequency = new Map<string, number>();
  for (const token of tokens) {
    if (STOP_WORDS.has(token)) continue;
    frequency.set(token, (frequency.get(token) || 0) + 1);
  }

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

  const sorted = Array.from(frequency.entries())
    .filter(([, count]) => count >= 2)
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0]);
    });

  let result = sorted.map(([term]) => term);
  if (result.length < minCount) {
    const singles = Array.from(frequency.entries())
      .filter(([, count]) => count === 1)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([term]) => term);
    result = [...result, ...singles];
  }

  const maxCount = 20;
  return result.slice(0, Math.max(minCount, Math.min(result.length, maxCount)));
}

// ---------------------------------------------------------------------------
// Step 2: Intelligent Matching + Actionable Suggestions (LLM-powered)
// ---------------------------------------------------------------------------

/** Impact priority for sorting suggestions */
const IMPACT_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

/**
 * Analyzes resume text against extracted keywords using LLM for intelligent matching.
 */
export async function analyzeResumeMatch(
  resumeText: string,
  keywords: string[],
  jobId: string,
  resumeHash: string
): Promise<CachedATSAnalysis> {
  if (!resumeText || keywords.length === 0) {
    return matchKeywordsLocal(resumeText, keywords);
  }

  const cacheKey = buildCacheKey(resumeHash, jobId, 'ats_analysis');
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

    const parsed = JSON.parse(response.content);
    const analysis = parseATSAnalysisResponse(parsed, keywords);

    if (analysis) {
      return analysis;
    }

    return matchKeywordsLocal(resumeText, keywords);
  } catch (error: unknown) {
    if (error instanceof LLMUnavailableError || error instanceof SyntaxError) {
      return matchKeywordsLocal(resumeText, keywords);
    }
    throw error;
  }
}

/**
 * Parses and validates the LLM response for ATS analysis.
 */
function parseATSAnalysisResponse(
  parsed: unknown,
  originalKeywords: string[]
): CachedATSAnalysis | null {
  if (!parsed || typeof parsed !== 'object') return null;

  const data = parsed as Record<string, unknown>;

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

  if (!Array.isArray(data.missingKeywords)) return null;
  const missingKeywords: string[] = data.missingKeywords
    .filter((k): k is string => typeof k === 'string' && k.trim().length > 0)
    .map((k) => k.trim());

  const matchedSet = new Set(matchedKeywords.map((m) => m.keyword.toLowerCase()));
  const missingSet = new Set(missingKeywords.map((m) => m.toLowerCase()));

  const totalAccountedFor = matchedSet.size + missingSet.size;
  if (totalAccountedFor === 0 && originalKeywords.length > 0) return null;

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
// Step 3: Local Keyword Matching with Skills Taxonomy
// ---------------------------------------------------------------------------

/**
 * Performs keyword matching using skills taxonomy for synonym resolution.
 * Checks exact match first, then checks taxonomy synonyms.
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

    // Check exact match
    if (resumeLower.includes(keywordLower)) {
      matchedKeywords.push({
        keyword,
        matchedText: keyword,
        matchType: 'exact',
      });
      continue;
    }

    // Check synonym match via skills taxonomy
    const entry = lookupSkill(keyword);
    let synonymMatched = false;

    if (entry) {
      // Check if resume contains the canonical form
      if (resumeLower.includes(entry.canonical.toLowerCase())) {
        matchedKeywords.push({
          keyword,
          matchedText: entry.canonical,
          matchType: 'synonym',
        });
        synonymMatched = true;
      } else {
        // Check all synonyms of this skill
        for (const syn of entry.synonyms) {
          if (resumeLower.includes(syn.toLowerCase())) {
            matchedKeywords.push({
              keyword,
              matchedText: syn,
              matchType: 'synonym',
            });
            synonymMatched = true;
            break;
          }
        }
      }
    }

    if (!synonymMatched) {
      // Also check reverse: keyword might be a synonym of something in the resume
      // Look up the keyword's canonical form and check if any of its synonyms are in resume
      const canonicalForm = canonicalize(keyword);
      if (canonicalForm !== keyword && resumeLower.includes(canonicalForm.toLowerCase())) {
        matchedKeywords.push({
          keyword,
          matchedText: canonicalForm,
          matchType: 'synonym',
        });
      } else {
        missingKeywords.push(keyword);
      }
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
// Multi-Dimensional Scoring
// ---------------------------------------------------------------------------

/**
 * Clamp a value to [min, max].
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Compute Keyword Match dimension using TF-IDF cosine similarity.
 * Builds a shared vocabulary from both documents, computes TF-IDF, then cosine similarity.
 */
function computeKeywordMatchScore(resumeText: string, jobDescription: string): number {
  const resumeTokens = tokenize(resumeText);
  const jobTokens = tokenize(jobDescription);

  if (resumeTokens.length === 0 || jobTokens.length === 0) {
    return 0;
  }

  // Build shared vocabulary
  const vocabSet = new Set<string>([...resumeTokens, ...jobTokens]);
  const vocabulary = Array.from(vocabSet);

  // Build corpus for IDF computation
  const corpus = [resumeTokens, jobTokens];

  // Compute IDF weights
  const idfWeights = new Map<string, number>();
  const corpusSize = corpus.length;
  const corpusSets = corpus.map((doc) => new Set(doc));

  for (const term of vocabulary) {
    let docsContaining = 0;
    for (const docSet of corpusSets) {
      if (docSet.has(term)) docsContaining++;
    }
    idfWeights.set(term, Math.log(corpusSize / (1 + docsContaining)));
  }

  // Build document vectors
  const resumeVec = buildVector(resumeText, vocabulary, idfWeights);
  const jobVec = buildVector(jobDescription, vocabulary, idfWeights);

  // Compute cosine similarity
  const similarity = cosineSimilarity(resumeVec, jobVec);

  return clamp(Math.round(similarity * 100), 0, 100);
}

/**
 * Compute Section Completeness dimension.
 * 5 expected sections × 20 points each.
 */
function computeSectionCompletenessScore(sections: SectionDetectionResult): number {
  const expectedSections = ['experience', 'education', 'skills', 'projects', 'certifications'];
  const detectedTypes = new Set(sections.sections.map((s) => s.type));
  const count = expectedSections.filter((s) => detectedTypes.has(s as never)).length;
  return clamp(count * 20, 0, 100);
}

/**
 * Extract bullet points from experience section lines.
 */
function extractBulletPoints(lines: string[]): string[] {
  return lines
    .map((l) => l.trim())
    .filter((l) => {
      // Match lines starting with bullet chars, dashes, numbers, or significant content
      return (
        /^[-•*▪▸►●○◦‣⁃]/.test(l) ||
        /^\d+[.)]\s/.test(l) ||
        (l.length > 20 && /^[A-Z]/.test(l) && !l.endsWith(':'))
      );
    });
}

/**
 * Check if a bullet point contains quantified achievements.
 */
function hasQuantification(bullet: string): boolean {
  // Match numbers, percentages, currency, time-based metrics
  return /\d+%|\$[\d,]+|\d+\+?\s*(users|customers|clients|team|engineers|developers|people|members|projects|applications|services|requests|transactions)/i.test(bullet) ||
    /\b\d{2,}\b/.test(bullet) ||
    /increased|decreased|reduced|improved|saved|generated|grew|boosted/i.test(bullet) &&
    /\d/.test(bullet);
}

/**
 * Check if a bullet point starts with an action verb.
 */
function startsWithActionVerb(bullet: string): boolean {
  const firstWord = bullet
    .replace(/^[-•*▪▸►●○◦‣⁃\d.)]\s*/, '')
    .split(/\s+/)[0]
    ?.toLowerCase();
  return firstWord ? ACTION_VERBS.has(firstWord) : false;
}

/**
 * Compute recency score based on dates found in experience section.
 * 100 if most recent experience < 2 years, 50 if 2-5 years, 0 if > 5 years.
 */
function computeRecencyScore(lines: string[]): number {
  const currentYear = new Date().getFullYear();
  const text = lines.join(' ');

  // Look for "Present" or "Current" indicating active role
  if (/present|current|ongoing/i.test(text)) {
    return 100;
  }

  // Find years mentioned
  const yearMatches = text.match(/\b(20\d{2}|19\d{2})\b/g);
  if (!yearMatches || yearMatches.length === 0) {
    return 0;
  }

  const years = yearMatches.map(Number);
  const mostRecent = Math.max(...years);
  const gap = currentYear - mostRecent;

  if (gap <= 2) return 100;
  if (gap <= 5) return 50;
  return 0;
}

/**
 * Compute Experience Quality dimension.
 * 50% quantified achievements + 30% action verbs + 20% recency
 */
function computeExperienceQualityScore(sections: SectionDetectionResult): number {
  const expLines = getSectionContent(sections, 'experience');

  if (expLines.length === 0) {
    return 0;
  }

  const bullets = extractBulletPoints(expLines);

  if (bullets.length === 0) {
    // If there's experience section content but no detectable bullets,
    // give partial credit for recency only
    const recencyScore = computeRecencyScore(expLines);
    return clamp(Math.round(recencyScore * 0.2), 0, 100);
  }

  const quantifiedRatio = bullets.filter(hasQuantification).length / bullets.length;
  const actionVerbRatio = bullets.filter(startsWithActionVerb).length / bullets.length;
  const recencyScore = computeRecencyScore(expLines);

  const score = Math.round(
    quantifiedRatio * 100 * 0.5 +
    actionVerbRatio * 100 * 0.3 +
    recencyScore * 0.2
  );

  return clamp(score, 0, 100);
}

/**
 * Compute Education Relevance dimension.
 * Compare degree fields to job domain keywords.
 * Exact/synonym match = 100, partial match (same broad category) = 60, no match = 20.
 */
function computeEducationRelevanceScore(
  sections: SectionDetectionResult,
  jobDescription: string
): number {
  const eduLines = getSectionContent(sections, 'education');

  if (eduLines.length === 0) {
    return 20; // Baseline when no education section found
  }

  const eduText = eduLines.join(' ').toLowerCase();
  const jobLower = jobDescription.toLowerCase();

  // Common degree fields and their broad categories
  const degreeFields: Record<string, string[]> = {
    'computer science': ['software', 'programming', 'developer', 'engineering', 'web', 'app', 'data', 'machine learning', 'ai'],
    'software engineering': ['software', 'developer', 'programming', 'web', 'app', 'full stack', 'backend', 'frontend'],
    'information technology': ['it', 'systems', 'network', 'infrastructure', 'technical support', 'cloud'],
    'data science': ['data', 'analytics', 'machine learning', 'ai', 'statistics', 'visualization'],
    'electrical engineering': ['hardware', 'embedded', 'iot', 'firmware', 'circuits'],
    'mathematics': ['data', 'analytics', 'quantitative', 'finance', 'algorithm'],
    'business': ['management', 'product', 'project', 'analyst', 'operations'],
    'design': ['ui', 'ux', 'user experience', 'graphic', 'visual', 'creative'],
    'cybersecurity': ['security', 'penetration', 'compliance', 'risk', 'vulnerability'],
  };

  // Check for exact/synonym match
  for (const [field, relatedTerms] of Object.entries(degreeFields)) {
    if (eduText.includes(field)) {
      // Check if job description relates to this field
      for (const term of relatedTerms) {
        if (jobLower.includes(term)) {
          return 100; // Exact alignment
        }
      }
      // Field detected but no job match → partial
      return 60;
    }
  }

  // Check for partial matches (education text contains any job-relevant keywords)
  const jobTokens = tokenize(jobDescription);
  const eduTokens = tokenize(eduLines.join(' '));
  const overlap = eduTokens.filter((t) => jobTokens.includes(t));

  if (overlap.length > 0) {
    return 60; // Partial match
  }

  return 20; // No detectable match — baseline
}

/**
 * Compute Formatting dimension.
 * Start at 100, deduct 20 for each issue (min 0).
 */
function computeFormattingScore(resumeText: string, sections: SectionDetectionResult): number {
  let score = 100;

  // Deduct 20 if parsed text contains image placeholder markers or embedded binary
  if (/\[image\]|\[img\]|data:image|base64,/i.test(resumeText)) {
    score -= 20;
  }

  // Deduct 20 if parsed text contains HTML table structures
  if (/<table|<tr|<td|<th/i.test(resumeText)) {
    score -= 20;
  }

  // Deduct 20 if fewer than 3 detectable section headers
  const headerCount = sections.sections.filter(
    (s) => s.type !== 'unstructured' && s.type !== 'header-contact'
  ).length;
  if (headerCount < 3) {
    score -= 20;
  }

  // Deduct 20 if > 30% of lines exceed 120 characters
  const lines = resumeText.split('\n');
  const longLineCount = lines.filter((l) => l.length > 120).length;
  if (lines.length > 0 && longLineCount / lines.length > 0.3) {
    score -= 20;
  }

  // Deduct 20 if resume < 200 characters
  if (resumeText.length < 200) {
    score -= 20;
  }

  return clamp(score, 0, 100);
}

/**
 * Compute all 5 dimensions of the ATS score.
 */
export function computeDimensions(
  resumeText: string,
  jobDescription: string,
  keywords: string[],
  matchedKeywords: ATSKeywordMatch[],
  sections: SectionDetectionResult
): DimensionScores {
  const keywordMatch = computeKeywordMatchScore(resumeText, jobDescription);
  const sectionCompleteness = computeSectionCompletenessScore(sections);
  const experienceQuality = computeExperienceQualityScore(sections);
  const educationRelevance = computeEducationRelevanceScore(sections, jobDescription);
  const formatting = computeFormattingScore(resumeText, sections);

  return {
    keywordMatch: clamp(keywordMatch, 0, 100),
    sectionCompleteness: clamp(sectionCompleteness, 0, 100),
    experienceQuality: clamp(experienceQuality, 0, 100),
    educationRelevance: clamp(educationRelevance, 0, 100),
    formatting: clamp(formatting, 0, 100),
  };
}

/**
 * Compute composite score from dimensions using weighted average.
 * Weights: Keyword Match 40%, Section Completeness 15%, Experience Quality 20%,
 *          Education Relevance 15%, Formatting 10%
 */
export function computeCompositeScore(dimensions: DimensionScores): number {
  const composite =
    dimensions.keywordMatch * 0.4 +
    dimensions.sectionCompleteness * 0.15 +
    dimensions.experienceQuality * 0.2 +
    dimensions.educationRelevance * 0.15 +
    dimensions.formatting * 0.1;
  return clamp(Math.round(composite), 0, 100);
}

// ---------------------------------------------------------------------------
// Orchestrator: calculateATSScore
// ---------------------------------------------------------------------------

/**
 * Full ATS scoring pipeline orchestrator.
 *
 * 1. Extracts keywords from job description (LLM with cache, or local TF-IDF fallback)
 * 2. Matches keywords against resume (LLM intelligent matching or local exact/synonym matching)
 * 3. Computes score:
 *    - Default (no dimensions): Math.round((matched / total) * 100) for backward compat
 *    - With dimensions: composite weighted average of 5 dimensions
 * 4. Score is clamped to integer in [0, 100]
 *
 * @param resumeText - The applicant's raw resume text
 * @param jobDescription - The job description text
 * @param qualifications - Optional qualifications text
 * @param jobDescriptionId - UUID of the job_descriptions record
 * @param jobId - UUID of the job (used for match cache keying)
 * @param fallbackKeywords - Optional keywords to use when source is 'local'
 * @param options - Optional settings (includeDimensions)
 * @returns Full ATS score result with matches, misses, and suggestions
 */
export async function calculateATSScore(
  resumeText: string,
  jobDescription: string,
  qualifications: string | null,
  jobDescriptionId: string,
  jobId: string,
  fallbackKeywords?: string[],
  options?: { includeDimensions?: boolean }
): Promise<ATSScoreResult> {
  // Step 1: Extract keywords from job description
  const { keywords, source: keywordSource } = await extractKeywords(
    jobDescription,
    qualifications,
    jobDescriptionId
  );

  // If local TF-IDF keywords are poor quality and we have fallback, use those
  const effectiveKeywords =
    keywordSource === 'local' && fallbackKeywords && fallbackKeywords.length > 0
      ? fallbackKeywords
      : keywords;

  // Edge case: zero keywords extracted
  if (effectiveKeywords.length === 0) {
    const result: ATSScoreResult = {
      score: 0,
      totalKeywords: 0,
      matchedKeywords: [],
      missingKeywords: [],
      suggestions: [],
      analysisSource: keywordSource,
    };
    if (options?.includeDimensions) {
      result.dimensions = {
        keywordMatch: 0,
        sectionCompleteness: 0,
        experienceQuality: 0,
        educationRelevance: 0,
        formatting: 0,
      };
    }
    return result;
  }

  // Step 2: Match resume against keywords
  const resumeHash = computeHash(resumeText);
  const analysis = await analyzeResumeMatch(resumeText, effectiveKeywords, jobId, resumeHash);

  // Step 2.5: Enhancement layer — additive-only AI enhancement
  let enhancedAnalysis = analysis;
  if (isEnhancementAvailable()) {
    try {
      const enhancement = await enhanceATSResults(
        analysis,
        resumeText,
        jobDescription,
        effectiveKeywords
      );

      if (enhancement.applied && enhancement.additionalMatches.length > 0) {
        // Merge AI matches into local results (additive-only)
        const aiPartial: Partial<CachedATSAnalysis> = {
          matchedKeywords: enhancement.additionalMatches,
        };
        enhancedAnalysis = mergeEnhancement(analysis, aiPartial);
      }
    } catch {
      // Silently absorb all enhancement failures — use local results unchanged
      enhancedAnalysis = analysis;
    }
  }

  // Step 3: Compute score
  const totalKeywords = effectiveKeywords.length;
  const matchedCount = enhancedAnalysis.matchedKeywords.length;

  let score: number;
  let dimensions: DimensionScores | undefined;

  if (options?.includeDimensions) {
    // Multi-dimensional scoring: compute all 5 dimensions + composite
    const sections = detectSections(resumeText);
    dimensions = computeDimensions(
      resumeText,
      jobDescription,
      effectiveKeywords,
      enhancedAnalysis.matchedKeywords,
      sections
    );
    score = computeCompositeScore(dimensions);
  } else {
    // Backward compatible: simple matched/total ratio
    const rawScore = Math.round((matchedCount / totalKeywords) * 100);
    score = Math.max(0, Math.min(100, rawScore));
  }

  const result: ATSScoreResult = {
    score,
    totalKeywords,
    matchedKeywords: enhancedAnalysis.matchedKeywords,
    missingKeywords: enhancedAnalysis.missingKeywords,
    suggestions: enhancedAnalysis.suggestions,
    analysisSource: enhancedAnalysis.analysisSource === 'llm' ? 'llm' : keywordSource,
  };

  if (dimensions) {
    result.dimensions = dimensions;
  }

  return result;
}
