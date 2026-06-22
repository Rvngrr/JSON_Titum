"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

interface ApplicantEntry {
  id: string;
  applicantId: string;
  applicantName: string;
  applicantEmail: string;
  jobId: string;
  jobTitle: string;
  matchPercentage: number | null;
  appliedAt: string;
}

export default function HRApplicantsPage() {
  const [applicants, setApplicants] = useState<ApplicantEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterJob, setFilterJob] = useState<string>("all");
  const [jobs, setJobs] = useState<Array<{ id: string; title: string }>>([]);

  useEffect(() => {
    async function fetchApplicants() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setError("Not authenticated"); setLoading(false); return; }

        // Fetch HR's job postings
        const { data: hrJobs, error: jobsError } = await supabase
          .from("job_descriptions")
          .select("id, title")
          .eq("hr_user_id", user.id)
          .order("created_at", { ascending: false });

        if (jobsError) { setError("Failed to load jobs."); setLoading(false); return; }
        if (!hrJobs || hrJobs.length === 0) { setApplicants([]); setLoading(false); return; }

        setJobs(hrJobs);
        const jobIds = hrJobs.map((j) => j.id);
        const jobTitleMap = new Map(hrJobs.map((j) => [j.id, j.title]));

        // Fetch all applications for these jobs
        const { data: applications, error: appError } = await supabase
          .from("applications")
          .select("id, applicant_id, job_description_id, created_at")
          .in("job_description_id", jobIds)
          .order("created_at", { ascending: false });

        if (appError) { setError("Failed to load applications."); setLoading(false); return; }
        if (!applications || applications.length === 0) { setApplicants([]); setLoading(false); return; }

        // Fetch applicant profiles
        const applicantIds = [...new Set(applications.map((a) => a.applicant_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, name, email")
          .in("id", applicantIds);

        const profileMap = new Map<string, { name: string; email: string }>();
        if (profiles) {
          for (const p of profiles) {
            profileMap.set(p.id, { name: p.name, email: p.email });
          }
        }

        // Fetch match results
        const { data: matches } = await supabase
          .from("match_results")
          .select("applicant_id, job_description_id, match_percentage")
          .in("job_description_id", jobIds)
          .in("applicant_id", applicantIds);

        const matchMap = new Map<string, number>();
        if (matches) {
          for (const m of matches) {
            matchMap.set(`${m.applicant_id}-${m.job_description_id}`, m.match_percentage);
          }
        }

        const result: ApplicantEntry[] = applications.map((app) => {
          const profile = profileMap.get(app.applicant_id);
          return {
            id: app.id,
            applicantId: app.applicant_id,
            applicantName: profile?.name ?? "Unknown",
            applicantEmail: profile?.email ?? "",
            jobId: app.job_description_id,
            jobTitle: jobTitleMap.get(app.job_description_id) ?? "Untitled",
            matchPercentage: matchMap.get(`${app.applicant_id}-${app.job_description_id}`) ?? null,
            appliedAt: app.created_at,
          };
        });

        setApplicants(result);
      } catch {
        setError("An unexpected error occurred.");
      } finally {
        setLoading(false);
      }
    }

    fetchApplicants();
  }, []);

  const filteredApplicants = filterJob === "all"
    ? applicants
    : applicants.filter((a) => a.jobId === filterJob);

  if (loading) {
    return (
      <main className="flex-1 p-6 md:p-8">
        <div className="flex items-center justify-center py-12" role="status">
          <svg className="h-6 w-6 animate-spin text-[var(--accent)]" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="ml-2 text-sm text-[var(--text-secondary)]">Loading applicants...</span>
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
          Applicants
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          All applicants who have applied to your job postings.
        </p>
      </motion.div>

      {/* Filter by job */}
      {jobs.length > 1 && (
        <div className="mt-4">
          <select
            value={filterJob}
            onChange={(e) => setFilterJob(e.target.value)}
            className="input-glass px-3 py-2 text-sm rounded-lg"
            aria-label="Filter by job posting"
          >
            <option value="all">All Job Postings ({applicants.length})</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.title} ({applicants.filter((a) => a.jobId === job.id).length})
              </option>
            ))}
          </select>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-6"
      >
        {filteredApplicants.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <div className="mb-3 flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--bg-secondary)]">
                <svg className="h-7 w-7 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
            <p className="text-sm text-[var(--text-secondary)]">No applicants yet.</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">Applicants will appear here once they apply to your postings.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredApplicants.map((applicant) => {
              const pct = applicant.matchPercentage;
              const badgeColor = pct !== null && pct >= 80
                ? "text-green-400 border-green-500/40"
                : pct !== null && pct >= 60
                ? "text-yellow-400 border-yellow-500/40"
                : "text-rose-400 border-rose-500/40";

              return (
                <Link
                  key={applicant.id}
                  href={`/hr/jobs/${applicant.jobId}/rankings`}
                  className="flex items-center gap-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card-solid)] px-4 py-3.5 transition-all hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-500/5 group"
                >
                  {/* Avatar */}
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--accent)] to-periwinkle">
                    <span className="text-sm font-bold text-white">
                      {applicant.applicantName.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--text-primary)] truncate group-hover:text-[var(--accent)] transition-colors">
                      {applicant.applicantName}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">
                      Applied to <span className="text-[var(--text-secondary)]">{applicant.jobTitle}</span> · {new Date(applicant.appliedAt).toLocaleDateString()}
                    </p>
                  </div>

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
      </motion.div>
    </main>
  );
}
