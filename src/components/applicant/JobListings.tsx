"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import MatchPercentageBadge from "@/components/applicant/MatchPercentageBadge";
import ApplicationStatusBadge from "@/components/applicant/ApplicationStatusBadge";
import ApplyButton from "@/components/applicant/ApplyButton";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import type { JobDescription, MatchResult, JobRequiredSkill } from "@/types";

interface JobWithMatch extends JobDescription {
  matchPercentage: number | null;
  requiredSkills: string[];
}

export default function JobListings() {
  const [jobs, setJobs] = useState<JobWithMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());
  const [statusFetchFailed, setStatusFetchFailed] = useState(false);

  // Filter state
  const [keyword, setKeyword] = useState("");
  const [skillFilter, setSkillFilter] = useState("");
  const [minMatch, setMinMatch] = useState(0);
  const [maxMatch, setMaxMatch] = useState(100);

  const handleApplicationSuccess = useCallback((jobId: string) => {
    setAppliedJobIds((prev) => new Set([...prev, jobId]));
  }, []);

  useEffect(() => {
    async function fetchJobs() {
      try {
        const supabase = createClient();

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setError("You must be logged in to view job listings.");
          setLoading(false);
          return;
        }

        // Fetch published job descriptions
        const { data: jobData, error: jobError } = await supabase
          .from("job_descriptions")
          .select("*")
          .eq("status", "published");

        if (jobError) {
          setError("Failed to load job listings.");
          setLoading(false);
          return;
        }

        // Fetch user's match results
        const { data: matchData } = await supabase
          .from("match_results")
          .select("*")
          .eq("applicant_id", user.id);

        // Fetch required skills for all jobs
        const { data: skillsData } = await supabase
          .from("job_required_skills")
          .select("*");

        // Batch-fetch application statuses for the current user
        const { data: applicationData, error: applicationError } =
          await supabase
            .from("applications")
            .select("job_description_id")
            .eq("applicant_id", user.id);

        if (applicationError) {
          setStatusFetchFailed(true);
        } else if (applicationData) {
          const appliedIds = new Set<string>(
            applicationData.map(
              (app: { job_description_id: string }) => app.job_description_id
            )
          );
          setAppliedJobIds(appliedIds);
        }

        const matchMap = new Map<string, MatchResult>();
        if (matchData) {
          for (const match of matchData as MatchResult[]) {
            matchMap.set(match.job_description_id, match);
          }
        }

        const skillsMap = new Map<string, string[]>();
        if (skillsData) {
          for (const skill of skillsData as JobRequiredSkill[]) {
            const existing = skillsMap.get(skill.job_description_id) || [];
            existing.push(skill.skill_name);
            skillsMap.set(skill.job_description_id, existing);
          }
        }

        const jobsWithMatch: JobWithMatch[] = (
          jobData as JobDescription[]
        ).map((job) => ({
          ...job,
          matchPercentage: matchMap.get(job.id)?.match_percentage ?? null,
          requiredSkills: skillsMap.get(job.id) || [],
        }));

        // Default sort: by match percentage descending (null values at the end)
        jobsWithMatch.sort((a, b) => {
          const aMatch = a.matchPercentage ?? -1;
          const bMatch = b.matchPercentage ?? -1;
          return bMatch - aMatch;
        });

        setJobs(jobsWithMatch);
      } catch {
        setError("An unexpected error occurred.");
      } finally {
        setLoading(false);
      }
    }

    fetchJobs();
  }, []);

  // Apply filters (AND logic)
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      // Keyword filter: case-insensitive substring match on title or description
      if (keyword.trim()) {
        const lowerKeyword = keyword.trim().toLowerCase();
        const matchesTitle = job.title.toLowerCase().includes(lowerKeyword);
        const matchesDescription = job.description
          .toLowerCase()
          .includes(lowerKeyword);
        if (!matchesTitle && !matchesDescription) {
          return false;
        }
      }

      // Skill filter: case-insensitive match on any required skill
      if (skillFilter.trim()) {
        const filterSkills = skillFilter
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter((s) => s.length > 0);

        if (filterSkills.length > 0) {
          const jobSkillsLower = job.requiredSkills.map((s) => s.toLowerCase());
          const hasMatchingSkill = filterSkills.some((filterSkill) =>
            jobSkillsLower.some((jobSkill) => jobSkill.includes(filterSkill))
          );
          if (!hasMatchingSkill) {
            return false;
          }
        }
      }

      // Match percentage range filter
      if (job.matchPercentage !== null) {
        if (job.matchPercentage < minMatch || job.matchPercentage > maxMatch) {
          return false;
        }
      } else {
        // If no match percentage and user has set a minimum above 0, exclude
        if (minMatch > 0) {
          return false;
        }
      }

      return true;
    });
  }, [jobs, keyword, skillFilter, minMatch, maxMatch]);

  const hasActiveFilters =
    keyword.trim() !== "" ||
    skillFilter.trim() !== "" ||
    minMatch > 0 ||
    maxMatch < 100;

  if (loading) {
    return (
      <section aria-label="Job listings">
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section aria-label="Job listings">
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Job listings">
      {/* Search and Filter Controls */}
      <div className="mb-6 space-y-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">
          Search &amp; Filter
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Keyword Search */}
          <div>
            <label
              htmlFor="keyword-search"
              className="block text-sm font-medium text-gray-700"
            >
              Keyword
            </label>
            <input
              id="keyword-search"
              type="text"
              placeholder="Search title or description..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Skill Filter */}
          <div>
            <label
              htmlFor="skill-filter"
              className="block text-sm font-medium text-gray-700"
            >
              Skills
            </label>
            <input
              id="skill-filter"
              type="text"
              placeholder="e.g. React, Python"
              value={skillFilter}
              onChange={(e) => setSkillFilter(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Comma-separated skills
            </p>
          </div>

          {/* Min Match Percentage */}
          <div>
            <label
              htmlFor="min-match"
              className="block text-sm font-medium text-gray-700"
            >
              Min Match %
            </label>
            <input
              id="min-match"
              type="number"
              min={0}
              max={100}
              value={minMatch}
              onChange={(e) =>
                setMinMatch(
                  Math.max(0, Math.min(100, Number(e.target.value) || 0))
                )
              }
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Max Match Percentage */}
          <div>
            <label
              htmlFor="max-match"
              className="block text-sm font-medium text-gray-700"
            >
              Max Match %
            </label>
            <input
              id="max-match"
              type="number"
              min={0}
              max={100}
              value={maxMatch}
              onChange={(e) =>
                setMaxMatch(
                  Math.max(0, Math.min(100, Number(e.target.value) || 0))
                )
              }
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Results */}
      {filteredJobs.length === 0 ? (
        <div className="rounded-md border border-yellow-200 bg-yellow-50 p-6 text-center">
          <p className="text-sm text-yellow-800">
            {hasActiveFilters
              ? "No jobs match your criteria. Try broadening your search."
              : "No published job listings are available at this time."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Showing {filteredJobs.length}{" "}
            {filteredJobs.length === 1 ? "job" : "jobs"}
          </p>

          {statusFetchFailed && (
            <div
              className="rounded-md border border-blue-200 bg-blue-50 p-3"
              role="status"
              aria-live="polite"
            >
              <p className="text-sm text-blue-700">
                Application status is temporarily unavailable.
              </p>
            </div>
          )}

          <ul className="space-y-3" role="list">
            {filteredJobs.map((job) => (
              <li
                key={job.id}
                className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <Link
                      href={`/applicant/jobs/${job.id}`}
                      className="text-lg font-medium text-gray-900 hover:text-blue-600 hover:underline"
                    >
                      {job.title}
                    </Link>
                    <p className="mt-1 line-clamp-2 text-sm text-gray-600">
                      {job.description}
                    </p>
                    {job.requiredSkills.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {job.requiredSkills.map((skill) => (
                          <span
                            key={skill}
                            className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    {job.matchPercentage !== null ? (
                      <MatchPercentageBadge
                        percentage={job.matchPercentage}
                      />
                    ) : (
                      <span className="text-xs text-gray-400">
                        Not calculated
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                  {!statusFetchFailed && (
                    <ApplicationStatusBadge
                      applied={appliedJobIds.has(job.id)}
                    />
                  )}
                  <div className={statusFetchFailed ? "ml-auto" : ""}>
                    <ApplyButton
                      jobId={job.id}
                      initialStatus={
                        appliedJobIds.has(job.id) ? "applied" : "not_applied"
                      }
                      jobStatus={job.status}
                      onApplicationSuccess={() =>
                        handleApplicationSuccess(job.id)
                      }
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
