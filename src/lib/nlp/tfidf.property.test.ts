/**
 * Property-Based Tests for TF-IDF Module
 *
 * Feature: hybrid-ats-resume-parser
 * - Property 6: Cosine Similarity Symmetry
 * - Property 7: Cosine Similarity Identity
 * - Property 8: Bounded Keyword Output
 *
 * **Validates: Requirements 1.2, 1.3, 2.2, 9.3**
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  cosineSimilarity,
  extractKeywords,
  type DocumentVector,
} from "./tfidf";

// --- Arbitraries ---

/**
 * Generates a DocumentVector with non-negative Float64Array weights.
 * TF-IDF produces non-negative weights, so we constrain to that domain.
 */
function arbDocumentVector(
  length: number
): fc.Arbitrary<DocumentVector> {
  return fc
    .array(fc.double({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true }), {
      minLength: length,
      maxLength: length,
    })
    .map((weights) => {
      const terms: string[] = [];
      const termIndex = new Map<string, number>();
      for (let i = 0; i < length; i++) {
        const term = `term_${i}`;
        terms.push(term);
        termIndex.set(term, i);
      }
      return {
        terms,
        weights: Float64Array.from(weights),
        termIndex,
      };
    });
}

/**
 * Generates a pair of DocumentVectors with the same dimension (shared vocabulary).
 */
function arbVectorPair(): fc.Arbitrary<[DocumentVector, DocumentVector]> {
  return fc
    .integer({ min: 1, max: 50 })
    .chain((length) =>
      fc.tuple(arbDocumentVector(length), arbDocumentVector(length))
    );
}

/**
 * Generates a non-zero DocumentVector (at least one weight > 0).
 * Uses a minimum of 1e-10 to avoid floating-point underflow in magnitude
 * computation (subnormal values like 5e-324 squared underflow to 0).
 */
function arbNonZeroDocumentVector(): fc.Arbitrary<DocumentVector> {
  return fc
    .integer({ min: 1, max: 50 })
    .chain((length) =>
      fc
        .array(
          fc.double({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true }),
          { minLength: length, maxLength: length }
        )
        .filter((weights) => weights.some((w) => w >= 1e-10))
        .map((weights) => {
          // Clamp very small positive values to avoid underflow issues
          const clamped = weights.map((w) => (w > 0 && w < 1e-10 ? 0 : w));
          const terms: string[] = [];
          const termIndex = new Map<string, number>();
          for (let i = 0; i < length; i++) {
            const term = `term_${i}`;
            terms.push(term);
            termIndex.set(term, i);
          }
          return {
            terms,
            weights: Float64Array.from(clamped),
            termIndex,
          };
        })
    );
}

/**
 * Generates arbitrary text strings that produce meaningful tokens.
 * Uses words that won't be filtered by stop-word removal.
 */
function arbMeaningfulText(): fc.Arbitrary<string> {
  const words = [
    "python", "javascript", "typescript", "react", "angular",
    "docker", "kubernetes", "terraform", "postgres", "redis",
    "machine", "learning", "deep", "neural", "network",
    "algorithm", "database", "frontend", "backend", "deployment",
    "architecture", "microservice", "serverless", "container", "pipeline",
    "testing", "integration", "continuous", "delivery", "monitoring",
  ];
  return fc
    .array(fc.constantFrom(...words), { minLength: 1, maxLength: 80 })
    .map((selected) => selected.join(" "));
}

// --- Property 6: Cosine Similarity Symmetry ---

describe("Feature: hybrid-ats-resume-parser, Property 6: Cosine Similarity Symmetry", () => {
  /**
   * Property 6: Cosine Similarity Symmetry
   *
   * For all vectors vecA and vecB:
   * cosineSimilarity(vecA, vecB) === cosineSimilarity(vecB, vecA)
   *
   * **Validates: Requirements 2.2**
   */

  it("cosineSimilarity(a, b) === cosineSimilarity(b, a) for all vector pairs", () => {
    fc.assert(
      fc.property(arbVectorPair(), ([vecA, vecB]) => {
        const simAB = cosineSimilarity(vecA, vecB);
        const simBA = cosineSimilarity(vecB, vecA);

        expect(simAB).toBeCloseTo(simBA, 10);
      }),
      { numRuns: 200 }
    );
  });
});

// --- Property 7: Cosine Similarity Identity ---

describe("Feature: hybrid-ats-resume-parser, Property 7: Cosine Similarity Identity", () => {
  /**
   * Property 7: Cosine Similarity Identity
   *
   * For all non-zero vectors vec:
   * cosineSimilarity(vec, vec) === 1.0
   *
   * **Validates: Requirements 2.2, 9.3**
   */

  it("cosineSimilarity(vec, vec) === 1.0 for all non-zero vectors", () => {
    fc.assert(
      fc.property(arbNonZeroDocumentVector(), (vec) => {
        const similarity = cosineSimilarity(vec, vec);

        expect(similarity).toBeCloseTo(1.0, 10);
      }),
      { numRuns: 200 }
    );
  });
});

// --- Property 8: Bounded Keyword Output ---

describe("Feature: hybrid-ats-resume-parser, Property 8: Bounded Keyword Output", () => {
  /**
   * Property 8: Bounded Keyword Output
   *
   * For all text and options:
   * extractKeywords(text, options).length <= options.maxKeywords
   *
   * **Validates: Requirements 1.2, 1.3**
   */

  it("extractKeywords(text, { maxKeywords }).length <= maxKeywords for all inputs", () => {
    fc.assert(
      fc.property(
        arbMeaningfulText(),
        fc.integer({ min: 1, max: 50 }),
        (text, maxKeywords) => {
          const results = extractKeywords(text, { maxKeywords });

          expect(results.length).toBeLessThanOrEqual(maxKeywords);
        }
      ),
      { numRuns: 200 }
    );
  });

  it("extractKeywords with arbitrary strings never exceeds maxKeywords", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 500 }),
        fc.integer({ min: 1, max: 50 }),
        (text, maxKeywords) => {
          const results = extractKeywords(text, { maxKeywords });

          expect(results.length).toBeLessThanOrEqual(maxKeywords);
        }
      ),
      { numRuns: 200 }
    );
  });
});
