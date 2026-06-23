"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import MatchPercentageBadge from "@/components/applicant/MatchPercentageBadge";
import ApplyButton from "@/components/applicant/ApplyButton";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import Pagination, { usePagination } from "@/components/shared/Pagination";
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
  const [applicationStatuses, setApplicationStatuses] = useState<Map<string, "applied" | "applied_externally">>(new Map());
  const [statusFetchFailed, setStatusFetchFailed] = useState(false);

  // Filter state
  const [keyword, setKeyword] = useState("");
  const [skillFilter, setSkillFilter] = useState("");
  const [minMatch, setMinMatch] = useState(0);
  const [maxMatch, setMaxMatch] = useState(100);
  const [typeFilter, setTypeFilter] = useState("");
  const [remoteFilter, setRemoteFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

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
            .select("job_description_id, status")
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

          const statusMap = new Map<string, "applied" | "applied_externally">();
          for (const app of applicationData as Array<{ job_description_id: string; status: string }>) {
            statusMap.set(app.job_description_id, app.status as "applied" | "applied_externally");
          }
          setApplicationStatuses(statusMap);
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

      // Employment type filter
      if (typeFilter) {
        if (!job.employment_type || !job.employment_type.toLowerCase().includes(typeFilter.toLowerCase())) {
          return false;
        }
      }

      // Remote/work mode filter
      if (remoteFilter) {
        const loc = (job.location_city || "").toLowerCase() + " " + (job.location_state || "").toLowerCase();
        const desc = job.description.toLowerCase();
        if (remoteFilter === "remote" && !desc.includes("remote") && !loc.includes("remote")) {
          return false;
        }
        if (remoteFilter === "hybrid" && !desc.includes("hybrid") && !loc.includes("hybrid")) {
          return false;
        }
        if (remoteFilter === "onsite" && (desc.includes("remote") || loc.includes("remote"))) {
          return false;
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
  }, [jobs, keyword, skillFilter, minMatch, maxMatch, typeFilter, remoteFilter]);

  const hasActiveFilters =
    keyword.trim() !== "" ||
    skillFilter.trim() !== "" ||
    minMatch > 0 ||
    maxMatch < 100 ||
    typeFilter !== "" ||
    remoteFilter !== "";

  const activeFilterCount = [
    keyword.trim() !== "",
    skillFilter.trim() !== "",
    minMatch > 0 || maxMatch < 100,
    typeFilter !== "",
    remoteFilter !== "",
  ].filter(Boolean).length;

  const {
    currentPage,
    setCurrentPage,
    paginatedItems: paginatedJobs,
    totalItems,
    pageSize,
  } = usePagination(filteredJobs, 10);

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
        <div className="rounded-xl bg-[var(--error-bg)] p-4">
          <p className="text-sm text-[var(--error-text)]">{error}</p>
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Job listings">
      {/* Search Bar + Filter Toggle */}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search job title or description..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-full input-glass pl-10 pr-4 py-2.5 text-sm"
            aria-label="Search jobs"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all border ${
            showFilters || hasActiveFilters
              ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
              : "border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:border-[var(--accent)]"
          }`}
          aria-expanded={showFilters}
          aria-label="Toggle filter options"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          More options
          {activeFilterCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Filter Pills Row — visible when expanded */}
      {showFilters && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {/* Type Filter */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenDropdown(openDropdown === "type" ? null : "type")}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium border transition-all ${
                typeFilter
                  ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                  : "border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]"
              }`}
            >
              Type
              <svg className={`h-3 w-3 transition-transform ${openDropdown === "type" ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openDropdown === "type" && (
              <div className="absolute top-full left-0 z-20 mt-1 w-44 rounded-xl glass-card p-1.5 shadow-lg">
                {["", "full-time", "part-time", "contract"].map((opt) => (
                  <button key={opt} type="button" onClick={() => { setTypeFilter(opt); setOpenDropdown(null); }}
                    className={`w-full text-left rounded-lg px-3 py-2 text-xs transition-colors ${typeFilter === opt ? "bg-[var(--accent)]/10 text-[var(--accent)]" : "text-[var(--text-secondary)] hover:bg-[var(--sidebar-hover)]"}`}
                  >
                    {opt === "" ? "All types" : opt.charAt(0).toUpperCase() + opt.slice(1)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Remote Filter */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenDropdown(openDropdown === "remote" ? null : "remote")}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium border transition-all ${
                remoteFilter
                  ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                  : "border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]"
              }`}
            >
              Remote
              <svg className={`h-3 w-3 transition-transform ${openDropdown === "remote" ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openDropdown === "remote" && (
              <div className="absolute top-full left-0 z-20 mt-1 w-40 rounded-xl glass-card p-1.5 shadow-lg">
                {["", "remote", "hybrid", "onsite"].map((opt) => (
                  <button key={opt} type="button" onClick={() => { setRemoteFilter(opt); setOpenDropdown(null); }}
                    className={`w-full text-left rounded-lg px-3 py-2 text-xs transition-colors ${remoteFilter === opt ? "bg-[var(--accent)]/10 text-[var(--accent)]" : "text-[var(--text-secondary)] hover:bg-[var(--sidebar-hover)]"}`}
                  >
                    {opt === "" ? "Any" : opt.charAt(0).toUpperCase() + opt.slice(1)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Match Range Filter */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenDropdown(openDropdown === "match" ? null : "match")}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium border transition-all ${
                minMatch > 0 || maxMatch < 100
                  ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                  : "border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]"
              }`}
            >
              Match %
              <svg className={`h-3 w-3 transition-transform ${openDropdown === "match" ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openDropdown === "match" && (
              <div className="absolute top-full left-0 z-20 mt-1 w-52 rounded-xl glass-card p-3 shadow-lg">
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-medium text-[var(--text-muted)]">Min: {minMatch}%</label>
                    <input type="range" min={0} max={100} value={minMatch} onChange={(e) => setMinMatch(Number(e.target.value))} className="w-full h-1.5 rounded-full appearance-none bg-[var(--border-subtle)] accent-[var(--accent)]" />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-[var(--text-muted)]">Max: {maxMatch}%</label>
                    <input type="range" min={0} max={100} value={maxMatch} onChange={(e) => setMaxMatch(Number(e.target.value))} className="w-full h-1.5 rounded-full appearance-none bg-[var(--border-subtle)] accent-[var(--accent)]" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Skills Filter */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenDropdown(openDropdown === "skills" ? null : "skills")}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium border transition-all ${
                skillFilter.trim()
                  ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                  : "border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]"
              }`}
            >
              Skills
              <svg className={`h-3 w-3 transition-transform ${openDropdown === "skills" ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openDropdown === "skills" && (
              <div className="absolute top-full left-0 z-20 mt-1 w-56 rounded-xl glass-card p-3 shadow-lg">
                <input
                  type="text"
                  placeholder="e.g. React, Python"
                  value={skillFilter}
                  onChange={(e) => setSkillFilter(e.target.value)}
                  className="w-full input-glass px-3 py-2 text-xs"
                  aria-label="Filter by skills"
                />
                <p className="mt-1.5 text-[10px] text-[var(--text-muted)]">Comma-separated skills</p>
              </div>
            )}
          </div>

          {/* Clear All */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setKeyword("");
                setSkillFilter("");
                setMinMatch(0);
                setMaxMatch(100);
                setTypeFilter("");
                setRemoteFilter("");
                setOpenDropdown(null);
              }}
              className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-xs font-medium text-[var(--error-text)] hover:bg-[var(--error-bg)] transition-colors"
            >
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear all
            </button>
          )}
        </div>
      )}

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

          <ul className="space-y-3" role="list">
            {paginatedJobs.map((job) => (
              <li
                key={job.id}
                className="glass-card p-4 transition hover:shadow-lg"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <Link
                      href={`/applicant/jobs/${job.id}`}
                      className="text-lg font-medium text-[var(--text-primary)] hover:text-[var(--accent)] hover:underline"
                    >
                      {job.title}
                    </Link>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-300 max-w-[85%]">
                      {job.description}
                    </p>
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
                <div className="mt-3 flex items-center justify-between">
                  {job.requiredSkills.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {job.requiredSkills.map((skill) => (
                        <span
                          key={skill}
                          className="inline-flex items-center rounded-full bg-orange-500/8 px-2.5 py-0.5 text-xs font-medium text-orange-400/70 border border-orange-500/15"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div />
                  )}
                  <div className="ml-4 flex-shrink-0">
                    <ApplyButton
                      jobId={job.id}
                      initialStatus={
                        appliedJobIds.has(job.id)
                          ? (applicationStatuses.get(job.id) === "applied_externally" ? "applied_externally" : "applied")
                          : "not_applied"
                      }
                      jobStatus={job.status}
                      jobLink={job.job_link}
                      jobTitle={job.title}
                      onApplicationSuccess={() =>
                        handleApplicationSuccess(job.id)
                      }
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            className="mt-6"
          />
        </div>
      )}
    </section>
  );
}
