"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { JobDescription } from "@/types";
import LoadingSpinner from "@/components/shared/LoadingSpinner";

interface ExtendedJobDescription extends JobDescription {
  external_job_id?: string | null;
  source?: string | null;
}

export default function JobDescriptionList() {
  const [jobs, setJobs] = useState<ExtendedJobDescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
      setJobs(data as ExtendedJobDescription[]);
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
        <div role="alert" aria-live="assertive" className="mb-4 rounded-xl bg-[var(--error-bg)] p-3 text-sm text-[var(--error-text)]">
          {error}
        </div>
      )}

      {successMessage && (
        <div role="status" aria-live="polite" className="mb-4 rounded-xl bg-[var(--success-bg)] p-3 text-sm text-[var(--success-text)]">
          {successMessage}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl">
        <table className="min-w-full divide-y divide-[var(--border-subtle)]">
          <thead className="bg-[var(--bg-secondary)]">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]"
              >
                Title
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]"
              >
                Status
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]"
              >
                Source
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]"
              >
                Created
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)] bg-[var(--bg-card-solid)]">
            {jobs.map((job) => (
              <tr key={job.id} className="hover:bg-[var(--sidebar-hover)] transition-colors">
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-[var(--text-primary)]">
                  {job.title}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm">
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold leading-5 ${getStatusBadgeClasses(job.status)}`}
                  >
                    {job.status}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm">
                  {getSourceBadge(job)}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-[var(--text-muted)]">
                  {formatDate(job.created_at)}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                  <div className="flex items-center justify-end gap-2">
                    {/* Publish action - only for draft manual jobs */}
                    {job.status === "draft" && isManualJob(job) && (
                      <button
                        type="button"
                        onClick={() => handlePublish(job.id, job.title)}
                        disabled={actionInProgressId === job.id}
                        className="font-medium text-[var(--success)] hover:text-[var(--success-text)] transition-colors disabled:opacity-50"
                        aria-label={`Publish ${job.title}`}
                      >
                        {actionInProgressId === job.id ? "Publishing..." : "Publish"}
                      </button>
                    )}

                    {/* Rankings link */}
                    <Link
                      href={`/hr/jobs/${job.id}/rankings`}
                      className="font-medium text-indigo-600 hover:text-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                      aria-label={`View rankings for ${job.title}`}
                    >
                      Rankings
                    </Link>

                    {/* Edit action - only for manual jobs */}
                    {isManualJob(job) && (
                      <Link
                        href={`/hr/jobs/${job.id}/edit`}
                        className="font-medium text-blue-600 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        aria-label={`Edit ${job.title}`}
                      >
                        Edit
                      </Link>
                    )}

                    {/* Close action - only for published manual jobs */}
                    {job.status === "published" && isManualJob(job) && (
                      <button
                        type="button"
                        onClick={() => handleClose(job.id, job.title)}
                        disabled={actionInProgressId === job.id}
                        className="font-medium text-orange-600 hover:text-orange-800 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50"
                        aria-label={`Close ${job.title}`}
                      >
                        {actionInProgressId === job.id ? "Closing..." : "Close"}
                      </button>
                    )}

                    {/* Delete action - only for manual jobs */}
                    {isManualJob(job) && (
                      <button
                        type="button"
                        onClick={() => handleDelete(job.id, job.title)}
                        disabled={deletingId === job.id}
                        className="font-medium text-red-600 hover:text-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
                        aria-label={`Delete ${job.title}`}
                      >
                        {deletingId === job.id ? "Deleting..." : "Delete"}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
