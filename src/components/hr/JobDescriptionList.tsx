"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { JobDescription } from "@/types";
import LoadingSpinner from "@/components/shared/LoadingSpinner";

interface ExtendedJobDescription extends JobDescription {
  external_job_id?: string | null;
  source?: string | null;
  applicationCount?: number;
}

type StatusFilter = "all" | "published" | "draft" | "closed";

export default function JobDescriptionList() {
  const [jobs, setJobs] = useState<ExtendedJobDescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const supabase = createClient();

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("job_descriptions")
      .select("*")
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError("Failed to load job descriptions. Please try again.");
    } else {
      const jobList = (data as ExtendedJobDescription[]) ?? [];

      // Fetch application counts
      const { data: appCounts } = await supabase
        .from("applications")
        .select("job_description_id");

      const countMap = new Map<string, number>();
      if (appCounts) {
        for (const app of appCounts) {
          countMap.set(app.job_description_id, (countMap.get(app.job_description_id) || 0) + 1);
        }
      }

      setJobs(jobList.map((job) => ({ ...job, applicationCount: countMap.get(job.id) || 0 })));
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleDelete = async (jobId: string, jobTitle: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${jobTitle}"? This will also remove all associated matches and rankings.`
    );

    if (!confirmed) return;

    setDeletingId(jobId);
    setError(null);
    setSuccessMessage(null);

    const { error: deleteError } = await supabase
      .from("job_descriptions")
      .delete()
      .eq("id", jobId);

    if (deleteError) {
      setError("Failed to delete job description. Please try again.");
      setDeletingId(null);
    } else {
      setJobs((prev) => prev.filter((job) => job.id !== jobId));
      setDeletingId(null);
    }
  };

  const handlePublish = async (jobId: string, jobTitle: string) => {
    setActionInProgressId(jobId);
    setError(null);
    setSuccessMessage(null);

    const { error: updateError } = await supabase
      .from("job_descriptions")
      .update({ status: "published", updated_at: new Date().toISOString() })
      .eq("id", jobId);

    if (updateError) {
      setError(`Failed to publish "${jobTitle}". Please try again.`);
    } else {
      setJobs((prev) =>
        prev.map((job) =>
          job.id === jobId ? { ...job, status: "published" as const } : job
        )
      );
      setSuccessMessage(`"${jobTitle}" has been published and is now visible to applicants.`);
    }

    setActionInProgressId(null);
  };

  const handleClose = async (jobId: string, jobTitle: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to close "${jobTitle}"? It will no longer be visible to applicants.`
    );

    if (!confirmed) return;

    setActionInProgressId(jobId);
    setError(null);
    setSuccessMessage(null);

    const { error: updateError } = await supabase
      .from("job_descriptions")
      .update({ status: "closed", updated_at: new Date().toISOString() })
      .eq("id", jobId);

    if (updateError) {
      setError(`Failed to close "${jobTitle}". Please try again.`);
    } else {
      setJobs((prev) =>
        prev.map((job) =>
          job.id === jobId ? { ...job, status: "closed" as const } : job
        )
      );
      setSuccessMessage(`"${jobTitle}" has been closed.`);
    }

    setActionInProgressId(null);
  };

  const isManualJob = (job: ExtendedJobDescription) => {
    return !job.external_job_id && !job.source;
  };

  const getStatusBadgeClasses = (status: JobDescription["status"]) => {
    switch (status) {
      case "published":
        return "bg-[var(--success-bg)] text-[var(--success-text)]";
      case "draft":
        return "bg-[var(--warning-bg)] text-[var(--warning-text)]";
      case "closed":
        return "bg-[var(--bg-secondary)] text-[var(--text-muted)]";
      default:
        return "bg-[var(--bg-secondary)] text-[var(--text-muted)]";
    }
  };

  const getSourceBadge = (job: ExtendedJobDescription) => {
    if (job.source === "jsearch") {
      return (
        <span className="badge-pill bg-[var(--orb-lavender)] text-[var(--text-primary)]">
          via JSearch
        </span>
      );
    }
    if (job.source === "indeed") {
      return (
        <span className="badge-pill bg-[var(--info-bg)] text-[var(--info-text)]">
          via Indeed
        </span>
      );
    }
    return (
      <span className="badge-pill bg-[var(--bg-secondary)] text-[var(--text-muted)]">
        Manual
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const filteredJobs = useMemo(() => {
    if (statusFilter === "all") return jobs;
    return jobs.filter((j) => j.status === statusFilter);
  }, [jobs, statusFilter]);

  const statusCounts = useMemo(() => ({
    all: jobs.length,
    published: jobs.filter((j) => j.status === "published").length,
    draft: jobs.filter((j) => j.status === "draft").length,
    closed: jobs.filter((j) => j.status === "closed").length,
  }), [jobs]);

  if (loading) {
    return (
      <section aria-label="Job descriptions" className="flex justify-center py-12">
        <LoadingSpinner />
      </section>
    );
  }

  if (error && jobs.length === 0) {
    return (
      <section aria-label="Job descriptions">
        <div role="alert" className="rounded-xl bg-[var(--error-bg)] p-4 text-[var(--error-text)]">
          {error}
        </div>
      </section>
    );
  }

  if (jobs.length === 0) {
    return (
      <section aria-label="Job descriptions" className="py-12 text-center">
        <p className="text-[var(--text-muted)]">
          You haven&apos;t created any job descriptions yet.
        </p>
        <Link
          href="/hr/jobs/new"
          className="btn-primary mt-4 inline-block text-sm"
        >
          Create your first job posting
        </Link>
      </section>
    );
  }

  return (
    <section aria-label="Job descriptions">
      {error && (
        <div role="alert" aria-live="assertive" className="mb-4 rounded-xl bg-rose-500/10 p-3 text-sm text-rose-300 border border-rose-500/20">
          {error}
        </div>
      )}

      {successMessage && (
        <div role="status" aria-live="polite" className="mb-4 rounded-xl bg-green-500/10 p-3 text-sm text-green-300 border border-green-500/20">
          {successMessage}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {(["all", "published", "draft", "closed"] as StatusFilter[]).map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setStatusFilter(filter)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
              statusFilter === filter
                ? "bg-[var(--accent)] text-white"
                : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
            }`}
          >
            {filter.charAt(0).toUpperCase() + filter.slice(1)} ({statusCounts[filter]})
          </button>
        ))}
      </div>

      {/* Job rows */}
      <div className="space-y-2">
        {filteredJobs.map((job) => (
          <div
            key={job.id}
            className="flex items-center gap-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card-solid)] px-4 py-3.5 transition-all hover:border-cyan-500/30"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{job.title}</p>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${getStatusBadgeClasses(job.status)}`}>
                  {job.status}
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {formatDate(job.created_at)}
                {job.source && <span> · via {job.source}</span>}
              </p>
            </div>

            {/* Applicant count */}
            <Link
              href="/hr/applicants"
              className="flex-shrink-0 rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-300 border border-cyan-500/20 hover:bg-cyan-500/20 transition-colors"
            >
              {job.applicationCount ?? 0} applicant{(job.applicationCount ?? 0) !== 1 ? "s" : ""}
            </Link>

            {/* Actions dropdown */}
            {isManualJob(job) && (
              <div className="relative flex-shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    const menu = e.currentTarget.nextElementSibling as HTMLElement;
                    menu.classList.toggle("hidden");
                  }}
                  onBlur={(e) => {
                    const menu = e.currentTarget.nextElementSibling as HTMLElement;
                    setTimeout(() => menu.classList.add("hidden"), 150);
                  }}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all"
                >
                  Actions
                </button>
                <div className="hidden absolute right-0 top-full mt-1 z-20 w-32 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card-solid)] py-1 shadow-lg">
                  {job.status === "draft" && (
                    <button type="button" onClick={() => handlePublish(job.id, job.title)} disabled={actionInProgressId === job.id} className="w-full text-left px-4 py-2 text-xs text-green-400 hover:bg-[var(--sidebar-hover)] disabled:opacity-50">
                      Publish
                    </button>
                  )}
                  {job.status === "published" && (
                    <button type="button" onClick={() => handleClose(job.id, job.title)} disabled={actionInProgressId === job.id} className="w-full text-left px-4 py-2 text-xs text-orange-400 hover:bg-[var(--sidebar-hover)] disabled:opacity-50">
                      Close
                    </button>
                  )}
                  <Link href={`/hr/jobs/${job.id}/edit`} className="block px-4 py-2 text-xs text-[var(--accent)] hover:bg-[var(--sidebar-hover)]">
                    Edit
                  </Link>
                  <button type="button" onClick={() => handleDelete(job.id, job.title)} disabled={deletingId === job.id} className="w-full text-left px-4 py-2 text-xs text-rose-400 hover:bg-[var(--sidebar-hover)] disabled:opacity-50">
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
