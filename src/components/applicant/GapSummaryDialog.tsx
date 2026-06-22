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

      // If match percentage is not available, try to fetch/calculate it
      let resolvedMatchPct = matchPercentage;
      let resolvedMissingSkills = missingSkills;

      if (resolvedMatchPct === null) {
        try {
          // Trigger match calculation for this job
          const calcRes = await fetch("/api/match/calculate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ job_description_id: jobId }),
          });
          if (calcRes.ok) {
            const calcData = await calcRes.json();
            if (calcData.success && calcData.results?.length > 0) {
              const result = calcData.results[0];
              resolvedMatchPct = result.match_percentage;
              resolvedMissingSkills = result.missing_skills ?? [];
            }
          }
        } catch {
          // Couldn't calculate — continue with null
        }
      }

      // Separate missing required and preferred skills
      const requiredSkillNames = requiredSkills
        .filter((s) => s.importance === "required")
        .map((s) => s.skill_name);
      const preferredSkillNames = requiredSkills
        .filter((s) => s.importance === "preferred")
        .map((s) => s.skill_name);

      const missingRequired = resolvedMissingSkills.filter((s) =>
        requiredSkillNames.some(
          (rs) => rs.toLowerCase() === s.toLowerCase()
        )
      );
      const missingPreferred = resolvedMissingSkills.filter((s) =>
        preferredSkillNames.some(
          (ps) => ps.toLowerCase() === s.toLowerCase()
        )
      );

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
        matchPercentage: resolvedMatchPct,
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
        className: "bg-green-500/10 border-green-500/20 text-green-300",
        icon: "🎉",
      };
    }
    if (matchPct < 60) {
      return {
        text: "You may want to develop these skills first, but you can still apply.",
        className: "bg-amber-500/10 border-amber-500/20 text-amber-300",
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
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Dialog panel */}
      <div className="relative z-10 w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-xl glass-card p-6 mx-4">
        <h2
          id="gap-summary-dialog-title"
          className="text-lg font-semibold text-[var(--text-primary)]"
        >
          Application Summary — {jobTitle}
        </h2>

        {loading ? (
          <div className="mt-4 flex items-center justify-center py-8">
            <svg
              className="h-6 w-6 animate-spin text-[var(--accent)]"
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
            <span className="ml-2 text-sm text-[var(--text-muted)]">
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

            {/* Skill Match Score */}
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4 text-center">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                Skill Match
              </p>
              <p className={`mt-1 text-3xl font-bold ${
                gapData.matchPercentage !== null && gapData.matchPercentage >= 80
                  ? "text-green-400"
                  : gapData.matchPercentage !== null && gapData.matchPercentage >= 60
                  ? "text-yellow-400"
                  : "text-rose-400"
              }`}>
                {gapData.matchPercentage !== null
                  ? `${gapData.matchPercentage}%`
                  : "—"}
              </p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Based on your skills vs job requirements
              </p>
            </div>

            {/* Missing Required Skills */}
            {gapData.missingRequiredSkills.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-secondary)]">
                  Missing Required Skills
                </h3>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {gapData.missingRequiredSkills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center rounded-full bg-rose-500/15 px-2.5 py-0.5 text-xs font-medium text-rose-300 border border-rose-500/20"
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
                <h3 className="text-sm font-semibold text-[var(--text-secondary)]">
                  Missing Preferred Skills
                </h3>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {gapData.missingPreferredSkills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center rounded-full bg-yellow-500/15 px-2.5 py-0.5 text-xs font-medium text-yellow-300 border border-yellow-500/20"
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
                <h3 className="text-sm font-semibold text-[var(--text-secondary)]">
                  Top Skills to Learn
                </h3>
                <ul className="mt-1.5 space-y-1.5">
                  {gapData.topSkillsToLearn.map((skill, idx) => (
                    <li
                      key={skill.skillName}
                      className="flex items-center justify-between rounded-md border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 py-2"
                    >
                      <span className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
                        <span className="text-xs text-[var(--text-muted)]">
                          {idx + 1}.
                        </span>
                        {skill.skillName}
                      </span>
                      <span className="text-xs font-semibold text-green-400">
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
                <p className="text-sm text-[var(--text-secondary)]">
                  No significant skill gaps found. You look like a great fit!
                </p>
              )}
          </div>
        ) : null}

        {/* Action buttons — always available, never blocks application */}
        <div className="mt-6 flex items-center justify-end gap-3 border-t border-[var(--border-subtle)] pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-[var(--text-secondary)] shadow-sm hover:bg-gray-50 disabled:opacity-50"
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
