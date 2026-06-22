"use client";

import { useEffect, useState, useCallback } from "react";
import LoadingSpinner from "@/components/shared/LoadingSpinner";

// ============================================================================
// Types
// ============================================================================

interface AnalyticsData {
  totalActiveListings: number;
  totalApplicants: number;
  averageMatchScore: number;
  topSkillsInDemand: Array<{ skill: string; count: number }>;
  applicantGrowthTrend: Array<{ month: string; count: number }>;
  skillGapAnalysis: Array<{
    skill: string;
    demandCount: number;
    supplyCount: number;
    gapRatio: number;
  }>;
  conversionRate: { applied: number; total: number; rate: number };
}

// ============================================================================
// Constants
// ============================================================================

const REFRESH_INTERVAL_MS = 30_000; // Refresh every 30 seconds for real-time feel

// ============================================================================
// Component
// ============================================================================

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const fetchAnalytics = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/analytics");
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || `Failed to fetch analytics (${response.status})`);
      }
      const json = await response.json();
      if (json.success) {
        setData(json.data);
      } else {
        throw new Error(json.error || "Unknown error fetching analytics.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch and periodic refresh for real-time updates
  useEffect(() => {
    fetchAnalytics(true);

    const interval = setInterval(() => {
      fetchAnalytics(false);
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [fetchAnalytics]);

  const handleCSVExport = async () => {
    setExporting(true);
    try {
      const response = await fetch("/api/analytics?format=csv");
      if (!response.ok) {
        throw new Error("Failed to export CSV.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "analytics-export.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setError("Failed to export analytics as CSV.");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12" aria-label="Loading analytics">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4" role="alert" aria-live="assertive">
        <p className="text-sm text-red-700">{error}</p>
        <button
          type="button"
          onClick={() => fetchAnalytics(true)}
          className="mt-2 text-sm font-medium text-red-600 underline hover:text-red-800"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const maxSkillCount =
    data.topSkillsInDemand.length > 0
      ? Math.max(...data.topSkillsInDemand.map((s) => s.count))
      : 1;

  const maxGrowthCount =
    data.applicantGrowthTrend.length > 0
      ? Math.max(...data.applicantGrowthTrend.map((w) => w.count), 1)
      : 1;

  return (
    <div className="space-y-6">
      {/* Header with Export */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">
            Auto-refreshing every 30 seconds
          </p>
        </div>
        <button
          type="button"
          onClick={handleCSVExport}
          disabled={exporting}
          className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Export analytics data as CSV"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          {exporting ? "Exporting..." : "Export CSV"}
        </button>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Total Active Listings"
          value={data.totalActiveListings}
          icon={
            <svg className="h-6 w-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
        />
        <MetricCard
          label="Total Applicants"
          value={data.totalApplicants}
          icon={
            <svg className="h-6 w-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
        <MetricCard
          label="Average Match Score"
          value={`${data.averageMatchScore}%`}
          icon={
            <svg className="h-6 w-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        />
        <MetricCard
          label="Conversion Rate"
          value={`${data.conversionRate.rate}%`}
          subtitle={`${data.conversionRate.applied} of ${data.conversionRate.total} applicants applied`}
          icon={
            <svg className="h-6 w-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
        />
      </div>

      {/* Top Skills in Demand & Applicant Growth Trend */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Skills in Demand */}
        <section
          className="rounded-lg border border-gray-200 bg-white p-6"
          aria-labelledby="top-skills-heading"
        >
          <h3 id="top-skills-heading" className="text-base font-semibold text-gray-900 mb-4">
            Top Skills in Demand
          </h3>
          {data.topSkillsInDemand.length === 0 ? (
            <p className="text-sm text-gray-500">No skill data available yet.</p>
          ) : (
            <ul className="space-y-3" aria-label="Top 10 skills in demand">
              {data.topSkillsInDemand.map((entry) => (
                <li key={entry.skill} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 truncate text-sm text-gray-700" title={entry.skill}>
                    {entry.skill}
                  </span>
                  <div className="flex-1 h-5 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${(entry.count / maxSkillCount) * 100}%` }}
                      role="progressbar"
                      aria-valuenow={entry.count}
                      aria-valuemin={0}
                      aria-valuemax={maxSkillCount}
                      aria-label={`${entry.skill}: ${entry.count} listings`}
                    />
                  </div>
                  <span className="w-8 text-right text-sm font-medium text-gray-600">
                    {entry.count}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Applicant Growth Trend (4 weeks) */}
        <section
          className="rounded-lg border border-gray-200 bg-white p-6"
          aria-labelledby="growth-trend-heading"
        >
          <h3 id="growth-trend-heading" className="text-base font-semibold text-gray-900 mb-4">
            Applicant Growth Trend (Last 4 Weeks)
          </h3>
          {data.applicantGrowthTrend.length === 0 ? (
            <p className="text-sm text-gray-500">No growth data available yet.</p>
          ) : (
            <div className="flex items-end justify-between gap-3 h-40" aria-label="Applicant growth bar chart">
              {data.applicantGrowthTrend.map((week) => {
                const heightPct = maxGrowthCount > 0 ? (week.count / maxGrowthCount) * 100 : 0;
                return (
                  <div key={week.month} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-xs font-medium text-gray-700">{week.count}</span>
                    <div className="w-full relative" style={{ height: "120px" }}>
                      <div
                        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 rounded-t bg-green-400 transition-all duration-300"
                        style={{ height: `${Math.max(heightPct, 4)}%` }}
                        role="img"
                        aria-label={`${week.month}: ${week.count} new applicants`}
                      />
                    </div>
                    <span className="text-xs text-gray-500 text-center">{week.month}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Skill Gap Analysis */}
      <section
        className="rounded-lg border border-gray-200 bg-white p-6"
        aria-labelledby="skill-gap-heading"
      >
        <h3 id="skill-gap-heading" className="text-base font-semibold text-gray-900 mb-4">
          Skill Gap Analysis (Top 5)
        </h3>
        {data.skillGapAnalysis.length === 0 ? (
          <p className="text-sm text-gray-500">No skill gap data available yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Skill gap analysis table">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="pb-2 text-left font-medium text-gray-600">Skill</th>
                  <th className="pb-2 text-right font-medium text-gray-600">Demand</th>
                  <th className="pb-2 text-right font-medium text-gray-600">Supply</th>
                  <th className="pb-2 text-right font-medium text-gray-600">Gap Ratio</th>
                </tr>
              </thead>
              <tbody>
                {data.skillGapAnalysis.map((entry) => (
                  <tr key={entry.skill} className="border-b border-gray-100 last:border-0">
                    <td className="py-2 text-gray-800 font-medium">{entry.skill}</td>
                    <td className="py-2 text-right text-gray-700">{entry.demandCount}</td>
                    <td className="py-2 text-right text-gray-700">{entry.supplyCount}</td>
                    <td className="py-2 text-right">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          entry.gapRatio >= 3
                            ? "bg-red-100 text-red-700"
                            : entry.gapRatio >= 2
                              ? "bg-orange-100 text-orange-700"
                              : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {entry.gapRatio}x
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

interface MetricCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
}

function MetricCard({ label, value, subtitle, icon }: MetricCardProps) {
  return (
    <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && (
            <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
          )}
        </div>
        <div className="shrink-0">{icon}</div>
      </div>
    </article>
  );
}
