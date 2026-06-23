"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import Pagination, { usePagination } from "@/components/shared/Pagination";

interface AppliedJob {
  id: string;
  jobId: string;
  jobTitle: string;
  status: "applied" | "applied_externally";
  appliedAt: string;
  matchPercentage: number | null;
}

export default function AppliedJobsPage() {
  const [appliedJobs, setAppliedJobs] = useState<AppliedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    currentPage,
    setCurrentPage,
    paginatedItems: paginatedJobs,
    totalItems,
    pageSize,
  } = usePagination(appliedJobs, 10);

  useEffect(() => {
    async function fetchAppliedJobs() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setError("Not authenticated"); setLoading(false); return; }

        // Fetch applications
        const { data: applications, error: appError } = await supabase
          .from("applications")
          .select("id, job_description_id, status, created_at")
          .eq("applicant_id", user.id)
          .order("created_at", { ascending: false });

        if (appError) {
          setError("Failed to load applications.");
          setLoading(false);
          return;
        }

        if (!applications || applications.length === 0) {
          setAppliedJobs([]);
          setLoading(false);
          return;
        }

        // Fetch job titles
        const jobIds = applications.map((a) => a.job_description_id);
        const { data: jobs } = await supabase
          .from("job_descriptions")
          .select("id, title")
          .in("id", jobIds);

        const jobTitleMap = new Map<string, string>();
        if (jobs) {
          for (const job of jobs) {
            jobTitleMap.set(job.id, job.title);
          }
        }

        // Fetch match results
        const { data: matches } = await supabase
          .from("match_results")
          .select("job_description_id, match_percentage")
          .eq("applicant_id", user.id)
          .in("job_description_id", jobIds);

        const matchMap = new Map<string, number>();
        if (matches) {
          for (const m of matches) {
            matchMap.set(m.job_description_id, m.match_percentage);
          }
        }

        const result: AppliedJob[] = applications.map((app) => ({
          id: app.id,
          jobId: app.job_description_id,
          jobTitle: jobTitleMap.get(app.job_description_id) ?? "Untitled Position",
          status: app.status ?? "applied",
          appliedAt: app.created_at,
          matchPercentage: matchMap.get(app.job_description_id) ?? null,
        }));

        setAppliedJobs(result);
      } catch {
        setError("An unexpected error occurred.");
      } finally {
        setLoading(false);
      }
    }

    fetchAppliedJobs();
  }, []);

  if (loading) {
    return (
      <main className="flex-1 p-6 md:p-8">
        <div className="flex items-center justify-center py-12" role="status">
          <svg className="h-6 w-6 animate-spin text-[var(--accent)]" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="ml-2 text-sm text-[var(--text-secondary)]">Loading applications...</span>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex-1 p-6 md:p-8">
        <div className="glass-card p-4 border-l-4 border-l-[var(--error)]">
          <p className="text-sm text-[var(--error)]">{error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 p-6 md:p-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)]">
          Applied Jobs
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Track all jobs you&apos;ve applied to.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-6"
      >
        {appliedJobs.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <div className="mb-3 flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--bg-secondary)]">
                <svg className="h-7 w-7 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <p className="text-sm text-[var(--text-secondary)]">You haven&apos;t applied to any jobs yet.</p>
            <Link href="/applicant/jobs" className="btn-primary mt-4 inline-block text-xs">
              Browse Matched Jobs
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {paginatedJobs.map((job, index) => {
              const pct = job.matchPercentage;
              const badgeColor = pct !== null && pct >= 80
                ? "text-green-400 border-green-500/40"
                : pct !== null && pct >= 60
                ? "text-yellow-400 border-yellow-500/40"
                : "text-rose-400 border-rose-500/40";

              return (
                <Link
                  key={job.id}
                  href={`/applicant/jobs/${job.jobId}`}
                  className="flex items-center gap-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card-solid)] px-4 py-3.5 transition-all hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-500/5 group"
                >
                  {/* Number */}
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[var(--bg-secondary)] text-sm font-semibold text-[var(--text-muted)] border border-[var(--border-subtle)]">
                    {(currentPage - 1) * pageSize + index + 1}
                  </span>

                  {/* Job info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--text-primary)] truncate group-hover:text-[var(--accent)] transition-colors">
                      {job.jobTitle}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      Applied {new Date(job.appliedAt).toLocaleDateString()}
                      {job.status === "applied_externally" && " · External"}
                    </p>
                  </div>

                  {/* Status badge */}
                  <span className={`flex-shrink-0 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                    job.status === "applied_externally"
                      ? "text-purple-300 border-purple-500/30"
                      : "text-green-300 border-green-500/30"
                  }`}>
                    {job.status === "applied_externally" ? "External" : "Applied"}
                  </span>

                  {/* Match percentage */}
                  {pct !== null && (
                    <span className={`flex-shrink-0 inline-flex items-center rounded-full border px-3 py-1 text-sm font-bold ${badgeColor}`}>
                      {pct}%
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {appliedJobs.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            className="mt-6"
          />
        )}
      </motion.div>
    </main>
  );
}
