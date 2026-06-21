interface ApplicationStatusBadgeProps {
  /** Whether the user has applied */
  applied: boolean;
  /** Application status: 'applied', 'applied_externally', or undefined */
  applicationStatus?: "applied" | "applied_externally" | null;
}

/**
 * Visual badge distinguishing application status:
 * - "Applied" (green) — internal application
 * - "Applied Externally" (purple) — confirmed external application
 * - "Not Applied" (gray) — no application
 *
 * Requirements: 20.6
 */
export default function ApplicationStatusBadge({
  applied,
  applicationStatus,
}: ApplicationStatusBadgeProps) {
  if (applied && applicationStatus === "applied_externally") {
    return (
      <span
        className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-sm font-medium text-purple-800"
        aria-label="Application status: Applied Externally"
      >
        <svg
          className="mr-1 h-3 w-3"
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
        Applied Externally
      </span>
    );
  }

  if (applied) {
    return (
      <span
        className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-sm font-medium text-green-800"
        aria-label="Application status: Applied"
      >
        Applied
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-sm font-medium text-gray-800"
      aria-label="Application status: Not Applied"
    >
      Not Applied
    </span>
  );
}
