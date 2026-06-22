"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import type { MatchResult, Skill } from "@/types";

// ============================================================================
// Types
// ============================================================================

interface DashboardData {
  atsScore: number;
  totalJobs: number;
  skills: Skill[];
  matchResults: MatchResult[];
  hiddenGems: HiddenGem[];
  skillROI: SkillROIItem[];
}

interface HiddenGem {
  name: string;
  frequency: number;
  totalJobs: number;
}

interface SkillROIItem {
  name: string;
  projectedImprovement: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getScoreLabel(score: number): { text: string; color: string } {
  if (score >= 80) return { text: "Optimal", color: "text-[var(--success)]" };
  if (score >= 60) return { text: "Good", color: "text-[var(--warning)]" };
  return { text: "Needs Work", color: "text-[var(--error)]" };
}

function getProficiencyPercent(level: string): number {
  switch (level) {
    case "expert":
      return 95;
    case "advanced":
      return 80;
    case "intermediate":
      return 60;
    case "beginner":
      return 35;
    default:
      return 50;
  }
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ============================================================================
// Animation Variants
// ============================================================================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
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

function ATSGauge({ score }: { score: number }) {
  const radius = 70;
  const circumference = Math.PI * radius;
  const progress = (score / 100) * circumference;

  return (
    <div className="relative flex flex-col items-center">
      <svg
        width="180"
        height="100"
        viewBox="0 0 180 100"
        className="overflow-visible"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--error)" />
            <stop offset="50%" stopColor="var(--warning)" />
            <stop offset="100%" stopColor="var(--success)" />
          </linearGradient>
        </defs>
        {/* Background arc */}
        <path
          d="M 10 90 A 70 70 0 0 1 170 90"
          fill="none"
          stroke="var(--border-subtle)"
          strokeWidth="14"
          strokeLinecap="round"
        />
        {/* Progress arc */}
        <motion.path
          d="M 10 90 A 70 70 0 0 1 170 90"
          fill="none"
          stroke="url(#gaugeGradient)"
          strokeWidth="14"
          strokeLinecap="round"
          initial={{ strokeDasharray: `0 ${circumference}` }}
          animate={{ strokeDasharray: `${progress} ${circumference}` }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
        />
      </svg>
      <div className="absolute top-6 flex flex-col items-center">
        <motion.span
          className="text-4xl font-bold text-[var(--text-primary)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {score}
        </motion.span>
        <span className="text-sm text-[var(--text-muted)]">/100</span>
      </div>
    </div>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function ApplicantDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [hasProfile, setHasProfile] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setError("Not authenticated");
          setLoading(false);
          return;
        }

        const { data: profile } = await supabase
          .from("skill_profiles")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (!profile) {
          setHasProfile(false);
          setLoading(false);
          return;
        }

        const [skillsResult, matchResult] = await Promise.all([
          supabase
            .from("skills")
            .select("*")
            .eq("skill_profile_id", profile.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("match_results")
            .select("*")
            .eq("applicant_id", user.id)
            .order("calculated_at", { ascending: false }),
        ]);

        const skills: Skill[] = skillsResult.data ?? [];
        const matchResults: MatchResult[] = matchResult.data ?? [];

        if (matchResults.length === 0 && skills.length === 0) {
          setHasProfile(false);
          setLoading(false);
          return;
        }

        const atsScore =
          matchResults.length > 0
            ? Math.round(
                matchResults.reduce((sum, m) => sum + m.match_percentage, 0) /
                  matchResults.length
              )
            : 0;

        const missingSkillsCount: Record<string, number> = {};
        matchResults.forEach((m) => {
          (m.missing_skills ?? []).forEach((skill) => {
            missingSkillsCount[skill] = (missingSkillsCount[skill] || 0) + 1;
          });
        });

        const hiddenGems: HiddenGem[] = Object.entries(missingSkillsCount)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([name, frequency]) => ({
            name,
            frequency,
            totalJobs: matchResults.length,
          }));

        const skillROI: SkillROIItem[] = Object.entries(missingSkillsCount)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([name, frequency]) => ({
            name,
            projectedImprovement: Math.round(
              (frequency / matchResults.length) * 25
            ),
          }));

        setData({
          atsScore,
          totalJobs: matchResults.length,
          skills,
          matchResults,
          hiddenGems,
          skillROI,
        });
      } catch (err) {
        console.error("Dashboard fetch error:", err);
        setError("Failed to load dashboard data. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  const scoreLabel = useMemo(
    () => getScoreLabel(data?.atsScore ?? 0),
    [data?.atsScore]
  );

  // Loading State
  if (loading) {
    return (
      <main className="flex-1 p-6 md:p-8">
        <div className="mb-6">
          <div className="h-6 w-64 animate-pulse rounded-lg bg-[var(--border-subtle)]" />
          <div className="mt-2 h-4 w-40 animate-pulse rounded-lg bg-[var(--border-subtle)]" />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <SkeletonCard className="lg:row-span-1" />
          <SkeletonCard className="lg:row-span-1" />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </main>
    );
  }

  // Error State
  if (error) {
    return (
      <main className="flex-1 p-6 md:p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-20"
        >
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--error-bg)]">
            <svg className="h-8 w-8 text-[var(--error)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Something went wrong</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary mt-4 text-sm"
          >
            Try Again
          </button>
        </motion.div>
      </main>
    );
  }

  // No Data State
  if (!hasProfile || !data) {
    return (
      <main className="flex-1 p-6 md:p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20"
        >
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-light)]">
            <svg className="h-8 w-8 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">No Resume Data Yet</h2>
          <p className="mt-1 max-w-sm text-center text-sm text-[var(--text-secondary)]">
            Upload your resume and let our AI analyze your skills against job listings. Get personalized insights and recommendations.
          </p>
          <Link href="/applicant/profile" className="btn-primary mt-6 text-sm">
            Upload Resume
          </Link>
        </motion.div>
      </main>
    );
  }

  // Main Dashboard
  return (
    <main className="flex-1 p-6 md:p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)]">
          Resume Analysis Results
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">{formatDate()}</p>
      </motion.div>

      {/* Dashboard Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid gap-6 lg:grid-cols-2"
      >
        {/* ATS Score Card */}
        <motion.div variants={itemVariants} className="glass-card p-6">
          <div className="flex flex-col items-center text-center">
            <ATSGauge score={data.atsScore} />
            <h2 className="mt-4 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)]">
              Resume ATS Score
            </h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Based on {data.totalJobs} targeted job description
              {data.totalJobs !== 1 ? "s" : ""}
            </p>
            <span className={`mt-3 badge-pill ${
              data.atsScore >= 80
                ? "bg-[var(--success-bg)] text-[var(--success-text)]"
                : data.atsScore >= 60
                ? "bg-[var(--warning-bg)] text-[var(--warning-text)]"
                : "bg-[var(--error-bg)] text-[var(--error-text)]"
            }`}>
              {scoreLabel.text}
            </span>
          </div>
        </motion.div>

        {/* Skills Overview Card */}
        <motion.div variants={itemVariants} className="glass-card p-6">
          <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)] mb-4">
            Your Skills
          </h2>
          {data.skills.length > 0 ? (
            <div className="space-y-3">
              {data.skills.slice(0, 5).map((skill) => {
                const percent = getProficiencyPercent(skill.proficiency_level);
                return (
                  <div key={skill.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-[var(--text-primary)]">
                        {skill.name}
                      </span>
                      <span className="text-xs text-[var(--text-muted)] capitalize">
                        {skill.proficiency_level}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--border-subtle)]">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-periwinkle"
                        initial={{ width: 0 }}
                        animate={{ width: `${percent}%` }}
                        transition={{ duration: 0.8, delay: 0.3 }}
                      />
                    </div>
                  </div>
                );
              })}
              {data.skills.length > 5 && (
                <Link
                  href="/applicant/profile"
                  className="mt-2 inline-block text-xs font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
                >
                  View all {data.skills.length} skills →
                </Link>
              )}
            </div>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">No skills found yet.</p>
          )}
        </motion.div>

        {/* Hidden Gems Card */}
        <motion.div variants={itemVariants} className="glass-card p-6">
          <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)] mb-4">
            Hidden Gems — Skills to Learn
          </h2>
          {data.hiddenGems.length > 0 ? (
            <div className="space-y-3">
              {data.hiddenGems.map((gem) => (
                <div
                  key={gem.name}
                  className="flex items-center justify-between rounded-xl bg-[var(--bg-secondary)] px-4 py-3 border border-[var(--border-subtle)]"
                >
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    {gem.name}
                  </span>
                  <span className="badge-pill bg-[var(--accent-light)] text-[var(--accent)]">
                    {gem.frequency}/{gem.totalJobs} jobs
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">
              No skill gap data available yet. Apply to more jobs to see insights.
            </p>
          )}
        </motion.div>

        {/* Skill ROI Card */}
        <motion.div variants={itemVariants} className="glass-card p-6">
          <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)] mb-4">
            Skill ROI — Projected Impact
          </h2>
          {data.skillROI.length > 0 ? (
            <div className="space-y-3">
              {data.skillROI.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between rounded-xl bg-[var(--bg-secondary)] px-4 py-3 border border-[var(--border-subtle)]"
                >
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    {item.name}
                  </span>
                  <span className="badge-pill bg-[var(--success-bg)] text-[var(--success-text)]">
                    +{item.projectedImprovement}% match
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">
              Apply to more jobs to see projected skill impact.
            </p>
          )}
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={itemVariants} className="glass-card p-6 lg:col-span-2">
          <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)] mb-4">
            Quick Actions
          </h2>
          <div className="flex flex-wrap gap-3">
            <Link href="/applicant/jobs" className="btn-primary text-xs">
              Browse Jobs
            </Link>
            <Link href="/applicant/profile" className="btn-secondary text-xs">
              Update Profile
            </Link>
            <Link href="/applicant/career-goals" className="btn-secondary text-xs">
              Set Career Goals
            </Link>
          </div>
        </motion.div>
      </motion.div>
    </main>
  );
}
