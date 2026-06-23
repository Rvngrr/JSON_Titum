"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import type { SkillGapGroup } from "@/lib/learning-paths/types";
import { sortAndCapRecommendations } from "@/lib/learning-paths/display-utils";
import { formatJobCount } from "@/lib/learning-paths/skill-gap-aggregator";
import CourseCard from "./CourseCard";

interface SkillGapSectionProps {
  group: SkillGapGroup;
}

/**
 * Renders a single skill gap group with its course recommendations
 * and hidden gem urgency data (jobs you'd unlock by learning this skill).
 *
 * Requirements: 1.1, 1.6, 3.4, 8.4, 8.5, 8.7
 */
export default function SkillGapSection({ group }: SkillGapSectionProps) {
  const { skill, courses, hiddenGems } = group;
  const shouldReduceMotion = useReducedMotion();

  const sortedCourses = sortAndCapRecommendations(courses, 10);
  const jobCountText = formatJobCount(skill.jobCount, skill.totalJobs);

  const sourceBadgeStyles: Record<string, string> = {
    "Job Matches": "bg-blue-500/15 text-blue-400 border border-blue-500/20",
    "Career Goal": "bg-amber-500/15 text-amber-400 border border-amber-500/20",
    "Both": "bg-green-500/15 text-green-400 border border-green-500/20",
  };

  const badgeClass = sourceBadgeStyles[skill.source] ?? "bg-gray-500/15 text-gray-400";

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.4, ease: "easeOut" }}
      aria-label={`Skill gap: ${skill.skillName}`}
    >
      {/* Skill Header */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">
          {skill.skillName}
        </h3>

        <span className="text-sm text-[var(--text-secondary)]">
          {jobCountText}
        </span>

        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeClass}`}
        >
          {skill.source}
        </span>

        {/* Urgency badge if hidden gems exist */}
        {hiddenGems && hiddenGems.unlockableJobCount > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/15 px-2.5 py-0.5 text-xs font-semibold text-orange-400 border border-orange-500/20">
            <span aria-hidden="true">🔥</span>
            Unlocks {hiddenGems.unlockableJobCount} job{hiddenGems.unlockableJobCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Hidden Gem Urgency Card */}
      {hiddenGems && hiddenGems.topJobs.length > 0 && (
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.2, duration: 0.4 }}
          className="mb-4 rounded-xl border border-orange-500/20 bg-gradient-to-r from-orange-500/5 to-amber-500/5 p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg" aria-hidden="true">💎</span>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {hiddenGems.unlockableJobCount} hidden gem{hiddenGems.unlockableJobCount !== 1 ? "s" : ""} waiting
            </p>
            <span className="text-xs text-[var(--text-muted)]">
              — jobs you&apos;re almost qualified for
            </span>
          </div>

          <div className="space-y-2">
            {hiddenGems.topJobs.map((job) => (
              <Link
                key={job.jobId}
                href={`/applicant/jobs/${job.jobId}`}
                className="flex items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 py-2.5 transition-all hover:border-orange-500/30 hover:bg-orange-500/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                    {job.title}
                  </p>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-[var(--text-muted)]">
                    <span>
                      Now: <span className="font-semibold text-[var(--warning)]">{job.currentMatch}%</span>
                    </span>
                    <span aria-hidden="true">→</span>
                    <span>
                      After: <span className="font-semibold text-[var(--success)]">{job.projectedMatch}%</span>
                    </span>
                  </div>
                </div>
                <svg className="h-4 w-4 flex-shrink-0 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>

          {hiddenGems.unlockableJobCount > 3 && (
            <Link
              href="/applicant/jobs"
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-orange-400 hover:text-orange-300 transition-colors"
            >
              See all {hiddenGems.unlockableJobCount} jobs
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          )}
        </motion.div>
      )}

      {/* Course Cards Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sortedCourses.map((course) => (
          <CourseCard key={course.url} course={course} />
        ))}
      </div>
    </motion.section>
  );
}
