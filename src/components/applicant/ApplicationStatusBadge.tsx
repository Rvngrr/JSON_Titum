interface ApplicationStatusBadgeProps {
  applied: boolean;
}

export default function ApplicationStatusBadge({
  applied,
}: ApplicationStatusBadgeProps) {
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
