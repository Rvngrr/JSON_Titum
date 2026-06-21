import AnalyticsDashboard from "@/components/hr/AnalyticsDashboard";

export const dynamic = "force-dynamic";

export default function AnalyticsPage() {
  return (
    <main className="flex-1 p-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Platform-wide metrics and insights. Data refreshes automatically.
        </p>
      </header>

      <AnalyticsDashboard />
    </main>
  );
}
