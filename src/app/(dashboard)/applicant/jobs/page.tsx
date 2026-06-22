export const dynamic = "force-dynamic";

import JobListings from "@/components/applicant/JobListings";

export default function ApplicantJobsPage() {
  return (
    <main className="flex-1 p-6 md:p-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <header>
          <h1 className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)]">
            Job Listings
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Browse available positions sorted by your match percentage.
          </p>
        </header>

        <JobListings />
      </div>
    </main>
  );
}
