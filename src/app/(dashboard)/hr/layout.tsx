import Link from "next/link";

export default function HRLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r border-gray-200 bg-gray-50 p-6">
        <nav aria-label="HR dashboard navigation">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            HR Portal
          </h2>
          <ul className="space-y-2">
            <li>
              <Link
                href="/hr"
                className="block rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 hover:text-gray-900"
              >
                Dashboard
              </Link>
            </li>
            <li>
              <Link
                href="/hr"
                className="block rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 hover:text-gray-900"
              >
                My Job Postings
              </Link>
            </li>
            <li>
              <Link
                href="/hr/jobs/new"
                className="block rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 hover:text-gray-900"
              >
                Create New Posting
              </Link>
            </li>
            <li>
              <Link
                href="/hr"
                className="block rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 hover:text-gray-900"
              >
                View Rankings
              </Link>
            </li>
          </ul>
        </nav>
      </aside>
      <div className="flex-1">{children}</div>
    </div>
  );
}
