"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
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
  if (score >= 80) return { text: "Optimal", color: "text-emerald-600" };
  if (score >= 60) return { text: "Good", color: "text-yellow-600" };
  return { text: "Needs Work", color: "text-red-500" };
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
// Sub-Components
// ============================================================================

function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-2xl border border-gray-100 bg-white/60 p-6 shadow-lg backdrop-blur-sm ${className}`}
    >
      <div className="mb-4 h-4 w-1/3 rounded bg-gray-200" />
      <div className="mb-2 h-8 w-1/2 rounded bg-gray-200" />
      <div className="h-4 w-2/3 rounded bg-gray-200" />
    </div>
  );
}

function ATSGauge({ score }: { score: number }) {
  // SVG semi-circle gauge from red → yellow → green
  const radius = 70;
  const strokeWidth = 14;
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
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="50%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
        </defs>
        {/* Background arc */}
        <path
          d="M 10 90 A 70 70 0 0 1 170 90"
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Progress arc */}
        <path
          d="M 10 90 A 70 70 0 0 1 170 90"
          fill="none"
          stroke="url(#gaugeGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${progress} ${circumference}`}
        />
      </svg>
      <div className="absolute top-8 flex flex-col items-center">
        <span className="text-4xl font-bold text-gray-900">{score}</span>
        <span className="text-sm text-gray-500">/100</span>
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

        // Fetch skill profile
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

        // Fetch skills, match results in parallel
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

        // Calculate ATS score (average match percentage)
        const atsScore =
          matchResults.length > 0
            ? Math.round(
                matchResults.reduce((sum, m) => sum + m.match_percentage, 0) /
                  matchResults.length
              )
            : 0;

        // Calculate Hidden Gems (most frequent missing skills)
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

        // Calculate Skill ROI (projected improvement per missing skill)
        const skillROI: SkillROIItem[] = Object.entries(missingSkillsCount)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([name, frequency]) => ({
            name,
            // Projected improvement: proportional to how many jobs need it
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
          <div className="h-6 w-64 animate-pulse rounded bg-gray-200" />
          <div className="mt-2 h-4 w-40 animate-pulse rounded bg-gray-200" />
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
        <div className="flex flex-col items-center justify-center py-20">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-8 w-8 text-red-500"
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
          <h2 className="text-lg font-semibold text-gray-900">
            Something went wrong
          </h2>
          <p className="mt-1 text-sm text-gray-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </main>
    );
  }

  // No Data State
  if (!hasProfile || !data) {
    return (
      <main className="flex-1 p-6 md:p-8">
        <div className="flex flex-col items-center justify-center py-20">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <svg
              className="h-8 w-8 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900">
            No Resume Data Yet
          </h2>
          <p className="mt-1 max-w-sm text-center text-sm text-gray-600">
            Upload your resume and let our AI analyze your skills against job
            listings. Get personalized insights and recommendations.
          </p>
          <Link
            href="/applicant/profile"
            className="mt-6 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white shadow-md hover:bg-blue-700 transition-colors"
          >
            Upload Resume
          </Link>
        </div>
      </main>
    );
  }

  // Main Dashboard
  return (
    <main className="flex-1 bg-gradient-to-br from-slate-50 via-white to-blue-50/30 p-6 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-xl font-bold uppercase tracking-wide text-gray-900">
          Resume Analysis Results
        </h1>
        <p className="mt-1 text-sm text-gray-500">{formatDate()}</p>
      </div>

      {/* Dashboard Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* ATS Score Card */}
        <div className="rounded-2xl border border-white/60 bg-white/80 p-6 shadow-lg backdrop-blur-sm transition-shadow hover:shadow-xl">
          <div className="flex flex-col items-center text-center">
            <ATSGauge score={data.atsScore} />
            <h2 className="mt-4 text-sm font-semibold uppercase tracking-wider text-gray-600">
              Resume ATS Score
            </h2>
            <p className="mt-1 text-xs text-gray-400">
              Based on {data.totalJobs} targeted job description
              {data.totalJobs !== 1 ? "s" : ""}
            </p>
            <span
              className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-semibold ${scoreLabel.color} bg-opacity-10 ${
                data.atsScore >= 80
                  ? "bg-emerald-100"
                  : data.atsScore >= 60
                  ? "bg-yellow-100"
                  : "bg-red-100"
              }`}
            >
              {scoreLabel.text}
            </span>
          </div>
        </div>

        {/* Hidden Gems Card */}
        <div className="rounded-2xl border border-white/60 bg-white/80 p-6 shadow-lg backdrop-blur-sm transition-shadow hover:shadow-xl">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-600">
            Hidden Gems{" "}
            <span className="font-normal text-gray-400">(Missing Skills)</span>
          </h2>
          {data.hiddenGems.length > 0 ? (
            <ul className="space-y-4">
              {data.hiddenGems.map((gem) => (
                <li key={gem.name} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100">
                    <svg
                      className="h-4 w-4 text-amber-600"
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
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {gem.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      Highly required by{" "}
                      {Math.round((gem.frequency / gem.totalJobs) * 100)}% of
                      target jobs
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400">
              No missing skills detected — great job!
            </p>
          )}
        </div>

        {/* Proficiency Levels Card */}
        <div className="rounded-2xl border border-white/60 bg-white/80 p-6 shadow-lg backdrop-blur-sm transition-shadow hover:shadow-xl">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-600">
            Proficiency Levels
          </h2>
          {data.skills.length > 0 ? (
            <ul className="space-y-4">
              {data.skills.slice(0, 3).map((skill) => {
                const percent = getProficiencyPercent(skill.proficiency_level);
                return (
                  <li key={skill.id}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-800">
                        {skill.name}
                      </span>
                      <span className="text-xs capitalize text-gray-500">
                        {skill.proficiency_level} · {percent}%
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-gray-400">
              No skills on your profile yet.
            </p>
          )}
        </div>

        {/* Skill ROI Card */}
        <div className="rounded-2xl border border-white/60 bg-white/80 p-6 shadow-lg backdrop-blur-sm transition-shadow hover:shadow-xl">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-600">
            Skill ROI
          </h2>
          {data.skillROI.length > 0 ? (
            <ul className="space-y-4">
              {data.skillROI.map((item) => (
                <li key={item.name} className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">
                      {item.name}
                    </p>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-500"
                        style={{
                          width: `${Math.min(item.projectedImprovement * 4, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                  <span className="shrink-0 rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                    +{item.projectedImprovement}% match
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400">
              Match against jobs to see skill ROI.
            </p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex flex-wrap gap-4">
        <Link
          href="/applicant/profile"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-blue-700 hover:shadow-lg"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
            />
          </svg>
          Update Resume
        </Link>
        <Link
          href="/applicant/jobs"
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 shadow-md transition-all hover:bg-gray-50 hover:shadow-lg"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          Explore Job Listings
        </Link>
      </div>
    </main>
  );
}
