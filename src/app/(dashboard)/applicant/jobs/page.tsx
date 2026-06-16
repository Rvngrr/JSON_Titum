export const dynamic = "force-dynamic";

import JobListings from "@/components/applicant/JobListings";

export default function ApplicantJobsPage() {
  return (
    <main className="flex-1 p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Job Listings</h1>
        <p className="mt-1 text-sm text-gray-600">
          Browse available positions sorted by your match percentage.
        </p>
      </header>
      <JobListings />
    </main>
  );
}
