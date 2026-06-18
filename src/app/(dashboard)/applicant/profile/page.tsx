"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import ResumeUpload from "@/components/applicant/ResumeUpload";
import SkillProfile from "@/components/applicant/SkillProfile";
import { useToast } from "@/components/shared/Toast";

export default function ApplicantProfilePage() {
  const [skillsKey, setSkillsKey] = useState(0);
  const [recalculating, setRecalculating] = useState(false);
  const [existingResume, setExistingResume] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const { addToast } = useToast();

  // Fetch existing resume filename on mount
  useEffect(() => {
    async function fetchExistingResume() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoadingProfile(false);
          return;
        }

        const { data: skillProfile } = await supabase
          .from("skill_profiles")
          .select("resume_file_path")
          .eq("user_id", user.id)
          .maybeSingle();

        if (skillProfile?.resume_file_path) {
          // Extract just the filename from the path (e.g., "user-id/resume.pdf" → "resume.pdf")
          const parts = skillProfile.resume_file_path.split("/");
          setExistingResume(parts[parts.length - 1]);
        }
      } catch {
        // Non-critical — just means we can't show existing filename
      } finally {
        setLoadingProfile(false);
      }
    }
    fetchExistingResume();
  }, []);

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
        addToast("error", "Match recalculation failed.");
      }
    } catch (err) {
      console.error("Match recalculation failed:", err);
      addToast("error", "Match recalculation failed.");
    } finally {
      setRecalculating(false);
    }
  }, []);

  const handleSkillsExtracted = useCallback(() => {
    // Force SkillProfile to refetch after resume parsing extracts new skills
    setSkillsKey((prev) => prev + 1);
    // Match recalculation is handled by the resume parse route directly
  }, []);

  const handleSkillsChanged = useCallback(() => {
    // Trigger match recalculation when skills are manually added/removed
    triggerMatchRecalculation();
  }, [triggerMatchRecalculation]);

  return (
    <main className="flex-1 p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="mt-1 text-sm text-gray-600">
          Upload your resume to auto-extract skills, or manage them manually.
        </p>
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
            {loadingProfile ? (
              <p className="text-sm text-gray-500">Loading resume info...</p>
            ) : (
              <ResumeUpload onSkillsExtracted={handleSkillsExtracted} existingFilename={existingResume} />
            )}
          </div>
        </section>

        {/* Skill Profile Section */}
        <section aria-labelledby="skills-section-heading">
          <h2
            id="skills-section-heading"
            className="mb-4 text-lg font-semibold text-gray-800"
          >
            Skills
          </h2>
          {!loadingProfile && !existingResume && (
            <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3" role="status">
              <p className="text-sm text-amber-800">
                No resume uploaded. Skills marked as &quot;Parsed from resume&quot; may be outdated.
                Upload a resume to keep your skill profile in sync.
              </p>
            </div>
          )}
          <SkillProfile key={skillsKey} onSkillsChanged={handleSkillsChanged} />
        </section>
      </div>
    </main>
  );
}
