"use client";

import { useState } from "react";

interface ExternalApplyDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Handler called when the dialog should close */
  onClose: () => void;
  /** Handler called when user confirms they applied externally */
  onConfirm: () => void;
  /** The job title for display */
  jobTitle: string;
}

/**
 * Dialog shown after opening an external job link in a new tab.
 * Asks the applicant "Did you apply through the external site?"
 * If confirmed, records the application as 'applied_externally'.
 * If declined, does not record anything.
 *
 * Requirements: 20.1, 20.2, 20.3
 */
export default function ExternalApplyDialog({
  open,
  onClose,
  onConfirm,
  jobTitle,
}: ExternalApplyDialogProps) {
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  async function handleConfirm() {
    setSubmitting(true);
    await onConfirm();
    setSubmitting(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="external-apply-dialog-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Dialog panel */}
      <div className="relative z-10 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2
          id="external-apply-dialog-title"
          className="text-lg font-semibold text-gray-900"
        >
          Did you apply?
        </h2>

        <p className="mt-2 text-sm text-gray-600">
          We opened the external application page for{" "}
          <span className="font-medium text-gray-800">{jobTitle}</span> in a new
          tab. Did you complete your application there?
        </p>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
          >
            No, I didn&apos;t apply
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className="inline-flex items-center rounded-md border border-green-600 bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 disabled:opacity-50"
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
                Recording...
              </>
            ) : (
              "Yes, I applied"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
