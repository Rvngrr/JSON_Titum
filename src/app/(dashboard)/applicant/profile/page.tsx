"use client";

import { useCallback, useEffect, useState } from "react";
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

  // Load profile data including enhanced fields
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

          // Load skills with timestamp fields
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
  }, []);

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
        prev
          ? { ...prev, work_experience: entries, total_years_experience: totalYears }
          : prev
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
        .update({
          education: entries,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profileData.id);

      if (error) throw error;

      setProfileData((prev) =>
        prev ? { ...prev, education: entries } : prev
      );
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
        .update({
          certifications: entries,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profileData.id);

      if (error) throw error;

      setProfileData((prev) =>
        prev ? { ...prev, certifications: entries } : prev
      );
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
        .update({
          work_preferences: preferences,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profileData.id);

      if (error) throw error;

      setProfileData((prev) =>
        prev ? { ...prev, work_preferences: preferences } : prev
      );
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
        .update({
          external_urls: urls,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profileData.id);

      if (error) throw error;

      setProfileData((prev) =>
        prev ? { ...prev, external_urls: urls } : prev
      );
    },
    [profileData]
  );

  if (loading) {
    return (
      <main className="flex-1 p-8">
        <div className="flex items-center justify-center py-12" role="status" aria-live="polite">
          <svg
            className="h-6 w-6 animate-spin text-blue-600"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="ml-2 text-sm text-gray-600">Loading profile...</span>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="mt-1 text-sm text-gray-600">
          Upload your resume to auto-extract skills, or manage your profile manually.
        </p>
        {profileData?.total_years_experience != null &&
          profileData.total_years_experience > 0 && (
            <p className="mt-1 text-sm text-gray-500">
              Total Experience:{" "}
              <span className="font-medium text-gray-700">
                {profileData.total_years_experience} years
              </span>
            </p>
          )}
      </div>

      {recalculating && (
        <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 p-3" role="status" aria-live="polite">
          <p className="text-sm text-blue-700">Recalculating match scores...</p>
        </div>
      )}

      <div className="space-y-8">
        {/* Resume Upload Section */}
        <section aria-labelledby="resume-section-heading">
          <h2
            id="resume-section-heading"
            className="mb-4 text-lg font-semibold text-gray-800"
          >
            Resume
          </h2>
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <ResumeUpload onSkillsExtracted={handleSkillsExtracted} />
          </div>
        </section>

        {/* Skills Section with Proficiency Badges */}
        <section aria-labelledby="skills-section-heading">
          <h2
            id="skills-section-heading"
            className="mb-4 text-lg font-semibold text-gray-800"
          >
            Skills
          </h2>
          {/* Proficiency badge legend */}
          {skills.length > 0 && (
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-500">Proficiency levels:</span>
              <ProficiencyBadge level="beginner" />
              <ProficiencyBadge level="intermediate" />
              <ProficiencyBadge level="advanced" />
              <ProficiencyBadge level="expert" />
            </div>
          )}
          {/* Skills with timestamps */}
          {skills.length > 0 && (
            <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
              <h3 className="mb-2 text-xs font-semibold text-gray-600">
                Learning Activity
              </h3>
              <div className="space-y-1.5">
                {skills
                  .filter((s) => s.added_at || s.last_used_at)
                  .slice(0, 5)
                  .map((skill) => (
                    <div
                      key={skill.id}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="flex items-center gap-2">
                        <ProficiencyBadge level={skill.proficiency_level} />
                        <span className="text-gray-700">{skill.name}</span>
                      </span>
                      <span className="text-gray-400">
                        {skill.last_used_at
                          ? `Used: ${new Date(skill.last_used_at).toLocaleDateString()}`
                          : skill.added_at
                          ? `Added: ${new Date(skill.added_at).toLocaleDateString()}`
                          : ""}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
          <SkillProfile key={skillsKey} onSkillsChanged={handleSkillsChanged} />
        </section>

        {/* Work Experience Section */}
        <section aria-labelledby="work-experience-heading">
          <h2
            id="work-experience-heading"
            className="mb-4 text-lg font-semibold text-gray-800"
          >
            Work Experience
          </h2>
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <WorkExperienceForm
              entries={
                (profileData?.work_experience as WorkExperienceEntry[]) ?? []
              }
              onSave={saveWorkExperience}
            />
          </div>
        </section>

        {/* Education Section */}
        <section aria-labelledby="education-heading">
          <h2
            id="education-heading"
            className="mb-4 text-lg font-semibold text-gray-800"
          >
            Education
          </h2>
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <EducationForm
              entries={(profileData?.education as EducationEntry[]) ?? []}
              onSave={saveEducation}
            />
          </div>
        </section>

        {/* Certifications Section */}
        <section aria-labelledby="certifications-heading">
          <h2
            id="certifications-heading"
            className="mb-4 text-lg font-semibold text-gray-800"
          >
            Certifications
          </h2>
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <CertificationsForm
              entries={
                (profileData?.certifications as CertificationEntry[]) ?? []
              }
              onSave={saveCertifications}
            />
          </div>
        </section>

        {/* Work Preferences Section */}
        <section aria-labelledby="work-preferences-heading">
          <h2
            id="work-preferences-heading"
            className="mb-4 text-lg font-semibold text-gray-800"
          >
            Work Preferences
          </h2>
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <WorkPreferencesForm
              preferences={
                (profileData?.work_preferences as WorkPreferences) ?? {}
              }
              onSave={saveWorkPreferences}
            />
          </div>
        </section>

        {/* External Profile Links Section */}
        <section aria-labelledby="external-profiles-heading">
          <h2
            id="external-profiles-heading"
            className="mb-4 text-lg font-semibold text-gray-800"
          >
            External Profiles
          </h2>
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <ExternalProfilesForm
              urls={(profileData?.external_urls as ExternalUrls) ?? {}}
              onSave={saveExternalUrls}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
