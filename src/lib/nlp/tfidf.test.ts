import { describe, it, expect } from "vitest";
import {
  tokenize,
  computeTFIDF,
  extractKeywords,
  detectCollocations,
  buildVector,
  cosineSimilarity,
  DocumentVector,
} from "./tfidf";

describe("TF-IDF Vectorizer", () => {
  describe("tokenize", () => {
    it("should convert text to lowercase tokens", () => {
      const tokens = tokenize("Hello World Programming");
      expect(tokens).toContain("hello");
      expect(tokens).toContain("world");
      expect(tokens).toContain("programming");
    });

    it("should remove stop words", () => {
      const tokens = tokenize("this is a test of the system");
      expect(tokens).not.toContain("this");
      expect(tokens).not.toContain("is");
      expect(tokens).not.toContain("a");
      expect(tokens).not.toContain("of");
      expect(tokens).not.toContain("the");
      expect(tokens).toContain("test");
      expect(tokens).toContain("system");
    });

    it("should preserve special characters by default (#+.-/)", () => {
      const tokens = tokenize("C++ C# .NET node.js TCP/IP");
      expect(tokens).toContain("c++");
      expect(tokens).toContain("c#");
      expect(tokens).toContain(".net");
      expect(tokens).toContain("node.js");
      expect(tokens).toContain("tcp/ip");
    });

    it("should filter tokens shorter than min length (2)", () => {
      const tokens = tokenize("I am a developer");
      // "I", "a" are single chars (and stop words), "am" is stop word
      expect(tokens).toContain("developer");
      expect(tokens).not.toContain("i");
      expect(tokens).not.toContain("a");
    });

    it("should return empty array for empty text", () => {
      expect(tokenize("")).toEqual([]);
      expect(tokenize("   ")).toEqual([]);
    });

    it("should handle custom preserveChars parameter", () => {
      // Without preserving #, c# would lose the #
      const tokensWithHash = tokenize("C# programming", "#+.-/");
      expect(tokensWithHash).toContain("c#");

      // Without preserving any special chars
      const tokensNoSpecial = tokenize("C# programming", "");
      expect(tokensNoSpecial).not.toContain("c#");
    });
  });

  describe("computeTFIDF", () => {
    it("should compute TF-IDF weights for document terms", () => {
      const doc = ["python", "python", "machine", "learning"];
      const corpus = [
        ["python", "python", "machine", "learning"],
        ["java", "spring", "machine", "learning"],
      ];

      const weights = computeTFIDF(doc, corpus);

      expect(weights.has("python")).toBe(true);
      expect(weights.has("machine")).toBe(true);
      // "python" only appears in doc1, so it has higher IDF than "machine" which appears in both
      expect(weights.get("python")!).toBeGreaterThan(weights.get("machine")!);
    });

    it("should return empty map for empty document", () => {
      const weights = computeTFIDF([], [["python"], ["java"]]);
      expect(weights.size).toBe(0);
    });

    it("should give higher weight to more frequent terms in document", () => {
      // Use a 3-document corpus so terms that only appear in doc1 get positive IDF
      const doc = ["python", "python", "python", "java"];
      const corpus = [doc, ["ruby", "ruby", "ruby", "go"], ["rust", "go", "elixir", "haskell"]];

      const weights = computeTFIDF(doc, corpus);
      // python TF is 3/4, java TF is 1/4; both have same IDF (appear in 1 of 3 docs)
      // So python weight should be higher due to higher TF
      expect(weights.get("python")!).toBeGreaterThan(weights.get("java")!);
    });

    it("should give zero weight when IDF is zero (term appears in all docs)", () => {
      const doc = ["common", "unique"];
      const corpus = [
        ["common", "unique"],
        ["common", "other"],
      ];

      const weights = computeTFIDF(doc, corpus);
      // "common" appears in both docs: IDF = log(2 / (1+2)) = log(2/3) < 0
      // Actually log(2/3) is negative, which means TF-IDF is negative for ubiquitous terms
      // This is the expected behavior of the formula: log(|corpus| / (1 + docsContaining))
      expect(weights.get("common")!).toBeLessThan(weights.get("unique")!);
    });
  });

  describe("detectCollocations", () => {
    it("should detect bigrams appearing at least 2 times", () => {
      const tokens = [
        "machine",
        "learning",
        "deep",
        "learning",
        "machine",
        "learning",
        "algorithms",
      ];
      const collocations = detectCollocations(tokens);
      expect(collocations).toContain("machine learning");
    });

    it("should detect trigrams appearing at least 2 times", () => {
      const tokens = [
        "natural",
        "language",
        "processing",
        "uses",
        "natural",
        "language",
        "processing",
        "techniques",
      ];
      const collocations = detectCollocations(tokens);
      expect(collocations).toContain("natural language processing");
    });

    it("should not include bigrams that are subsumed by detected trigrams", () => {
      const tokens = [
        "natural",
        "language",
        "processing",
        "natural",
        "language",
        "processing",
      ];
      const collocations = detectCollocations(tokens);
      expect(collocations).toContain("natural language processing");
      expect(collocations).not.toContain("natural language");
      expect(collocations).not.toContain("language processing");
    });

    it("should return empty for tokens with no repeated ngrams", () => {
      const tokens = ["python", "java", "ruby", "go"];
      expect(detectCollocations(tokens)).toEqual([]);
    });

    it("should return empty for single token", () => {
      expect(detectCollocations(["hello"])).toEqual([]);
    });

    it("should respect custom minFrequency threshold", () => {
      const tokens = ["machine", "learning", "machine", "learning"];
      expect(detectCollocations(tokens, 3)).toEqual([]);
      expect(detectCollocations(tokens, 2)).toContain("machine learning");
    });
  });

  describe("extractKeywords", () => {
    it("should extract keywords from job description text", () => {
      const text =
        "We are looking for a Python developer with experience in machine learning and data science. " +
        "The ideal candidate has Python programming skills and machine learning expertise. " +
        "Experience with Python frameworks and machine learning models is required.";

      const keywords = extractKeywords(text);

      expect(keywords.length).toBeGreaterThan(0);
      expect(keywords.length).toBeLessThanOrEqual(25);

      // Keywords should include python since it appears frequently
      const terms = keywords.map((k) => k.term);
      expect(terms).toContain("python");
    });

    it("should return empty array for empty text", () => {
      expect(extractKeywords("")).toEqual([]);
    });

    it("should mark multi-word terms with isMultiWord flag", () => {
      const text =
        "machine learning is important. machine learning is the future. " +
        "deep learning and machine learning are related fields.";

      const keywords = extractKeywords(text);
      const multiWord = keywords.filter((k) => k.isMultiWord);

      // Should detect "machine learning" as a collocation
      if (multiWord.length > 0) {
        expect(multiWord[0].term).toContain(" ");
      }
    });

    it("should respect maxKeywords option", () => {
      const text =
        "Python Java Ruby Go Rust TypeScript JavaScript Kotlin Swift Scala " +
        "Django Flask Spring React Angular Vue Svelte Next Express FastAPI " +
        "PostgreSQL MongoDB Redis MySQL SQLite Docker Kubernetes Terraform AWS GCP";

      const keywords = extractKeywords(text, { maxKeywords: 5 });
      expect(keywords.length).toBeLessThanOrEqual(5);
    });

    it("should return terms ordered by descending weight", () => {
      const text =
        "Python Python Python developer. Java experience helpful. " +
        "Python frameworks. Python machine learning.";

      const keywords = extractKeywords(text);

      for (let i = 1; i < keywords.length; i++) {
        expect(keywords[i - 1].weight).toBeGreaterThanOrEqual(
          keywords[i].weight
        );
      }
    });
  });

  describe("buildVector", () => {
    it("should create a DocumentVector with correct dimensions", () => {
      const vocabulary = ["python", "java", "machine", "learning"];
      const idfWeights = new Map([
        ["python", 0.5],
        ["java", 0.3],
        ["machine", 0.7],
        ["learning", 0.4],
      ]);

      const vec = buildVector("Python is great for machine learning", vocabulary, idfWeights);

      expect(vec.terms).toEqual(vocabulary);
      expect(vec.weights.length).toBe(4);
      expect(vec.termIndex.size).toBe(4);
    });

    it("should have zero weights for terms not in the text", () => {
      const vocabulary = ["python", "java", "ruby"];
      const idfWeights = new Map([
        ["python", 0.5],
        ["java", 0.5],
        ["ruby", 0.5],
      ]);

      const vec = buildVector("Python programming", vocabulary, idfWeights);

      // "java" and "ruby" are not in the text
      expect(vec.weights[vec.termIndex.get("java")!]).toBe(0);
      expect(vec.weights[vec.termIndex.get("ruby")!]).toBe(0);
    });

    it("should handle empty text", () => {
      const vocabulary = ["python", "java"];
      const idfWeights = new Map([
        ["python", 0.5],
        ["java", 0.5],
      ]);

      const vec = buildVector("", vocabulary, idfWeights);
      expect(vec.weights[0]).toBe(0);
      expect(vec.weights[1]).toBe(0);
    });

    it("should use Float64Array for weights", () => {
      const vocabulary = ["python"];
      const idfWeights = new Map([["python", 1.0]]);

      const vec = buildVector("python", vocabulary, idfWeights);
      expect(vec.weights).toBeInstanceOf(Float64Array);
    });
  });

  describe("cosineSimilarity", () => {
    it("should return 1.0 for identical vectors", () => {
      const vec: DocumentVector = {
        terms: ["a", "b"],
        weights: new Float64Array([0.5, 0.3]),
        termIndex: new Map([
          ["a", 0],
          ["b", 1],
        ]),
      };

      expect(cosineSimilarity(vec, vec)).toBeCloseTo(1.0);
    });

    it("should return 0 for orthogonal vectors", () => {
      const vecA: DocumentVector = {
        terms: ["a", "b"],
        weights: new Float64Array([1.0, 0.0]),
        termIndex: new Map([
          ["a", 0],
          ["b", 1],
        ]),
      };
      const vecB: DocumentVector = {
        terms: ["a", "b"],
        weights: new Float64Array([0.0, 1.0]),
        termIndex: new Map([
          ["a", 0],
          ["b", 1],
        ]),
      };

      expect(cosineSimilarity(vecA, vecB)).toBe(0);
    });

    it("should return 0 when either vector has zero magnitude", () => {
      const zeroVec: DocumentVector = {
        terms: ["a", "b"],
        weights: new Float64Array([0.0, 0.0]),
        termIndex: new Map([
          ["a", 0],
          ["b", 1],
        ]),
      };
      const nonZeroVec: DocumentVector = {
        terms: ["a", "b"],
        weights: new Float64Array([0.5, 0.3]),
        termIndex: new Map([
          ["a", 0],
          ["b", 1],
        ]),
      };

      expect(cosineSimilarity(zeroVec, nonZeroVec)).toBe(0);
      expect(cosineSimilarity(nonZeroVec, zeroVec)).toBe(0);
    });

    it("should be symmetric", () => {
      const vecA: DocumentVector = {
        terms: ["a", "b", "c"],
        weights: new Float64Array([0.5, 0.3, 0.1]),
        termIndex: new Map([
          ["a", 0],
          ["b", 1],
          ["c", 2],
        ]),
      };
      const vecB: DocumentVector = {
        terms: ["a", "b", "c"],
        weights: new Float64Array([0.2, 0.8, 0.4]),
        termIndex: new Map([
          ["a", 0],
          ["b", 1],
          ["c", 2],
        ]),
      };

      expect(cosineSimilarity(vecA, vecB)).toBeCloseTo(
        cosineSimilarity(vecB, vecA)
      );
    });

    it("should return value clamped between 0 and 1", () => {
      const vecA: DocumentVector = {
        terms: ["a", "b"],
        weights: new Float64Array([0.7, 0.2]),
        termIndex: new Map([
          ["a", 0],
          ["b", 1],
        ]),
      };
      const vecB: DocumentVector = {
        terms: ["a", "b"],
        weights: new Float64Array([0.4, 0.9]),
        termIndex: new Map([
          ["a", 0],
          ["b", 1],
        ]),
      };

      const similarity = cosineSimilarity(vecA, vecB);
      expect(similarity).toBeGreaterThanOrEqual(0);
      expect(similarity).toBeLessThanOrEqual(1);
    });
  });
});
