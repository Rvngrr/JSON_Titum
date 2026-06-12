import Link from "next/link";
import EditJobClient from "@/components/hr/EditJobClient";

export default async function EditJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="flex-1 p-8">
      <nav aria-label="Breadcrumb" className="mb-4">
        <Link
          href="/hr"
          className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
        >
          ← Back to Job Postings
        </Link>
      </nav>
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Edit Job Posting</h1>
        <p className="mt-2 text-gray-600">
          Update the job details below. Match scores will be recalculated
          automatically after saving.
        </p>
      </header>

      <section aria-labelledby="edit-job-form-heading">
        <h2 id="edit-job-form-heading" className="sr-only">
          Edit job posting form
        </h2>
        <EditJobClient jobId={id} />
      </section>
    </main>
  );
}
