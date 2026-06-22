"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import LoadingSpinner from "@/components/shared/LoadingSpinner";

// ============================================================================
// Types
// ============================================================================

interface PipelineHealthEntry {
  jobId: string;
  jobTitle: string;
  tiers: {
    topTier: number;
    goodFit: number;
    potential: number;
    gap: number;
  };
  totalApplicants: number;
}

type TierKey = "topTier" | "goodFit" | "potential" | "gap";

interface TierConfig {
  key: TierKey;
  label: string;
  emoji: string;
  range: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  hoverBg: string;
  minMatch: number;
  maxMatch: number;
}

// ============================================================================
// Constants
// ============================================================================

const TIER_CONFIGS: TierConfig[] = [
  {
    key: "topTier",
    label: "Top Tier",
    emoji: "🟢",
    range: "90%+",
    bgColor: "bg-green-500/10",
    textColor: "text-green-400",
    borderColor: "border-green-500/30",
    hoverBg: "hover:bg-green-500/20",
    minMatch: 90,
    maxMatch: 100,
  },
  {
    key: "goodFit",
    label: "Good Fit",
    emoji: "🟡",
    range: "75-89%",
    bgColor: "bg-yellow-500/10",
    textColor: "text-yellow-400",
    borderColor: "border-yellow-500/30",
    hoverBg: "hover:bg-yellow-500/20",
    minMatch: 75,
    maxMatch: 89,
  },
  {
    key: "potential",
    label: "Potential",
    emoji: "🟠",
    range: "60-74%",
    bgColor: "bg-orange-500/10",
    textColor: "text-orange-400",
    borderColor: "border-orange-500/30",
    hoverBg: "hover:bg-orange-500/20",
    minMatch: 60,
    maxMatch: 74,
  },
  {
    key: "gap",
    label: "Gap",
    emoji: "🔴",
    range: "<60%",
    bgColor: "bg-red-500/10",
    textColor: "text-red-400",
    borderColor: "border-red-500/30",
    hoverBg: "hover:bg-red-500/20",
    minMatch: 0,
    maxMatch: 59,
  },
];

// ============================================================================
// Tier classification (mirrors pipeline-health.ts logic for client-side use)
// ============================================================================

function classifyMatchPercentage(matchPercentage: number): TierKey {
  const clamped = Math.max(0, Math.min(100, matchPercentage));
  if (clamped >= 90) return "topTier";
  if (clamped >= 75) return "goodFit";
  if (clamped >= 60) return "potential";
  return "gap";
}

// ============================================================================
// Component
// ============================================================================

export default function PipelineHealthDashboard() {
  const [healthData, setHealthData] = useState<PipelineHealthEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchPipelineHealth() {
      setLoading(true);
      setError(null);

      try {
        const supabase = createClient();

        // Fetch all published jobs
        const { data: jobs, error: jobsError } = await supabase
          .from("job_descriptions")
          .select("id, title")
          .eq("status", "published")
          .order("created_at", { ascending: false });

        if (jobsError) {
          setError("Failed to load published jobs.");
          setLoading(false);
          return;
        }

        if (!jobs || jobs.length === 0) {
          setHealthData([]);
          setLoading(false);
          return;
        }

        const jobIds = jobs.map((j) => j.id);

        // Fetch all match results for published jobs in one query
        const { data: matchResults, error: matchError } = await supabase
          .from("match_results")
          .select("job_description_id, match_percentage")
          .in("job_description_id", jobIds);

        if (matchError) {
          setError("Failed to load match results.");
          setLoading(false);
          return;
        }

        // Group match results by job
        const matchesByJob = new Map<string, number[]>();
        for (const result of matchResults ?? []) {
          const existing = matchesByJob.get(result.job_description_id) ?? [];
          existing.push(result.match_percentage);
          matchesByJob.set(result.job_description_id, existing);
        }

        // Build health entries for each published job
        const entries: PipelineHealthEntry[] = jobs.map((job) => {
          const percentages = matchesByJob.get(job.id) ?? [];
          const tiers = { topTier: 0, goodFit: 0, potential: 0, gap: 0 };

          for (const pct of percentages) {
            const tier = classifyMatchPercentage(pct);
            tiers[tier]++;
          }

          return {
            jobId: job.id,
            jobTitle: job.title,
            tiers,
            totalApplicants: percentages.length,
          };
        });

        setHealthData(entries);
      } catch {
        setError("An unexpected error occurred while loading pipeline health data.");
      } finally {
        setLoading(false);
      }
    }

    fetchPipelineHealth();
  }, []);

  /**
   * Navigate to the rankings page with pre-selected job and tier filter.
   * Uses query params so the rankings page can filter applicants by tier.
   */
  const handleTierClick = (jobId: string, tierKey: TierKey) => {
    const tierConfig = TIER_CONFIGS.find((t) => t.key === tierKey);
    if (!tierConfig) return;

    router.push(
      `/hr/rankings?jobId=${jobId}&minMatch=${tierConfig.minMatch}&maxMatch=${tierConfig.maxMatch}`
    );
  };

  // Loading state
  if (loading) {
    return (
      <section aria-label="Pipeline health dashboard" className="flex justify-center py-8">
        <LoadingSpinner />
      </section>
    );
  }

  // Error state
  if (error) {
    return (
      <section aria-label="Pipeline health dashboard">
        <p className="text-[var(--error-text)]" role="alert">
          {error}
        </p>
      </section>
    );
  }

  // Empty state
  if (healthData.length === 0) {
    return (
      <section aria-label="Pipeline health dashboard">
        <p className="text-[var(--text-muted)]">
          No published jobs yet. Publish a job to see pipeline health data.
        </p>
      </section>
    );
  }

  return (
    <section aria-label="Pipeline health dashboard" className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {healthData.map((entry) => (
          <article
            key={entry.jobId}
            className="rounded-xl border border-[var(--border-input)] bg-[var(--bg-card-solid)] p-4 shadow-sm"
            aria-label={`Pipeline health for ${entry.jobTitle}`}
          >
            {/* Job title and total applicants */}
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate" title={entry.jobTitle}>
                {entry.jobTitle}
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {entry.totalApplicants} applicant{entry.totalApplicants !== 1 ? "s" : ""}
              </p>
            </div>

            {/* Tier counts */}
            <div className="grid grid-cols-4 gap-2">
              {TIER_CONFIGS.map((tier) => {
                const count = entry.tiers[tier.key];
                return (
                  <button
                    key={tier.key}
                    type="button"
                    onClick={() => handleTierClick(entry.jobId, tier.key)}
                    className={`flex flex-col items-center rounded-md border p-2 transition-colors cursor-pointer ${tier.bgColor} ${tier.borderColor} ${tier.hoverBg}`}
                    aria-label={`${count} ${tier.label} applicants (${tier.range}) for ${entry.jobTitle}. Click to view.`}
                    title={`${tier.emoji} ${tier.label} (${tier.range}): ${count} applicant${count !== 1 ? "s" : ""}`}
                  >
                    <span className="text-base" aria-hidden="true">
                      {tier.emoji}
                    </span>
                    <span className={`text-lg font-bold ${tier.textColor}`}>
                      {count}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)] leading-tight text-center">
                      {tier.range}
                    </span>
                  </button>
                );
              })}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
