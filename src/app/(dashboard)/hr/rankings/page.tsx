export const dynamic = "force-dynamic";

import JobRankingsSelector from "@/components/hr/JobRankingsSelector";

export default function RankingsOverviewPage() {
  return (
    <main className="flex-1 p-6 md:p-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <header>
          <h1 className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)]">
            Applicant Rankings
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            View applicants ranked by match percentage for each of your job postings.
          </p>
        </header>

        <div className="glass-card p-6">
          <JobRankingsSelector />
        </div>
      </div>
    </main>
  );
}
