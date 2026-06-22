"use client";

import Link from "next/link";
import Image from "next/image";
import FloatingOrbs from "@/components/shared/FloatingOrbs";
import ThemeToggle from "@/components/shared/ThemeToggle";

// ============================================================================
// CSS Keyframe animations (injected via style tag for dynamic rings/blobs)
// ============================================================================

const animationStyles = `
@keyframes float-slow {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-20px) rotate(3deg); }
}
@keyframes float-medium {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-14px) rotate(-2deg); }
}
@keyframes float-fast {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-10px) scale(1.03); }
}
@keyframes spin-slow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes spin-reverse {
  from { transform: rotate(360deg); }
  to { transform: rotate(0deg); }
}
@keyframes pulse-soft {
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.08); }
}
@keyframes drift {
  0%, 100% { transform: translate(0, 0); }
  25% { transform: translate(10px, -15px); }
  50% { transform: translate(-5px, -25px); }
  75% { transform: translate(-15px, -10px); }
}
@keyframes fade-up {
  from { opacity: 0; transform: translateY(24px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes fade-up-delay-1 {
  0%, 10% { opacity: 0; transform: translateY(24px); }
  100% { opacity: 1; transform: translateY(0); }
}
@keyframes fade-up-delay-2 {
  0%, 20% { opacity: 0; transform: translateY(24px); }
  100% { opacity: 1; transform: translateY(0); }
}
@keyframes fade-up-delay-3 {
  0%, 30% { opacity: 0; transform: translateY(24px); }
  100% { opacity: 1; transform: translateY(0); }
}
@keyframes card-float-1 {
  0%, 100% { transform: rotate(-2deg) translateY(0); }
  50% { transform: rotate(-1deg) translateY(-12px); }
}
@keyframes card-float-2 {
  0%, 100% { transform: rotate(1deg) translateY(0); }
  50% { transform: rotate(2deg) translateY(-8px); }
}
`;

// ============================================================================
// Decorative Ring Component
// ============================================================================

function DecorativeRing({
  size,
  top,
  left,
  right,
  bottom,
  color,
  borderWidth = 2,
  animationDuration = "20s",
  animationName = "spin-slow",
  opacity = 0.3,
}: {
  size: number;
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  color: string;
  borderWidth?: number;
  animationDuration?: string;
  animationName?: string;
  opacity?: number;
}) {
  return (
    <div
      className="pointer-events-none absolute rounded-full"
      style={{
        width: size,
        height: size,
        top,
        left,
        right,
        bottom,
        border: `${borderWidth}px solid ${color}`,
        opacity,
        animation: `${animationName} ${animationDuration} linear infinite`,
      }}
      aria-hidden="true"
    />
  );
}

// ============================================================================
// Decorative Blob Component
// ============================================================================

function DecorativeBlob({
  size,
  top,
  left,
  right,
  bottom,
  gradient,
  blur = 60,
  animationDuration = "8s",
  animationName = "pulse-soft",
}: {
  size: number;
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  gradient: string;
  blur?: number;
  animationDuration?: string;
  animationName?: string;
}) {
  return (
    <div
      className="pointer-events-none absolute rounded-full"
      style={{
        width: size,
        height: size,
        top,
        left,
        right,
        bottom,
        background: gradient,
        filter: `blur(${blur}px)`,
        animation: `${animationName} ${animationDuration} ease-in-out infinite`,
      }}
      aria-hidden="true"
    />
  );
}

// ============================================================================
// Main Landing Page
// ============================================================================

export default function Home() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: animationStyles }} />

      <div className="relative min-h-screen overflow-hidden bg-hero-gradient">
        <FloatingOrbs />

        {/* ====== Extra Decorative Rings ====== */}
        <DecorativeRing size={300} top="-80px" left="-100px" color="var(--orb-lavender)" borderWidth={3} animationDuration="25s" />
        <DecorativeRing size={180} top="15%" right="5%" color="var(--orb-pink)" borderWidth={2} animationDuration="18s" animationName="spin-reverse" />
        <DecorativeRing size={400} bottom="-120px" right="-150px" color="var(--orb-blue)" borderWidth={2} animationDuration="30s" opacity={0.2} />
        <DecorativeRing size={120} top="60%" left="8%" color="var(--orb-pink)" borderWidth={1.5} animationDuration="15s" animationName="spin-reverse" opacity={0.35} />
        <DecorativeRing size={220} top="40%" right="20%" color="var(--orb-lavender)" borderWidth={1.5} animationDuration="22s" opacity={0.2} />

        {/* ====== Extra Decorative Blobs ====== */}
        <DecorativeBlob size={200} top="10%" left="60%" gradient="radial-gradient(circle, var(--orb-pink), transparent)" blur={80} animationDuration="10s" />
        <DecorativeBlob size={150} top="50%" left="5%" gradient="radial-gradient(circle, var(--orb-blue), transparent)" blur={60} animationDuration="12s" animationName="drift" />
        <DecorativeBlob size={180} bottom="10%" right="10%" gradient="radial-gradient(circle, var(--orb-lavender), transparent)" blur={70} animationDuration="9s" />
        <DecorativeBlob size={100} top="25%" right="35%" gradient="radial-gradient(circle, var(--orb-blue), transparent)" blur={50} animationDuration="14s" animationName="drift" />
        <DecorativeBlob size={130} bottom="30%" left="25%" gradient="radial-gradient(circle, var(--orb-pink), transparent)" blur={55} animationDuration="11s" />

        {/* ====== Navigation ====== */}
        <nav className="relative z-10 flex items-center justify-between px-8 py-5 md:px-16">
          <div className="flex items-center gap-3">
            <Image
              src="/careerflow.png"
              alt="CareerFlow Logo"
              width={40}
              height={40}
              className="h-10 w-10 object-contain"
              priority
            />
            <span className="text-xl font-bold text-[var(--text-primary)]">CareerFlow</span>
          </div>

          <div className="hidden items-center gap-8 md:flex">
            <a href="#how-it-works" className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
              How It Works
            </a>
            <a href="#features" className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
              Features
            </a>
            <a href="#for-companies" className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
              For Companies
            </a>
            <ThemeToggle />
            <Link
              href="/register"
              className="rounded-full border border-[var(--text-primary)] px-5 py-2 text-sm font-semibold text-[var(--text-primary)] transition-all hover:bg-[var(--text-primary)] hover:text-white"
            >
              Sign up
            </Link>
          </div>

          <div className="flex items-center gap-3 md:hidden">
            <ThemeToggle />
            <Link href="/register" className="btn-primary text-xs px-4 py-2">Sign up</Link>
          </div>
        </nav>

        {/* ====== Hero Section ====== */}
        <main className="relative z-10 px-8 pt-12 pb-24 md:px-16 md:pt-20">
          <div className="flex flex-col gap-16 lg:flex-row lg:items-start lg:gap-24">
            {/* Left: Text content */}
            <div className="max-w-xl flex-1">
              <p
                className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]"
                style={{ animation: "fade-up 0.6s ease-out forwards" }}
              >
                Unlock Your Potential
              </p>

              <h1
                className="mt-4 text-5xl font-bold leading-[1.1] tracking-tight text-[var(--text-primary)] md:text-6xl lg:text-7xl"
                style={{ animation: "fade-up-delay-1 0.8s ease-out forwards" }}
              >
                Opportunities<br />Found Faster.
              </h1>

              <p
                className="mt-6 text-base leading-relaxed text-[var(--text-secondary)] md:text-lg"
                style={{ animation: "fade-up-delay-2 0.9s ease-out forwards" }}
              >
                Connect your unique skillset with perfect job matches.<br />
                Elevate your career with AI-powered insights.
              </p>

              <div
                className="mt-10 flex flex-wrap gap-4"
                style={{ animation: "fade-up-delay-3 1s ease-out forwards" }}
              >
                <Link href="/register" className="btn-primary text-sm">Upload Resume</Link>
                <Link href="/login" className="btn-secondary text-sm">Job Listings</Link>
              </div>
            </div>

            {/* Right: Floating Glass Cards */}
            <div className="relative hidden flex-1 lg:block" style={{ minHeight: 420 }}>
              {/* Small ring accent near cards */}
              <DecorativeRing size={80} top="10px" right="200px" color="var(--orb-pink)" borderWidth={1.5} animationDuration="12s" opacity={0.5} />
              <DecorativeRing size={50} bottom="80px" right="30px" color="var(--orb-lavender)" borderWidth={1} animationDuration="10s" animationName="spin-reverse" opacity={0.5} />

              {/* Profile Card */}
              <div
                className="absolute right-8 top-0 w-72 glass-card p-5"
                style={{ animation: "card-float-1 6s ease-in-out infinite" }}
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)]">Applicant Profile</p>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#C4E4F9] to-[#E8DEFF]">
                    <svg className="h-6 w-6 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <span className="text-lg font-bold text-[var(--text-primary)]">Jane Doe</span>
                </div>
                <div className="mt-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Key Skills</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="badge-pill bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">Python</span>
                    <span className="badge-pill bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">Data Analysis</span>
                    <span className="badge-pill bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">ML</span>
                  </div>
                </div>
              </div>

              {/* Job Match Card */}
              <div
                className="absolute right-0 top-56 w-72 glass-card p-5"
                style={{ animation: "card-float-2 7s ease-in-out infinite" }}
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)]">Top Job Match</p>
                <h3 className="mt-2 text-xl font-bold text-[var(--text-primary)]">Backend Developer</h3>
                <p className="text-sm text-[var(--text-secondary)]">TechCorp</p>
                <div className="mt-3 flex items-center gap-2">
                  <div className="relative h-10 w-10">
                    <svg className="h-10 w-10 -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--border-subtle)" strokeWidth="3" />
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--accent)" strokeWidth="3" strokeDasharray="95, 100" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">Match:</p>
                    <p className="text-lg font-bold text-[var(--text-primary)]">95%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* ====== How It Works Section ====== */}
        <section id="how-it-works" className="relative z-10 px-8 py-20 md:px-16">
          {/* Section ring accents */}
          <DecorativeRing size={160} top="-40px" left="50%" color="var(--orb-blue)" borderWidth={1.5} animationDuration="20s" opacity={0.25} />

          <div className="mx-auto max-w-5xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">Simple Process</p>
            <h2 className="mt-3 text-3xl font-bold text-[var(--text-primary)] md:text-4xl">How It Works</h2>
            <p className="mx-auto mt-4 max-w-2xl text-[var(--text-secondary)]">
              Three simple steps to find your perfect career match
            </p>
          </div>

          <div className="mx-auto mt-12 grid max-w-5xl gap-8 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Upload Your Resume",
                description: "Our AI parses your skills, experience, and career goals automatically.",
                icon: (
                  <svg className="h-8 w-8 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                ),
              },
              {
                step: "02",
                title: "Get Matched",
                description: "AI analyzes thousands of listings to find opportunities that fit you perfectly.",
                icon: (
                  <svg className="h-8 w-8 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                ),
              },
              {
                step: "03",
                title: "Apply & Grow",
                description: "Track applications, get skill recommendations, and advance your career.",
                icon: (
                  <svg className="h-8 w-8 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                ),
              },
            ].map((item) => (
              <div key={item.step} className="glass-card p-6 text-center" style={{ animation: "float-medium 5s ease-in-out infinite" }}>
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent-light)]">
                  {item.icon}
                </div>
                <p className="text-xs font-bold text-[var(--accent)] tracking-widest">{item.step}</p>
                <h3 className="mt-2 text-lg font-bold text-[var(--text-primary)]">{item.title}</h3>
                <p className="mt-2 text-sm text-[var(--text-secondary)] leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ====== Features Section ====== */}
        <section id="features" className="relative z-10 px-8 py-20 md:px-16">
          {/* Section decorations */}
          <DecorativeRing size={250} bottom="-60px" left="-80px" color="var(--orb-pink)" borderWidth={2} animationDuration="28s" opacity={0.2} />
          <DecorativeBlob size={120} top="20%" right="5%" gradient="radial-gradient(circle, var(--orb-lavender), transparent)" blur={50} animationDuration="13s" animationName="drift" />

          <div className="mx-auto max-w-5xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">Platform Features</p>
            <h2 className="mt-3 text-3xl font-bold text-[var(--text-primary)] md:text-4xl">Everything You Need</h2>
            <p className="mx-auto mt-4 max-w-2xl text-[var(--text-secondary)]">
              Powerful AI-driven tools to supercharge your job search
            </p>
          </div>

          <div className="mx-auto mt-12 grid max-w-5xl gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "AI Resume Parsing", desc: "Instantly extract skills, experience, and education from any resume format." },
              { title: "Smart Job Matching", desc: "Our algorithm finds the best opportunities based on your unique profile." },
              { title: "ATS Score Analysis", desc: "See how well your resume matches each job before you apply." },
              { title: "Skill ROI Insights", desc: "Discover which skills will boost your career value the most." },
              { title: "Career Goal Tracking", desc: "Set goals and track your progress with actionable milestones." },
              { title: "HR Pipeline Analytics", desc: "Companies get real-time visibility into their talent pipeline." },
            ].map((feature) => (
              <div key={feature.title} className="glass-card p-5">
                <div className="mb-3 h-2 w-12 rounded-full bg-gradient-to-r from-[var(--accent)] to-[#C9B8F7]" />
                <h3 className="text-base font-bold text-[var(--text-primary)]">{feature.title}</h3>
                <p className="mt-2 text-sm text-[var(--text-secondary)] leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ====== For Companies Section ====== */}
        <section id="for-companies" className="relative z-10 px-8 py-20 md:px-16">
          <DecorativeRing size={200} top="10%" right="15%" color="var(--orb-blue)" borderWidth={2} animationDuration="24s" animationName="spin-reverse" opacity={0.2} />

          <div className="mx-auto max-w-4xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">For HR Teams</p>
            <h2 className="mt-3 text-3xl font-bold text-[var(--text-primary)] md:text-4xl">Hire Smarter, Faster</h2>
            <p className="mx-auto mt-4 max-w-2xl text-[var(--text-secondary)]">
              AI-powered candidate ranking, pipeline health monitoring, and skill gap analytics
            </p>

            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link href="/register" className="btn-primary text-sm">Start Hiring</Link>
              <Link href="/login" className="btn-secondary text-sm">View Demo</Link>
            </div>
          </div>
        </section>

        {/* ====== Footer CTA ====== */}
        <section className="relative z-10 px-8 py-16 md:px-16">
          <DecorativeBlob size={160} bottom="-40px" left="20%" gradient="radial-gradient(circle, var(--orb-blue), transparent)" blur={70} animationDuration="10s" />

          <div className="mx-auto max-w-3xl glass-card p-10 text-center">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] md:text-3xl">
              Ready to find your perfect match?
            </h2>
            <p className="mt-3 text-[var(--text-secondary)]">
              Join thousands of professionals who found their dream jobs through AI-powered matching.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link href="/register" className="btn-primary text-sm">Get Started Free</Link>
              <Link href="/login" className="btn-secondary text-sm">Sign In</Link>
            </div>
          </div>
        </section>

        {/* Bottom spacer */}
        <div className="h-12" />
      </div>
    </>
  );
}
