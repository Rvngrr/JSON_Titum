import Link from "next/link";
import JobRankingsSelector from "@/components/hr/JobRankingsSelector";

export default async function RankingsPage({
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Applicant Rankings
      </h1>
      <p className="text-gray-600 mb-6">
        Applicants ranked by match percentage. Use the selector below to switch
        between job postings.
      </p>
      <JobRankingsSelector initialJobId={id} />
    </main>
  );
}
