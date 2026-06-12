"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import LoadingSpinner from "@/components/shared/LoadingSpinner";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRankings() {
      setLoading(true);
      setError(null);

      try {
        const supabase = createClient();

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

        if (!matchResults || matchResults.length === 0) {
          setRankedApplicants([]);
          setLoading(false);
          return;
        }

        // Fetch applicant profiles (names) for all matched applicants
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

        // Build a map of applicant ID -> name
        const profileMap = new Map<string, string>();
        if (profiles) {
          for (const profile of profiles) {
            profileMap.set(profile.id, profile.name);
          }
        }

        // Build entries for ranking computation
        const entries: ApplicantMatchEntry[] = matchResults.map((m) => ({
          applicantId: m.applicant_id,
          name: profileMap.get(m.applicant_id) ?? "Unknown Applicant",
          matchPercentage: m.match_percentage,
        }));

        // Compute ranked list with tie-handling
        const ranked = computeRanks(entries);
        setRankedApplicants(ranked);
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

  if (rankedApplicants.length === 0) {
    return (
      <section aria-label="Applicant rankings" className="p-4">
        <p className="text-gray-500">No applicants have been matched to this job yet.</p>
      </section>
    );
  }

  return (
    <section aria-label="Applicant rankings" className="p-4">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-gray-200 text-left">
            <th className="py-3 px-4 font-semibold text-gray-700">Rank</th>
            <th className="py-3 px-4 font-semibold text-gray-700">Applicant</th>
            <th className="py-3 px-4 font-semibold text-gray-700 text-right">Match %</th>
          </tr>
        </thead>
        <tbody>
          {rankedApplicants.map((applicant) => (
            <tr
              key={applicant.applicantId}
              className="border-b border-gray-100 hover:bg-gray-50"
            >
              <td className="py-3 px-4 font-medium text-gray-900">
                #{applicant.rank}
              </td>
              <td className="py-3 px-4 text-gray-800">
                {applicant.name}
              </td>
              <td className="py-3 px-4 text-right font-medium text-gray-900">
                {applicant.matchPercentage}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
