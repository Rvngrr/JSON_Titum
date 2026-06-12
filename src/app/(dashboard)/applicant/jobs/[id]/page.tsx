export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Job Detail</h1>
      <p className="text-gray-600">Job ID: {id}</p>
    </main>
  );
}
