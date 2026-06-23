/**
 * Bug Condition Exploration Test - Non-Tech Resume Skills Not Extracted
 *
 * **Property 1: Bug Condition** - This test encodes the EXPECTED behavior.
 * It MUST FAIL on unfixed code to confirm the bug exists.
 *
 * **Validates: Requirements 1.1, 1.2, 1.4, 2.1, 2.2, 2.4**
 *
 * Bug Conditions Tested:
 * - Case 1: extractSkillsLocally() returns 0 skills for non-tech resumes
 * - Case 4: ROLE_EXPECTED_SKILLS has no entries for non-tech roles
 */

import { describe, it, expect, vi } from "vitest";
import * as fc from "fast-check";

// Mock dependencies needed by the career-goals page module
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));
vi.mock("framer-motion", () => ({
  motion: new Proxy({}, { get: () => "div" }),
  AnimatePresence: ({ children }: { children: unknown }) => children,
}));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: vi.fn() },
    from: () => ({ select: vi.fn(), upsert: vi.fn() }),
  }),
}));
vi.mock("@/components/applicant/ResumeUpload", () => ({
  default: () => null,
}));

// Mock supabase server for route.ts imports
vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => ({
    from: () => ({ select: vi.fn(), upsert: vi.fn(), delete: vi.fn() }),
    storage: { from: () => ({ download: vi.fn() }) },
  }),
}));
vi.mock("@/lib/ai/gemini", () => ({
  callGemini: vi.fn().mockResolvedValue("[]"),
}));

import { extractSkillsLocally } from "./route";
import { ROLE_EXPECTED_SKILLS } from "@/app/(dashboard)/applicant/career-goals/page";

// Non-tech resume text samples for each industry
const NON_TECH_RESUME_SAMPLES = {
  culinary: [
    "experienced chef with culinary arts and food safety certification",
    "professional cook skilled in menu planning, kitchen management, and HACCP compliance",
    "culinary arts graduate with food preparation and catering experience",
  ],
  healthcare: [
    "registered nurse with patient care, CPR, medication administration",
    "healthcare professional experienced in vital signs monitoring, wound care, and triage",
    "certified nursing assistant with HIPAA compliance and electronic health records experience",
  ],
  education: [
    "teacher with curriculum development, classroom management, lesson planning",
    "educator experienced in special education, differentiated instruction, and student assessment",
    "experienced instructor skilled in IEP development and educational technology",
  ],
  trades: [
    "mechanic skilled in HVAC, plumbing, electrical wiring, blueprint reading",
    "certified electrician with experience in safety compliance, OSHA, and welding",
    "skilled tradesperson with carpentry, masonry, and forklift operation certification",
  ],
} as const;

const ALL_NON_TECH_SAMPLES = Object.values(NON_TECH_RESUME_SAMPLES).flat();

// Non-tech roles that should have expected skills defined
const NON_TECH_ROLES = ["Chef", "Nurse", "Teacher", "Mechanic"] as const;

describe("Bug Condition Exploration: Non-Tech Resume Skills Not Extracted", () => {
  describe("Case 1: extractSkillsLocally() fails for non-tech resumes", () => {
    it("should extract >= 1 skill from a chef resume", () => {
      const resumeText =
        "experienced chef with culinary arts and food safety certification";
      const skills = extractSkillsLocally(resumeText);
      expect(skills.length).toBeGreaterThanOrEqual(1);
    });

    it("should extract >= 1 skill from a nurse resume", () => {
      const resumeText =
        "registered nurse with patient care, CPR, medication administration";
      const skills = extractSkillsLocally(resumeText);
      expect(skills.length).toBeGreaterThanOrEqual(1);
    });

    it("should extract >= 1 skill from a teacher resume", () => {
      const resumeText =
        "teacher with curriculum development, classroom management, lesson planning";
      const skills = extractSkillsLocally(resumeText);
      expect(skills.length).toBeGreaterThanOrEqual(1);
    });

    it("should extract >= 1 skill from a mechanic resume", () => {
      const resumeText =
        "mechanic skilled in HVAC, plumbing, electrical wiring, blueprint reading";
      const skills = extractSkillsLocally(resumeText);
      expect(skills.length).toBeGreaterThanOrEqual(1);
    });

    // Property-based test: for ANY non-tech resume, at least one skill should be extracted
    it("for any non-tech resume text, extractSkillsLocally should return >= 1 skill", () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...ALL_NON_TECH_SAMPLES),
          (resumeText) => {
            const skills = extractSkillsLocally(resumeText);
            return skills.length >= 1;
          }
        ),
        { numRuns: 12 }
      );
    });
  });

  describe("Case 4: ROLE_EXPECTED_SKILLS missing non-tech roles", () => {
    it("should have a defined entry for Chef with >= 5 skills", () => {
      expect(ROLE_EXPECTED_SKILLS["Chef"]).toBeDefined();
      expect(ROLE_EXPECTED_SKILLS["Chef"]?.length).toBeGreaterThanOrEqual(5);
    });

    it("should have a defined entry for Nurse with >= 5 skills", () => {
      expect(ROLE_EXPECTED_SKILLS["Nurse"]).toBeDefined();
      expect(ROLE_EXPECTED_SKILLS["Nurse"]?.length).toBeGreaterThanOrEqual(5);
    });

    it("should have a defined entry for Teacher with >= 5 skills", () => {
      expect(ROLE_EXPECTED_SKILLS["Teacher"]).toBeDefined();
      expect(ROLE_EXPECTED_SKILLS["Teacher"]?.length).toBeGreaterThanOrEqual(5);
    });

    it("should have a defined entry for Mechanic with >= 5 skills", () => {
      expect(ROLE_EXPECTED_SKILLS["Mechanic"]).toBeDefined();
      expect(ROLE_EXPECTED_SKILLS["Mechanic"]?.length).toBeGreaterThanOrEqual(5);
    });

    // Property-based test: for ANY non-tech role, ROLE_EXPECTED_SKILLS should be defined with >= 5 skills
    it("for any non-tech role, ROLE_EXPECTED_SKILLS should be defined and have >= 5 skills", () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...NON_TECH_ROLES),
          (role) => {
            const skills = ROLE_EXPECTED_SKILLS[role];
            return skills !== undefined && skills.length >= 5;
          }
        ),
        { numRuns: 4 }
      );
    });
  });
});
