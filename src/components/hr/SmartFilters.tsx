"use client";

import { useState, useCallback, useMemo } from "react";

// ============================================================================
// Types
// ============================================================================

/**
 * Represents a candidate with all data needed for smart filtering.
 * This is the expected shape of items passed to the SmartFilters component.
 */
export interface SmartFilterCandidate {
  applicantId: string;
  name: string;
  /** Current match percentage for the selected job (0-100) */
  matchPercentage: number;
  /** Number of skills added in the last 30 days */
  recentSkillsCount: number;
  /** Total years of work experience */
  totalYearsExperience: number;
  /** Year the applicant graduated (e.g., 2023) */
  graduationYear: number | null;
  /** Whether the applicant has at least one certification */
  hasCertifications: boolean;
}

/**
 * The available smart filter types.
 */
export type SmartFilterType =
  | "top-matches"
  | "fast-learners"
  | "industry-veterans"
  | "recent-grads"
  | "certified";

/**
 * Configuration for a single smart filter button.
 */
interface SmartFilterConfig {
  id: SmartFilterType;
  label: string;
  emoji: string;
  description: string;
}

// ============================================================================
// Filter definitions
// ============================================================================

const SMART_FILTERS: SmartFilterConfig[] = [
  {
    id: "top-matches",
    label: "90%+ Matches",
    emoji: "🏆",
    description: "Applicants with a match score of 90% or higher",
  },
  {
    id: "fast-learners",
    label: "Fast Learners",
    emoji: "🚀",
    description: "Applicants who added 3+ skills in the last 30 days",
  },
  {
    id: "industry-veterans",
    label: "Industry Veterans",
    emoji: "💼",
    description: "Applicants with 5+ years of work experience",
  },
  {
    id: "recent-grads",
    label: "Recent Grads",
    emoji: "🎓",
    description: "Applicants who graduated within the last 2 years",
  },
  {
    id: "certified",
    label: "Certified",
    emoji: "🏅",
    description: "Applicants with at least one certification",
  },
];

// ============================================================================
// Filter logic
// ============================================================================

/**
 * Applies a single smart filter predicate to a candidate.
 * Returns true if the candidate passes the filter.
 */
export function applySmartFilter(
  candidate: SmartFilterCandidate,
  filter: SmartFilterType
): boolean {
  switch (filter) {
    case "top-matches":
      return candidate.matchPercentage >= 90;
    case "fast-learners":
      return candidate.recentSkillsCount >= 3;
    case "industry-veterans":
      return candidate.totalYearsExperience >= 5;
    case "recent-grads": {
      if (candidate.graduationYear === null) return false;
      const currentYear = new Date().getFullYear();
      return currentYear - candidate.graduationYear <= 2;
    }
    case "certified":
      return candidate.hasCertifications;
    default:
      return true;
  }
}

/**
 * Applies all active smart filters to a list of candidates.
 * Multiple filters are combined with AND logic — a candidate must
 * satisfy ALL active filters to be included.
 */
export function filterCandidates(
  candidates: SmartFilterCandidate[],
  activeFilters: Set<SmartFilterType>
): SmartFilterCandidate[] {
  if (activeFilters.size === 0) return candidates;

  return candidates.filter((candidate) =>
    [...activeFilters].every((filter) => applySmartFilter(candidate, filter))
  );
}

// ============================================================================
// Component Props
// ============================================================================

interface SmartFiltersProps {
  /** The list of candidates to filter */
  candidates: SmartFilterCandidate[];
  /** Callback invoked with the filtered candidate list whenever filters change */
  onFilterChange: (filtered: SmartFilterCandidate[]) => void;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Smart Filters component for the HR Dashboard.
 *
 * Displays pre-built filter buttons that allow HR users to instantly surface
 * the right candidates without manual screening. Filters are applied
 * client-side for immediate response without a full page reload.
 *
 * Supports combining multiple smart filters simultaneously (AND logic).
 *
 * Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7
 */
export default function SmartFilters({ candidates, onFilterChange }: SmartFiltersProps) {
  const [activeFilters, setActiveFilters] = useState<Set<SmartFilterType>>(new Set());

  // Toggle a filter on/off and immediately apply filtering
  const handleFilterToggle = useCallback(
    (filterId: SmartFilterType) => {
      setActiveFilters((prev) => {
        const next = new Set(prev);
        if (next.has(filterId)) {
          next.delete(filterId);
        } else {
          next.add(filterId);
        }

        // Apply filters immediately (Requirement 17.6)
        const filtered = filterCandidates(candidates, next);
        onFilterChange(filtered);

        return next;
      });
    },
    [candidates, onFilterChange]
  );

  // Clear all active filters
  const handleClearAll = useCallback(() => {
    setActiveFilters(new Set());
    onFilterChange(candidates);
  }, [candidates, onFilterChange]);

  // Compute counts for each filter to show how many candidates match
  const filterCounts = useMemo(() => {
    const counts: Record<SmartFilterType, number> = {
      "top-matches": 0,
      "fast-learners": 0,
      "industry-veterans": 0,
      "recent-grads": 0,
      "certified": 0,
    };

    for (const candidate of candidates) {
      for (const filter of SMART_FILTERS) {
        if (applySmartFilter(candidate, filter.id)) {
          counts[filter.id]++;
        }
      }
    }

    return counts;
  }, [candidates]);

  // Compute filtered count for display
  const filteredCount = useMemo(() => {
    return filterCandidates(candidates, activeFilters).length;
  }, [candidates, activeFilters]);

  return (
    <section aria-label="Smart filters" className="mb-6">
      <div className="flex flex-wrap items-center gap-2">
        {/* Filter buttons */}
        {SMART_FILTERS.map((filter) => {
          const isActive = activeFilters.has(filter.id);
          const count = filterCounts[filter.id];

          return (
            <button
              key={filter.id}
              type="button"
              onClick={() => handleFilterToggle(filter.id)}
              className={`
                inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium
                transition-all duration-150 ease-in-out
                ${
                  isActive
                    ? "bg-blue-600 text-white shadow-sm ring-2 ring-blue-600 ring-offset-1"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900"
                }
              `}
              aria-pressed={isActive}
              aria-label={`${filter.emoji} ${filter.label}: ${filter.description}. ${count} candidates match.`}
              title={filter.description}
            >
              <span aria-hidden="true">{filter.emoji}</span>
              <span>{filter.label}</span>
              <span
                className={`
                  ml-1 inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-semibold
                  ${isActive ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-600"}
                `}
              >
                {count}
              </span>
            </button>
          );
        })}

        {/* Clear all button — shown only when at least one filter is active */}
        {activeFilters.size > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            className="ml-2 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Clear all smart filters"
          >
            ✕ Clear
          </button>
        )}
      </div>

      {/* Active filter summary */}
      {activeFilters.size > 0 && (
        <p className="mt-2 text-sm text-gray-500" aria-live="polite">
          Showing {filteredCount} of {candidates.length} candidates
        </p>
      )}
    </section>
  );
}
