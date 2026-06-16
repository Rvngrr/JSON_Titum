"use client";

import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import ResumeUpload from "@/components/applicant/ResumeUpload";
import SkillProfile from "@/components/applicant/SkillProfile";

export default function ApplicantProfilePage() {
  const [skillsKey, setSkillsKey] = useState(0);
  const [recalculating, setRecalculating] = useState(false);

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
            <ResumeUpload onSkillsExtracted={handleSkillsExtracted} />
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
          <SkillProfile key={skillsKey} onSkillsChanged={handleSkillsChanged} />
        </section>
      </div>
    </main>
  );
}
