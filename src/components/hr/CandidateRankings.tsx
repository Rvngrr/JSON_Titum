"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import LoadingSpinner from "@/components/shared/LoadingSpinner";

// ============================================================================
// Types
// ============================================================================

interface CandidateRankingEntry {
  applicantId: string;
  name: string;
  readyNowScore: number;
  highPotentialScore: number;
  isHighGrowth: boolean;
  easiestSkillsToLearn: string[];
  isAtRisk: boolean;
  highMatchJobCount: number;
}

type SortField = "readyNow" | "highPotential";
type SortDirection = "desc" | "asc";

interface CandidateRankingsProps {
  /** The job description ID to show candidate rankings for */
  jobId: string;
}

// ============================================================================
// Scoring Helpers (client-side — mirrors candidate-scorer logic)
// ============================================================================

/**
 * Easy skills catalog (mirrors hidden-gem-detector).
 * Used for client-side "High Potential" calculations.
 */
const EASY_SKILLS = new Set([
  "communication", "public speaking", "teamwork", "time management",
  "problem solving", "critical thinking", "leadership", "adaptability",
  "creativity", "emotional intelligence", "conflict resolution",
  "presentation skills", "negotiation", "mentoring", "collaboration",
  "excel", "google sheets", "powerpoint", "google slides", "word",
  "google docs", "slack", "trello", "jira", "notion", "figma",
  "canva", "zoom", "microsoft teams", "outlook", "git", "github",
  "vs code", "postman", "npm", "yarn", "markdown", "html", "css",
  "json", "xml", "rest api", "agile", "scrum", "kanban",
]);

function classifySkillDifficulty(skillName: string): "easy" | "hard" {
  return EASY_SKILLS.has(skillName.toLowerCase().trim()) ? "easy" : "hard";
}

function calculateMatchPercentage(
  applicantSkills: string[],
  jobRequiredSkills: Array<{ skill_name: string; importance: "required" | "preferred" }>
): number {
  if (jobRequiredSkills.length === 0) return 0;

  const normalized = applicantSkills.map((s) => s.toLowerCase().trim());
  let totalWeight = 0;
  let matchedWeight = 0;

  for (const jobSkill of jobRequiredSkills) {
    const weight = jobSkill.importance === "required" ? 2 : 1;
    totalWeight += weight;
    if (normalized.includes(jobSkill.skill_name.toLowerCase().trim())) {
      matchedWeight += weight;
    }
  }

  if (totalWeight === 0) return 0;
  return Math.min(100, Math.max(0, Math.round((matchedWeight / totalWeight) * 100)));
}

function getMissingSkills(
  applicantSkills: string[],
  jobRequiredSkills: Array<{ skill_name: string; importance: "required" | "preferred" }>
): string[] {
  const normalized = applicantSkills.map((s) => s.toLowerCase().trim());
  return jobRequiredSkills
    .filter((js) => !normalized.includes(js.skill_name.toLowerCase().trim()))
    .map((js) => js.skill_name);
}

function findEasiestMissingSkills(missingSkills: string[], count: number): string[] {
  const easy: string[] = [];
  const hard: string[] = [];
  for (const skill of missingSkills) {
    if (classifySkillDifficulty(skill) === "easy") {
      easy.push(skill);
    } else {
      hard.push(skill);
    }
  }
  const result: string[] = [];
  for (const s of easy) { if (result.length >= count) break; result.push(s); }
  for (const s of hard) { if (result.length >= count) break; result.push(s); }
  return result;
}

// ============================================================================
// Component
// ============================================================================

export default function CandidateRankings({ jobId }: CandidateRankingsProps) {
  const [candidates, setCandidates] = useState<CandidateRankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("readyNow");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [showAtRiskOnly, setShowAtRiskOnly] = useState(false);

  useEffect(() => {
    async function fetchCandidateScores() {
      setLoading(true);
      setError(null);

      try {
        const supabase = createClient();

        // Fetch job required skills
        const { data: jobSkills, error: skillsError } = await supabase
          .from("job_required_skills")
          .select("skill_name, importance")
          .eq("job_description_id", jobId);

        if (skillsError) {
          setError("Failed to load job skills.");
          setLoading(false);
          return;
        }

        const typedJobSkills = (jobSkills ?? []) as Array<{
          skill_name: string;
          importance: "required" | "preferred";
        }>;

        // Fetch match results for this job
        const { data: matchResults, error: matchError } = await supabase
          .from("match_results")
          .select("applicant_id, match_percentage")
          .eq("job_description_id", jobId);

        if (matchError) {
          setError("Failed to load match results.");
          setLoading(false);
          return;
        }

        if (!matchResults || matchResults.length === 0) {
          setCandidates([]);
          setLoading(false);
          return;
        }

        // Get all unique applicant IDs
        const applicantIds = [...new Set(matchResults.map((m) => m.applicant_id))];

        // Fetch profiles for applicants
        const { data: profiles, error: profileError } = await supabase
          .from("profiles")
          .select("id, name")
          .in("id", applicantIds);

        if (profileError) {
          setError("Failed to load applicant profiles.");
          setLoading(false);
          return;
        }

        const profileMap = new Map<string, string>();
        for (const p of profiles ?? []) {
          profileMap.set(p.id, p.name);
        }

        // Fetch skills for each applicant
        const { data: applicantSkillsData, error: applicantSkillsError } = await supabase
          .from("skills")
          .select("user_id, name")
          .in("user_id", applicantIds);

        if (applicantSkillsError) {
          setError("Failed to load applicant skills.");
          setLoading(false);
          return;
        }

        // Group skills by applicant
        const applicantSkillsMap = new Map<string, string[]>();
        for (const skill of applicantSkillsData ?? []) {
          const existing = applicantSkillsMap.get(skill.user_id) ?? [];
          existing.push(skill.name);
          applicantSkillsMap.set(skill.user_id, existing);
        }

        // For At Risk detection: get all match results for all applicants across all published jobs
        const { data: allHighMatches, error: highMatchError } = await supabase
          .from("match_results")
          .select("applicant_id, match_percentage, job_description_id")
          .in("applicant_id", applicantIds)
          .gte("match_percentage", 85);

        const highMatchCountMap = new Map<string, number>();
        if (!highMatchError && allHighMatches) {
          for (const id of applicantIds) {
            const count = allHighMatches.filter(
              (m) => m.applicant_id === id && m.match_percentage >= 85
            ).length;
            highMatchCountMap.set(id, count);
          }
        }

        // Calculate candidate scores for each applicant
        const entries: CandidateRankingEntry[] = applicantIds.map((applicantId) => {
          const name = profileMap.get(applicantId) ?? "Unknown Applicant";
          const skills = applicantSkillsMap.get(applicantId) ?? [];

          // Ready Now score
          const readyNowScore = calculateMatchPercentage(skills, typedJobSkills);

          // Missing skills and High Potential calculation
          const missingSkills = getMissingSkills(skills, typedJobSkills);
          const easiestSkillsToLearn = findEasiestMissingSkills(missingSkills, 2);

          let highPotentialScore = readyNowScore;
          if (easiestSkillsToLearn.length > 0) {
            const simulatedSkills = [...skills, ...easiestSkillsToLearn];
            highPotentialScore = calculateMatchPercentage(simulatedSkills, typedJobSkills);
          }

          const isHighGrowth = highPotentialScore - readyNowScore >= 10;

          // At Risk status
          const highMatchJobCount = highMatchCountMap.get(applicantId) ?? 0;
          const isAtRisk = highMatchJobCount >= 3;

          return {
            applicantId,
            name,
            readyNowScore,
            highPotentialScore,
            isHighGrowth,
            easiestSkillsToLearn,
            isAtRisk,
            highMatchJobCount,
          };
        });

        setCandidates(entries);
      } catch {
        setError("An unexpected error occurred while loading candidate scores.");
      } finally {
        setLoading(false);
      }
    }

    if (jobId) {
      fetchCandidateScores();
    }
  }, [jobId]);

  // Sort and filter logic
  const displayedCandidates = useMemo(() => {
    let filtered = candidates;

    if (showAtRiskOnly) {
      filtered = filtered.filter((c) => c.isAtRisk);
    }

    const sorted = [...filtered].sort((a, b) => {
      const aVal = sortField === "readyNow" ? a.readyNowScore : a.highPotentialScore;
      const bVal = sortField === "readyNow" ? b.readyNowScore : b.highPotentialScore;

      if (sortDirection === "desc") {
        return bVal - aVal || a.name.localeCompare(b.name);
      }
      return aVal - bVal || a.name.localeCompare(b.name);
    });

    return sorted;
  }, [candidates, sortField, sortDirection, showAtRiskOnly]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "desc" ? "asc" : "desc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return "↕";
    return sortDirection === "desc" ? "↓" : "↑";
  };

  // Loading state
  if (loading) {
    return (
      <section aria-label="Candidate rankings" className="flex justify-center p-4 py-12">
        <LoadingSpinner />
      </section>
    );
  }

  // Error state
  if (error) {
    return (
      <section aria-label="Candidate rankings" className="p-4">
        <p className="text-red-600" role="alert">{error}</p>
      </section>
    );
  }

  // Empty state
  if (candidates.length === 0) {
    return (
      <section aria-label="Candidate rankings" className="p-4">
        <p className="text-gray-500">No candidates found for this job listing.</p>
      </section>
    );
  }

  return (
    <section aria-label="Candidate rankings" className="p-4">
      {/* Filter controls */}
      <div className="mb-4 flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={showAtRiskOnly}
            onChange={(e) => setShowAtRiskOnly(e.target.checked)}
            className="rounded border-gray-300 text-red-600 focus:ring-red-500"
            aria-label="Show At Risk applicants only"
          />
          <span>🚨 At Risk only</span>
        </label>
        <span className="text-sm text-gray-500">
          {displayedCandidates.length} of {candidates.length} candidates shown
        </span>
      </div>

      {/* Rankings table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse" aria-label="Candidate scores and rankings">
          <thead>
            <tr className="border-b border-gray-200 text-left">
              <th className="py-3 px-4 font-semibold text-gray-700">Applicant</th>
              <th className="py-3 px-4 font-semibold text-gray-700 text-right">
                <button
                  type="button"
                  onClick={() => handleSort("readyNow")}
                  className="inline-flex items-center gap-1 hover:text-blue-600 transition-colors"
                  aria-label="Sort by Ready Now score"
                >
                  Ready Now {getSortIcon("readyNow")}
                </button>
              </th>
              <th className="py-3 px-4 font-semibold text-gray-700 text-right">
                <button
                  type="button"
                  onClick={() => handleSort("highPotential")}
                  className="inline-flex items-center gap-1 hover:text-blue-600 transition-colors"
                  aria-label="Sort by High Potential score"
                >
                  High Potential {getSortIcon("highPotential")}
                </button>
              </th>
              <th className="py-3 px-4 font-semibold text-gray-700">Growth</th>
              <th className="py-3 px-4 font-semibold text-gray-700">Skills to Learn</th>
              <th className="py-3 px-4 font-semibold text-gray-700">Status</th>
            </tr>
          </thead>
          <tbody>
            {displayedCandidates.map((candidate) => (
              <tr
                key={candidate.applicantId}
                className="border-b border-gray-100 hover:bg-gray-50"
              >
                {/* Name */}
                <td className="py-3 px-4 text-gray-800 font-medium">
                  {candidate.name}
                </td>

                {/* Ready Now Score */}
                <td className="py-3 px-4 text-right font-medium text-gray-900">
                  {candidate.readyNowScore}%
                </td>

                {/* High Potential Score */}
                <td className="py-3 px-4 text-right font-medium text-gray-900">
                  {candidate.highPotentialScore}%
                </td>

                {/* High Growth indicator */}
                <td className="py-3 px-4">
                  {candidate.isHighGrowth && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800"
                      title={`+${candidate.highPotentialScore - candidate.readyNowScore}% growth potential`}
                    >
                      📈 High Growth
                    </span>
                  )}
                </td>

                {/* Easiest missing skills */}
                <td className="py-3 px-4">
                  {candidate.easiestSkillsToLearn.length > 0 ? (
                    <span className="text-sm text-gray-600">
                      {candidate.easiestSkillsToLearn.join(", ")}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400 italic">None</span>
                  )}
                </td>

                {/* At Risk status */}
                <td className="py-3 px-4">
                  {candidate.isAtRisk && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800"
                      title={`Matches ${candidate.highMatchJobCount} jobs at 85%+`}
                    >
                      🚨 At Risk
                      <span className="ml-1 text-red-600">
                        ({candidate.highMatchJobCount} jobs)
                      </span>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty filtered state */}
      {showAtRiskOnly && displayedCandidates.length === 0 && (
        <p className="mt-4 text-center text-gray-500">
          No &quot;At Risk&quot; applicants found for this job.
        </p>
      )}
    </section>
  );
}
