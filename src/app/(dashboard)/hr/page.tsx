export const dynamic = "force-dynamic";

import JobDescriptionList from "@/components/hr/JobDescriptionList";
import ImportJobsPanel from "@/components/hr/ImportJobsPanel";
import PipelineHealthDashboard from "@/components/hr/PipelineHealthDashboard";

export default function HRDashboardPage() {
  return (
    <main className="flex-1 p-6 md:p-8">
      <header className="mb-8">
        <h1 className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)]">
          HR Dashboard
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Welcome back. Manage your job postings, review applicants, and track rankings.
        </p>
      </header>

      <section aria-labelledby="import-section" className="mt-6">
        <ImportJobsPanel />
      </section>

      <section aria-labelledby="pipeline-health-heading" className="mt-8">
        <h2
          id="pipeline-health-heading"
          className="mb-4 text-sm font-semibold text-[var(--text-primary)]"
        >
          Pipeline Health
        </h2>
        <div className="glass-card p-6">
          <PipelineHealthDashboard />
        </div>
      </section>

      <section aria-labelledby="job-postings-heading" className="mt-8">
        <h2
          id="job-postings-heading"
          className="mb-4 text-sm font-semibold text-[var(--text-primary)]"
        >
          My Job Postings
        </h2>
        <div className="glass-card p-6">
          <JobDescriptionList />
        </div>
      </section>
    </main>
  );
}
