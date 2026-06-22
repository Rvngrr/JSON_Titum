export const dynamic = "force-dynamic";

import JobDescriptionList from "@/components/hr/JobDescriptionList";
import ImportJobsPanel from "@/components/hr/ImportJobsPanel";
import PipelineHealthDashboard from "@/components/hr/PipelineHealthDashboard";

export default function HRDashboardPage() {
  return (
    <main className="flex-1 p-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">HR Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Welcome back. Manage your job postings, review applicants, and track
          rankings from here.
        </p>
      </header>

      <section aria-labelledby="import-section" className="mt-6">
        <ImportJobsPanel />
      </section>

      <section aria-labelledby="pipeline-health-heading" className="mt-8">
        <h2
          id="pipeline-health-heading"
          className="mb-4 text-xl font-semibold text-gray-800"
        >
          Pipeline Health
        </h2>
        <PipelineHealthDashboard />
      </section>

      <section aria-labelledby="job-postings-heading" className="mt-8">
        <h2
          id="job-postings-heading"
          className="mb-4 text-xl font-semibold text-gray-800"
        >
          My Job Postings
        </h2>
        <JobDescriptionList />
      </section>
    </main>
  );
}
