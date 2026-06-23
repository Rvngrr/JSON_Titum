"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import Pagination, { usePagination } from "@/components/shared/Pagination";

/**
 * Represents a ranked applicant entry for display in the rankings table.
 */
export interface RankedApplicant {
  /** Competition rank position (ties share the same rank, next rank skips) */
  rank: number;
  /** Applicant display name */
  name: string;
  /** Match percentage for the job (0-100) */
  matchPercentage: number;
  /** Applicant's user ID */
  applicantId: string;
}

/**
 * Represents an applicant who applied but has no match_result yet.
 */
export interface PendingApplicant {
  /** Applicant display name */
  name: string;
  /** Applicant's user ID */
  applicantId: string;
}

/**
 * Input entry for the computeRanks function.
 */
export interface ApplicantMatchEntry {
  applicantId: string;
  name: string;
  matchPercentage: number;
}

/**
 * Computes ranked applicant list with tie-handling using standard competition ranking.
 *
 * - Sorts by match_percentage descending
 * - For equal match_percentage, sorts alphabetically by name (ascending, case-insensitive)
 * - Assigns same rank to applicants with equal match_percentage
 * - After a tie group of size N at rank R, the next rank is R + N (standard competition ranking)
 *   e.g., 1, 1, 3, 4, 4, 6...
 */
export function computeRanks(entries: ApplicantMatchEntry[]): RankedApplicant[] {
  // Sort: primary by matchPercentage descending, secondary by name ascending (case-insensitive)
  const sorted = [...entries].sort((a, b) => {
    if (b.matchPercentage !== a.matchPercentage) {
      return b.matchPercentage - a.matchPercentage;
    }
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });

  // Assign ranks using standard competition ranking
  const ranked: RankedApplicant[] = [];
  for (let i = 0; i < sorted.length; i++) {
    let rank: number;
    if (i === 0) {
      rank = 1;
    } else if (sorted[i].matchPercentage === sorted[i - 1].matchPercentage) {
      // Same percentage as previous — assign same rank
      rank = ranked[i - 1].rank;
    } else {
      // Different percentage — rank is position + 1 (1-indexed)
      rank = i + 1;
    }

    ranked.push({
      rank,
      name: sorted[i].name,
      matchPercentage: sorted[i].matchPercentage,
      applicantId: sorted[i].applicantId,
    });
  }

  return ranked;
}

interface ApplicantRankingsProps {
  /** The job description ID to show rankings for */
  jobId: string;
}

export default function ApplicantRankings({ jobId }: ApplicantRankingsProps) {
  const [rankedApplicants, setRankedApplicants] = useState<RankedApplicant[]>([]);
  const [pendingApplicants, setPendingApplicants] = useState<PendingApplicant[]>([]);
  const [totalApplications, setTotalApplications] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [fallbackMode, setFallbackMode] = useState(false);

  // Combine ranked + pending for pagination
  const allApplicants = [
    ...rankedApplicants.map((a) => ({ ...a, type: "ranked" as const })),
    ...pendingApplicants.map((a) => ({ ...a, type: "pending" as const })),
  ];
  const {
    currentPage,
    setCurrentPage,
    paginatedItems: paginatedAllApplicants,
    totalItems: totalRankingItems,
    pageSize: rankingPageSize,
  } = usePagination(allApplicants, 10);

  const paginatedRanked = paginatedAllApplicants.filter((a) => a.type === "ranked") as (RankedApplicant & { type: "ranked" })[];
  const paginatedPending = paginatedAllApplicants.filter((a) => a.type === "pending") as (PendingApplicant & { type: "pending" })[];

  useEffect(() => {
    async function fetchRankings() {
      setLoading(true);
      setError(null);
      setWarning(null);
      setFallbackMode(false);

      try {
        const supabase = createClient();

        // Fetch applications for this job
        const { data: applications, error: appError } = await supabase
          .from("applications")
          .select("applicant_id")
          .eq("job_description_id", jobId);

        // If the applications table doesn't exist, fall back to showing all matched applicants
        const applicationsUnavailable =
          appError &&
          (appError.message.includes("relation") ||
            appError.message.includes("does not exist"));

        if (applicationsUnavailable) {
          // Fallback: show ALL matched applicants (pre-application-system behavior)
          setFallbackMode(true);
          setWarning(
            "The applications table has not been created yet. Showing all matched applicants. Please run the database migration to enable application tracking."
          );

          // Fetch all match results for this job
          const { data: matchResults, error: matchError } = await supabase
            .from("match_results")
            .select("applicant_id, match_percentage")
            .eq("job_description_id", jobId);

          if (matchError) {
            setError("Failed to load match results.");
            setLoading(false);
            return;
          }

          if (!matchResults || matchResults.length === 0) {
            setRankedApplicants([]);
            setPendingApplicants([]);
            setTotalApplications(0);
            setLoading(false);
            return;
          }

          // Fetch profiles for all matched applicants
          const applicantIds = matchResults.map((m) => m.applicant_id);
          const { data: profiles, error: profileError } = await supabase
            .from("profiles")
            .select("id, name")
            .in("id", applicantIds);

          if (profileError) {
            setError("Failed to load applicant profiles.");
            setLoading(false);
            return;
          }

          const profileMap = new Map<string, string>();
          if (profiles) {
            for (const profile of profiles) {
              profileMap.set(profile.id, profile.name);
            }
          }

          const entries: ApplicantMatchEntry[] = matchResults.map((m) => ({
            applicantId: m.applicant_id,
            name: profileMap.get(m.applicant_id) ?? "Unknown Applicant",
            matchPercentage: m.match_percentage,
          }));

          const ranked = computeRanks(entries);
          setRankedApplicants(ranked);
          setPendingApplicants([]);
          setTotalApplications(0);
          setLoading(false);
          return;
        }

        if (appError) {
          setError("Failed to load applications.");
          setLoading(false);
          return;
        }

        const applicationCount = applications?.length ?? 0;
        setTotalApplications(applicationCount);

        // If no applications, show empty state
        if (applicationCount === 0) {
          setRankedApplicants([]);
          setPendingApplicants([]);
          setLoading(false);
          return;
        }

        // Build a Set of applicant IDs who have applied
        const appliedIds = new Set(applications.map((a) => a.applicant_id));

        // Fetch match results for this job
        const { data: matchResults, error: matchError } = await supabase
          .from("match_results")
          .select("applicant_id, match_percentage")
          .eq("job_description_id", jobId);

        if (matchError) {
          setError("Failed to load match results.");
          setLoading(false);
          return;
        }

        // Filter match results to only include applicants who have applied
        const appliedMatchResults = (matchResults ?? []).filter((m) =>
          appliedIds.has(m.applicant_id)
        );

        // Identify applicants who applied but have NO match result (pending)
        const matchedApplicantIds = new Set(
          appliedMatchResults.map((m) => m.applicant_id)
        );
        const pendingApplicantIds = [...appliedIds].filter(
          (id) => !matchedApplicantIds.has(id)
        );

        // Gather all applicant IDs that need profile info
        const allApplicantIds = [...appliedIds];

        // Fetch applicant profiles (names) for all applied applicants
        const { data: profiles, error: profileError } = await supabase
          .from("profiles")
          .select("id, name")
          .in("id", allApplicantIds);

        if (profileError) {
          setError("Failed to load applicant profiles.");
          setLoading(false);
          return;
        }

        // Build a map of applicant ID -> name
        const profileMap = new Map<string, string>();
        if (profiles) {
          for (const profile of profiles) {
            profileMap.set(profile.id, profile.name);
          }
        }

        // Build entries for ranking computation (scored applicants only)
        const entries: ApplicantMatchEntry[] = appliedMatchResults.map((m) => ({
          applicantId: m.applicant_id,
          name: profileMap.get(m.applicant_id) ?? "Unknown Applicant",
          matchPercentage: m.match_percentage,
        }));

        // Compute ranked list with tie-handling
        const ranked = computeRanks(entries);
        setRankedApplicants(ranked);

        // Build pending applicants list (sorted alphabetically by name)
        const pending: PendingApplicant[] = pendingApplicantIds.map((id) => ({
          applicantId: id,
          name: profileMap.get(id) ?? "Unknown Applicant",
        }));
        pending.sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
        );
        setPendingApplicants(pending);
      } catch {
        setError("An unexpected error occurred while loading rankings.");
      } finally {
        setLoading(false);
      }
    }

    if (jobId) {
      fetchRankings();
    }
  }, [jobId]);

  if (loading) {
    return (
      <section aria-label="Applicant rankings" className="flex justify-center p-4 py-12">
        <LoadingSpinner />
      </section>
    );
  }

  if (error) {
    return (
      <section aria-label="Applicant rankings" className="p-4">
        <p className="text-red-600" role="alert">{error}</p>
      </section>
    );
  }

  if (!fallbackMode && totalApplications === 0) {
    return (
      <section aria-label="Applicant rankings" className="p-4">
        <p className="text-gray-500">No applications have been received for this job yet.</p>
      </section>
    );
  }

  if (fallbackMode && rankedApplicants.length === 0) {
    return (
      <section aria-label="Applicant rankings" className="p-4">
        {warning && (
          <div className="mb-4 rounded border border-yellow-300 bg-yellow-50 p-3" role="alert">
            <p className="text-sm text-yellow-800">{warning}</p>
          </div>
        )}
        <p className="text-gray-500">No matched applicants found for this job yet.</p>
      </section>
    );
  }

  return (
    <section aria-label="Applicant rankings" className="p-4">
      {warning && (
        <div className="mb-4 rounded border border-yellow-300 bg-yellow-50 p-3" role="alert">
          <p className="text-sm text-yellow-800">{warning}</p>
        </div>
      )}
      {!fallbackMode && (
        <p className="mb-4 text-sm text-gray-600">
          {totalApplications} {totalApplications === 1 ? "application" : "applications"} received
        </p>
      )}
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-gray-200 text-left">
            <th className="py-3 px-4 font-semibold text-gray-700">Rank</th>
            <th className="py-3 px-4 font-semibold text-gray-700">Applicant</th>
            <th className="py-3 px-4 font-semibold text-gray-700 text-right">Match %</th>
          </tr>
        </thead>
        <tbody>
          {paginatedRanked.map((applicant) => (
            <tr
              key={applicant.applicantId}
              className="border-b border-gray-100 hover:bg-gray-50"
            >
              <td className="py-3 px-4 font-medium text-gray-900">
                #{applicant.rank}
              </td>
              <td className="py-3 px-4 text-gray-800">
                {applicant.name}
                <ViewResumeButton applicantId={applicant.applicantId} />
              </td>
              <td className="py-3 px-4 text-right font-medium text-gray-900">
                {applicant.matchPercentage}%
              </td>
            </tr>
          ))}
          {paginatedPending.map((applicant) => (
            <tr
              key={applicant.applicantId}
              className="border-b border-gray-100 hover:bg-gray-50"
            >
              <td className="py-3 px-4 font-medium text-gray-400">
                —
              </td>
              <td className="py-3 px-4 text-gray-800">
                {applicant.name}
                <ViewResumeButton applicantId={applicant.applicantId} />
              </td>
              <td className="py-3 px-4 text-right">
                <span className="inline-block rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                  Pending
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalItems={totalRankingItems}
        pageSize={rankingPageSize}
        onPageChange={setCurrentPage}
        className="mt-4"
      />
    </section>
  );
}

/**
 * Button that opens an applicant's resume PDF via the server-side view API.
 * Uses /api/resume/view which generates a signed URL securely.
 */
function ViewResumeButton({ applicantId }: { applicantId: string }) {
  const [loading, setLoading] = useState(false);

  async function handleViewResume(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);

    try {
      const response = await fetch(`/api/resume/view?applicant_id=${applicantId}`);
      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Unable to load resume.");
        return;
      }

      if (data.url) {
        window.open(data.url, "_blank");
      }
    } catch {
      alert("Failed to load resume.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleViewResume}
      disabled={loading}
      className="ml-2 inline-flex items-center rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
    >
      {loading ? "..." : "View Resume"}
    </button>
  );
}
