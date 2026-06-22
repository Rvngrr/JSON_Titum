interface MatchPercentageBadgeProps {
  percentage: number;
}

export default function MatchPercentageBadge({
  percentage,
}: MatchPercentageBadgeProps) {
  return (
    <span
      className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-sm font-medium text-blue-800"
      aria-label={`Match percentage: ${percentage}%`}
    >
      {percentage}%
    </span>
  );
}
