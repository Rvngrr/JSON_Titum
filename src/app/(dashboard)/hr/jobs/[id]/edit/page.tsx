export default async function EditJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Edit Job Posting</h1>
      <p className="text-gray-600">Job ID: {id}</p>
    </main>
  );
}
