"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import JobDescriptionList from "@/components/hr/JobDescriptionList";
import ImportJobsPanel from "@/components/hr/ImportJobsPanel";

interface QuickStats {
  totalJobs: number;
  publishedJobs: number;
  totalApplicants: number;
  totalApplications: number;
}

interface RecentApplication {
  id: string;
  applicantName: string;
  jobTitle: string;
  appliedAt: string;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<QuickStats | null>(null);
  const [recentApps, setRecentApps] = useState<RecentApplication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const supabase = createClient();

        // Quick stats
        const [jobsRes, applicantsRes, appsRes] = await Promise.all([
          supabase.from("job_descriptions").select("id, status"),
          supabase.from("profiles").select("id", { count: "exact" }).eq("role", "applicant"),
          supabase.from("applications").select("id", { count: "exact" }),
        ]);

        const jobs = jobsRes.data ?? [];
        setStats({
          totalJobs: jobs.length,
          publishedJobs: jobs.filter((j) => j.status === "published").length,
          totalApplicants: applicantsRes.count ?? 0,
          totalApplications: appsRes.count ?? 0,
        });

        // Recent applications (last 5)
        const { data: recentApplications } = await supabase
          .from("applications")
          .select("id, applicant_id, job_description_id, created_at")
          .order("created_at", { ascending: false })
          .limit(5);

        if (recentApplications && recentApplications.length > 0) {
          const applicantIds = [...new Set(recentApplications.map((a) => a.applicant_id))];
          const jobIds = [...new Set(recentApplications.map((a) => a.job_description_id))];

          const [profilesRes, jobsDetailRes] = await Promise.all([
            supabase.from("profiles").select("id, name").in("id", applicantIds),
            supabase.from("job_descriptions").select("id, title").in("id", jobIds),
          ]);

          const nameMap = new Map<string, string>();
          if (profilesRes.data) {
            for (const p of profilesRes.data) nameMap.set(p.id, p.name);
          }

          const titleMap = new Map<string, string>();
          if (jobsDetailRes.data) {
            for (const j of jobsDetailRes.data) titleMap.set(j.id, j.title);
          }

          setRecentApps(
            recentApplications.map((app) => ({
              id: app.id,
              applicantName: nameMap.get(app.applicant_id) ?? "Unknown",
              jobTitle: titleMap.get(app.job_description_id) ?? "Untitled",
              appliedAt: app.created_at,
            }))
          );
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  return (
    <main className="flex-1 p-6 md:p-8">
      <motion.header initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)]">
          HR Dashboard
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Manage job postings, import from external sources, and monitor platform activity.
        </p>
      </motion.header>

      {/* Quick Actions */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mb-8 flex flex-wrap items-center gap-3">
        <Link href="/hr/analytics" className="flex items-center gap-2 rounded-full bg-[var(--bg-secondary)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-purple-400 hover:text-purple-400 transition-all">
          <svg className="h-4 w-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Analytics
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

      {/* Quick Stats */}
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-8">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: "Total Jobs", value: stats?.totalJobs ?? "—", sub: `${stats?.publishedJobs ?? 0} published`, icon: "📋" },
            { label: "Applicants", value: stats?.totalApplicants ?? "—", sub: "registered", icon: "👥" },
            { label: "Applications", value: stats?.totalApplications ?? "—", sub: "submitted", icon: "📨" },
            { label: "Published", value: stats?.publishedJobs ?? "—", sub: "active jobs", icon: "🟢" },
          ].map((stat) => (
            <div key={stat.label} className="glass-card p-5 text-center">
              <span className="text-2xl" aria-hidden="true">{stat.icon}</span>
              <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{stat.value}</p>
              <p className="text-xs text-[var(--text-muted)]">{stat.label}</p>
              <p className="text-[10px] text-[var(--text-muted)]">{stat.sub}</p>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Import Jobs */}
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-8">
        <h2 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">Import Jobs</h2>
        <div className="glass-card p-6">
          <ImportJobsPanel />
        </div>
      </motion.section>

      {/* Recent Applications */}
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Recent Applications</h2>
          <Link href="/hr/applicants" className="text-xs font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors">
            View all →
          </Link>
        </div>
        <div className="glass-card p-6">
          {loading ? (
            <p className="text-sm text-[var(--text-muted)]">Loading...</p>
          ) : recentApps.length > 0 ? (
            <div className="space-y-2.5">
              {recentApps.map((app) => (
                <div key={app.id} className="flex items-center gap-3 rounded-lg bg-[var(--bg-secondary)] px-4 py-3 border border-[var(--border-subtle)]">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--accent)] to-periwinkle">
                    <span className="text-xs font-bold text-white">{app.applicantName.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">{app.applicantName}</p>
                    <p className="text-xs text-[var(--text-muted)] truncate">Applied to {app.jobTitle}</p>
                  </div>
                  <span className="text-xs text-[var(--text-muted)] flex-shrink-0">
                    {new Date(app.appliedAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--text-muted)] text-center py-4">No applications yet. Applicants will appear here once they start applying.</p>
          )}
        </div>
      </motion.section>

      {/* All Job Postings */}
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <h2 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">All Job Postings</h2>
        <div className="glass-card p-6">
          <JobDescriptionList />
        </div>
      </motion.section>
    </main>
  );
}
