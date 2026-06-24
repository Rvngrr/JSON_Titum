"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import FloatingOrbs from "@/components/shared/FloatingOrbs";
import ThemeToggle from "@/components/shared/ThemeToggle";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

const cardFloat: Variants = {
  hidden: { opacity: 0, y: 30, rotate: 0 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, delay, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

export default function Home() {
  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="relative flex flex-col overflow-x-hidden bg-hero-gradient">
      <FloatingOrbs density="high" />

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 md:px-16">
        <div className="flex items-center gap-2">
          <Image
            src="/careerflow.png"
            alt="CareerFlow logo"
            width={32}
            height={32}
            className="h-8 w-8 rounded-lg"
            priority
          />
          <span className="text-xl font-bold text-[var(--text-primary)]">CareerFlow</span>
        </div>

        <div className="hidden items-center gap-6 md:flex">
          <a href="#how-it-works" onClick={(e) => scrollToSection(e, "how-it-works")} className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
            How It Works
          </a>
          <a href="#features" onClick={(e) => scrollToSection(e, "features")} className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
            Features
          </a>
          <a href="#for-companies" onClick={(e) => scrollToSection(e, "for-companies")} className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
            For Companies
          </a>
          <ThemeToggle />
          <Link
            href="/register"
            className="rounded-full border border-[var(--text-primary)] px-5 py-2 text-sm font-medium text-[var(--text-primary)] transition-all hover:bg-[var(--accent)] hover:border-[var(--accent)] hover:text-white"
          >
            Sign up
          </Link>
        </div>

        {/* Mobile menu */}
        <div className="flex items-center gap-3 md:hidden">
          <ThemeToggle />
          <Link
            href="/register"
            className="rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white"
          >
            Sign up
          </Link>
        </div>
      </nav>

      {/* Hero Section — full viewport height */}
      <main className="relative z-10 flex min-h-screen items-center justify-center px-6 md:px-16">
        <div className="flex w-full max-w-6xl flex-col gap-8 py-12 lg:flex-row lg:items-center lg:justify-center lg:gap-16">
          {/* Left: Text Content */}
          <div className="max-w-xl flex-1">
            <motion.p
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={0}
              className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]"
            >
              Unlock Your Potential
            </motion.p>

            <motion.h1
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={0.1}
              className="mt-4 text-5xl font-bold leading-tight text-[var(--text-primary)] md:text-6xl lg:text-7xl"
            >
              Opportunities<br />
              Found Faster.
            </motion.h1>

            <motion.p
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={0.2}
              className="mt-6 text-base leading-relaxed text-[var(--text-secondary)] md:text-lg"
            >
              Connect your unique skillset with perfect job matches.<br />
              Elevate your career with AI-powered insights.
            </motion.p>

            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={0.3}
              className="mt-10 flex flex-wrap gap-4"
            >
              <Link
                href="/register"
                className="btn-primary inline-flex items-center text-sm uppercase tracking-wide"
              >
                Upload Resume
              </Link>
              <Link
                href="/login"
                className="btn-secondary inline-flex items-center text-sm uppercase tracking-wide"
              >
                Job Listings
              </Link>
            </motion.div>

            <motion.p
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={0.4}
              className="mt-12 text-sm text-[var(--text-muted)]"
            >
              Learn more about AI-matching{" "}
              <a href="#how-it-works" className="font-medium text-[var(--accent)] underline underline-offset-2 hover:text-[var(--accent-hover)] transition-colors">
                here
              </a>
            </motion.p>
          </div>

          {/* Right: Floating Cards */}
          <div className="relative hidden flex-shrink-0 lg:block lg:min-h-[480px] lg:w-[360px]">
            {/* Applicant Profile Card */}
            <motion.div
              variants={cardFloat}
              initial="hidden"
              animate="visible"
              custom={0.4}
              whileHover={{ rotate: 0, scale: 1.05, y: -8 }}
              className="absolute left-0 top-0 w-80 rotate-[-2deg] glass-card p-6 cursor-default"
            >
              <motion.div
                animate={{ y: [0, -4, 0, 3, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              >
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)]">
                Applicant Profile
              </p>
              <div className="mt-4 flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[var(--orb-blue)] to-[var(--orb-lavender)]">
                  <svg className="h-7 w-7 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <span className="text-xl font-bold text-[var(--text-primary)]">JSON Titum</span>
              </div>
              <div className="mt-5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Key Skills</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="badge-pill bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">Python</span>
                  <span className="badge-pill bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">Data Analysis</span>
                  <span className="badge-pill bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">SQL</span>
                </div>
              </div>
              </motion.div>
            </motion.div>

            {/* Top Job Match Card */}
            <motion.div
              variants={cardFloat}
              initial="hidden"
              animate="visible"
              custom={0.6}
              whileHover={{ rotate: 0, scale: 1.05, y: -8 }}
              className="absolute left-10 top-56 w-80 rotate-[1deg] glass-card p-6 cursor-default"
            >
              <motion.div
                animate={{ y: [0, 3, 0, -4, 0] }}
                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              >
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)]">
                Top Job Match
              </p>
              <h3 className="mt-3 text-2xl font-bold text-[var(--text-primary)]">Backend Developer</h3>
              <p className="text-sm text-[var(--text-secondary)]">TechCorp</p>
              <div className="mt-4 flex items-center gap-3">
                <div className="relative h-12 w-12">
                  <svg className="h-12 w-12 -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="var(--border-subtle)"
                      strokeWidth="3"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="var(--accent)"
                      strokeWidth="3"
                      strokeDasharray="95, 100"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Match Percentage:</p>
                  <p className="text-xl font-bold text-[var(--text-primary)]">95%</p>
                </div>
              </div>
              </motion.div>
            </motion.div>

            {/* Decorative small orbs around cards */}
            <motion.div
              animate={{ y: [0, -15, 0], x: [0, 8, 0], opacity: [0.4, 0.7, 0.4] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -left-10 top-24 h-16 w-16 rounded-full bg-gradient-to-br from-[var(--orb-pink)] to-transparent blur-xl"
            />
            <motion.div
              animate={{ y: [0, 12, 0], x: [0, -6, 0], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }}
              className="absolute left-2 bottom-8 h-20 w-20 rounded-full bg-gradient-to-br from-[var(--orb-blue)] to-transparent blur-xl"
            />
          </div>
        </div>
      </main>

      {/* How It Works Section */}
      <section id="how-it-works" className="relative z-10 min-h-screen flex items-center px-6 py-24 md:px-16">
        <div className="mx-auto w-full max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
              How It Works
            </p>
            <h2 className="mt-4 text-4xl font-bold text-[var(--text-primary)] md:text-5xl">
              Three Simple Steps
            </h2>
            <p className="mt-4 max-w-2xl text-lg text-[var(--text-secondary)]">
              Our AI-powered platform connects your skills with the right opportunities in minutes, not months.
            </p>
          </motion.div>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Upload Your Resume",
                description: "Upload your resume or fill in your profile. Our AI parses your skills, experience, and career goals automatically.",
                icon: (
                  <svg className="h-8 w-8 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                ),
              },
              {
                step: "02",
                title: "Get AI-Matched Jobs",
                description: "Our algorithms analyze job requirements against your profile to surface the best-fit opportunities with a match score.",
                icon: (
                  <svg className="h-8 w-8 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                ),
              },
              {
                step: "03",
                title: "Apply & Track",
                description: "Apply to matched positions with one click and track your application progress all in one dashboard.",
                icon: (
                  <svg className="h-8 w-8 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, delay: i * 0.15 }}
                className="glass-card p-8"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                  {item.icon}
                </div>
                <p className="mt-5 text-sm font-bold text-[var(--accent)]">{item.step}</p>
                <h3 className="mt-2 text-xl font-bold text-[var(--text-primary)]">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 min-h-screen flex items-center px-6 py-24 md:px-16">
        <div className="mx-auto w-full max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
              Features
            </p>
            <h2 className="mt-4 text-4xl font-bold text-[var(--text-primary)] md:text-5xl">
              Built for Job Seekers
            </h2>
            <p className="mt-4 max-w-2xl text-lg text-[var(--text-secondary)]">
              Everything you need to land your dream role, powered by intelligent matching and career insights.
            </p>
          </motion.div>

          <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Smart Match Scoring",
                description: "Get a weighted match score for every job based on your skills mapped against job requirements.",
              },
              {
                title: "Resume Parsing",
                description: "Upload any resume format and our AI extracts your skills, roles, education, and certifications.",
              },
              {
                title: "Skill Gap Analysis",
                description: "See which skills you need to develop for your target roles with actionable recommendations.",
              },
              {
                title: "Career Goal Tracking",
                description: "Set career goals and track progress with personalized milestones and AI-driven suggestions.",
              },
              {
                title: "Application Dashboard",
                description: "Track all your applications in one place with status updates and follow-up reminders.",
              },
              {
                title: "Skill ROI Calculator",
                description: "Understand which skills will give you the highest return on investment for your career path.",
              },
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="glass-card p-7"
              >
                <h3 className="text-lg font-bold text-[var(--text-primary)]">{feature.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* For Companies Section */}
      <section id="for-companies" className="relative z-10 min-h-screen flex items-center px-6 py-24 md:px-16">
        <div className="mx-auto w-full max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
              For Companies
            </p>
            <h2 className="mt-4 text-4xl font-bold text-[var(--text-primary)] md:text-5xl">
              Hire Smarter, Faster
            </h2>
            <p className="mt-4 max-w-2xl text-lg text-[var(--text-secondary)]">
              Our Admin dashboard gives hiring teams AI-powered tools to find the best candidates from your applicant pool.
            </p>
          </motion.div>

          <div className="mt-16 grid gap-8 md:grid-cols-2">
            {[
              {
                title: "AI-Ranked Applicants",
                description: "Automatically rank candidates by fit score against your job requirements. No more manual resume screening.",
              },
              {
                title: "Job Posting Management",
                description: "Create, edit, and manage job postings with AI-assisted requirement generation and bulk import.",
              },
              {
                title: "Hiring Analytics",
                description: "Track your hiring funnel, time-to-fill, and source effectiveness with real-time analytics dashboards.",
              },
              {
                title: "Bulk Job Import",
                description: "Import jobs from LinkedIn, Indeed, and other platforms directly into your dashboard via API integrations.",
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, delay: i * 0.15 }}
                className="glass-card p-8"
              >
                <h3 className="text-xl font-bold text-[var(--text-primary)]">{item.title}</h3>
                <p className="mt-3 text-base leading-relaxed text-[var(--text-secondary)]">{item.description}</p>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-12 flex flex-wrap gap-4"
          >
            <Link
              href="/register"
              className="btn-primary inline-flex items-center text-sm uppercase tracking-wide"
            >
              Get Started as Job Curator
            </Link>
            <Link
              href="/login"
              className="btn-secondary inline-flex items-center text-sm uppercase tracking-wide"
            >
              Sign In
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
