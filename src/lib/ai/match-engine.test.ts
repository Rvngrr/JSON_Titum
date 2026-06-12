/**
 * Unit tests for the Match Engine scoring logic.
 * Tests the pure calculateWeightedScore function which does not require OpenAI.
 */

import { describe, it, expect } from "vitest";
import {
  calculateWeightedScore,
  type SkillMatchDetail,
} from "./match-engine";

describe("calculateWeightedScore", () => {
  it("returns 0 with empty arrays when no match details provided", () => {
    const result = calculateWeightedScore([]);
    expect(result.matchPercentage).toBe(0);
    expect(result.matchedSkills).toEqual([]);
    expect(result.missingSkills).toEqual([]);
  });

  it("returns 100 when all skills are matched", () => {
    const details: SkillMatchDetail[] = [
      { jobSkill: "React", applicantSkill: "React.js", isMatch: true, importance: "required" },
      { jobSkill: "TypeScript", applicantSkill: "TypeScript", isMatch: true, importance: "required" },
      { jobSkill: "CSS", applicantSkill: "CSS3", isMatch: true, importance: "preferred" },
    ];
    const result = calculateWeightedScore(details);
    expect(result.matchPercentage).toBe(100);
    expect(result.matchedSkills).toEqual(["React", "TypeScript", "CSS"]);
    expect(result.missingSkills).toEqual([]);
  });

  it("returns 0 when no skills are matched", () => {
    const details: SkillMatchDetail[] = [
      { jobSkill: "React", applicantSkill: null, isMatch: false, importance: "required" },
      { jobSkill: "TypeScript", applicantSkill: null, isMatch: false, importance: "preferred" },
    ];
    const result = calculateWeightedScore(details);
    expect(result.matchPercentage).toBe(0);
    expect(result.matchedSkills).toEqual([]);
    expect(result.missingSkills).toEqual(["React", "TypeScript"]);
  });

  it("weights required skills at 2x and preferred at 1x", () => {
    // 1 required skill matched (weight 2), 1 preferred skill missed (weight 1)
    // Score: 2 / (2 + 1) = 66.67 → rounds to 67
    const details: SkillMatchDetail[] = [
      { jobSkill: "React", applicantSkill: "React", isMatch: true, importance: "required" },
      { jobSkill: "CSS", applicantSkill: null, isMatch: false, importance: "preferred" },
    ];
    const result = calculateWeightedScore(details);
    expect(result.matchPercentage).toBe(67);
    expect(result.matchedSkills).toEqual(["React"]);
    expect(result.missingSkills).toEqual(["CSS"]);
  });

  it("demonstrates required skills contribute more than preferred", () => {
    // Only match a required skill: 2 / (2+1) = 67%
    const matchRequired: SkillMatchDetail[] = [
      { jobSkill: "React", applicantSkill: "React", isMatch: true, importance: "required" },
      { jobSkill: "CSS", applicantSkill: null, isMatch: false, importance: "preferred" },
    ];

    // Only match a preferred skill: 1 / (2+1) = 33%
    const matchPreferred: SkillMatchDetail[] = [
      { jobSkill: "React", applicantSkill: null, isMatch: false, importance: "required" },
      { jobSkill: "CSS", applicantSkill: "CSS", isMatch: true, importance: "preferred" },
    ];

    const resultRequired = calculateWeightedScore(matchRequired);
    const resultPreferred = calculateWeightedScore(matchPreferred);

    expect(resultRequired.matchPercentage).toBeGreaterThan(
      resultPreferred.matchPercentage
    );
  });

  it("normalizes score to integer between 0 and 100", () => {
    // 2 required matched, 1 preferred missed: 4 / (4+1) = 80%
    const details: SkillMatchDetail[] = [
      { jobSkill: "React", applicantSkill: "React", isMatch: true, importance: "required" },
      { jobSkill: "Node.js", applicantSkill: "Node", isMatch: true, importance: "required" },
      { jobSkill: "GraphQL", applicantSkill: null, isMatch: false, importance: "preferred" },
    ];
    const result = calculateWeightedScore(details);
    expect(result.matchPercentage).toBe(80);
    expect(Number.isInteger(result.matchPercentage)).toBe(true);
    expect(result.matchPercentage).toBeGreaterThanOrEqual(0);
    expect(result.matchPercentage).toBeLessThanOrEqual(100);
  });

  it("handles all required skills correctly", () => {
    // 1 matched, 1 missed, both required: 2 / (2+2) = 50%
    const details: SkillMatchDetail[] = [
      { jobSkill: "Python", applicantSkill: "Python 3", isMatch: true, importance: "required" },
      { jobSkill: "Java", applicantSkill: null, isMatch: false, importance: "required" },
    ];
    const result = calculateWeightedScore(details);
    expect(result.matchPercentage).toBe(50);
  });

  it("handles all preferred skills correctly", () => {
    // 1 matched, 1 missed, both preferred: 1 / (1+1) = 50%
    const details: SkillMatchDetail[] = [
      { jobSkill: "Docker", applicantSkill: "Docker", isMatch: true, importance: "preferred" },
      { jobSkill: "K8s", applicantSkill: null, isMatch: false, importance: "preferred" },
    ];
    const result = calculateWeightedScore(details);
    expect(result.matchPercentage).toBe(50);
  });
});
