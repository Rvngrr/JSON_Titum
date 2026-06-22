import AnalyticsDashboard from "@/components/hr/AnalyticsDashboard";

export const dynamic = "force-dynamic";

export default function AnalyticsPage() {
  return (
    <main className="flex-1 p-6 md:p-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <header>
          <h1 className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)]">
            Analytics Dashboard
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Platform-wide metrics and insights. Data refreshes automatically.
          </p>
        </header>

        <div className="glass-card p-6">
          <AnalyticsDashboard />
        </div>
      </div>
    </main>
  );
}
