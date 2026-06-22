"use client";

type ProficiencyLevel = "beginner" | "intermediate" | "advanced" | "expert";

interface ProficiencyBadgeProps {
  level: ProficiencyLevel;
  size?: "sm" | "md";
}

const BADGE_STYLES: Record<ProficiencyLevel, { bg: string; text: string; dot: string; label: string }> = {
  beginner: {
    bg: "bg-gray-100",
    text: "text-gray-700",
    dot: "bg-gray-400",
    label: "Beginner",
  },
  intermediate: {
    bg: "bg-blue-100",
    text: "text-blue-700",
    dot: "bg-blue-400",
    label: "Intermediate",
  },
  advanced: {
    bg: "bg-purple-100",
    text: "text-purple-700",
    dot: "bg-purple-400",
    label: "Advanced",
  },
  expert: {
    bg: "bg-green-100",
    text: "text-green-700",
    dot: "bg-green-400",
    label: "Expert",
  },
};

export default function ProficiencyBadge({ level, size = "sm" }: ProficiencyBadgeProps) {
  const style = BADGE_STYLES[level];
  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${style.bg} ${style.text} ${sizeClasses}`}
      aria-label={`Proficiency: ${style.label}`}
    >
      <span
        className={`inline-block h-1.5 w-1.5 rounded-full ${style.dot}`}
        aria-hidden="true"
      />
      {style.label}
    </span>
  );
}
