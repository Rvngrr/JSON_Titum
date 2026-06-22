"use client";

import { useCallback, useEffect, useState } from "react";
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

  if (loading) {
    return (
      <main className="flex-1 p-6 md:p-8">
        <div className="flex items-center justify-center py-12" role="status" aria-live="polite">
          <svg className="h-6 w-6 animate-spin text-[var(--accent)]" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="ml-2 text-sm text-[var(--text-secondary)]">Loading profile...</span>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 p-6 md:p-8">
      <motion.div
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
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Total Experience:{" "}
              <span className="font-medium text-[var(--text-primary)]">
                {profileData.total_years_experience} years
              </span>
            </p>
          )}
      </motion.div>

      {recalculating && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mb-4 glass-card p-3 border-l-4 border-l-[var(--accent)]"
          role="status"
          aria-live="polite"
        >
          <p className="text-sm text-[var(--accent)]">Recalculating match scores...</p>
        </motion.div>
      )}

      <div className="space-y-8">
        {/* Resume Upload Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          aria-labelledby="resume-section-heading"
        >
          <h2 id="resume-section-heading" className="mb-4 text-sm font-semibold text-[var(--text-primary)]">
            Resume
          </h2>
          <div className="glass-card p-6">
            <ResumeUpload onSkillsExtracted={handleSkillsExtracted} />
          </div>
        </motion.section>

        {/* Skills Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          aria-labelledby="skills-section-heading"
        >
          <h2 id="skills-section-heading" className="mb-4 text-sm font-semibold text-[var(--text-primary)]">
            Skills
          </h2>
          {skills.length > 0 && (
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="text-xs text-[var(--text-muted)]">Proficiency levels:</span>
              <ProficiencyBadge level="beginner" />
              <ProficiencyBadge level="intermediate" />
              <ProficiencyBadge level="advanced" />
              <ProficiencyBadge level="expert" />
            </div>
          )}
          {skills.length > 0 && (
            <div className="glass-card p-4 mb-4">
              <h3 className="mb-2 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                Learning Activity
              </h3>
              <div className="space-y-1.5">
                {skills
                  .filter((s) => s.added_at || s.last_used_at)
                  .slice(0, 5)
                  .map((skill) => (
                    <div key={skill.id} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2">
                        <ProficiencyBadge level={skill.proficiency_level} />
                        <span className="text-[var(--text-primary)]">{skill.name}</span>
                      </span>
                      {skill.last_used_at && (
                        <span className="text-[var(--text-muted)]">
                          Last used: {new Date(skill.last_used_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}
          <div className="glass-card p-6">
            <SkillProfile key={skillsKey} onSkillsChanged={handleSkillsChanged} />
          </div>
        </motion.section>

        {/* Work Experience Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">Work Experience</h2>
          <div className="glass-card p-6">
            <WorkExperienceForm
              entries={(profileData?.work_experience as WorkExperienceEntry[]) ?? []}
              onSave={saveWorkExperience}
            />
          </div>
        </motion.section>

        {/* Education Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">Education</h2>
          <div className="glass-card p-6">
            <EducationForm
              entries={(profileData?.education as EducationEntry[]) ?? []}
              onSave={saveEducation}
            />
          </div>
        </motion.section>

        {/* Certifications Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h2 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">Certifications</h2>
          <div className="glass-card p-6">
            <CertificationsForm
              entries={(profileData?.certifications as CertificationEntry[]) ?? []}
              onSave={saveCertifications}
            />
          </div>
        </motion.section>

        {/* Work Preferences Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <h2 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">Work Preferences</h2>
          <div className="glass-card p-6">
            <WorkPreferencesForm
              preferences={(profileData?.work_preferences as WorkPreferences) ?? { workMode: "", jobType: "", location: "" }}
              onSave={saveWorkPreferences}
            />
          </div>
        </motion.section>

        {/* External Profiles Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <h2 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">External Profiles</h2>
          <div className="glass-card p-6">
            <ExternalProfilesForm
              urls={(profileData?.external_urls as ExternalUrls) ?? { linkedin: "", github: "", portfolio: "" }}
              onSave={saveExternalUrls}
            />
          </div>
        </motion.section>
      </div>
    </main>
  );
}
