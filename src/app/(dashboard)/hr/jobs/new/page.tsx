export const dynamic = "force-dynamic";

import JobDescriptionForm from "@/components/hr/JobDescriptionForm";

export default function CreateJobPage() {
  return (
    <main className="flex-1 p-6 md:p-8">
      <header className="mb-8">
        <h1 className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)]">
          Create New Job Posting
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Fill in the details below to create a new job posting. It will be saved as a draft.
        </p>
      </header>

      <section aria-labelledby="job-form-heading">
        <h2 id="job-form-heading" className="sr-only">Job posting form</h2>
        <div className="glass-card p-6">
          <JobDescriptionForm />
        </div>
      </section>
    </main>
  );
}
