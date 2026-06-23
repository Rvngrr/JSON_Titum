"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

interface InsightsData {
  summary: string;
  strengths: string[];
  improvements: string[];
  nextSteps: string[];
  matchSummary: string;
}

/**
 * AI-powered career insights card for the applicant dashboard.
 * Fetches personalized recommendations from /api/insights.
 */
export default function InsightsCard() {
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    async function fetchInsights() {
      try {
        const res = await fetch("/api/insights");
        if (!res.ok) {
          setError(true);
          return;
        }
        const json = await res.json();
        if (json.success && json.data) {
          setData(json.data);
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    fetchInsights();
  }, []);

  if (loading) {
    return (
      <div className="glass-card overflow-hidden animate-pulse">
        <div className="h-16 bg-gradient-to-r from-purple-500/10 to-[var(--accent-light)]" />
        <div className="p-6">
          <div className="mb-3 h-4 w-64 rounded-lg bg-[var(--border-subtle)]" />
          <div className="mb-2 h-3 w-full rounded-lg bg-[var(--border-subtle)]" />
          <div className="h-3 w-4/5 rounded-lg bg-[var(--border-subtle)]" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return null;
  }

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.5 }}
      className="glass-card overflow-hidden"
    >
      {/* Gradient Header Banner */}
      <div className="relative px-6 py-4 bg-gradient-to-r from-purple-500/10 via-[var(--accent)]/5 to-rose-500/10">
        <div className="absolute inset-0 bg-[var(--bg-card-solid)]/50" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/30 to-[var(--accent)]/30 shadow-sm">
              <svg className="h-5 w-5 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                Career Insights
              </h2>
              <p className="text-[10px] text-[var(--text-muted)]">Personalized for you</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/15 px-2.5 py-1 text-[10px] font-semibold text-purple-400 border border-purple-500/20">
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            AI Generated
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-6 space-y-5">
        {/* Summary */}
        <p className="text-sm text-[var(--text-primary)] leading-relaxed">
          {data.summary}
        </p>

        {/* Match Summary Pill */}
        {data.matchSummary && (
          <div className="flex items-center gap-2 rounded-lg bg-[var(--accent)]/5 border border-[var(--accent)]/15 px-3 py-2">
            <svg className="h-4 w-4 text-[var(--accent)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-xs text-[var(--text-secondary)]">
              {data.matchSummary}
            </p>
          </div>
        )}

        {/* Three columns: Strengths, Improve, Next Steps */}
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Strengths */}
          {data.strengths.length > 0 && (
            <div className="rounded-xl border border-green-500/15 bg-green-500/5 p-4">
              <h3 className="text-xs font-bold text-[var(--success-text)] mb-3 flex items-center gap-1.5">
                <div className="flex h-5 w-5 items-center justify-center rounded-md bg-green-500/20">
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                Strengths
              </h3>
              <ul className="space-y-2 list-none pl-0">
                {data.strengths.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-[var(--text-secondary)] leading-relaxed">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-green-400 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Improvements */}
          {data.improvements.length > 0 && (
            <div className="rounded-xl border border-amber-500/15 bg-amber-500/5 p-4">
              <h3 className="text-xs font-bold text-amber-400 mb-3 flex items-center gap-1.5">
                <div className="flex h-5 w-5 items-center justify-center rounded-md bg-amber-500/20">
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                To Improve
              </h3>
              <ul className="space-y-2 list-none pl-0">
                {data.improvements.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-[var(--text-secondary)] leading-relaxed">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-amber-400 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Next Steps */}
          {data.nextSteps.length > 0 && (
            <div className="rounded-xl border border-[var(--accent)]/15 bg-[var(--accent)]/5 p-4">
              <h3 className="text-xs font-bold text-[var(--accent)] mb-3 flex items-center gap-1.5">
                <div className="flex h-5 w-5 items-center justify-center rounded-md bg-[var(--accent)]/20">
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
                Next Steps
              </h3>
              <ul className="space-y-2 list-none pl-0">
                {data.nextSteps.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-[var(--text-secondary)] leading-relaxed">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-[var(--accent)] flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* CTA Buttons */}
        <div className="flex items-center gap-3 pt-1">
          <Link
            href="/applicant/learning-paths"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)]/10 border border-[var(--accent)]/20 px-3 py-2 text-xs font-medium text-[var(--accent)] hover:bg-[var(--accent)]/20 transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14v7" />
            </svg>
            Learning Paths
          </Link>
          <Link
            href="/applicant/jobs"
            className="inline-flex items-center gap-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 px-3 py-2 text-xs font-medium text-purple-400 hover:bg-purple-500/20 transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Browse Jobs
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
