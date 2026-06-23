"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import SkillGapSection from "@/components/applicant/SkillGapSection";
import type { LearningPathResponse, SkillGapGroup, UrgencySummary } from "@/lib/learning-paths/types";

// ============================================================================
// Types
// ============================================================================

type PageState = "loading" | "error" | "empty" | "populated";

// ============================================================================
// Animation Variants
// ============================================================================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

// ============================================================================
// Sub-Components
// ============================================================================

function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse glass-card p-6 ${className}`}>
      <div className="mb-4 h-4 w-1/3 rounded-lg bg-[var(--border-subtle)]" />
      <div className="mb-2 h-8 w-1/2 rounded-lg bg-[var(--border-subtle)]" />
      <div className="h-4 w-2/3 rounded-lg bg-[var(--border-subtle)]" />
    </div>
  );
}

function UrgencyHeroBanner({ urgency, shouldReduceMotion }: { urgency: UrgencySummary; shouldReduceMotion: boolean | null }) {
  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: -10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.5, ease: "easeOut" }}
      className="mb-8 overflow-hidden rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-rose-500/10 p-6 relative"
    >
      {/* Decorative glow */}
      <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-orange-500/10 blur-3xl" aria-hidden="true" />
      <div className="absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-amber-500/10 blur-2xl" aria-hidden="true" />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-orange-500/20">
            <span className="text-2xl" aria-hidden="true">🔥</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              Learn {urgency.topSkill} to Unlock {urgency.topSkillUnlocks} Hidden Gem{urgency.topSkillUnlocks !== 1 ? "s" : ""}
            </h2>
            <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
              There {urgency.totalHiddenGems === 1 ? "is" : "are"}{" "}
              <span className="font-semibold text-orange-400">{urgency.totalHiddenGems} job{urgency.totalHiddenGems !== 1 ? "s" : ""}</span>{" "}
              you&apos;re almost qualified for. One skill could make the difference.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:flex-shrink-0">
          <Link
            href="/applicant/jobs"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-2.5 text-sm font-medium text-orange-400 transition-all hover:bg-orange-500/20 hover:border-orange-500/40"
          >
            <span aria-hidden="true">💎</span>
            See Hidden Gems
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Progress Stats Banner
// ============================================================================

function ProgressStats({ skillGaps }: { skillGaps: SkillGapGroup[] }) {
  const totalCourses = skillGaps.reduce((sum, g) => sum + g.courses.length, 0);
  const totalHiddenGems = skillGaps.reduce(
    (sum, g) => sum + (g.hiddenGems?.unlockableJobCount ?? 0), 0
  );
  const withCerts = skillGaps.reduce(
    (sum, g) => sum + g.courses.filter((c) => c.hasCertificate).length, 0
  );

  return (
    <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4 text-center">
        <p className="text-2xl font-bold text-[var(--accent)]">{skillGaps.length}</p>
        <p className="mt-0.5 text-xs text-[var(--text-muted)]">Skill Gaps</p>
      </div>
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4 text-center">
        <p className="text-2xl font-bold text-purple-400">{totalCourses}</p>
        <p className="mt-0.5 text-xs text-[var(--text-muted)]">Courses</p>
      </div>
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4 text-center">
        <p className="text-2xl font-bold text-orange-400">{totalHiddenGems}</p>
        <p className="mt-0.5 text-xs text-[var(--text-muted)]">Jobs to Unlock</p>
      </div>
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4 text-center">
        <p className="text-2xl font-bold text-green-400">{withCerts}</p>
        <p className="mt-0.5 text-xs text-[var(--text-muted)]">Certifications</p>
      </div>
    </div>
  );
}

// ============================================================================
// Data Fetching
// ============================================================================

async function fetchData(signal: AbortSignal): Promise<{
  state: PageState;
  data: SkillGapGroup[];
  urgency?: UrgencySummary;
  error: string;
}> {
  const response = await fetch("/api/learning-paths", { signal });

  if (!response.ok) {
    const msg =
      response.status === 401
        ? "Please log in to view learning paths."
        : "Something went wrong generating your recommendations.";
    return { state: "error", data: [], error: msg };
  }

  const result: LearningPathResponse = await response.json();

  if (!result.success) {
    return {
      state: "error",
      data: [],
      error: result.error || "Unable to load recommendations.",
    };
  }

  if (result.data.length === 0) {
    return { state: "empty", data: [], error: "" };
  }

  return { state: "populated", data: result.data, urgency: result.urgency, error: "" };
}

// ============================================================================
// Main Page Component
// ============================================================================

/**
 * Learning Paths Page
 *
 * Displays recommended courses to bridge skill gaps based on job match analysis.
 * Features urgency banners showing hidden gem jobs that would be unlocked.
 */
export default function LearningPathsPage() {
  const [pageState, setPageState] = useState<PageState>("loading");
  const [skillGaps, setSkillGaps] = useState<SkillGapGroup[]>([]);
  const [urgency, setUrgency] = useState<UrgencySummary | undefined>();
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [retryCount, setRetryCount] = useState(0);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    async function loadData() {
      try {
        const result = await fetchData(controller.signal);
        if (!controller.signal.aborted) {
          setPageState(result.state);
          setSkillGaps(result.data);
          setUrgency(result.urgency);
          setErrorMessage(result.error);
        }
      } catch (err: unknown) {
        if (!controller.signal.aborted) {
          if (err instanceof DOMException && err.name === "AbortError") {
            setErrorMessage("Request timed out. Please try again.");
          } else if (err instanceof Error) {
            setErrorMessage(err.message);
          } else {
            setErrorMessage("Unable to load recommendations. Please try again.");
          }
          setPageState("error");
        }
      } finally {
        clearTimeout(timeoutId);
      }
    }

    loadData();

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [retryCount]);

  function handleRetry() {
    setRetryCount((c) => c + 1);
  }

  // Loading State
  if (pageState === "loading") {
    return (
      <main className="flex-1 p-6 md:p-8" aria-label="Learning Paths">
        <div className="mb-6">
          <div className="h-6 w-48 animate-pulse rounded-lg bg-[var(--border-subtle)]" />
          <div className="mt-2 h-4 w-80 animate-pulse rounded-lg bg-[var(--border-subtle)]" />
        </div>
        {/* Urgency banner skeleton */}
        <div className="mb-8 animate-pulse rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-[var(--border-subtle)]" />
            <div className="flex-1">
              <div className="h-5 w-64 rounded-lg bg-[var(--border-subtle)]" />
              <div className="mt-2 h-3 w-96 rounded-lg bg-[var(--border-subtle)]" />
            </div>
          </div>
        </div>
        {/* Stats skeleton */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4">
              <div className="mx-auto h-8 w-8 rounded-lg bg-[var(--border-subtle)]" />
              <div className="mx-auto mt-2 h-3 w-16 rounded-lg bg-[var(--border-subtle)]" />
            </div>
          ))}
        </div>
        <div className="grid gap-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </main>
    );
  }

  // Error State
  if (pageState === "error") {
    return (
      <main className="flex-1 p-6 md:p-8" aria-label="Learning Paths">
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={shouldReduceMotion ? { duration: 0 } : undefined}
          className="flex flex-col items-center justify-center py-20"
        >
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--error-bg)]">
            <svg
              className="h-8 w-8 text-[var(--error)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Something went wrong
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {errorMessage}
          </p>
          <button
            onClick={handleRetry}
            className="btn-primary mt-4 min-h-[44px] min-w-[44px] text-sm"
            aria-label="Try again to load learning paths"
          >
            Try Again
          </button>
        </motion.div>
      </main>
    );
  }

  // Empty State
  if (pageState === "empty") {
    return (
      <main className="flex-1 p-6 md:p-8" aria-label="Learning Paths">
        <section>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Learning Paths
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Recommended courses to bridge your skill gaps based on job match analysis.
          </p>
        </section>

        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={shouldReduceMotion ? { duration: 0 } : undefined}
          className="mt-12 flex flex-col items-center justify-center py-12"
        >
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-light)]">
            <svg
              className="h-8 w-8 text-[var(--accent)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            No skill gaps identified
          </h2>
          <p className="mt-2 max-w-md text-center text-sm text-[var(--text-secondary)]">
            Complete your profile or apply to jobs to get personalized learning
            recommendations based on your skill gaps.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/applicant/career-goals"
              className="btn-primary min-h-[44px] min-w-[44px] px-5 py-2.5 text-sm"
            >
              Set Career Goals
            </Link>
            <Link
              href="/applicant/jobs"
              className="flex min-h-[44px] min-w-[44px] items-center rounded-lg border border-[var(--border-subtle)] px-5 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-all hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              Browse Jobs
            </Link>
          </div>
        </motion.div>
      </main>
    );
  }

  // Populated State
  return (
    <main className="flex-1 p-6 md:p-8" aria-label="Learning Paths">
      {/* Page Header */}
      <motion.section
        initial={shouldReduceMotion ? false : { opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={shouldReduceMotion ? { duration: 0 } : undefined}
        className="mb-6"
      >
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Learning Paths
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Recommended courses to bridge your skill gaps based on job match analysis.
        </p>
      </motion.section>

      {/* Urgency Hero Banner — only shows when hidden gems exist */}
      {urgency && urgency.totalHiddenGems > 0 && (
        <UrgencyHeroBanner urgency={urgency} shouldReduceMotion={shouldReduceMotion} />
      )}

      {/* Progress Stats */}
      <ProgressStats skillGaps={skillGaps} />

      {/* Skill Gap Sections */}
      <motion.div
        variants={shouldReduceMotion ? undefined : containerVariants}
        initial={shouldReduceMotion ? undefined : "hidden"}
        animate={shouldReduceMotion ? undefined : "visible"}
        className="grid gap-8"
      >
        {skillGaps.map((group) => (
          <motion.div
            key={group.skill.skillName}
            variants={shouldReduceMotion ? undefined : itemVariants}
            className="glass-card p-6"
          >
            <SkillGapSection group={group} />
          </motion.div>
        ))}
      </motion.div>
    </main>
  );
}
