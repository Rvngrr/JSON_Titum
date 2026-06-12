import Link from "next/link";

export default function ApplicantDashboardPage() {
  return (
    <main className="flex-1 p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome to Your Dashboard
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage your profile, browse job listings, and track your match scores.
        </p>
      </div>

      {/* Quick action cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Profile card */}
        <Link
          href="/applicant/profile"
          className="group rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600">
            My Profile
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Upload your resume and manage your skills to improve match scores.
          </p>
        </Link>

        {/* Job listings card */}
        <Link
          href="/applicant/jobs"
          className="group rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600">
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 group-hover:text-green-600">
            Job Listings
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Browse available positions sorted by your match percentage.
          </p>
        </Link>

        {/* Getting started card */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900">
            Getting Started
          </h2>
          <ul className="mt-2 space-y-1 text-sm text-gray-600">
            <li className="flex items-center gap-2">
              <span className="text-blue-500" aria-hidden="true">1.</span>
              Upload your resume or add skills manually
            </li>
            <li className="flex items-center gap-2">
              <span className="text-blue-500" aria-hidden="true">2.</span>
              Browse job listings with match scores
            </li>
            <li className="flex items-center gap-2">
              <span className="text-blue-500" aria-hidden="true">3.</span>
              View AI recommendations to improve matches
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}
