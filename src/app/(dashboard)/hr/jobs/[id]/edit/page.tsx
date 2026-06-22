export const dynamic = "force-dynamic";

import Link from "next/link";
import EditJobClient from "@/components/hr/EditJobClient";

export default async function EditJobPage({
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
            href="/hr"
            className="text-sm text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
          >
            &larr; Back to Job Postings
          </Link>
        </nav>

        <header>
          <h1 className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)]">
            Edit Job Posting
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Update the job details below. Match scores will be recalculated automatically.
          </p>
        </header>

        <section aria-labelledby="edit-job-form-heading">
          <h2 id="edit-job-form-heading" className="sr-only">Edit job posting form</h2>
          <div className="glass-card p-6">
            <EditJobClient jobId={id} />
          </div>
        </section>
      </div>
    </main>
  );
}
