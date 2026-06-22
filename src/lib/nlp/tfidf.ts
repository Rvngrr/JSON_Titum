/**
 * TF-IDF Vectorizer
 *
 * Implements Term Frequency–Inverse Document Frequency computation and document
 * vectorization over a two-document corpus (resume + job description).
 * Pure TypeScript with zero npm dependencies.
 */

// ─── Interfaces ────────────────────────────────────────────────────────────────

export interface TFIDFOptions {
  minTermLength: number; // default: 2
  maxKeywords: number; // default: 25
  minKeywords: number; // default: 10
  preserveSpecialChars: string; // default: "#+.-/"
}

export interface DocumentVector {
  terms: string[];
  weights: Float64Array;
  termIndex: Map<string, number>;
}

export interface KeywordResult {
  term: string;
  weight: number;
  isMultiWord: boolean;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_OPTIONS: TFIDFOptions = {
  minTermLength: 2,
  maxKeywords: 25,
  minKeywords: 10,
  preserveSpecialChars: "#+.-/",
};

/**
 * Common English stop words used for filtering during tokenization.
 */
const STOP_WORDS: Set<string> = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "but",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "with",
  "by",
  "from",
  "as",
  "is",
  "was",
  "are",
  "were",
  "been",
  "be",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "may",
  "might",
  "shall",
  "can",
  "need",
  "dare",
  "ought",
  "used",
  "it",
  "its",
  "this",
  "that",
  "these",
  "those",
  "i",
  "me",
  "my",
  "myself",
  "we",
  "our",
  "ours",
  "ourselves",
  "you",
  "your",
  "yours",
  "yourself",
  "yourselves",
  "he",
  "him",
  "his",
  "himself",
  "she",
  "her",
  "hers",
  "herself",
  "they",
  "them",
  "their",
  "theirs",
  "themselves",
  "what",
  "which",
  "who",
  "whom",
  "when",
  "where",
  "why",
  "how",
  "all",
  "each",
  "every",
  "both",
  "few",
  "more",
  "most",
  "other",
  "some",
  "such",
  "no",
  "nor",
  "not",
  "only",
  "own",
  "same",
  "so",
  "than",
  "too",
  "very",
  "just",
  "because",
  "about",
  "above",
  "after",
  "again",
  "against",
  "before",
  "below",
  "between",
  "during",
  "into",
  "through",
  "under",
  "until",
  "up",
  "down",
  "out",
  "off",
  "over",
  "then",
  "once",
  "here",
  "there",
  "any",
  "if",
  "also",
  "while",
]);

// ─── Tokenization ──────────────────────────────────────────────────────────────

/**
 * Tokenize and normalize text, removing stop words.
 *
 * Steps:
 * 1. Convert to lowercase
 * 2. Strip non-alphanumeric characters except preserved special chars
 * 3. Split on whitespace
 * 4. Remove stop words and tokens shorter than minTermLength (2)
 */
export function tokenize(
  text: string,
  preserveChars: string = DEFAULT_OPTIONS.preserveSpecialChars
): string[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  // Build regex for stripping: remove anything that is NOT alphanumeric,
  // whitespace, or a preserved special character.
  const escapedChars = preserveChars.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
  const stripRegex = new RegExp(`[^a-z0-9\\s${escapedChars}]`, "g");

  const normalized = text.toLowerCase().replace(stripRegex, " ");

  const tokens = normalized
    .split(/\s+/)
    .filter(
      (token) =>
        token.length >= DEFAULT_OPTIONS.minTermLength &&
        !STOP_WORDS.has(token)
    );

  return tokens;
}

// ─── TF-IDF Computation ────────────────────────────────────────────────────────

/**
 * Compute TF-IDF weights for all terms in a document against a corpus.
 *
 * TF(t, d) = count(t in d) / |d|
 * IDF(t) = log(|corpus| / (1 + docsContainingTerm))
 * TF-IDF(t, d) = TF(t, d) * IDF(t)
 */
export function computeTFIDF(
  document: string[],
  corpus: string[][]
): Map<string, number> {
  const weights = new Map<string, number>();

  if (document.length === 0) {
    return weights;
  }

  // Compute term frequency for this document
  const termCounts = new Map<string, number>();
  for (const term of document) {
    termCounts.set(term, (termCounts.get(term) || 0) + 1);
  }

  const docLength = document.length;
  const corpusSize = corpus.length;

  // Pre-compute which terms appear in which corpus documents (as Sets for efficiency)
  const corpusTermSets: Set<string>[] = corpus.map((doc) => new Set(doc));

  for (const [term, count] of termCounts) {
    // Term frequency: count / total tokens in document
    const tf = count / docLength;

    // Count how many corpus documents contain this term
    let docsContaining = 0;
    for (const docSet of corpusTermSets) {
      if (docSet.has(term)) {
        docsContaining++;
      }
    }

    // Inverse document frequency: log(|corpus| / (1 + docsContainingTerm))
    const idf = Math.log(corpusSize / (1 + docsContaining));

    weights.set(term, tf * idf);
  }

  return weights;
}

// ─── Collocation Detection ─────────────────────────────────────────────────────

/**
 * Detect multi-word terms (bigrams/trigrams) via collocation analysis.
 * Returns collocations that appear at least `minFrequency` times.
 */
export function detectCollocations(
  tokens: string[],
  minFrequency: number = 2
): string[] {
  if (tokens.length < 2) {
    return [];
  }

  const collocations: string[] = [];

  // Count bigrams
  const bigramCounts = new Map<string, number>();
  for (let i = 0; i < tokens.length - 1; i++) {
    const bigram = `${tokens[i]} ${tokens[i + 1]}`;
    bigramCounts.set(bigram, (bigramCounts.get(bigram) || 0) + 1);
  }

  // Count trigrams
  const trigramCounts = new Map<string, number>();
  for (let i = 0; i < tokens.length - 2; i++) {
    const trigram = `${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]}`;
    trigramCounts.set(trigram, (trigramCounts.get(trigram) || 0) + 1);
  }

  // Collect trigrams first (longer matches take priority)
  const usedBigrams = new Set<string>();
  for (const [trigram, count] of trigramCounts) {
    if (count >= minFrequency) {
      collocations.push(trigram);
      // Mark constituent bigrams as used
      const parts = trigram.split(" ");
      usedBigrams.add(`${parts[0]} ${parts[1]}`);
      usedBigrams.add(`${parts[1]} ${parts[2]}`);
    }
  }

  // Collect bigrams that aren't part of detected trigrams
  for (const [bigram, count] of bigramCounts) {
    if (count >= minFrequency && !usedBigrams.has(bigram)) {
      collocations.push(bigram);
    }
  }

  return collocations;
}

// ─── Keyword Extraction ────────────────────────────────────────────────────────

/**
 * Extract top keywords from text by TF-IDF weight.
 *
 * Algorithm:
 * 1. Tokenize and normalize (lowercase, stop-words removed, special chars preserved)
 * 2. Detect multi-word collocations (bigrams/trigrams appearing at least 2 times)
 * 3. Build two-document corpus: [document tokens, synthetic background corpus tokens]
 * 4. Compute TF-IDF
 * 5. Sort by weight, take top maxKeywords
 * 6. Return KeywordResult[] with term, weight, and isMultiWord flag
 */
export function extractKeywords(
  text: string,
  options?: Partial<TFIDFOptions>
): KeywordResult[] {
  const opts: TFIDFOptions = { ...DEFAULT_OPTIONS, ...options };

  // Step 1: Tokenize
  const tokens = tokenize(text, opts.preserveSpecialChars);

  if (tokens.length === 0) {
    return [];
  }

  // Step 2: Detect collocations
  const collocations = detectCollocations(tokens);

  // Step 3: Build two-document corpus
  // The synthetic background document uses a uniform distribution of unique terms
  // to give higher IDF to terms that are distinctive to the input document.
  const uniqueTerms = [...new Set(tokens)];
  const backgroundTokens = uniqueTerms; // Each unique term appears once in background

  // Build combined token list with collocations treated as single terms
  const documentTokensWithCollocations = buildTokensWithCollocations(
    tokens,
    collocations
  );
  const backgroundWithCollocations = buildTokensWithCollocations(
    backgroundTokens,
    [] // Background doesn't use collocations
  );

  const corpus = [documentTokensWithCollocations, backgroundWithCollocations];

  // Step 4: Compute TF-IDF
  const tfidfWeights = computeTFIDF(documentTokensWithCollocations, corpus);

  // Step 5: Sort by weight descending
  const sortedTerms = [...tfidfWeights.entries()].sort((a, b) => b[1] - a[1]);

  // Filter by min term length
  const filtered = sortedTerms.filter(
    ([term]) => term.length >= opts.minTermLength
  );

  // Take top maxKeywords
  const topTerms = filtered.slice(0, opts.maxKeywords);

  // Step 6: Build results
  const collocationSet = new Set(collocations);
  const results: KeywordResult[] = topTerms.map(([term, weight]) => ({
    term,
    weight,
    isMultiWord: collocationSet.has(term) || term.includes(" "),
  }));

  return results;
}

/**
 * Replace sequences of tokens that form collocations with the joined collocation term.
 */
function buildTokensWithCollocations(
  tokens: string[],
  collocations: string[]
): string[] {
  if (collocations.length === 0) {
    return [...tokens];
  }

  // Sort collocations by length (longer first) so trigrams are matched before bigrams
  const sortedCollocations = [...collocations].sort(
    (a, b) => b.split(" ").length - a.split(" ").length
  );

  const result: string[] = [];
  let i = 0;

  while (i < tokens.length) {
    let matched = false;

    for (const collocation of sortedCollocations) {
      const parts = collocation.split(" ");
      if (i + parts.length <= tokens.length) {
        let isMatch = true;
        for (let j = 0; j < parts.length; j++) {
          if (tokens[i + j] !== parts[j]) {
            isMatch = false;
            break;
          }
        }
        if (isMatch) {
          result.push(collocation);
          i += parts.length;
          matched = true;
          break;
        }
      }
    }

    if (!matched) {
      result.push(tokens[i]);
      i++;
    }
  }

  return result;
}

// ─── Document Vector Construction ──────────────────────────────────────────────

/**
 * Build a document vector from text using TF-IDF weights over a shared vocabulary.
 *
 * @param text - The text to vectorize
 * @param vocabulary - Shared vocabulary (union of terms from both documents)
 * @param idfWeights - Pre-computed IDF weights for the vocabulary terms
 */
export function buildVector(
  text: string,
  vocabulary: string[],
  idfWeights: Map<string, number>
): DocumentVector {
  const terms = vocabulary;
  const termIndex = new Map<string, number>();
  const weights = new Float64Array(vocabulary.length);

  // Build term index
  for (let i = 0; i < vocabulary.length; i++) {
    termIndex.set(vocabulary[i], i);
  }

  // Tokenize the document
  const tokens = tokenize(text);

  if (tokens.length === 0) {
    return { terms, weights, termIndex };
  }

  // Compute term frequencies
  const termCounts = new Map<string, number>();
  for (const token of tokens) {
    termCounts.set(token, (termCounts.get(token) || 0) + 1);
  }

  const docLength = tokens.length;

  // Compute TF-IDF weight for each vocabulary term
  for (const [term, idx] of termIndex) {
    const count = termCounts.get(term) || 0;
    if (count > 0) {
      const tf = count / docLength;
      const idf = idfWeights.get(term) || 0;
      weights[idx] = tf * idf;
    }
    // weights[idx] remains 0.0 if term is not in the document
  }

  return { terms, weights, termIndex };
}

// ─── Cosine Similarity ─────────────────────────────────────────────────────────

/**
 * Compute cosine similarity between two document vectors.
 *
 * Properties:
 * - Symmetric: cosineSimilarity(A, B) === cosineSimilarity(B, A)
 * - Identity at 1.0 for identical non-zero vectors
 * - Zero-magnitude guard: returns 0 if either vector has zero magnitude
 * - Result clamped to [0, 1] to handle floating point imprecision
 */
export function cosineSimilarity(
  vecA: DocumentVector,
  vecB: DocumentVector
): number {
  const weightsA = vecA.weights;
  const weightsB = vecB.weights;

  // Vectors must be same dimension (over shared vocabulary)
  const length = Math.min(weightsA.length, weightsB.length);

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  // Single pass over shared vocabulary dimension
  for (let i = 0; i < length; i++) {
    dotProduct += weightsA[i] * weightsB[i];
    magnitudeA += weightsA[i] * weightsA[i];
    magnitudeB += weightsB[i] * weightsB[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  // Zero-magnitude guard
  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  const similarity = dotProduct / (magnitudeA * magnitudeB);

  // Clamp to [0, 1] to handle floating point imprecision
  return Math.max(0, Math.min(1, similarity));
}
