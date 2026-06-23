"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

interface HRInsightsData {
  summary: string;
  platformHealth: string[];
  skillGapActions: string[];
  engagementTips: string[];
  hiringRecommendations: string[];
}

/**
 * AI-powered platform insights card for the HR/Job Curator analytics page.
 */
export default function HRInsightsCard() {
  const [data, setData] = useState<HRInsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    async function fetchInsights() {
      try {
        const res = await fetch("/api/hr-insights");
        if (!res.ok) { setError(true); return; }
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
        <div className="h-16 bg-gradient-to-r from-blue-500/10 to-purple-500/10" />
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

  const sections = [
    {
      title: "Platform Health",
      items: data.platformHealth,
      color: "blue",
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      ),
    },
    {
      title: "Skill Gap Actions",
      items: data.skillGapActions,
      color: "amber",
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      ),
    },
    {
      title: "Engagement Tips",
      items: data.engagementTips,
      color: "green",
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
      ),
    },
    {
      title: "Hiring Recommendations",
      items: data.hiringRecommendations,
      color: "purple",
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      ),
    },
  ];

  const colorMap: Record<string, { bg: string; border: string; text: string; dot: string; iconBg: string }> = {
    blue: { bg: "bg-blue-500/5", border: "border-blue-500/15", text: "text-blue-400", dot: "bg-blue-400", iconBg: "bg-blue-500/20" },
    amber: { bg: "bg-amber-500/5", border: "border-amber-500/15", text: "text-amber-400", dot: "bg-amber-400", iconBg: "bg-amber-500/20" },
    green: { bg: "bg-green-500/5", border: "border-green-500/15", text: "text-green-400", dot: "bg-green-400", iconBg: "bg-green-500/20" },
    purple: { bg: "bg-purple-500/5", border: "border-purple-500/15", text: "text-purple-400", dot: "bg-purple-400", iconBg: "bg-purple-500/20" },
  };

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.5 }}
      className="glass-card overflow-hidden"
    >
      {/* Gradient Header */}
      <div className="relative px-6 py-4 bg-gradient-to-r from-blue-500/10 via-purple-500/5 to-cyan-500/10">
        <div className="absolute inset-0 bg-[var(--bg-card-solid)]/50" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/30 to-purple-500/30 shadow-sm">
              <svg className="h-5 w-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">Platform Insights</h2>
              <p className="text-[10px] text-[var(--text-muted)]">AI-powered analytics summary</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 px-2.5 py-1 text-[10px] font-semibold text-blue-400 border border-blue-500/20">
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

        {/* 4 Section Grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          {sections.map((section) => {
            const colors = colorMap[section.color];
            if (!section.items.length) return null;
            return (
              <div key={section.title} className={`rounded-xl border ${colors.border} ${colors.bg} p-4`}>
                <h3 className={`text-xs font-bold ${colors.text} mb-3 flex items-center gap-1.5`}>
                  <div className={`flex h-5 w-5 items-center justify-center rounded-md ${colors.iconBg}`}>
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      {section.icon}
                    </svg>
                  </div>
                  {section.title}
                </h3>
                <ul className="space-y-2 list-none">
                  {section.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-[var(--text-secondary)] leading-relaxed">
                      <span className={`mt-1.5 h-1 w-1 rounded-full ${colors.dot} flex-shrink-0`} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
