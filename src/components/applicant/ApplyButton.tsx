"use client";

import { useState } from "react";
import type { JobDescription } from "@/types";
import ExternalApplyDialog from "./ExternalApplyDialog";
import GapSummaryDialog from "./GapSummaryDialog";

interface ApplyButtonProps {
  jobId: string;
  initialStatus: "not_applied" | "applied" | "applied_externally";
  jobStatus: JobDescription["status"];
  /** External job link — if present, this is an imported job */
  jobLink?: string | null;
  /** Job title for dialog display */
  jobTitle?: string;
  /** Match percentage (if available) */
  matchPercentage?: number | null;
  /** Missing skills from match result */
  missingSkills?: string[];
  /** Required skills for the job (for gap summary) */
  requiredSkills?: Array<{ skill_name: string; importance: "required" | "preferred" }>;
  onApplicationSuccess?: () => void;
}

/**
 * Smart Apply button that handles two different flows:
 *
 * 1. External jobs (has Job_Link): Opens external link in new tab,
 *    then shows confirmation dialog "Did you apply?"
 *
 * 2. Internal jobs (no Job_Link): Shows pre-application gap summary dialog
 *    with match %, ATS score, missing skills, and top skills to learn.
 *
 * Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6, 26.1–26.8
 */
export default function ApplyButton({
  jobId,
  initialStatus,
  jobStatus,
  jobLink,
  jobTitle = "this position",
  matchPercentage = null,
  missingSkills = [],
  requiredSkills = [],
  onApplicationSuccess,
}: ApplyButtonProps) {
  const [status, setStatus] = useState<
    "idle" | "submitting" | "applied" | "applied_externally" | "error"
  >(
    initialStatus === "applied"
      ? "applied"
      : initialStatus === "applied_externally"
        ? "applied_externally"
        : "idle"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showExternalDialog, setShowExternalDialog] = useState(false);
  const [showGapSummary, setShowGapSummary] = useState(false);

  // Do not render button if job is not published
  if (jobStatus !== "published") {
    return null;
  }

  const isExternalJob = Boolean(jobLink);

  async function submitApplication(applicationStatus: "applied" | "applied_externally") {
    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescriptionId: jobId,
          status: applicationStatus,
        }),
      });

      if (response.status === 201 || response.status === 409) {
        // 201 = created, 409 = already applied (treat as success)
        setStatus(applicationStatus === "applied_externally" ? "applied_externally" : "applied");
        onApplicationSuccess?.();
        return true;
      } else {
        const data = await response.json().catch(() => null);
        const message =
          data?.message || "Failed to submit application. Please try again.";
        setStatus("error");
        setErrorMessage(message);
        return false;
      }
    } catch {
      setStatus("error");
      setErrorMessage("Failed to submit application. Please try again.");
      return false;
    }
  }

  function handleApplyClick() {
    setErrorMessage(null);

    if (isExternalJob) {
      // External job: open link in new tab, then show confirmation
      window.open(jobLink!, "_blank", "noopener,noreferrer");
      setShowExternalDialog(true);
    } else {
      // Internal job: show gap summary dialog
      setShowGapSummary(true);
    }
  }

  async function handleExternalConfirm() {
    await submitApplication("applied_externally");
    setShowExternalDialog(false);
  }

  function handleExternalDecline() {
    setShowExternalDialog(false);
  }

  async function handleGapSummaryProceed() {
    await submitApplication("applied");
    setShowGapSummary(false);
  }

  function handleGapSummaryCancel() {
    setShowGapSummary(false);
  }

  const isDisabled =
    status === "submitting" ||
    status === "applied" ||
    status === "applied_externally";

  const buttonLabel =
    status === "applied"
      ? "Applied"
      : status === "applied_externally"
        ? "Applied Externally"
        : status === "submitting"
          ? "Applying..."
          : isExternalJob
            ? "Apply Externally"
            : "Apply";

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleApplyClick}
        disabled={isDisabled}
        aria-label={
          status === "applied"
            ? "Already applied"
            : status === "applied_externally"
              ? "Already applied externally"
              : status === "submitting"
                ? "Submitting application"
                : isExternalJob
                  ? "Apply to this job externally"
                  : "Apply to this job"
        }
        className={`inline-flex items-center rounded-xl px-4 py-2 text-sm font-medium shadow-sm transition-colors ${
          status === "applied"
            ? "cursor-not-allowed border border-[var(--success)] bg-[var(--success-bg)] text-[var(--success-text)]"
            : status === "applied_externally"
              ? "cursor-not-allowed border border-purple-500/30 bg-purple-500/15 text-purple-400"
              : status === "submitting"
                ? "cursor-not-allowed border border-[var(--border-input)] bg-[var(--bg-secondary)] text-[var(--text-muted)]"
                : isExternalJob
                  ? "border border-purple-500 bg-purple-500 text-white hover:bg-purple-600"
                  : "border border-[var(--accent)] bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
        }`}
      >
        {status === "submitting" && (
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
        )}
        {(status === "applied" || status === "applied_externally") && (
          <svg
            className="mr-1.5 h-4 w-4"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        )}
        {isExternalJob && status === "idle" && (
          <svg
            className="mr-1.5 h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        )}
        {buttonLabel}
      </button>

      {status === "error" && errorMessage && (
        <p className="text-sm text-[var(--error-text)]" role="alert">
          {errorMessage}
        </p>
      )}

      {/* External Apply Confirmation Dialog */}
      <ExternalApplyDialog
        open={showExternalDialog}
        onClose={handleExternalDecline}
        onConfirm={handleExternalConfirm}
        jobTitle={jobTitle}
      />

      {/* Gap Summary Dialog for Internal Jobs */}
      <GapSummaryDialog
        open={showGapSummary}
        onClose={handleGapSummaryCancel}
        onProceed={handleGapSummaryProceed}
        jobTitle={jobTitle}
        jobId={jobId}
        matchPercentage={matchPercentage}
        missingSkills={missingSkills}
        requiredSkills={requiredSkills}
      />
    </div>
  );
}
