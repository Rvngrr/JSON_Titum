import AnalyticsDashboard from "@/components/hr/AnalyticsDashboard";

export const dynamic = "force-dynamic";

export default function AnalyticsPage() {
  return (
    <main className="flex-1 p-6 md:p-8">
      <header className="mb-8">
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
    </main>
  );
}
