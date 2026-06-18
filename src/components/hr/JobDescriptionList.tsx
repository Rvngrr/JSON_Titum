"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { JobDescription } from "@/types";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { useToast } from "@/components/shared/Toast";

export default function JobDescriptionList() {
  const [jobs, setJobs] = useState<JobDescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();

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
      addToast("error", "Failed to load job descriptions.");
    } else {
      setJobs(data as JobDescription[]);
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

    const { error: deleteError } = await supabase
      .from("job_descriptions")
      .delete()
      .eq("id", jobId);

    if (deleteError) {
      setError("Failed to delete job description. Please try again.");
      addToast("error", "Failed to delete job description. Please try again.");
      setDeletingId(null);
    } else {
      setJobs((prev) => prev.filter((job) => job.id !== jobId));
      addToast("success", `"${jobTitle}" has been deleted.`);
      setDeletingId(null);
    }
  };

  const getStatusBadgeClasses = (status: JobDescription["status"]) => {
    switch (status) {
      case "published":
        return "bg-green-100 text-green-800";
      case "draft":
        return "bg-yellow-100 text-yellow-800";
      case "closed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
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

  if (error) {
    return (
      <section aria-label="Job descriptions">
        <div role="alert" className="rounded-md bg-red-50 p-4 text-red-700">
          {error}
        </div>
      </section>
    );
  }

  if (jobs.length === 0) {
    return (
      <section aria-label="Job descriptions" className="py-12 text-center">
        <p className="text-gray-500">
          You haven&apos;t created any job descriptions yet.
        </p>
        <Link
          href="/hr/jobs/new"
          className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Create your first job posting
        </Link>
      </section>
    );
  }

  return (
    <section aria-label="Job descriptions">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                Title
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                Status
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                Created
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {jobs.map((job) => (
              <tr key={job.id}>
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                  {job.title}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm">
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold leading-5 ${getStatusBadgeClasses(job.status)}`}
                  >
                    {job.status}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  {formatDate(job.created_at)}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                  <Link
                    href={`/hr/jobs/${job.id}/rankings`}
                    className="mr-3 font-medium text-indigo-600 hover:text-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    aria-label={`View rankings for ${job.title}`}
                  >
                    Rankings
                  </Link>
                  <Link
                    href={`/hr/jobs/${job.id}/edit`}
                    className="mr-3 font-medium text-blue-600 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    aria-label={`Edit ${job.title}`}
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(job.id, job.title)}
                    disabled={deletingId === job.id}
                    className="font-medium text-red-600 hover:text-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
                    aria-label={`Delete ${job.title}`}
                  >
                    {deletingId === job.id ? "Deleting..." : "Delete"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
