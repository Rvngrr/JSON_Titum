import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen overflow-hidden bg-gradient-to-br from-[#e8d5f5] via-[#dce8fc] to-[#c9e4f9]">
      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5 md:px-16">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-500">
            <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-xl font-bold text-gray-900">CareerFlow</span>
        </div>

        <div className="hidden items-center gap-8 md:flex">
          <a href="#how-it-works" className="text-sm font-medium text-gray-700 hover:text-gray-900">How It Works</a>
          <a href="#features" className="text-sm font-medium text-gray-700 hover:text-gray-900">Features</a>
          <a href="#for-companies" className="text-sm font-medium text-gray-700 hover:text-gray-900">For Companies</a>
          <Link
            href="/register"
            className="rounded-full border border-gray-900 px-5 py-2 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-900 hover:text-white"
          >
            Sign up
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative px-8 pt-12 md:px-16 md:pt-20">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -top-20 right-20 h-72 w-72 rounded-full bg-gradient-to-br from-pink-200/60 to-purple-200/60 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-gradient-to-br from-blue-200/50 to-cyan-200/50 blur-3xl" />
        <div className="pointer-events-none absolute right-1/4 top-1/2 h-40 w-40 rounded-full bg-gradient-to-br from-pink-300/40 to-rose-200/40 blur-2xl" />

        {/* Small decorative dots */}
        <div className="pointer-events-none absolute left-[15%] top-[30%] h-3 w-3 rounded-full bg-pink-300/70" />
        <div className="pointer-events-none absolute left-[45%] top-[15%] h-2 w-2 rounded-full bg-purple-300/70" />
        <div className="pointer-events-none absolute left-[25%] top-[70%] h-2.5 w-2.5 rounded-full bg-blue-300/70" />

        <div className="relative z-10 flex flex-col gap-12 lg:flex-row lg:items-start lg:gap-20">
          {/* Left: Text Content */}
          <div className="max-w-xl flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-600">
              Unlock Your Potential
            </p>

            <h1 className="mt-4 text-5xl font-bold leading-tight text-gray-900 md:text-6xl lg:text-7xl">
              Opportunities<br />
              Found Faster.
            </h1>

            <p className="mt-6 text-base leading-relaxed text-gray-600 md:text-lg">
              Connect your unique skillset with perfect job matches.<br />
              Elevate your career with AI-powered insights.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/register"
                className="inline-flex items-center rounded-full bg-[#a8dff0] px-7 py-3.5 text-sm font-semibold uppercase tracking-wide text-gray-900 shadow-md transition-all hover:bg-[#8dd3ec] hover:shadow-lg"
              >
                Upload Resume
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center rounded-full border-2 border-gray-300 bg-white/60 px-7 py-3.5 text-sm font-semibold uppercase tracking-wide text-gray-700 backdrop-blur-sm transition-all hover:border-gray-400 hover:bg-white/80"
              >
                Job Listings
              </Link>
            </div>

            <p className="mt-12 text-sm text-gray-500">
              Learn more about AI-matching{" "}
              <a href="#how-it-works" className="font-medium text-gray-700 underline underline-offset-2 hover:text-gray-900">
                here
              </a>
            </p>
          </div>

          {/* Right: Floating Cards */}
          <div className="relative hidden flex-1 lg:block">
            {/* Applicant Profile Card */}
            <div className="absolute right-8 top-0 w-72 rotate-[-2deg] rounded-2xl border border-white/60 bg-white/80 p-5 shadow-xl backdrop-blur-md transition-transform hover:rotate-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-500">
                Applicant Profile
              </p>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-purple-100">
                  <svg className="h-6 w-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <span className="text-lg font-bold text-gray-900">Jane Doe</span>
              </div>
              <div className="mt-4">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Key Skills</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700">Python</span>
                  <span className="rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700">Data Analysis</span>
                </div>
              </div>
            </div>

            {/* Top Job Match Card */}
            <div className="absolute right-0 top-52 w-72 rotate-[1deg] rounded-2xl border border-white/60 bg-white/80 p-5 shadow-xl backdrop-blur-md transition-transform hover:rotate-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-500">
                Top Job Match
              </p>
              <h3 className="mt-2 text-xl font-bold text-gray-900">Backend Developer</h3>
              <p className="text-sm text-gray-500">TechCorp</p>
              <div className="mt-3 flex items-center gap-2">
                {/* Match meter gauge */}
                <div className="relative h-10 w-10">
                  <svg className="h-10 w-10 -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth="3"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#22c55e"
                      strokeWidth="3"
                      strokeDasharray="95, 100"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Match Percentage:</p>
                  <p className="text-lg font-bold text-gray-900">95%</p>
                </div>
              </div>
            </div>

            {/* Decorative 3D shape (CSS sphere) */}
            <div className="absolute -bottom-8 right-32 h-32 w-32 rounded-full bg-gradient-to-br from-gray-300/40 to-gray-100/20 shadow-inner backdrop-blur-sm" />
          </div>
        </div>
      </main>
    </div>
  );
}
