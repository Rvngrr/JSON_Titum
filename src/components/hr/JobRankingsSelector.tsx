"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { JobDescription } from "@/types";
import ApplicantRankings from "./ApplicantRankings";
import LoadingSpinner from "@/components/shared/LoadingSpinner";

interface RankingsMetadata {
  /** Most recent calculated_at timestamp across all match results for the selected job */
  lastCalculatedAt: string | null;
  /** Whether the rankings were recently updated (within last 5 minutes) */
  recentlyUpdated: boolean;
}

interface JobRankingsSelectorProps {
  /** Optional initial job ID to pre-select */
  initialJobId?: string;
}

/**
 * Job selector dropdown combined with applicant rankings display.
 * Allows HR users to switch between rankings for different job postings
 * without navigating away. Shows an "updated" indicator when rankings
 * have been recently recalculated.
 */
export default function JobRankingsSelector({ initialJobId }: JobRankingsSelectorProps) {
  const [jobs, setJobs] = useState<JobDescription[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>(initialJobId ?? "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rankingsMetadata, setRankingsMetadata] = useState<RankingsMetadata>({
    lastCalculatedAt: null,
    recentlyUpdated: false,
  });

  // Fetch the HR user's jobs
  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error: fetchError } = await supabase
      .from("job_descriptions")
      .select("*")
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError("Failed to load job descriptions.");
      setLoading(false);
      return;
    }

    setJobs((data as JobDescription[]) ?? []);

    // Auto-select the first job if none specified
    if (!initialJobId && data && data.length > 0) {
      setSelectedJobId(data[0].id);
    }

    setLoading(false);
  }, [initialJobId]);

  // Fetch rankings metadata (last calculation time) for the selected job
  const fetchRankingsMetadata = useCallback(async (jobId: string) => {
    if (!jobId) {
      setRankingsMetadata({ lastCalculatedAt: null, recentlyUpdated: false });
      return;
    }

    const supabase = createClient();
    const { data, error: metaError } = await supabase
      .from("match_results")
      .select("calculated_at")
      .eq("job_description_id", jobId)
      .order("calculated_at", { ascending: false })
      .limit(1);

    if (metaError || !data || data.length === 0) {
      setRankingsMetadata({ lastCalculatedAt: null, recentlyUpdated: false });
      return;
    }

    const lastCalculatedAt = data[0].calculated_at;
    const calculatedTime = new Date(lastCalculatedAt).getTime();
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const recentlyUpdated = calculatedTime > fiveMinutesAgo;

    setRankingsMetadata({ lastCalculatedAt, recentlyUpdated });
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  useEffect(() => {
    if (selectedJobId) {
      fetchRankingsMetadata(selectedJobId);
    }
  }, [selectedJobId, fetchRankingsMetadata]);

  const handleJobChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedJobId(e.target.value);
  };

  const formatTimestamp = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="rounded-md bg-red-50 p-4 text-red-700">
        {error}
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-gray-500">
          No job postings found. Create a job posting to see applicant rankings.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Job Selector */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px]">
          <label
            htmlFor="job-selector"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Select Job Posting
          </label>
          <select
            id="job-selector"
            value={selectedJobId}
            onChange={handleJobChange}
            className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            aria-label="Select a job posting to view rankings"
          >
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.title} ({job.status})
              </option>
            ))}
          </select>
        </div>

        {/* Updated Indicator */}
        {rankingsMetadata.lastCalculatedAt && (
          <div className="flex items-center gap-2 text-sm">
            {rankingsMetadata.recentlyUpdated && (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800"
                aria-label="Rankings recently updated"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" aria-hidden="true" />
                Updated
              </span>
            )}
            <span className="text-gray-500">
              Last calculated: {formatTimestamp(rankingsMetadata.lastCalculatedAt)}
            </span>
          </div>
        )}
      </div>

      {/* Rankings Display */}
      {selectedJobId ? (
        <ApplicantRankings jobId={selectedJobId} />
      ) : (
        <p className="text-gray-500">Select a job posting to view rankings.</p>
      )}
    </div>
  );
}
