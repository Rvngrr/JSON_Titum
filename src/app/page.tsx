"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import FloatingOrbs from "@/components/shared/FloatingOrbs";
import ThemeToggle from "@/components/shared/ThemeToggle";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay, ease: "easeOut" },
  }),
};

const cardFloat = {
  hidden: { opacity: 0, y: 30, rotate: 0 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, delay, ease: "easeOut" },
  }),
};

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-hero-gradient">
      <FloatingOrbs density="high" />

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 md:px-16">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent-teal to-periwinkle">
            <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-xl font-bold text-[var(--text-primary)]">CareerFlow</span>
        </div>

        <div className="hidden items-center gap-6 md:flex">
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

      {/* Hero Section */}
      <main className="relative z-10 px-6 pt-12 md:px-16 md:pt-20 pb-20">
        <div className="flex flex-col gap-12 lg:flex-row lg:items-start lg:gap-20">
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
          <div className="relative hidden flex-1 lg:block">
            {/* Applicant Profile Card */}
            <motion.div
              variants={cardFloat}
              initial="hidden"
              animate="visible"
              custom={0.4}
              whileHover={{ rotate: 0, scale: 1.05, y: -8 }}
              className="absolute right-8 top-0 w-72 rotate-[-2deg] glass-card p-5 cursor-default"
            >
              <motion.div
                animate={{ y: [0, -4, 0, 3, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              >
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)]">
                Applicant Profile
              </p>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[var(--orb-blue)] to-[var(--orb-lavender)]">
                  <svg className="h-6 w-6 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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
              className="absolute right-0 top-52 w-72 rotate-[1deg] glass-card p-5 cursor-default"
            >
              <motion.div
                animate={{ y: [0, 3, 0, -4, 0] }}
                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              >
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)]">
                Top Job Match
              </p>
              <h3 className="mt-2 text-xl font-bold text-[var(--text-primary)]">Backend Developer</h3>
              <p className="text-sm text-[var(--text-secondary)]">TechCorp</p>
              <div className="mt-3 flex items-center gap-2">
                <div className="relative h-10 w-10">
                  <svg className="h-10 w-10 -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
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
                  <p className="text-lg font-bold text-[var(--text-primary)]">95%</p>
                </div>
              </div>
              </motion.div>
            </motion.div>

            {/* Decorative small orbs around cards */}
            <motion.div
              animate={{ y: [0, -15, 0], x: [0, 8, 0], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -left-6 top-20 h-16 w-16 rounded-full bg-gradient-to-br from-[var(--orb-pink)] to-transparent blur-xl"
            />
            <motion.div
              animate={{ y: [0, 12, 0], x: [0, -6, 0], opacity: [0.2, 0.5, 0.2] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }}
              className="absolute -right-4 bottom-12 h-20 w-20 rounded-full bg-gradient-to-br from-[var(--orb-blue)] to-transparent blur-xl"
            />
          </div>
        </div>
      </main>
    </div>
  );
}
