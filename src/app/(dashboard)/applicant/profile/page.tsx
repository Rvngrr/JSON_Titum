"use client";

import { useCallback, useState } from "react";
import ResumeUpload from "@/components/applicant/ResumeUpload";
import SkillProfile from "@/components/applicant/SkillProfile";

export default function ApplicantProfilePage() {
  const [skillsKey, setSkillsKey] = useState(0);

  const handleSkillsExtracted = useCallback(() => {
    // Force SkillProfile to refetch after resume parsing extracts new skills
    setSkillsKey((prev) => prev + 1);
  }, []);

  return (
    <main className="flex-1 p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="mt-1 text-sm text-gray-600">
          Upload your resume to auto-extract skills, or manage them manually.
        </p>
      </div>

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
          <SkillProfile key={skillsKey} />
        </section>
      </div>
    </main>
  );
}
