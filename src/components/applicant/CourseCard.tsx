"use client";

import type { CourseRecommendation } from "@/lib/learning-paths/types";
import { truncateTitle, generateAriaLabel } from "@/lib/learning-paths/display-utils";

interface CourseCardProps {
  course: CourseRecommendation;
}

/**
 * Renders an individual course recommendation card with glass-card styling.
 * Displays course title, platform, duration, certificate badge, and an external link.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 8.6
 */
export default function CourseCard({ course }: CourseCardProps) {
  const displayTitle = truncateTitle(course.title);
  const ariaLabel = generateAriaLabel(course.title, course.platform);
  const duration = `${course.durationHours}h`;

  return (
    <a
      href={course.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
      className="glass-card block p-4 transition-all hover:shadow-lg hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* Course Title */}
          <h4 className="text-sm font-semibold text-[var(--text-primary)] leading-snug">
            {displayTitle}
          </h4>

          {/* Platform and Duration */}
          <div className="mt-1.5 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <span className="inline-flex items-center gap-1">
              {/* Platform icon */}
              <svg
                className="h-3.5 w-3.5 text-[var(--text-muted)]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              {course.platform}
            </span>

            <span className="text-[var(--text-muted)]" aria-hidden="true">·</span>

            {/* Duration */}
            <span className="inline-flex items-center gap-1">
              <svg
                className="h-3.5 w-3.5 text-[var(--text-muted)]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              {duration}
            </span>
          </div>
        </div>

        {/* External link indicator */}
        <svg
          className="h-4 w-4 flex-shrink-0 text-[var(--text-muted)]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
      </div>

      {/* Certificate Badge */}
      {course.hasCertificate && (
        <div className="mt-2.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--success-bg)] px-2.5 py-0.5 text-xs font-medium text-[var(--success-text)]">
            <svg
              className="h-3 w-3"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            Certificate Available
          </span>
        </div>
      )}
    </a>
  );
}
