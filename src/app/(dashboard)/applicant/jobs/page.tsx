export const dynamic = "force-dynamic";

import JobListings from "@/components/applicant/JobListings";

export default function ApplicantJobsPage() {
  return (
    <main className="flex-1 p-6 md:p-8">
      <header className="mb-6">
        <h1 className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)]">
          Matched Job Listings
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Browse available positions sorted by your match percentage.
        </p>
      </header>
      <JobListings />
    </main>
  );
}
