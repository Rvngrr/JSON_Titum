import JobDetail from "@/components/applicant/JobDetail";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="flex-1 p-8">
      <JobDetail jobId={id} />
    </main>
  );
}
