"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import SkillProfile from "@/components/applicant/SkillProfile";
import WorkExperienceForm from "@/components/applicant/WorkExperienceForm";
import EducationForm from "@/components/applicant/EducationForm";
import CertificationsForm from "@/components/applicant/CertificationsForm";
import ExternalProfilesForm from "@/components/applicant/ExternalProfilesForm";
import ProficiencyBadge from "@/components/applicant/ProficiencyBadge";
import { calculateTotalYearsExperience } from "@/lib/profile/calculate-experience";
import type {
  WorkExperienceEntry,
  EducationEntry,
  CertificationEntry,
  ExternalUrls,
  SkillProfile as SkillProfileType,
} from "@/types";
import ShareProfileModal from "@/components/applicant/ShareProfileModal";

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
  const [resumeFilename, setResumeFilename] = useState<string | null>(null);
  const [careerGoal, setCareerGoal] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");

  // Profile picture & banner state
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [uploadingPic, setUploadingPic] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const picInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        setUserName(user.user_metadata?.name || "");
        setUserEmail(user.email || "");

        const { data: profile } = await supabase
          .from("skill_profiles")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (profile) {
          setProfileData(profile);
          if (profile.resume_file_path) {
            const parts = (profile.resume_file_path as string).split("/");
            setResumeFilename(parts[parts.length - 1]);
          }
          const prefs = profile.work_preferences as Record<string, unknown> | null;
          if (prefs?.careerGoal) setCareerGoal(prefs.careerGoal as string);
          if (profile.profile_picture_url) setProfilePicUrl(profile.profile_picture_url as string);
          if (profile.banner_url) setBannerUrl(profile.banner_url as string);

          const { data: skillsData } = await supabase
            .from("skills")
            .select("*")
            .eq("skill_profile_id", profile.id)
            .order("created_at", { ascending: false });
          if (skillsData) setSkills(skillsData);
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
      await fetch("/api/match/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicant_id: user.id }),
      });
    } catch (err) {
      console.error("Match recalculation failed:", err);
    } finally {
      setRecalculating(false);
    }
  }, []);

  const handleSkillsChanged = useCallback(() => { triggerMatchRecalculation(); }, [triggerMatchRecalculation]);

  // Image upload handler (profile pic or banner)
  const handleImageUpload = useCallback(async (file: File, type: "profile" | "banner") => {
    if (type === "profile") setUploadingPic(true);
    else setUploadingBanner(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Convert to base64 data URL for simple storage (no extra Supabase bucket needed)
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;

        if (type === "profile") {
          setProfilePicUrl(dataUrl);
          await supabase.from("skill_profiles").update({ profile_picture_url: dataUrl, updated_at: new Date().toISOString() }).eq("user_id", user.id);
        } else {
          setBannerUrl(dataUrl);
          await supabase.from("skill_profiles").update({ banner_url: dataUrl, updated_at: new Date().toISOString() }).eq("user_id", user.id);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(`Failed to upload ${type}:`, err);
    } finally {
      if (type === "profile") setUploadingPic(false);
      else setUploadingBanner(false);
    }
  }, []);

  const saveWorkExperience = useCallback(async (entries: WorkExperienceEntry[]) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !profileData) throw new Error("Not authenticated");
    const totalYears = calculateTotalYearsExperience(entries);
    const { error } = await supabase.from("skill_profiles").update({ work_experience: entries, total_years_experience: totalYears, updated_at: new Date().toISOString() }).eq("id", profileData.id);
    if (error) throw error;
    setProfileData((prev) => prev ? { ...prev, work_experience: entries, total_years_experience: totalYears } : prev);
  }, [profileData]);

  const saveEducation = useCallback(async (entries: EducationEntry[]) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !profileData) throw new Error("Not authenticated");
    const { error } = await supabase.from("skill_profiles").update({ education: entries, updated_at: new Date().toISOString() }).eq("id", profileData.id);
    if (error) throw error;
    setProfileData((prev) => (prev ? { ...prev, education: entries } : prev));
  }, [profileData]);

  const saveCertifications = useCallback(async (entries: CertificationEntry[]) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !profileData) throw new Error("Not authenticated");
    const { error } = await supabase.from("skill_profiles").update({ certifications: entries, updated_at: new Date().toISOString() }).eq("id", profileData.id);
    if (error) throw error;
    setProfileData((prev) => (prev ? { ...prev, certifications: entries } : prev));
  }, [profileData]);

  const saveExternalUrls = useCallback(async (urls: ExternalUrls) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !profileData) throw new Error("Not authenticated");
    const { error } = await supabase.from("skill_profiles").update({ external_urls: urls, updated_at: new Date().toISOString() }).eq("id", profileData.id);
    if (error) throw error;
    setProfileData((prev) => (prev ? { ...prev, external_urls: urls } : prev));
  }, [profileData]);

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
    <main className="flex-1 p-0 md:p-0">
      {/* Profile Banner & Avatar Header */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative">
        {/* Banner */}
        <div
          className="relative h-40 md:h-52 w-full overflow-hidden rounded-b-2xl cursor-pointer group"
          onClick={() => bannerInputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Click to change banner image"
          onKeyDown={(e) => { if (e.key === "Enter") bannerInputRef.current?.click(); }}
        >
          {bannerUrl ? (
            <Image src={bannerUrl} alt="Profile banner" fill className="object-cover" unoptimized />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-[var(--orb-blue)] via-[var(--orb-lavender)] to-[var(--orb-pink)] opacity-60" />
          )}
          {/* Overlay on hover */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
            <span className="text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
              {uploadingBanner ? "Uploading..." : "Change Banner"}
            </span>
          </div>
          <input
            ref={bannerInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { if (e.target.files?.[0]) handleImageUpload(e.target.files[0], "banner"); }}
          />
        </div>

        {/* Profile Picture */}
        <div className="absolute -bottom-14 left-6 md:left-10">
          <div
            className="relative h-28 w-28 rounded-full border-4 border-[var(--bg-card-solid)] overflow-hidden cursor-pointer group shadow-lg"
            onClick={() => picInputRef.current?.click()}
            role="button"
            tabIndex={0}
            aria-label="Click to change profile picture"
            onKeyDown={(e) => { if (e.key === "Enter") picInputRef.current?.click(); }}
          >
            {profilePicUrl ? (
              <Image src={profilePicUrl} alt="Profile picture" fill className="object-cover" unoptimized />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-[var(--accent)] to-periwinkle">
                <span className="text-3xl font-bold text-white">
                  {userName ? userName.charAt(0).toUpperCase() : "?"}
                </span>
              </div>
            )}
            {/* Overlay on hover */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 rounded-full transition-colors">
              <svg className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            {uploadingPic && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                <svg className="h-5 w-5 animate-spin text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              </div>
            )}
            <input
              ref={picInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { if (e.target.files?.[0]) handleImageUpload(e.target.files[0], "profile"); }}
            />
          </div>
        </div>
      </motion.div>

      {/* Name & Info (below avatar) */}
      <div className="px-6 md:px-10 pt-16 pb-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">{userName || "Your Name"}</h1>
              <p className="text-sm text-[var(--text-secondary)]">{userEmail}</p>
            </div>
            <button
              type="button"
              onClick={() => setShowShareModal(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-all hover:border-[var(--accent)] hover:text-[var(--accent)]"
              aria-label="Share profile"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share
            </button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {careerGoal && (
              <span className="badge-pill bg-[var(--accent-light)] text-[var(--accent)] text-xs">
                {careerGoal}
              </span>
            )}
            {profileData?.total_years_experience != null && profileData.total_years_experience > 0 && (
              <span className="badge-pill bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-subtle)] text-xs">
                {profileData.total_years_experience} yrs experience
              </span>
            )}
            {resumeFilename && (
              <span className="badge-pill bg-[var(--success-bg)] text-[var(--success-text)] text-xs">
                Resume uploaded
              </span>
            )}
          </div>
        </motion.div>
      </div>

      {/* Main Content */}
      <div className="px-6 md:px-10 pb-10 space-y-8">
        {recalculating && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-3 border-l-4 border-l-[var(--accent)]" role="status" aria-live="polite">
            <p className="text-sm text-[var(--accent)]">Recalculating match scores...</p>
          </motion.div>
        )}

        {/* Resume & Career Goal Quick Info */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="glass-card p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-light)]">
                <svg className="h-5 w-5 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">Resume & career goal managed in Career Goals</p>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {resumeFilename ? resumeFilename : "No resume yet"}{careerGoal ? ` · Aspiring ${careerGoal}` : ""}
                </p>
              </div>
            </div>
            <Link href="/applicant/career-goals" className="btn-secondary text-xs whitespace-nowrap">
              {resumeFilename || careerGoal ? "Update" : "Set Up"}
            </Link>
          </div>
        </motion.section>

        {/* Skills Section */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} aria-labelledby="skills-heading">
          <div className="flex items-center justify-between mb-4">
            <h2 id="skills-heading" className="text-sm font-semibold text-[var(--text-primary)]">Skills</h2>
            {skills.length > 0 && (
              <span className="text-xs text-[var(--text-muted)]">
                {skills.filter((s) => s.source === "resume_parsed").length} from resume · {skills.filter((s) => s.source === "manual").length} manual
              </span>
            )}
          </div>
          {skills.length > 0 && (
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="text-xs text-[var(--text-muted)]">Level:</span>
              <ProficiencyBadge level="beginner" />
              <ProficiencyBadge level="intermediate" />
              <ProficiencyBadge level="advanced" />
              <ProficiencyBadge level="expert" />
            </div>
          )}
          <div className="glass-card p-6">
            <SkillProfile key={skillsKey} onSkillsChanged={handleSkillsChanged} />
          </div>
        </motion.section>

        {/* Work Experience */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h2 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">Work Experience</h2>
          <div className="glass-card p-6">
            <WorkExperienceForm entries={(profileData?.work_experience as WorkExperienceEntry[]) ?? []} onSave={saveWorkExperience} />
          </div>
        </motion.section>

        {/* Education */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <h2 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">Education</h2>
          <div className="glass-card p-6">
            <EducationForm entries={(profileData?.education as EducationEntry[]) ?? []} onSave={saveEducation} />
          </div>
        </motion.section>

        {/* Certifications */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <h2 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">Certifications</h2>
          <div className="glass-card p-6">
            <CertificationsForm entries={(profileData?.certifications as CertificationEntry[]) ?? []} onSave={saveCertifications} />
          </div>
        </motion.section>

        {/* External Profiles */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <h2 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">External Profiles</h2>
          <div className="glass-card p-6">
            <ExternalProfilesForm urls={(profileData?.external_urls as ExternalUrls) ?? { linkedin: "", github: "", portfolio: "" }} onSave={saveExternalUrls} />
          </div>
        </motion.section>
      </div>

      {/* Share Profile Modal */}
      <ShareProfileModal
        open={showShareModal}
        onClose={() => setShowShareModal(false)}
        userName={userName}
        careerGoal={careerGoal}
      />
    </main>
  );
}
