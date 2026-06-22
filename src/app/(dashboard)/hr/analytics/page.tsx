"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

// ============================================================================
// Types
// ============================================================================

interface PlatformOverview {
  totalJobs: number;
  totalApplicants: number;
  totalApplications: number;
  publishedJobs: number;
}

interface MatchQuality {
  averageMatchPercent: number;
  distribution: { range: string; count: number; color: string }[];
}

interface EngagementItem {
  jobId: string;
  jobTitle: string;
  applicationCount: number;
  avgMatch: number;
}

interface SkillInsight {
  skillName: string;
  jobDemand: number;
  applicantSupply: number;
  gap: number; // positive = more demand than supply
}

// ============================================================================
// Component
// ============================================================================

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<PlatformOverview | null>(null);
  const [matchQuality, setMatchQuality] = useState<MatchQuality | null>(null);
  const [topEngaged, setTopEngaged] = useState<EngagementItem[]>([]);
  const [leastEngaged, setLeastEngaged] = useState<EngagementItem[]>([]);
  const [skillInsights, setSkillInsights] = useState<SkillInsight[]>([]);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const supabase = createClient();

        // 1. Platform Overview
        const [jobsRes, applicantsRes, applicationsRes] = await Promise.all([
          supabase.from("job_descriptions").select("id, status", { count: "exact" }),
          supabase.from("profiles").select("id", { count: "exact" }).eq("role", "applicant"),
          supabase.from("applications").select("id", { count: "exact" }),
        ]);

        const totalJobs = jobsRes.count ?? 0;
        const publishedJobs = (jobsRes.data ?? []).filter((j) => j.status === "published").length;
        const totalApplicants = applicantsRes.count ?? 0;
        const totalApplications = applicationsRes.count ?? 0;

        setOverview({ totalJobs, totalApplicants, totalApplications, publishedJobs });

        // 2. Match Quality
        const { data: matchResults } = await supabase
          .from("match_results")
          .select("match_percentage");

        if (matchResults && matchResults.length > 0) {
          const avg = Math.round(
            matchResults.reduce((sum, m) => sum + m.match_percentage, 0) / matchResults.length
          );

          const ranges = [
            { range: "0–20%", min: 0, max: 20, color: "bg-rose-500" },
            { range: "21–40%", min: 21, max: 40, color: "bg-orange-500" },
            { range: "41–60%", min: 41, max: 60, color: "bg-yellow-500" },
            { range: "61–80%", min: 61, max: 80, color: "bg-cyan-500" },
            { range: "81–100%", min: 81, max: 100, color: "bg-green-500" },
          ];

          const distribution = ranges.map((r) => ({
            range: r.range,
            count: matchResults.filter((m) => m.match_percentage >= r.min && m.match_percentage <= r.max).length,
            color: r.color,
          }));

          setMatchQuality({ averageMatchPercent: avg, distribution });
        }

        // 3. Engagement — jobs with most/least applications
        const { data: allJobs } = await supabase
          .from("job_descriptions")
          .select("id, title")
          .eq("status", "published");

        const { data: allApplications } = await supabase
          .from("applications")
          .select("job_description_id");

        if (allJobs && allApplications) {
          const appCountMap = new Map<string, number>();
          for (const app of allApplications) {
            appCountMap.set(app.job_description_id, (appCountMap.get(app.job_description_id) || 0) + 1);
          }

          // Get avg match per job
          const { data: matchByJob } = await supabase
            .from("match_results")
            .select("job_description_id, match_percentage");

          const avgMatchMap = new Map<string, number>();
          if (matchByJob) {
            const grouped = new Map<string, number[]>();
            for (const m of matchByJob) {
              const arr = grouped.get(m.job_description_id) || [];
              arr.push(m.match_percentage);
              grouped.set(m.job_description_id, arr);
            }
            for (const [jobId, percents] of grouped) {
              avgMatchMap.set(jobId, Math.round(percents.reduce((a, b) => a + b, 0) / percents.length));
            }
          }

          const engagement: EngagementItem[] = allJobs.map((job) => ({
            jobId: job.id,
            jobTitle: job.title,
            applicationCount: appCountMap.get(job.id) || 0,
            avgMatch: avgMatchMap.get(job.id) || 0,
          }));

          const sorted = [...engagement].sort((a, b) => b.applicationCount - a.applicationCount);
          setTopEngaged(sorted.slice(0, 5));
          setLeastEngaged(sorted.filter((e) => e.applicationCount === 0).slice(0, 5));
        }

        // 4. Skill Market Insights
        const { data: jobSkills } = await supabase
          .from("job_required_skills")
          .select("skill_name");

        const { data: applicantSkills } = await supabase
          .from("skills")
          .select("name");

        if (jobSkills && applicantSkills) {
          const demandMap = new Map<string, number>();
          for (const s of jobSkills) {
            const key = s.skill_name.toLowerCase();
            demandMap.set(key, (demandMap.get(key) || 0) + 1);
          }

          const supplyMap = new Map<string, number>();
          for (const s of applicantSkills) {
            const key = s.name.toLowerCase();
            supplyMap.set(key, (supplyMap.get(key) || 0) + 1);
          }

          // Combine all skill names
          const allSkillNames = new Set([...demandMap.keys(), ...supplyMap.keys()]);
          const insights: SkillInsight[] = [];

          for (const skill of allSkillNames) {
            const demand = demandMap.get(skill) || 0;
            const supply = supplyMap.get(skill) || 0;
            insights.push({
              skillName: skill.charAt(0).toUpperCase() + skill.slice(1),
              jobDemand: demand,
              applicantSupply: supply,
              gap: demand - supply,
            });
          }

          // Sort by absolute gap (biggest mismatches first)
          insights.sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap));
          setSkillInsights(insights.slice(0, 10));
        }
      } catch (err) {
        console.error("Analytics fetch error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <main className="flex-1 p-6 md:p-8">
        <div className="flex items-center justify-center py-12" role="status">
          <svg className="h-6 w-6 animate-spin text-[var(--accent)]" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="ml-2 text-sm text-[var(--text-secondary)]">Loading analytics...</span>
        </div>
      </main>
    );
  }

  const maxDistribution = matchQuality ? Math.max(...matchQuality.distribution.map((d) => d.count), 1) : 1;

  return (
    <main className="flex-1 p-6 md:p-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)]">
          Platform Analytics
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Overview of platform health, match quality, and skill market insights.
        </p>
      </motion.div>

      {/* Quick Actions */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mt-6 flex flex-wrap items-center gap-3">
        <Link href="/hr" className="flex items-center gap-2 rounded-full bg-[var(--bg-secondary)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all">
          <svg className="h-4 w-4 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Dashboard
        </Link>
        <Link href="/hr/jobs/new" className="flex items-center gap-2 rounded-full bg-[var(--bg-secondary)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-green-400 hover:text-green-400 transition-all">
          <svg className="h-4 w-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Posting
        </Link>
        <Link href="/hr/applicants" className="flex items-center gap-2 rounded-full bg-[var(--bg-secondary)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-cyan-400 hover:text-cyan-400 transition-all">
          <svg className="h-4 w-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Applicants
        </Link>
      </motion.div>

      <div className="mt-8 space-y-8">
        {/* Platform Overview */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h2 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">Platform Overview</h2>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: "Total Jobs", value: overview?.totalJobs ?? 0, sub: `${overview?.publishedJobs ?? 0} published` },
              { label: "Total Applicants", value: overview?.totalApplicants ?? 0, sub: "registered" },
              { label: "Total Applications", value: overview?.totalApplications ?? 0, sub: "submitted" },
              { label: "Avg Match", value: matchQuality ? `${matchQuality.averageMatchPercent}%` : "—", sub: "across all matches" },
            ].map((stat) => (
              <div key={stat.label} className="glass-card p-5 text-center">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">{stat.label}</p>
                <p className="mt-2 text-3xl font-bold text-[var(--text-primary)]">{stat.value}</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">{stat.sub}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Match Quality Distribution */}
        {matchQuality && (
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h2 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">Match Quality Distribution</h2>
            <div className="glass-card p-6">
              <p className="mb-4 text-xs text-[var(--text-muted)]">
                How well are applicants matching with posted jobs?
              </p>
              <div className="space-y-3">
                {matchQuality.distribution.map((d) => (
                  <div key={d.range} className="flex items-center gap-3">
                    <span className="w-16 text-xs text-[var(--text-muted)] text-right">{d.range}</span>
                    <div className="flex-1 h-6 rounded-full bg-[var(--bg-secondary)] overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${d.color}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${(d.count / maxDistribution) * 100}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                      />
                    </div>
                    <span className="w-8 text-xs font-medium text-[var(--text-primary)] text-right">{d.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.section>
        )}

        {/* Engagement — Top & Least */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h2 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">Engagement</h2>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Most Applied */}
            <div className="glass-card p-6">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-3">
                Most Applied Jobs
              </h3>
              {topEngaged.length > 0 ? (
                <div className="space-y-2.5">
                  {topEngaged.map((job) => (
                    <div key={job.jobId} className="flex items-center justify-between rounded-lg bg-[var(--bg-secondary)] px-3 py-2.5 border border-[var(--border-subtle)]">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">{job.jobTitle}</p>
                        <p className="text-xs text-[var(--text-muted)]">Avg match: {job.avgMatch}%</p>
                      </div>
                      <span className="badge-pill bg-green-500/15 text-green-300 border border-green-500/20 ml-2">
                        {job.applicationCount} apps
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--text-muted)]">No applications yet.</p>
              )}
            </div>

            {/* Ignored Jobs */}
            <div className="glass-card p-6">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-3">
                Jobs With No Applicants
              </h3>
              {leastEngaged.length > 0 ? (
                <div className="space-y-2.5">
                  {leastEngaged.map((job) => (
                    <div key={job.jobId} className="flex items-center justify-between rounded-lg bg-[var(--bg-secondary)] px-3 py-2.5 border border-[var(--border-subtle)]">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">{job.jobTitle}</p>
                        <p className="text-xs text-[var(--text-muted)]">Avg match: {job.avgMatch}%</p>
                      </div>
                      <span className="badge-pill bg-rose-500/15 text-rose-300 border border-rose-500/20 ml-2">
                        0 apps
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--text-muted)]">All jobs have received applications!</p>
              )}
            </div>
          </div>
        </motion.section>

        {/* Skill Market Insights */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <h2 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">Skill Market Insights</h2>
          <div className="glass-card p-6">
            <p className="mb-4 text-xs text-[var(--text-muted)]">
              Comparing what jobs require vs what applicants have. Positive gap = more demand than supply.
            </p>
            {skillInsights.length > 0 ? (
              <div className="space-y-2.5">
                <div className="flex items-center gap-3 text-xs font-medium text-[var(--text-muted)] px-3 pb-1 border-b border-[var(--border-subtle)]">
                  <span className="flex-1">Skill</span>
                  <span className="w-20 text-center">Jobs Need</span>
                  <span className="w-20 text-center">Applicants Have</span>
                  <span className="w-16 text-right">Gap</span>
                </div>
                {skillInsights.map((skill) => (
                  <div key={skill.skillName} className="flex items-center gap-3 rounded-lg bg-[var(--bg-secondary)] px-3 py-2.5 border border-[var(--border-subtle)]">
                    <span className="flex-1 text-sm font-medium text-[var(--text-primary)] truncate">{skill.skillName}</span>
                    <span className="w-20 text-center text-xs text-[var(--text-secondary)]">{skill.jobDemand}</span>
                    <span className="w-20 text-center text-xs text-[var(--text-secondary)]">{skill.applicantSupply}</span>
                    <span className={`w-16 text-right text-xs font-bold ${
                      skill.gap > 0 ? "text-rose-400" : skill.gap < 0 ? "text-green-400" : "text-[var(--text-muted)]"
                    }`}>
                      {skill.gap > 0 ? `+${skill.gap}` : skill.gap === 0 ? "0" : `${skill.gap}`}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">Not enough data yet.</p>
            )}
          </div>
        </motion.section>
      </div>
    </main>
  );
}
