export const dynamic = "force-dynamic";

import Link from "next/link";
import JobDetail from "@/components/applicant/JobDetail";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="flex-1 p-6 md:p-10">
      <div className="mx-auto max-w-3xl space-y-8">
        <nav aria-label="Breadcrumb">
          <Link
            href="/applicant/jobs"
            className="text-sm text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
          >
            &larr; Back to Job Listings
          </Link>
        </nav>

        <JobDetail jobId={id} />
      </div>
    </main>
  );
}
