export const dynamic = "force-dynamic";

import Link from "next/link";
import JobRankingsSelector from "@/components/hr/JobRankingsSelector";

export default async function RankingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="flex-1 p-6 md:p-8">
      <nav aria-label="Breadcrumb" className="mb-4">
        <Link
          href="/hr"
          className="text-sm text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
        >
          &larr; Back to Job Postings
        </Link>
      </nav>
      <header className="mb-6">
        <h1 className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)]">
          Applicant Rankings
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Applicants ranked by match percentage.
        </p>
      </header>
      <div className="glass-card p-6">
        <JobRankingsSelector initialJobId={id} />
      </div>
    </main>
  );
}
