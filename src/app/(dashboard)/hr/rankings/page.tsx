export const dynamic = "force-dynamic";

import JobRankingsSelector from "@/components/hr/JobRankingsSelector";

export default function RankingsOverviewPage() {
  return (
    <main className="flex-1 p-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Applicant Rankings
        </h1>
        <p className="mt-2 text-gray-600">
          View applicants ranked by match percentage for each of your job
          postings. Use the dropdown to switch between jobs.
        </p>
      </header>
      <JobRankingsSelector />
    </main>
  );
}
