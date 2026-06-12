export default async function RankingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Applicant Rankings</h1>
      <p className="text-gray-600">Job ID: {id}</p>
    </main>
  );
}
