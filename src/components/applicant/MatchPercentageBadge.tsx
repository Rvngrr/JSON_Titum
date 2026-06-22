interface MatchPercentageBadgeProps {
  percentage: number;
}

export default function MatchPercentageBadge({
  percentage,
}: MatchPercentageBadgeProps) {
  return (
    <span
      className="inline-flex items-center rounded-full border border-[var(--accent)] bg-[var(--accent-light)] px-2.5 py-0.5 text-sm font-medium text-[var(--accent)]"
      aria-label={`Match percentage: ${percentage}%`}
    >
      {percentage}%
    </span>
  );
}
