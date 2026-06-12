import JobDescriptionForm from "@/components/hr/JobDescriptionForm";

export default function CreateJobPage() {
  return (
    <main className="flex-1 p-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Create New Job Posting
        </h1>
        <p className="mt-2 text-gray-600">
          Fill in the details below to publish a new job posting. Applicants
          will be matched automatically once published.
        </p>
      </header>

      <section aria-labelledby="job-form-heading">
        <h2 id="job-form-heading" className="sr-only">
          Job posting form
        </h2>
        <JobDescriptionForm />
      </section>
    </main>
  );
}
