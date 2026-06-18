"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import MatchPercentageBadge from "@/components/applicant/MatchPercentageBadge";
import ApplyButton from "@/components/applicant/ApplyButton";
import ApplicationStatusBadge from "@/components/applicant/ApplicationStatusBadge";
import RecommendationsList from "@/components/applicant/RecommendationsList";
import { useToast } from "@/components/shared/Toast";
import type {
  JobDescription,
  JobRequiredSkill,
  MatchResult,
  Recommendation,
} from "@/types";

interface JobDetailProps {
  jobId: string;
}

interface AdjacentJobs {
  prevId: string | null;
  nextId: string | null;
}

export default function JobDetail({ jobId }: JobDetailProps) {
  const [job, setJob] = useState<JobDescription | null>(null);
  const [requiredSkills, setRequiredSkills] = useState<JobRequiredSkill[]>([]);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [adjacentJobs, setAdjacentJobs] = useState<AdjacentJobs>({
    prevId: null,
    nextId: null,
  });

  const [hasApplied, setHasApplied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [recommendationsError, setRecommendationsError] = useState<string | null>(null);
  const { addToast } = useToast();

  const fetchRecommendations = useCallback(
    async (applicantId: string, jobDescriptionId: string) => {
      setRecommendationsLoading(true);
      setRecommendationsError(null);

      try {
        // Always regenerate recommendations to reflect current skills
        const response = await fetch("/api/recommendations/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            applicant_id: applicantId,
            job_description_id: jobDescriptionId,
          }),
        });

        if (response.status === 404) {
          // No skill profile or job skills yet — not an error, just no recommendations available
          setRecommendations([]);
          setRecommendationsLoading(false);
          return;
        }

        const data = await response.json();

        if (data.success && data.recommendations) {
          setRecommendations(data.recommendations as Recommendation[]);
        } else {
          setRecommendationsError(
            data.error || "Failed to generate recommendations"
          );
          if (data.error?.includes("API key")) {
            addToast("warning", "AI service unavailable. Showing basic recommendations.");
          }
        }
      } catch {
        setRecommendationsError("Failed to load recommendations");
        addToast("error", "Failed to load recommendations.");
      } finally {
        setRecommendationsLoading(false);
      }
    },
    [addToast]
  );

  useEffect(() => {
    async function fetchJobDetail() {
      try {
        setLoading(true);
        setError(null);

        const supabase = createClient();

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setError("You must be logged in to view job details.");
          setLoading(false);
          return;
        }

        // Fetch the job description
        const { data: jobData, error: jobError } = await supabase
          .from("job_descriptions")
          .select("*")
          .eq("id", jobId)
          .eq("status", "published")
          .single();

        if (jobError || !jobData) {
          setError("Job not found or is no longer available.");
          setLoading(false);
          return;
        }

        setJob(jobData as JobDescription);

        // Fetch required skills for this job
        const { data: skillsData } = await supabase
          .from("job_required_skills")
          .select("*")
          .eq("job_description_id", jobId);

        if (skillsData) {
          setRequiredSkills(skillsData as JobRequiredSkill[]);
        }

        // Fetch match result for this applicant-job pair
        const { data: matchData } = await supabase
          .from("match_results")
          .select("*")
          .eq("applicant_id", user.id)
          .eq("job_description_id", jobId)
          .maybeSingle();

        if (matchData) {
          setMatchResult(matchData as MatchResult);
        }

        // Check if the applicant has already applied to this job
        try {
          const { data: applicationData } = await supabase
            .from("applications")
            .select("id")
            .eq("applicant_id", user.id)
            .eq("job_description_id", jobId)
            .maybeSingle();

          if (applicationData) {
            setHasApplied(true);
          }
        } catch {
          // Graceful degradation: if status fetch fails, default to not_applied (idle state)
        }

        // Fetch adjacent jobs for prev/next navigation
        // Get all published jobs sorted by match percentage (same as listings page)
        const { data: allJobs } = await supabase
          .from("job_descriptions")
          .select("id")
          .eq("status", "published")
          .order("created_at", { ascending: false });

        if (allJobs && allJobs.length > 1) {
          // Get match results to sort by match percentage
          const { data: allMatches } = await supabase
            .from("match_results")
            .select("job_description_id, match_percentage")
            .eq("applicant_id", user.id);

          const matchMap = new Map<string, number>();
          if (allMatches) {
            for (const m of allMatches) {
              matchMap.set(m.job_description_id, m.match_percentage);
            }
          }

          // Sort jobs by match percentage descending (same as listings page)
          const sortedJobs = [...allJobs].sort((a, b) => {
            const aMatch = matchMap.get(a.id) ?? -1;
            const bMatch = matchMap.get(b.id) ?? -1;
            return bMatch - aMatch;
          });

          const currentIndex = sortedJobs.findIndex((j) => j.id === jobId);
          if (currentIndex !== -1) {
            setAdjacentJobs({
              prevId: currentIndex > 0 ? sortedJobs[currentIndex - 1].id : null,
              nextId:
                currentIndex < sortedJobs.length - 1
                  ? sortedJobs[currentIndex + 1].id
                  : null,
            });
          }
        }

        // Fetch recommendations
        await fetchRecommendations(user.id, jobId);
      } catch {
        setError("An unexpected error occurred while loading job details.");
      } finally {
        setLoading(false);
      }
    }

    fetchJobDetail();
  }, [jobId, fetchRecommendations]);

  if (loading) {
    return (
      <article aria-label="Job detail">
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-2 text-gray-500">
            <svg
              className="h-5 w-5 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span>Loading job details...</span>
          </div>
        </div>
      </article>
    );
  }

  if (error) {
    return (
      <article aria-label="Job detail">
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
        <div className="mt-4">
          <Link
            href="/applicant/jobs"
            className="text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            ← Back to Job Listings
          </Link>
        </div>
      </article>
    );
  }

  if (!job) {
    return null;
  }

  const requiredSkillsList = requiredSkills.filter(
    (s) => s.importance === "required"
  );
  const preferredSkillsList = requiredSkills.filter(
    (s) => s.importance === "preferred"
  );

  return (
    <article aria-label="Job detail">
      {/* Navigation: Prev/Next + Back to Listings */}
      <nav
        className="mb-6 flex items-center justify-between"
        aria-label="Job navigation"
      >
        <Link
          href="/applicant/jobs"
          className="text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          ← Back to Job Listings
        </Link>

        <div className="flex items-center gap-3">
          {adjacentJobs.prevId ? (
            <Link
              href={`/applicant/jobs/${adjacentJobs.prevId}`}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              aria-label="Previous job"
            >
              ← Prev
            </Link>
          ) : (
            <span
              className="inline-flex items-center rounded-md border border-gray-200 bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-400"
              aria-disabled="true"
            >
              ← Prev
            </span>
          )}

          {adjacentJobs.nextId ? (
            <Link
              href={`/applicant/jobs/${adjacentJobs.nextId}`}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              aria-label="Next job"
            >
              Next →
            </Link>
          ) : (
            <span
              className="inline-flex items-center rounded-md border border-gray-200 bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-400"
              aria-disabled="true"
            >
              Next →
            </span>
          )}
        </div>
      </nav>

      {/* Job Header with Match Percentage */}
      <header className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{job.title}</h1>
              <ApplicationStatusBadge applied={hasApplied} />
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Posted {new Date(job.created_at).toLocaleDateString()}
            </p>
          </div>
          <div className="ml-4 flex flex-col items-end gap-3">
            <div className="flex flex-col items-end">
              <span className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                Your Match
              </span>
              {matchResult ? (
                <MatchPercentageBadge percentage={matchResult.match_percentage} />
              ) : (
                <span className="text-sm text-gray-400">Not calculated</span>
              )}
            </div>
            <ApplyButton
              jobId={jobId}
              initialStatus={hasApplied ? "applied" : "not_applied"}
              jobStatus={job.status}
              onApplicationSuccess={() => setHasApplied(true)}
            />
          </div>
        </div>
      </header>

      {/* Job Description */}
      <section className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">
          Description
        </h2>
        <p className="whitespace-pre-wrap text-gray-700">{job.description}</p>
      </section>

      {/* Required Skills */}
      {requiredSkillsList.length > 0 && (
        <section className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">
            Required Skills
          </h2>
          <ul className="flex flex-wrap gap-2" role="list">
            {requiredSkillsList.map((skill) => {
              const isMatched = matchResult?.matched_skills?.includes(
                skill.skill_name
              );
              return (
                <li
                  key={skill.id}
                  className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                    isMatched
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {skill.skill_name}
                  {isMatched && (
                    <svg
                      className="ml-1 h-4 w-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      aria-label="Matched"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Preferred Skills */}
      {preferredSkillsList.length > 0 && (
        <section className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">
            Preferred Skills
          </h2>
          <ul className="flex flex-wrap gap-2" role="list">
            {preferredSkillsList.map((skill) => {
              const isMatched = matchResult?.matched_skills?.includes(
                skill.skill_name
              );
              return (
                <li
                  key={skill.id}
                  className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                    isMatched
                      ? "bg-green-100 text-green-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {skill.skill_name}
                  {isMatched && (
                    <svg
                      className="ml-1 h-4 w-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      aria-label="Matched"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Qualifications */}
      {job.qualifications && (
        <section className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">
            Qualifications
          </h2>
          <p className="whitespace-pre-wrap text-gray-700">
            {job.qualifications}
          </p>
        </section>
      )}

      {/* AI Recommendations */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <RecommendationsList
          recommendations={recommendations}
          matchPercentage={matchResult?.match_percentage ?? null}
          loading={recommendationsLoading}
          error={recommendationsError}
        />
      </div>

      {/* Bottom Navigation */}
      <nav
        className="mt-6 flex items-center justify-between"
        aria-label="Job pagination"
      >
        {adjacentJobs.prevId ? (
          <Link
            href={`/applicant/jobs/${adjacentJobs.prevId}`}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            ← Previous Job
          </Link>
        ) : (
          <div />
        )}

        {adjacentJobs.nextId ? (
          <Link
            href={`/applicant/jobs/${adjacentJobs.nextId}`}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Next Job →
          </Link>
        ) : (
          <div />
        )}
      </nav>
    </article>
  );
}
