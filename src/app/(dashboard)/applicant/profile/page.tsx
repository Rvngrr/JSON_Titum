"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import ResumeUpload from "@/components/applicant/ResumeUpload";
import SkillProfile from "@/components/applicant/SkillProfile";
import WorkExperienceForm from "@/components/applicant/WorkExperienceForm";
import EducationForm from "@/components/applicant/EducationForm";
import CertificationsForm from "@/components/applicant/CertificationsForm";
import WorkPreferencesForm from "@/components/applicant/WorkPreferencesForm";
import ExternalProfilesForm from "@/components/applicant/ExternalProfilesForm";
import ProficiencyBadge from "@/components/applicant/ProficiencyBadge";
import { calculateTotalYearsExperience } from "@/lib/profile/calculate-experience";
import type {
  WorkExperienceEntry,
  EducationEntry,
  CertificationEntry,
  WorkPreferences,
  ExternalUrls,
  SkillProfile as SkillProfileType,
} from "@/types";

interface SkillWithTimestamps {
  id: string;
  name: string;
  proficiency_level: "beginner" | "intermediate" | "advanced" | "expert";
  source: "resume_parsed" | "manual";
  created_at: string;
  added_at?: string | null;
  last_used_at?: string | null;
}

// ============================================================================
// Animation Variants
// ============================================================================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
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

function ProfileCompletenessCard({ profileData, skills }: { profileData: SkillProfileType | null; skills: SkillWithTimestamps[] }) {
  const sections = useMemo(() => {
    if (!profileData) return { completed: 0, total: 7, items: [] };

    const items = [
      { label: "Resume", done: !!profileData.resume_file_path },
      { label: "Skills", done: skills.length > 0 },
      { label: "Work Experience", done: Array.isArray(profileData.work_experience) && (profileData.work_experience as WorkExperienceEntry[]).length > 0 },
      { label: "Education", done: Array.isArray(profileData.education) && (profileData.education as EducationEntry[]).length > 0 },
      { label: "Certifications", done: Array.isArray(profileData.certifications) && (profileData.certifications as CertificationEntry[]).length > 0 },
      { label: "Work Preferences", done: !!(profileData.work_preferences as WorkPreferences)?.workMode },
      { label: "External Profiles", done: !!(profileData.external_urls as ExternalUrls)?.linkedin || !!(profileData.external_urls as ExternalUrls)?.github },
    ];

    return { completed: items.filter((i) => i.done).length, total: items.length, items };
  }, [profileData, skills]);

  const percentage = Math.round((sections.completed / sections.total) * 100);

  return (
    <>
      <div className="flex items-center gap-4 mb-4">
        <span className="text-3xl font-bold text-[var(--text-primary)]">{percentage}%</span>
        <span className="text-xs text-[var(--text-muted)]">{sections.completed}/{sections.total} sections</span>
      </div>
      {/* Progress bar */}
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--border-subtle)] mb-4">
        <motion.div
          className="h-full rounded-full"
          style={{ background: "linear-gradient(90deg, var(--accent), #C9B8F7)" }}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
        />
      </div>
      {/* Section checklist */}
      <div className="space-y-2">
        {sections.items.map((item) => (
          <div key={item.label} className="flex items-center gap-2 text-xs">
            {item.done ? (
              <svg className="h-3.5 w-3.5 text-[var(--success)]" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="h-3.5 w-3.5 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="10" strokeWidth={2} />
              </svg>
            )}
            <span className={item.done ? "text-[var(--text-secondary)]" : "text-[var(--text-muted)]"}>{item.label}</span>
          </div>
        ))}
      </div>
    </>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function ApplicantProfilePage() {
  const [skillsKey, setSkillsKey] = useState(0);
  const [recalculating, setRecalculating] = useState(false);
  const [profileData, setProfileData] = useState<SkillProfileType | null>(null);
  const [skills, setSkills] = useState<SkillWithTimestamps[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const { data: profile } = await supabase
          .from("skill_profiles")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (profile) {
          setProfileData(profile);
          const { data: skillsData } = await supabase
            .from("skills")
            .select("*")
            .eq("skill_profile_id", profile.id)
            .order("created_at", { ascending: false });

          if (skillsData) {
            setSkills(skillsData);
          }
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [skillsKey]);

  const triggerMatchRecalculation = useCallback(async () => {
    try {
      setRecalculating(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const response = await fetch("/api/match/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicant_id: user.id }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        console.error("Match recalculation failed:", response.status, data);
      }
    } catch (err) {
      console.error("Match recalculation failed:", err);
    } finally {
      setRecalculating(false);
    }
  }, []);

  const handleSkillsExtracted = useCallback(() => {
    setSkillsKey((prev) => prev + 1);
    triggerMatchRecalculation();
  }, [triggerMatchRecalculation]);

  const handleSkillsChanged = useCallback(() => {
    triggerMatchRecalculation();
  }, [triggerMatchRecalculation]);

  const saveWorkExperience = useCallback(
    async (entries: WorkExperienceEntry[]) => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !profileData) throw new Error("Not authenticated");

      const totalYears = calculateTotalYearsExperience(entries);
      const { error } = await supabase
        .from("skill_profiles")
        .update({
          work_experience: entries,
          total_years_experience: totalYears,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profileData.id);

      if (error) throw error;
      setProfileData((prev) =>
        prev ? { ...prev, work_experience: entries, total_years_experience: totalYears } : prev
      );
    },
    [profileData]
  );

  const saveEducation = useCallback(
    async (entries: EducationEntry[]) => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !profileData) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("skill_profiles")
        .update({ education: entries, updated_at: new Date().toISOString() })
        .eq("id", profileData.id);

      if (error) throw error;
      setProfileData((prev) => (prev ? { ...prev, education: entries } : prev));
    },
    [profileData]
  );

  const saveCertifications = useCallback(
    async (entries: CertificationEntry[]) => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !profileData) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("skill_profiles")
        .update({ certifications: entries, updated_at: new Date().toISOString() })
        .eq("id", profileData.id);

      if (error) throw error;
      setProfileData((prev) => (prev ? { ...prev, certifications: entries } : prev));
    },
    [profileData]
  );

  const saveWorkPreferences = useCallback(
    async (preferences: WorkPreferences) => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !profileData) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("skill_profiles")
        .update({ work_preferences: preferences, updated_at: new Date().toISOString() })
        .eq("id", profileData.id);

      if (error) throw error;
      setProfileData((prev) => (prev ? { ...prev, work_preferences: preferences } : prev));
    },
    [profileData]
  );

  const saveExternalUrls = useCallback(
    async (urls: ExternalUrls) => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !profileData) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("skill_profiles")
        .update({ external_urls: urls, updated_at: new Date().toISOString() })
        .eq("id", profileData.id);

      if (error) throw error;
      setProfileData((prev) => (prev ? { ...prev, external_urls: urls } : prev));
    },
    [profileData]
  );

  // ============================================================================
  // Loading State
  // ============================================================================

  if (loading) {
    return (
      <main className="flex-1 p-6 md:p-10">
        <div className="mx-auto max-w-3xl space-y-6">
          <div>
            <div className="h-4 w-32 animate-pulse rounded-lg bg-[var(--border-subtle)]" />
            <div className="mt-2 h-4 w-64 animate-pulse rounded-lg bg-[var(--border-subtle)]" />
          </div>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </main>
    );
  }

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <main className="flex-1 p-6 md:p-10">
      <div className="mx-auto max-w-5xl">
        {/* Page Header */}
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)]">
            My Profile
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Upload your resume to auto-extract skills, or manage your profile manually.
          </p>
          {profileData?.total_years_experience != null &&
            profileData.total_years_experience > 0 && (
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                Total Experience:{" "}
                <span className="font-medium text-[var(--text-primary)]">
                  {profileData.total_years_experience} years
                </span>
              </p>
            )}
        </motion.header>

        {recalculating && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mb-6 glass-card p-4 border-l-4 border-l-[var(--accent)] flex items-center gap-3"
            role="status"
            aria-live="polite"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--accent)]" />
            </span>
            <p className="text-sm font-medium text-[var(--accent)]">Recalculating match scores...</p>
          </motion.div>
        )}

        {/* Uniform 2-Column Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 gap-5 md:grid-cols-2"
        >
          {/* Resume Upload */}
          <motion.section variants={itemVariants} aria-labelledby="resume-heading">
            <div className="glass-card p-6 h-full">
              <h2 id="resume-heading" className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)] mb-4 flex items-center gap-2">
                <svg className="h-4 w-4 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Resume
              </h2>
              <ResumeUpload onSkillsExtracted={handleSkillsExtracted} />
            </div>
          </motion.section>

          {/* Profile Completeness */}
          <motion.div variants={itemVariants}>
            <div className="glass-card p-6 h-full">
              <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)] mb-4 flex items-center gap-2">
                <svg className="h-4 w-4 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Profile Completeness
              </h3>
              <ProfileCompletenessCard profileData={profileData} skills={skills} />
            </div>
          </motion.div>

          {/* Skills */}
          <motion.section variants={itemVariants} aria-labelledby="skills-heading">
            <div className="glass-card p-6 h-full">
              <h2 id="skills-heading" className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)] mb-4 flex items-center gap-2">
                <svg className="h-4 w-4 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Skills
              </h2>
              {skills.length > 0 && (
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-[var(--text-muted)]">Levels:</span>
                  <ProficiencyBadge level="beginner" />
                  <ProficiencyBadge level="intermediate" />
                  <ProficiencyBadge level="advanced" />
                  <ProficiencyBadge level="expert" />
                </div>
              )}
              <SkillProfile key={skillsKey} onSkillsChanged={handleSkillsChanged} />
            </div>
          </motion.section>

          {/* Learning Activity */}
          <motion.div variants={itemVariants}>
            <div className="glass-card p-6 h-full">
              <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)] mb-4 flex items-center gap-2">
                <svg className="h-4 w-4 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Learning Activity
              </h3>
              {skills.filter((s) => s.added_at || s.last_used_at).length > 0 ? (
                <div className="space-y-3">
                  {skills.filter((s) => s.added_at || s.last_used_at).slice(0, 6).map((skill) => (
                    <div key={skill.id} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2">
                        <ProficiencyBadge level={skill.proficiency_level} />
                        <span className="text-[var(--text-primary)] font-medium">{skill.name}</span>
                      </span>
                      {skill.last_used_at && (
                        <span className="text-[var(--text-muted)]">{new Date(skill.last_used_at).toLocaleDateString(undefined, { month: "short", year: "numeric" })}</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[var(--text-muted)]">Skill activity will appear here as you use the platform.</p>
              )}
            </div>
          </motion.div>

          {/* Work Experience */}
          <motion.section variants={itemVariants}>
            <div className="glass-card p-6 h-full">
              <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)] mb-4 flex items-center gap-2">
                <svg className="h-4 w-4 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Work Experience
              </h2>
              <WorkExperienceForm entries={(profileData?.work_experience as WorkExperienceEntry[]) ?? []} onSave={saveWorkExperience} />
            </div>
          </motion.section>

          {/* Education */}
          <motion.section variants={itemVariants}>
            <div className="glass-card p-6 h-full">
              <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)] mb-4 flex items-center gap-2">
                <svg className="h-4 w-4 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                </svg>
                Education
              </h2>
              <EducationForm entries={(profileData?.education as EducationEntry[]) ?? []} onSave={saveEducation} />
            </div>
          </motion.section>

          {/* Certifications */}
          <motion.section variants={itemVariants}>
            <div className="glass-card p-6 h-full">
              <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)] mb-4 flex items-center gap-2">
                <svg className="h-4 w-4 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
                Certifications
              </h2>
              <CertificationsForm entries={(profileData?.certifications as CertificationEntry[]) ?? []} onSave={saveCertifications} />
            </div>
          </motion.section>

          {/* Work Preferences */}
          <motion.section variants={itemVariants}>
            <div className="glass-card p-6 h-full">
              <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)] mb-4 flex items-center gap-2">
                <svg className="h-4 w-4 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Work Preferences
              </h2>
              <WorkPreferencesForm preferences={(profileData?.work_preferences as WorkPreferences) ?? { workMode: "", jobType: "", location: "" }} onSave={saveWorkPreferences} />
            </div>
          </motion.section>

          {/* External Profiles — Full Width */}
          <motion.section variants={itemVariants} className="md:col-span-2">
            <div className="glass-card p-6 h-full">
              <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)] mb-4 flex items-center gap-2">
                <svg className="h-4 w-4 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                External Profiles
              </h2>
              <ExternalProfilesForm urls={(profileData?.external_urls as ExternalUrls) ?? { linkedin: "", github: "", portfolio: "" }} onSave={saveExternalUrls} />
            </div>
          </motion.section>
        </motion.div>
      </div>
    </main>
  );
}
