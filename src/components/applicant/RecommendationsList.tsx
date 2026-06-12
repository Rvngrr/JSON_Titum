"use client";

import type { Recommendation } from "@/types";

interface RecommendationsListProps {
  recommendations: Recommendation[];
  matchPercentage: number | null;
  loading: boolean;
  error: string | null;
}

export default function RecommendationsList({
  recommendations,
  matchPercentage,
  loading,
  error,
}: RecommendationsListProps) {
  if (loading) {
    return (
      <section aria-label="AI recommendations">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">
          AI Improvement Suggestions
        </h2>
        <div className="flex items-center justify-center rounded-lg border border-gray-200 bg-white p-6">
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
            <span>Generating recommendations...</span>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section aria-label="AI recommendations">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">
          AI Improvement Suggestions
        </h2>
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </section>
    );
  }

  // Show "fully matched" message when match is 100%
  if (matchPercentage === 100) {
    return (
      <section aria-label="AI recommendations">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">
          AI Improvement Suggestions
        </h2>
        <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center">
          <div className="mb-2 text-2xl">🎉</div>
          <p className="font-medium text-green-800">
            Your profile fully matches the job requirements!
          </p>
          <p className="mt-1 text-sm text-green-600">
            No additional skills are needed for this position.
          </p>
        </div>
      </section>
    );
  }

  if (recommendations.length === 0) {
    return (
      <section aria-label="AI recommendations">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">
          AI Improvement Suggestions
        </h2>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
          <p className="text-sm text-gray-600">
            No recommendations available yet.
          </p>
        </div>
      </section>
    );
  }

  // Sort by impact score descending
  const sorted = [...recommendations].sort(
    (a, b) => b.impact_score - a.impact_score
  );

  const skillsToAdd = sorted.filter((r) => r.suggestion_type === "skill_to_add");
  const skillsToImprove = sorted.filter(
    (r) => r.suggestion_type === "skill_to_improve"
  );

  return (
    <section aria-label="AI recommendations">
      <h2 className="mb-4 text-xl font-semibold text-gray-900">
        AI Improvement Suggestions
      </h2>

      <div className="space-y-6">
        {/* Skills to Add */}
        {skillsToAdd.length > 0 && (
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-orange-700">
              Skills to Add
            </h3>
            <ul className="space-y-3" role="list" aria-label="Skills to add">
              {skillsToAdd.map((rec) => (
                <li
                  key={rec.id}
                  className="rounded-lg border border-orange-100 bg-orange-50 p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {rec.skill_name}
                      </p>
                      <p className="mt-1 text-sm text-gray-600">
                        {rec.description}
                      </p>
                    </div>
                    <span
                      className="ml-3 inline-flex items-center rounded-full bg-orange-200 px-2.5 py-0.5 text-xs font-medium text-orange-800"
                      aria-label={`Impact score: ${rec.impact_score} out of 10`}
                    >
                      Impact: {rec.impact_score}/10
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Skills to Improve */}
        {skillsToImprove.length > 0 && (
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-blue-700">
              Skills to Improve
            </h3>
            <ul className="space-y-3" role="list" aria-label="Skills to improve">
              {skillsToImprove.map((rec) => (
                <li
                  key={rec.id}
                  className="rounded-lg border border-blue-100 bg-blue-50 p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {rec.skill_name}
                      </p>
                      <p className="mt-1 text-sm text-gray-600">
                        {rec.description}
                      </p>
                    </div>
                    <span
                      className="ml-3 inline-flex items-center rounded-full bg-blue-200 px-2.5 py-0.5 text-xs font-medium text-blue-800"
                      aria-label={`Impact score: ${rec.impact_score} out of 10`}
                    >
                      Impact: {rec.impact_score}/10
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
