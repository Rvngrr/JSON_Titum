"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import InsightsCard from "@/components/applicant/InsightsCard";
import type { MatchResult, Skill } from "@/types";

// ============================================================================
// Types
// ============================================================================

interface DashboardData {
  atsScore: number;
  totalJobs: number;
  skills: Skill[];
  matchResults: MatchResult[];
  hiddenGems: HiddenGem[];
  skillROI: SkillROIItem[];
  topMatchedJobs: TopMatchedJob[];
  roleReadiness: RoleReadinessData | null;
}

interface RoleReadinessData {
  careerGoal: string;
  percentage: number;
  matched: string[];
  missing: string[];
  total: number;
}

interface TopMatchedJob {
  jobId: string;
  title: string;
  matchPercentage: number;
  matchedSkills: string[];
  missingSkills: string[];
}

interface HiddenGem {
  name: string;
  frequency: number;
  totalJobs: number;
}

interface SkillROIItem {
  name: string;
  projectedImprovement: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/** Typical skills expected for each aspired role (mirrors career-goals page) */
const ROLE_EXPECTED_SKILLS: Record<string, string[]> = {
  "Data Analyst": ["SQL", "Python", "Excel", "Data Analysis", "Statistics", "Tableau", "Power BI", "R"],
  "Software Developer": ["JavaScript", "Python", "Git", "REST APIs", "SQL", "React", "Node.js", "TypeScript"],
  "Information Technology": ["Linux", "Networking", "Troubleshooting", "Windows", "Cloud Services", "Security", "Python"],
  "Advertising": ["Marketing", "Communication", "Social Media", "Analytics", "SEO", "Content Writing", "Adobe Creative Suite"],
  "Software Media": ["Video Editing", "Adobe Premiere", "After Effects", "Photoshop", "UI/UX Design", "Figma", "Motion Graphics"],
  "Customer Svc": ["Communication", "Problem-Solving", "CRM", "Empathy", "Multitasking", "Patience", "Conflict Resolution"],
  "Cybersecurity": ["Networking", "Linux", "Python", "Penetration Testing", "Firewalls", "SIEM", "Cryptography", "Risk Assessment"],
  "Web Developer": ["HTML", "CSS", "JavaScript", "React", "Node.js", "Git", "Responsive Design", "TypeScript"],
  "AI/ML Engineer": ["Python", "Machine Learning", "TensorFlow", "Deep Learning", "Statistics", "NLP", "PyTorch", "Data Analysis"],
  "UX Designer": ["Figma", "User Research", "Wireframing", "Prototyping", "UI/UX Design", "Adobe XD", "Communication"],
  "Chef": ["Culinary Arts", "Food Safety", "Menu Planning", "Kitchen Management", "HACCP", "Inventory Management", "Team Leadership", "Time Management"],
  "Nurse": ["Patient Care", "Medication Administration", "Vital Signs", "CPR", "HIPAA Compliance", "EHR", "Communication", "Critical Thinking"],
  "Teacher": ["Curriculum Development", "Classroom Management", "Lesson Planning", "Student Assessment", "Communication", "Educational Technology", "Differentiated Instruction", "Patience"],
  "Mechanic": ["Automotive Repair", "Diagnostics", "Blueprint Reading", "Electrical Systems", "OSHA", "Welding", "Problem-Solving", "Preventive Maintenance"],
  "Electrician": ["Electrical Wiring", "Blueprint Reading", "NEC Code", "Safety Compliance", "Troubleshooting", "PLC Programming", "Conduit Bending", "Circuit Design"],
  "Accountant": ["Accounting", "Financial Analysis", "QuickBooks", "Tax Preparation", "Auditing", "Excel", "Budgeting", "Compliance"],
  "Marketing Manager": ["Digital Marketing", "SEO", "Content Strategy", "Social Media Marketing", "Analytics", "Brand Management", "CRM", "Market Research"],
  "Graphic Designer": ["Adobe Photoshop", "Adobe Illustrator", "Figma", "Typography", "Brand Identity", "Layout Design", "Color Theory", "Communication"],
};

function computeRoleReadiness(careerGoal: string, userSkills: string[]): RoleReadinessData | null {
  const expectedSkills = ROLE_EXPECTED_SKILLS[careerGoal];
  if (!expectedSkills || userSkills.length === 0) return null;

  const userSkillsLower = userSkills.map((s) => s.toLowerCase());
  const matched = expectedSkills.filter((expected) =>
    userSkillsLower.some((us) =>
      us.includes(expected.toLowerCase()) || expected.toLowerCase().includes(us)
    )
  );
  const missing = expectedSkills.filter(
    (expected) =>
      !userSkillsLower.some((us) =>
        us.includes(expected.toLowerCase()) || expected.toLowerCase().includes(us)
      )
  );

  return {
    careerGoal,
    percentage: Math.round((matched.length / expectedSkills.length) * 100),
    matched,
    missing,
    total: expectedSkills.length,
  };
}

function getScoreLabel(score: number): { text: string; color: string } {
  if (score >= 80) return { text: "Optimal", color: "text-[var(--success)]" };
  if (score >= 60) return { text: "Good", color: "text-[var(--warning)]" };
  return { text: "Needs Work", color: "text-[var(--error)]" };
}

function getProficiencyPercent(level: string): number {
  switch (level) {
    case "expert":
      return 95;
    case "advanced":
      return 80;
    case "intermediate":
      return 60;
    case "beginner":
      return 35;
    default:
      return 50;
  }
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ============================================================================
// Animation Variants
// ============================================================================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

// ============================================================================
// Sub-Components
// ============================================================================

function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse glass-card p-6 ${className}`}>
      <div className="mb-4 h-4 w-1/3 rounded-lg bg-[var(--border-subtle)]" />
      <div className="mb-2 h-8 w-1/2 rounded-lg bg-[var(--border-subtle)]" />
      <div className="h-4 w-2/3 rounded-lg bg-[var(--border-subtle)]" />
    </div>
  );
}

function ATSGauge({ score }: { score: number }) {
  const radius = 70;
  const circumference = Math.PI * radius;
  const progress = (score / 100) * circumference;

  return (
    <div className="relative flex flex-col items-center">
      <svg
        width="180"
        height="100"
        viewBox="0 0 180 100"
        className="overflow-visible"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--error)" />
            <stop offset="50%" stopColor="var(--warning)" />
            <stop offset="100%" stopColor="var(--success)" />
          </linearGradient>
        </defs>
        {/* Background arc */}
        <path
          d="M 10 90 A 70 70 0 0 1 170 90"
          fill="none"
          stroke="var(--border-subtle)"
          strokeWidth="14"
          strokeLinecap="round"
        />
        {/* Progress arc */}
        <motion.path
          d="M 10 90 A 70 70 0 0 1 170 90"
          fill="none"
          stroke="url(#gaugeGradient)"
          strokeWidth="14"
          strokeLinecap="round"
          initial={{ strokeDasharray: `0 ${circumference}` }}
          animate={{ strokeDasharray: `${progress} ${circumference}` }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
        />
      </svg>
      <div className="absolute top-6 flex flex-col items-center">
        <motion.span
          className="text-4xl font-bold text-[var(--text-primary)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {score}
        </motion.span>
        <span className="text-sm text-[var(--text-muted)]">/100</span>
      </div>
    </div>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function ApplicantDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [hasProfile, setHasProfile] = useState(true);
  const [profileData, setProfileData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setError("Not authenticated");
          setLoading(false);
          return;
        }

        const { data: profile } = await supabase
          .from("skill_profiles")
          .select("id, work_experience, education, certifications")
          .eq("user_id", user.id)
          .single();

        if (!profile) {
          setHasProfile(false);
          setLoading(false);
          return;
        }

        setProfileData(profile as Record<string, unknown>);

        const [skillsResult, matchResult] = await Promise.all([
          supabase
            .from("skills")
            .select("*")
            .eq("skill_profile_id", profile.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("match_results")
            .select("*")
            .eq("applicant_id", user.id)
            .order("calculated_at", { ascending: false }),
        ]);

        const skills: Skill[] = skillsResult.data ?? [];
        const matchResults: MatchResult[] = matchResult.data ?? [];

        if (matchResults.length === 0 && skills.length === 0) {
          setHasProfile(false);
          setLoading(false);
          return;
        }

        const atsScore =
          matchResults.length > 0
            ? Math.round(
                matchResults.reduce((sum, m) => sum + m.match_percentage, 0) /
                  matchResults.length
              )
            : 0;

        const missingSkillsCount: Record<string, number> = {};
        matchResults.forEach((m) => {
          (m.missing_skills ?? []).forEach((skill) => {
            missingSkillsCount[skill] = (missingSkillsCount[skill] || 0) + 1;
          });
        });

        const hiddenGems: HiddenGem[] = Object.entries(missingSkillsCount)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([name, frequency]) => ({
            name,
            frequency,
            totalJobs: matchResults.length,
          }));

        const skillROI: SkillROIItem[] = Object.entries(missingSkillsCount)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([name, frequency]) => ({
            name,
            projectedImprovement: Math.round(
              (frequency / matchResults.length) * 25
            ),
          }));

        // Fetch top matched jobs with titles
        const topMatches = [...matchResults]
          .sort((a, b) => b.match_percentage - a.match_percentage)
          .slice(0, 5);

        let topMatchedJobs: TopMatchedJob[] = [];
        if (topMatches.length > 0) {
          const jobIds = topMatches.map((m) => m.job_description_id);
          const { data: jobsData } = await supabase
            .from("job_descriptions")
            .select("id, title")
            .in("id", jobIds);

          const jobTitleMap = new Map<string, string>();
          if (jobsData) {
            for (const job of jobsData) {
              jobTitleMap.set(job.id, job.title);
            }
          }

          topMatchedJobs = topMatches.map((m) => ({
            jobId: m.job_description_id,
            title: jobTitleMap.get(m.job_description_id) ?? "Untitled Position",
            matchPercentage: m.match_percentage,
            matchedSkills: m.matched_skills ?? [],
            missingSkills: m.missing_skills ?? [],
          }));
        }

        setData({
          atsScore,
          totalJobs: matchResults.length,
          skills,
          matchResults,
          hiddenGems,
          skillROI,
          topMatchedJobs,
          roleReadiness: null,
        });

        // Fetch career goal for role readiness
        const { data: profilePrefs } = await supabase
          .from("skill_profiles")
          .select("work_preferences")
          .eq("user_id", user.id)
          .single();

        if (profilePrefs?.work_preferences) {
          const prefs = profilePrefs.work_preferences as Record<string, unknown>;
          const goal = prefs.careerGoal as string | undefined;
          if (goal) {
            const readiness = computeRoleReadiness(goal, skills.map((s) => s.name));
            setData((prev) => prev ? { ...prev, roleReadiness: readiness } : prev);
          }
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err);
        setError("Failed to load dashboard data. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  const scoreLabel = useMemo(
    () => getScoreLabel(data?.atsScore ?? 0),
    [data?.atsScore]
  );

  // Loading State
  if (loading) {
    return (
      <main className="flex-1 p-6 md:p-8">
        <div className="mb-6">
          <div className="h-6 w-64 animate-pulse rounded-lg bg-[var(--border-subtle)]" />
          <div className="mt-2 h-4 w-40 animate-pulse rounded-lg bg-[var(--border-subtle)]" />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <SkeletonCard className="lg:row-span-1" />
          <SkeletonCard className="lg:row-span-1" />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </main>
    );
  }

  // Error State
  if (error) {
    return (
      <main className="flex-1 p-6 md:p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-20"
        >
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--error-bg)]">
            <svg className="h-8 w-8 text-[var(--error)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Something went wrong</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary mt-4 text-sm"
          >
            Try Again
          </button>
        </motion.div>
      </main>
    );
  }

  // No Data State — Blocking onboarding modal
  if (!hasProfile || !data) {
    return (
      <main className="flex-1 relative min-h-screen">
        {/* Centered blocking modal with landing page background */}
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-hero-gradient overflow-hidden">
          {/* Floating orbs matching landing page */}
          <div className="absolute top-[10%] right-[15%] h-64 w-64 rounded-full bg-[var(--orb-pink)] opacity-40 blur-3xl" aria-hidden="true" />
          <div className="absolute bottom-[15%] left-[10%] h-48 w-48 rounded-full bg-[var(--orb-blue)] opacity-40 blur-3xl" aria-hidden="true" />
          <div className="absolute top-[40%] left-[30%] h-36 w-36 rounded-full bg-[var(--orb-lavender)] opacity-30 blur-3xl" aria-hidden="true" />

          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="glass-card mx-4 max-w-md w-full p-8 text-center relative z-10"
          >
            {/* Icon */}
            <div className="mb-5 flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[var(--accent)] to-periwinkle shadow-lg">
                <svg className="h-10 w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-[var(--text-primary)]">Welcome to CareerFlow!</h2>
            <p className="mt-3 text-sm text-[var(--text-secondary)] leading-relaxed">
              Let&apos;s get you set up. We&apos;ll guide you through uploading your resume, setting your career goals, and finding your best job matches.
            </p>

            {/* Steps preview */}
            <div className="mt-6 space-y-3 text-left">
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[var(--accent-light)] text-xs font-bold text-[var(--accent)]">1</span>
                <span className="text-sm text-[var(--text-secondary)]">Choose your aspired role</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[var(--accent-light)] text-xs font-bold text-[var(--accent)]">2</span>
                <span className="text-sm text-[var(--text-secondary)]">Set your work preferences</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[var(--accent-light)] text-xs font-bold text-[var(--accent)]">3</span>
                <span className="text-sm text-[var(--text-secondary)]">Upload your resume for AI analysis</span>
              </div>
            </div>

            <Link
              href="/applicant/career-goals"
              className="btn-primary mt-8 w-full text-sm inline-block"
            >
              Get Started →
            </Link>

            <p className="mt-4 text-xs text-[var(--text-muted)]">
              Takes about 2 minutes to complete
            </p>
          </motion.div>
        </div>
      </main>
    );
  }

  // Main Dashboard
  return (
    <main className="flex-1 p-6 md:p-8 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)]">
          Resume Analysis Results
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">{formatDate()}</p>
      </motion.div>

      {/* Quick Actions — inline with icons */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-wrap items-center gap-3"
      >
        <Link href="/applicant/jobs" className="flex items-center gap-2 rounded-full bg-[var(--bg-secondary)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all">
          <svg className="h-4 w-4 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Job Listings
        </Link>
        <Link href="/applicant/profile" className="flex items-center gap-2 rounded-full bg-[var(--bg-secondary)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-purple-400 hover:text-purple-400 transition-all">
          <svg className="h-4 w-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Update Profile
        </Link>
        <Link href="/applicant/career-goals" className="flex items-center gap-2 rounded-full bg-[var(--bg-secondary)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-amber-400 hover:text-amber-400 transition-all">
          <svg className="h-4 w-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Career Goals
        </Link>
        <Link href="/applicant/applications" className="flex items-center gap-2 rounded-full bg-[var(--bg-secondary)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-cyan-400 hover:text-cyan-400 transition-all">
          <svg className="h-4 w-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Applied Jobs
        </Link>
        <Link href="/applicant/learning-paths" className="flex items-center gap-2 rounded-full bg-[var(--bg-secondary)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-rose-400 hover:text-rose-400 transition-all">
          <svg className="h-4 w-4 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422A12.083 12.083 0 0121 12.75v4.5M12 14v7.25M3.75 12.75v4.5a12.083 12.083 0 002.84 1.328L12 21.25" />
          </svg>
          Learning Paths
        </Link>
      </motion.div>

      {/* AI Career Insights */}
      <InsightsCard />

      {/* Dashboard Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid gap-6 lg:grid-cols-2"
      >
        {/* ATS Score Card */}
        <motion.div variants={itemVariants} className="glass-card p-6">
          <div className="flex flex-col items-center text-center">
            <ATSGauge score={data.atsScore} />
            <h2 className="mt-4 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)]">
              Resume ATS Score
            </h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Based on {data.totalJobs} targeted job description
              {data.totalJobs !== 1 ? "s" : ""}
            </p>
            <span className={`mt-3 badge-pill ${
              data.atsScore >= 80
                ? "bg-[var(--success-bg)] text-[var(--success-text)]"
                : data.atsScore >= 60
                ? "bg-[var(--warning-bg)] text-[var(--warning-text)]"
                : "bg-[var(--error-bg)] text-[var(--error-text)]"
            }`}>
              {scoreLabel.text}
            </span>
          </div>
        </motion.div>

        {/* Role Readiness Card */}
        {data.roleReadiness && (
          <motion.div variants={itemVariants} className="glass-card p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)]">
                Role Readiness
              </h2>
              <Link
                href="/applicant/career-goals"
                className="text-xs font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
              >
                Edit goal →
              </Link>
            </div>

            <p className="mb-3 text-sm font-medium text-[var(--text-primary)]">
              {data.roleReadiness.careerGoal}
            </p>

            {/* Progress bar */}
            <div className="mb-3 flex items-center gap-3">
              <div className="flex-1 h-3 overflow-hidden rounded-full bg-[var(--border-subtle)]">
                <motion.div
                  className={`h-full rounded-full ${
                    data.roleReadiness.percentage >= 75
                      ? "bg-[var(--success)]"
                      : data.roleReadiness.percentage >= 50
                      ? "bg-[var(--warning)]"
                      : "bg-[var(--error)]"
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${data.roleReadiness.percentage}%` }}
                  transition={{ duration: 1, ease: "easeOut", delay: 0.4 }}
                />
              </div>
              <span className={`text-lg font-bold ${
                data.roleReadiness.percentage >= 75
                  ? "text-[var(--success)]"
                  : data.roleReadiness.percentage >= 50
                  ? "text-[var(--warning)]"
                  : "text-[var(--error)]"
              }`}>
                {data.roleReadiness.percentage}%
              </span>
            </div>

            {/* Skill breakdown */}
            <div className="space-y-2">
              {data.roleReadiness.matched.length > 0 && (
                <div>
                  <p className="text-xs text-[var(--success-text)] mb-1">
                    ✓ {data.roleReadiness.matched.length} skills matched
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {data.roleReadiness.matched.slice(0, 4).map((s) => (
                      <span key={s} className="rounded-full bg-[var(--success-bg)] px-2 py-0.5 text-[10px] font-medium text-[var(--success-text)]">
                        {s}
                      </span>
                    ))}
                    {data.roleReadiness.matched.length > 4 && (
                      <span className="rounded-full bg-[var(--success-bg)] px-2 py-0.5 text-[10px] font-medium text-[var(--success-text)]">
                        +{data.roleReadiness.matched.length - 4}
                      </span>
                    )}
                  </div>
                </div>
              )}
              {data.roleReadiness.missing.length > 0 && (
                <div>
                  <p className="text-xs text-[var(--warning-text)] mb-1">
                    ✗ {data.roleReadiness.missing.length} skills to develop
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {data.roleReadiness.missing.slice(0, 4).map((s) => (
                      <span key={s} className="rounded-full bg-[var(--warning-bg)] px-2 py-0.5 text-[10px] font-medium text-[var(--warning-text)]">
                        {s}
                      </span>
                    ))}
                    {data.roleReadiness.missing.length > 4 && (
                      <span className="rounded-full bg-[var(--warning-bg)] px-2 py-0.5 text-[10px] font-medium text-[var(--warning-text)]">
                        +{data.roleReadiness.missing.length - 4}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Skills Overview Card */}
        <motion.div variants={itemVariants} className="glass-card p-6">
          <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)] mb-4">
            Your Skills
          </h2>
          {data.skills.length > 0 ? (
            <div className="space-y-3">
              {data.skills.slice(0, 5).map((skill) => {
                const percent = getProficiencyPercent(skill.proficiency_level);
                return (
                  <div key={skill.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-[var(--text-primary)]">
                        {skill.name}
                      </span>
                      <span className="text-xs text-[var(--text-muted)] capitalize">
                        {skill.proficiency_level}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--border-subtle)]">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-periwinkle"
                        initial={{ width: 0 }}
                        animate={{ width: `${percent}%` }}
                        transition={{ duration: 0.8, delay: 0.3 }}
                      />
                    </div>
                  </div>
                );
              })}
              {data.skills.length > 5 && (
                <Link
                  href="/applicant/profile"
                  className="mt-2 inline-block text-xs font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
                >
                  View all {data.skills.length} skills →
                </Link>
              )}
            </div>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">No skills found yet.</p>
          )}
        </motion.div>

        {/* Profile Completeness Card */}
        <motion.div variants={itemVariants} className="glass-card p-6">
          <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)] mb-4">
            Profile Completeness
          </h2>
          {(() => {
            const checks = [
              { label: "Resume uploaded", done: !!data.matchResults.length || data.skills.length > 0, href: "/applicant/career-goals" },
              { label: "Career goal set", done: !!data.roleReadiness, href: "/applicant/career-goals" },
              { label: "Skills added", done: data.skills.length >= 3, href: "/applicant/profile" },
              { label: "Work experience", done: !!(profileData?.work_experience as unknown[])?.length, href: "/applicant/profile" },
              { label: "Education added", done: !!(profileData?.education as unknown[])?.length, href: "/applicant/profile" },
            ];
            const completed = checks.filter((c) => c.done).length;
            const percent = Math.round((completed / checks.length) * 100);

            return (
              <>
                {/* Circular progress */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative h-16 w-16 flex-shrink-0">
                    <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
                      <circle cx="18" cy="18" r="14" fill="none" stroke="var(--border-subtle)" strokeWidth="3" />
                      <motion.circle
                        cx="18" cy="18" r="14" fill="none"
                        stroke="var(--accent)" strokeWidth="3" strokeLinecap="round"
                        initial={{ strokeDasharray: "0 88" }}
                        animate={{ strokeDasharray: `${(percent / 100) * 88} 88` }}
                        transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-[var(--text-primary)]">
                      {percent}%
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{completed}/{checks.length} completed</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {percent === 100 ? "Your profile is complete!" : "Complete your profile to improve visibility"}
                    </p>
                  </div>
                </div>

                {/* Checklist */}
                <div className="space-y-2">
                  {checks.map((check) => (
                    <Link
                      key={check.label}
                      href={check.href}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs transition-colors hover:bg-[var(--bg-secondary)]"
                    >
                      {check.done ? (
                        <svg className="h-4 w-4 flex-shrink-0 text-[var(--success)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4 flex-shrink-0 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <circle cx="12" cy="12" r="9" strokeWidth={2} />
                        </svg>
                      )}
                      <span className={check.done ? "text-[var(--text-secondary)] line-through" : "text-[var(--text-primary)] font-medium"}>
                        {check.label}
                      </span>
                    </Link>
                  ))}
                </div>
              </>
            );
          })()}
        </motion.div>

        {/* Skills to Learn — what's missing and how much it would boost your match */}
        <motion.div variants={itemVariants} className="glass-card p-6 lg:col-span-2">
          <div className="mb-1">
            <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)]">
              Skills to Learn
            </h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              These skills appear most often in jobs you&apos;re missing out on. Learning them could boost your match scores.
            </p>
          </div>
          {data.hiddenGems.length > 0 ? (
            <div className="mt-4 space-y-2.5">
              {data.hiddenGems.map((gem) => {
                const roi = data.skillROI.find((r) => r.name === gem.name);
                return (
                  <div
                    key={gem.name}
                    className="flex items-center justify-between rounded-xl bg-[var(--bg-secondary)] px-4 py-3 border border-[var(--border-subtle)]"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-[var(--text-primary)]">
                        {gem.name}
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">
                        Required by {gem.frequency} of {gem.totalJobs} jobs
                      </span>
                    </div>
                    {roi && (
                      <span className="badge-pill bg-[var(--success-bg)] text-[var(--success-text)] whitespace-nowrap">
                        +{roi.projectedImprovement}% match
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 text-sm text-[var(--text-muted)]">
              No skill gap data yet. Once you have match results, we&apos;ll show which skills would improve your scores the most.
            </p>
          )}
        </motion.div>

        {/* Top Matched Jobs Card */}
        <motion.div variants={itemVariants} className="glass-card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)]">
              Top Matched Jobs
            </h2>
            <Link
              href="/applicant/jobs"
              className="text-xs font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
            >
              View all jobs →
            </Link>
          </div>
          {data.topMatchedJobs.length > 0 ? (
            <div className="space-y-2">
              {data.topMatchedJobs.map((job, index) => {
                const pct = job.matchPercentage;
                const badgeColor = pct >= 80
                  ? "text-green-400 border-green-500/40"
                  : pct >= 60
                  ? "text-yellow-400 border-yellow-500/40"
                  : "text-rose-400 border-rose-500/40";

                return (
                  <Link
                    key={job.jobId}
                    href={`/applicant/jobs/${job.jobId}`}
                    className="flex items-center gap-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4 py-3.5 transition-all hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-500/5 group"
                  >
                    {/* Rank circle */}
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[var(--bg-card-solid)] text-sm font-semibold text-[var(--text-muted)] border border-[var(--border-subtle)] group-hover:border-[var(--accent)] group-hover:text-[var(--accent)] transition-colors">
                      {index + 1}
                    </span>

                    {/* Job info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[var(--text-primary)] truncate group-hover:text-[var(--accent)] transition-colors">
                        {job.title}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        {job.matchedSkills.length} skill{job.matchedSkills.length !== 1 ? "s" : ""} matched
                        {job.missingSkills.length > 0 && (
                          <span> · {job.missingSkills.length} missing</span>
                        )}
                      </p>
                    </div>

                    {/* Match percentage */}
                    <span className={`flex-shrink-0 inline-flex items-center rounded-full border px-3 py-1 text-sm font-bold ${badgeColor}`}>
                      {pct}%
                    </span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-[var(--text-muted)]">
                No job matches yet. Upload your resume and we&apos;ll match you with available positions.
              </p>
              <Link href="/applicant/profile" className="btn-primary mt-3 text-xs inline-block">
                Upload Resume
              </Link>
            </div>
          )}
        </motion.div>
      </motion.div>
    </main>
  );
}
