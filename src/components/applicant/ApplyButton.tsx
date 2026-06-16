"use client";

import { useState } from "react";
import type { JobDescription } from "@/types";

interface ApplyButtonProps {
  jobId: string;
  initialStatus: "not_applied" | "applied";
  jobStatus: JobDescription["status"];
  onApplicationSuccess?: () => void;
}

export default function ApplyButton({
  jobId,
  initialStatus,
  jobStatus,
  onApplicationSuccess,
}: ApplyButtonProps) {
  const [status, setStatus] = useState<
    "idle" | "submitting" | "applied" | "error"
  >(initialStatus === "applied" ? "applied" : "idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Do not render button if job is not published
  if (jobStatus !== "published") {
    return null;
  }

  async function handleApply() {
    setStatus("submitting");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_description_id: jobId }),
      });

      if (response.status === 201) {
        // Success
        setStatus("applied");
        onApplicationSuccess?.();
      } else if (response.status === 409) {
        // Duplicate — treat as success
        setStatus("applied");
        onApplicationSuccess?.();
      } else {
        // Error (422, 401, 500, etc.)
        const data = await response.json().catch(() => null);
        const message =
          data?.message || "Failed to submit application. Please try again.";
        setStatus("error");
        setErrorMessage(message);
      }
    } catch {
      setStatus("error");
      setErrorMessage("Failed to submit application. Please try again.");
    }
  }

  const isDisabled = status === "submitting" || status === "applied";

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleApply}
        disabled={isDisabled}
        aria-label={
          status === "applied"
            ? "Already applied"
            : status === "submitting"
              ? "Submitting application"
              : "Apply to this job"
        }
        className={`inline-flex items-center rounded-md px-4 py-2 text-sm font-medium shadow-sm transition-colors ${
          status === "applied"
            ? "cursor-not-allowed border border-green-300 bg-green-50 text-green-700"
            : status === "submitting"
              ? "cursor-not-allowed border border-gray-300 bg-gray-100 text-gray-500"
              : "border border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
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
        {status === "applied" && (
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
        {status === "applied"
          ? "Applied"
          : status === "submitting"
            ? "Applying..."
            : "Apply"}
      </button>
      {status === "error" && errorMessage && (
        <p className="text-sm text-red-600" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
