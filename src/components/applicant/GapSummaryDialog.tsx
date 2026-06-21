"use client";

import { useEffect, useState } from "react";

interface SkillROIItem {
  skillName: string;
  currentScore: number;
  projectedScore: number;
  scoreDelta: number;
}

interface GapSummaryData {
  matchPercentage: number | null;
  atsScore: number | null;
  missingRequiredSkills: string[];
  missingPreferredSkills: string[];
  topSkillsToLearn: SkillROIItem[];
}

interface GapSummaryDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Handler called when the dialog should close (Cancel) */
  onClose: () => void;
  /** Handler called when user proceeds with application */
  onProceed: () => void;
  /** The job title for display */
  jobTitle: string;
  /** The job ID to fetch gap data for */
  jobId: string;
  /** Match percentage if already available (avoids extra fetch) */
  matchPercentage: number | null;
  /** Missing skills if already available */
  missingSkills: string[];
  /** Required skills for this job */
  requiredSkills: Array<{ skill_name: string; importance: "required" | "preferred" }>;
}

/**
 * Pre-application gap summary dialog shown for internal jobs (no external Job_Link).
 * Shows match %, ATS score, missing required/preferred skills, and top 3 skills to learn.
 * Provides encouraging/advisory messages based on match level.
 * Never blocks the application — always allows "Proceed with Application".
 *
 * Requirements: 26.1, 26.2, 26.3, 26.4, 26.5, 26.6, 26.7, 26.8
 */
export default function GapSummaryDialog({
  open,
  onClose,
  onProceed,
  jobTitle,
  jobId,
  matchPercentage,
  missingSkills,
  requiredSkills,
}: GapSummaryDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [gapData, setGapData] = useState<GapSummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;

    async function fetchGapData() {
      setLoading(true);

      // Separate missing required and preferred skills
      const requiredSkillNames = requiredSkills
        .filter((s) => s.importance === "required")
        .map((s) => s.skill_name);
      const preferredSkillNames = requiredSkills
        .filter((s) => s.importance === "preferred")
        .map((s) => s.skill_name);

      const missingRequired = missingSkills.filter((s) =>
        requiredSkillNames.some(
          (rs) => rs.toLowerCase() === s.toLowerCase()
        )
      );
      const missingPreferred = missingSkills.filter((s) =>
        preferredSkillNames.some(
          (ps) => ps.toLowerCase() === s.toLowerCase()
        )
      );

      // Fetch ATS score
      let atsScore: number | null = null;
      try {
        const atsRes = await fetch(`/api/jobs/${jobId}/ats-score`);
        if (atsRes.ok) {
          const atsData = await atsRes.json();
          atsScore = atsData.score ?? null;
        }
      } catch {
        // ATS score not available — that's okay
      }

      // Fetch top 3 skills to learn from Skill ROI
      let topSkillsToLearn: SkillROIItem[] = [];
      try {
        const roiRes = await fetch(`/api/jobs/${jobId}/skill-roi`);
        if (roiRes.ok) {
          const roiData = await roiRes.json();
          if (roiData.success && roiData.results) {
            topSkillsToLearn = roiData.results.slice(0, 3);
          }
        }
      } catch {
        // Skill ROI not available — that's okay
      }

      setGapData({
        matchPercentage,
        atsScore,
        missingRequiredSkills: missingRequired,
        missingPreferredSkills: missingPreferred,
        topSkillsToLearn,
      });
      setLoading(false);
    }

    fetchGapData();
  }, [open, jobId, matchPercentage, missingSkills, requiredSkills]);

  if (!open) return null;

  async function handleProceed() {
    setSubmitting(true);
    await onProceed();
    setSubmitting(false);
  }

  function getMatchMessage(matchPct: number | null) {
    if (matchPct === null) return null;
    if (matchPct >= 90) {
      return {
        text: "You're a strong match for this role!",
        className: "bg-green-50 border-green-200 text-green-800",
        icon: "🎉",
      };
    }
    if (matchPct < 60) {
      return {
        text: "You may want to develop these skills first, but you can still apply.",
        className: "bg-amber-50 border-amber-200 text-amber-800",
        icon: "💡",
      };
    }
    return null;
  }

  const matchMessage = gapData ? getMatchMessage(gapData.matchPercentage) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gap-summary-dialog-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Dialog panel */}
      <div className="relative z-10 w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <h2
          id="gap-summary-dialog-title"
          className="text-lg font-semibold text-gray-900"
        >
          Application Summary — {jobTitle}
        </h2>

        {loading ? (
          <div className="mt-4 flex items-center justify-center py-8">
            <svg
              className="h-6 w-6 animate-spin text-blue-500"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span className="ml-2 text-sm text-gray-500">
              Analyzing your fit...
            </span>
          </div>
        ) : gapData ? (
          <div className="mt-4 space-y-4">
            {/* Encouraging / Advisory Message */}
            {matchMessage && (
              <div
                className={`flex items-start gap-2 rounded-md border p-3 ${matchMessage.className}`}
              >
                <span className="text-lg" aria-hidden="true">
                  {matchMessage.icon}
                </span>
                <p className="text-sm font-medium">{matchMessage.text}</p>
              </div>
            )}

            {/* Score Summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-center">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Match
                </p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {gapData.matchPercentage !== null
                    ? `${gapData.matchPercentage}%`
                    : "—"}
                </p>
              </div>
              <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-center">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  ATS Score
                </p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {gapData.atsScore !== null ? `${gapData.atsScore}%` : "—"}
                </p>
              </div>
            </div>

            {/* Missing Required Skills */}
            {gapData.missingRequiredSkills.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700">
                  Missing Required Skills
                </h3>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {gapData.missingRequiredSkills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Missing Preferred Skills */}
            {gapData.missingPreferredSkills.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700">
                  Missing Preferred Skills
                </h3>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {gapData.missingPreferredSkills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Top 3 Skills to Learn */}
            {gapData.topSkillsToLearn.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700">
                  Top Skills to Learn
                </h3>
                <ul className="mt-1.5 space-y-1.5">
                  {gapData.topSkillsToLearn.map((skill, idx) => (
                    <li
                      key={skill.skillName}
                      className="flex items-center justify-between rounded-md border border-gray-100 bg-gray-50 px-3 py-2"
                    >
                      <span className="flex items-center gap-2 text-sm text-gray-800">
                        <span className="text-xs text-gray-400">
                          {idx + 1}.
                        </span>
                        {skill.skillName}
                      </span>
                      <span className="text-xs font-semibold text-green-700">
                        +{skill.scoreDelta}% match
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* No gaps — clean profile */}
            {gapData.missingRequiredSkills.length === 0 &&
              gapData.missingPreferredSkills.length === 0 &&
              gapData.topSkillsToLearn.length === 0 && (
                <p className="text-sm text-gray-600">
                  No significant skill gaps found. You look like a great fit!
                </p>
              )}
          </div>
        ) : null}

        {/* Action buttons — always available, never blocks application */}
        <div className="mt-6 flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleProceed}
            disabled={submitting}
            className="inline-flex items-center rounded-md border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <svg
                  className="mr-2 h-4 w-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Applying...
              </>
            ) : (
              "Proceed with Application"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
