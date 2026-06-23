"use client";

import { useCallback, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import ResumeUpload from "@/components/applicant/ResumeUpload";

const POPULAR_ROLES = [
  "Data Analyst", "Software Developer", "Information Technology",
  "Advertising", "Software Media", "Customer Svc",
  "Cybersecurity", "Web Developer", "AI/ML Engineer", "UX Designer",
  "Chef", "Nurse", "Teacher", "Mechanic",
  "Electrician", "Accountant", "Marketing Manager", "Graphic Designer",
];

/**
 * Typical skills expected for each aspired role.
 * Used to calculate role readiness against applicant's current skills.
 */
export const ROLE_EXPECTED_SKILLS: Record<string, string[]> = {
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

const JOB_TYPES = ["Full time", "Part time", "Contract/Temp"];
const WORK_MODES = ["Remote", "Hybrid", "Onsite"];
const JOB_CATEGORIES = [
  "Data Analyst", "IT", "Software Dev", "Advertising",
  "Arts & Media", "Banking", "Customer Svc", "Engineering",
  "Healthcare", "Marketing",
];

const TOTAL_STEPS = 3;

export default function CareerGoalsPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showIncompleteModal, setShowIncompleteModal] = useState(false);
  const [incompleteReasons, setIncompleteReasons] = useState<string[]>([]);

  // Step 1 state
  const [careerGoal, setCareerGoal] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Step 2 state
  const [selectedJobType, setSelectedJobType] = useState<string | null>(null);
  const [selectedWorkMode, setSelectedWorkMode] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Step 3 state
  const [resumeFilename, setResumeFilename] = useState<string | null>(null);

  // Role readiness state
  const [userSkills, setUserSkills] = useState<string[]>([]);

  const filteredRoles = careerGoal.trim()
    ? POPULAR_ROLES.filter((role) =>
        role.toLowerCase().includes(careerGoal.toLowerCase())
      )
    : [];

  // Calculate role readiness based on user's current skills vs expected role skills
  const roleReadiness = (() => {
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

    const percentage = Math.round((matched.length / expectedSkills.length) * 100);
    return { percentage, matched, missing, total: expectedSkills.length };
  })();

  useEffect(() => {
    async function loadExisting() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from("skill_profiles")
          .select("id, work_preferences, resume_file_path")
          .eq("user_id", user.id)
          .single();

        if (profile) {
          const prefs = profile.work_preferences as Record<string, unknown> | null;
          if (prefs) {
            if (prefs.careerGoal) setCareerGoal(prefs.careerGoal as string);
            if (prefs.jobType) setSelectedJobType(prefs.jobType as string);
            if (prefs.workMode) setSelectedWorkMode(prefs.workMode as string);
            if (prefs.jobCategories) setSelectedCategories(prefs.jobCategories as string[]);
          }
          if (profile.resume_file_path) {
            const parts = (profile.resume_file_path as string).split("/");
            setResumeFilename(parts[parts.length - 1]);
          }

          // Fetch user's skills for role readiness calculation
          const { data: skillsData } = await supabase
            .from("skills")
            .select("name")
            .eq("skill_profile_id", (profile as { id: string }).id);
          if (skillsData) {
            setUserSkills(skillsData.map((s: { name: string }) => s.name));
          }
        }
      } catch (err) {
        console.error("Failed to load career goals:", err);
      }
    }
    loadExisting();
  }, []);

  const handleSelectRole = (role: string) => {
    setCareerGoal(role);
    setShowSuggestions(false);
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };

  const handleNext = () => { if (currentStep < TOTAL_STEPS) setCurrentStep((p) => p + 1); };
  const handleBack = () => { if (currentStep > 1) setCurrentStep((p) => p - 1); };

  const handleComplete = useCallback(async () => {
    // Re-check the database for resume_file_path in case state is stale
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("You must be logged in."); return; }

    let currentResumeFilename = resumeFilename;
    if (!currentResumeFilename) {
      const { data: profileCheck } = await supabase
        .from("skill_profiles")
        .select("resume_file_path")
        .eq("user_id", user.id)
        .single();
      if (profileCheck?.resume_file_path) {
        const parts = (profileCheck.resume_file_path as string).split("/");
        currentResumeFilename = parts[parts.length - 1];
        setResumeFilename(currentResumeFilename);
      }
    }

    // Validate required steps are completed
    const reasons: string[] = [];
    if (!careerGoal.trim()) reasons.push("Select an aspired role / job");
    if (!currentResumeFilename) reasons.push("Upload your resume");

    if (reasons.length > 0) {
      setIncompleteReasons(reasons);
      setShowIncompleteModal(true);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError("You must be logged in."); setSaving(false); return; }

      const { data: profile } = await supabase
        .from("skill_profiles")
        .select("id, work_preferences")
        .eq("user_id", user.id)
        .single();

      if (!profile) { setError("Profile not found."); setSaving(false); return; }

      const existingPrefs = (profile.work_preferences as Record<string, unknown>) || {};
      const updatedPrefs = {
        ...existingPrefs,
        careerGoal: careerGoal || undefined,
        jobType: selectedJobType || undefined,
        workMode: selectedWorkMode || undefined,
        jobCategories: selectedCategories.length > 0 ? selectedCategories : undefined,
      };

      const { error: updateError } = await supabase
        .from("skill_profiles")
        .update({ work_preferences: updatedPrefs, updated_at: new Date().toISOString() })
        .eq("id", profile.id);

      if (updateError) throw updateError;

      // Show analyzing state
      setSaving(false);
      setAnalyzing(true);

      // Trigger match recalculation
      await fetch("/api/match/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicant_id: user.id }),
      }).catch(() => {});

      // Simulate brief analysis time for UX feedback
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setAnalyzing(false);
      setShowCompletionModal(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save career goals.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }, [careerGoal, selectedJobType, selectedWorkMode, selectedCategories, router]);

  return (
    <main className="flex-1 p-6 md:p-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Set Your Career Goals</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Step {currentStep} of {TOTAL_STEPS}</p>
        </motion.div>

        {/* Progress bar */}
        <div className="mb-8 px-6">
          <div className="flex items-center">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => {
              const step = i + 1;
              const isCompleted = step < currentStep;
              const isActive = step === currentStep;
              return (
                <div key={step} className={`flex items-center ${step < TOTAL_STEPS ? "flex-1" : ""}`}>
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                    isCompleted ? "bg-[var(--accent)] text-white"
                      : isActive ? "border-2 border-[var(--accent)] bg-[var(--bg-card-solid)] text-[var(--accent)]"
                      : "border-2 border-[var(--border-input)] bg-[var(--bg-card-solid)] text-[var(--text-muted)]"
                  }`}>
                    {isCompleted ? (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : step}
                  </div>
                  {step < TOTAL_STEPS && (
                    <div className={`mx-2 h-0.5 flex-1 transition-colors ${isCompleted ? "bg-[var(--accent)]" : "bg-[var(--border-input)]"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="glass-card p-6"
        >
          {/* Step 1: Aspired Role */}
          {currentStep === 1 && (
            <div>
              <h2 className="mb-1 text-lg font-semibold text-[var(--text-primary)]">Aspired Role / Job</h2>
              <p className="mb-6 text-sm text-[var(--text-muted)]">Tell us your career goal.</p>

              <div className="relative" role="combobox" aria-expanded={showSuggestions && filteredRoles.length > 0} aria-haspopup="listbox" aria-controls="career-goal-listbox">
                <input
                  ref={inputRef}
                  type="text"
                  value={careerGoal}
                  onChange={(e) => { setCareerGoal(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  placeholder="e.g. Software Developer, Data Analyst..."
                  className="input-glass w-full px-4 py-3 text-sm"
                  aria-label="Career goal"
                  aria-autocomplete="list"
                />
                {showSuggestions && filteredRoles.length > 0 && (
                  <ul id="career-goal-listbox" className="absolute z-10 mt-1 w-full glass-card py-1 max-h-48 overflow-auto" role="listbox">
                    {filteredRoles.map((role) => (
                      <li key={role} role="option" aria-selected={careerGoal === role}
                        className="cursor-pointer px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--accent)]"
                        onMouseDown={() => handleSelectRole(role)}
                      >{role}</li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Popular roles */}
              <div className="mt-6">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">Popular Roles</p>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_ROLES.map((role) => (
                    <button key={role} type="button" onClick={() => handleSelectRole(role)}
                      className={`rounded-full border px-3 py-1.5 text-sm transition-all ${
                        careerGoal === role
                          ? "border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)]"
                          : "border-[var(--border-input)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                      }`}
                    >{role}</button>
                  ))}
                </div>
              </div>

              {/* Role Readiness Indicator */}
              {roleReadiness && resumeFilename && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-5"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                      Role Readiness: {careerGoal}
                    </h3>
                    <span className={`badge-pill font-bold ${
                      roleReadiness.percentage >= 75
                        ? "bg-[var(--success-bg)] text-[var(--success-text)]"
                        : roleReadiness.percentage >= 50
                        ? "bg-[var(--warning-bg)] text-[var(--warning-text)]"
                        : "bg-[var(--error-bg)] text-[var(--error-text)]"
                    }`}>
                      {roleReadiness.percentage}% Ready
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-4 h-2.5 w-full overflow-hidden rounded-full bg-[var(--border-subtle)]">
                    <motion.div
                      className={`h-full rounded-full ${
                        roleReadiness.percentage >= 75
                          ? "bg-[var(--success)]"
                          : roleReadiness.percentage >= 50
                          ? "bg-[var(--warning)]"
                          : "bg-[var(--error)]"
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${roleReadiness.percentage}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                  </div>

                  {/* Matched skills */}
                  {roleReadiness.matched.length > 0 && (
                    <div className="mb-3">
                      <p className="mb-2 text-xs font-medium text-[var(--success-text)]">
                        ✓ Skills you already have ({roleReadiness.matched.length}/{roleReadiness.total})
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {roleReadiness.matched.map((skill) => (
                          <span key={skill} className="rounded-full bg-[var(--success-bg)] px-2.5 py-1 text-xs font-medium text-[var(--success-text)]">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Missing skills */}
                  {roleReadiness.missing.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-medium text-[var(--warning-text)]">
                        ✗ Skills to develop ({roleReadiness.missing.length}/{roleReadiness.total})
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {roleReadiness.missing.map((skill) => (
                          <span key={skill} className="rounded-full bg-[var(--warning-bg)] px-2.5 py-1 text-xs font-medium text-[var(--warning-text)]">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Guidance message */}
                  <p className="mt-4 text-xs text-[var(--text-muted)]">
                    {roleReadiness.percentage >= 75
                      ? "You're well-positioned for this role. Keep refining your expertise!"
                      : roleReadiness.percentage >= 50
                      ? "You have a solid foundation. Focus on the missing skills to strengthen your candidacy."
                      : "You're building toward this goal. Consider adding the missing skills through courses or projects."}
                  </p>
                </motion.div>
              )}

              {/* No skills message */}
              {careerGoal && ROLE_EXPECTED_SKILLS[careerGoal] && userSkills.length === 0 && resumeFilename && (
                <div className="mt-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4 text-center">
                  <p className="text-sm text-[var(--text-muted)]">
                    Upload your resume or add skills to your profile to see how ready you are for this role.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Preferences */}
          {currentStep === 2 && (
            <div>
              <h2 className="mb-1 text-lg font-semibold text-[var(--text-primary)]">Set Your Preferences</h2>
              <p className="mb-6 text-sm text-[var(--text-muted)]">Optional — helps us find better matches for you.</p>

              <div className="mb-6">
                <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">Job Type</label>
                <div className="flex flex-wrap gap-2">
                  {JOB_TYPES.map((type) => (
                    <button key={type} type="button"
                      onClick={() => setSelectedJobType(selectedJobType === type ? null : type)}
                      className={`rounded-xl border px-4 py-2 text-sm font-medium transition-all ${
                        selectedJobType === type
                          ? "border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)] shadow-sm"
                          : "border-[var(--border-input)] bg-[var(--bg-card-solid)] text-[var(--text-secondary)] hover:border-[var(--accent)]"
                      }`}
                    >{type}</button>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">Work Mode</label>
                <div className="flex flex-wrap gap-2">
                  {WORK_MODES.map((mode) => (
                    <button key={mode} type="button"
                      onClick={() => setSelectedWorkMode(selectedWorkMode === mode ? null : mode)}
                      className={`rounded-xl border px-4 py-2 text-sm font-medium transition-all ${
                        selectedWorkMode === mode
                          ? "border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)] shadow-sm"
                          : "border-[var(--border-input)] bg-[var(--bg-card-solid)] text-[var(--text-secondary)] hover:border-[var(--accent)]"
                      }`}
                    >{mode}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">Job Categories</label>
                <div className="flex flex-wrap gap-2">
                  {JOB_CATEGORIES.map((category) => (
                    <button key={category} type="button" onClick={() => toggleCategory(category)}
                      className={`rounded-full border px-3 py-1.5 text-sm transition-all ${
                        selectedCategories.includes(category)
                          ? "border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)]"
                          : "border-[var(--border-input)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-[var(--accent)]"
                      }`}
                    >{category}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Resume Upload */}
          {currentStep === 3 && (
            <div>
              <h2 className="mb-1 text-lg font-semibold text-[var(--text-primary)]">Upload Your Resume</h2>
              <p className="mb-6 text-sm text-[var(--text-muted)]">
                Optional — we&apos;ll extract skills from your resume to better match you with jobs.
              </p>
              {resumeFilename && (
                <div className="mb-4 flex items-center justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4 py-3">
                  <div className="flex items-center gap-2">
                    <svg className="h-5 w-5 text-[var(--success)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-sm font-medium text-[var(--text-primary)]">{resumeFilename}</span>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      const supabase = createClient();
                      const { data: { user } } = await supabase.auth.getUser();
                      if (!user) return;

                      // Clear resume path in database
                      await supabase
                        .from("skill_profiles")
                        .update({ resume_file_path: null, raw_resume_text: null, updated_at: new Date().toISOString() })
                        .eq("user_id", user.id);

                      // Delete skills that were parsed from resume
                      const { data: profile } = await supabase
                        .from("skill_profiles")
                        .select("id")
                        .eq("user_id", user.id)
                        .single();

                      if (profile) {
                        await supabase
                          .from("skills")
                          .delete()
                          .eq("skill_profile_id", profile.id)
                          .eq("source", "resume_parsed");
                      }

                      setResumeFilename(null);
                      setUserSkills([]);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--error-text)] hover:bg-[var(--error-bg)] transition-colors"
                    aria-label="Remove current resume"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Remove
                  </button>
                </div>
              )}
              <ResumeUpload onSkillsExtracted={() => {
                // Update resumeFilename state so validation passes
                const supabase = createClient();
                supabase.auth.getUser().then(({ data: { user } }) => {
                  if (!user) return;
                  supabase.from("skill_profiles").select("resume_file_path").eq("user_id", user.id).single().then(({ data }) => {
                    if (data?.resume_file_path) {
                      const parts = (data.resume_file_path as string).split("/");
                      setResumeFilename(parts[parts.length - 1]);
                    }
                  });
                });
              }} />
              {resumeFilename && (
                <p className="mt-3 text-xs text-[var(--text-muted)]">
                  Upload a new file above to replace your current resume.
                </p>
              )}
            </div>
          )}
        </motion.div>

        {/* Error message */}
        {error && (
          <div role="alert" className="mt-4 glass-card p-3 border-l-4 border-l-[var(--error)]">
            <p className="text-sm text-[var(--error-text)]">{error}</p>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="mt-6 flex items-center justify-between">
          {currentStep > 1 ? (
            <button type="button" onClick={handleBack} className="btn-secondary text-sm">
              Back
            </button>
          ) : <div />}

          {currentStep < TOTAL_STEPS ? (
            <button type="button" onClick={handleNext} className="btn-primary text-sm">
              Next
            </button>
          ) : (
            <button type="button" onClick={handleComplete} disabled={saving || analyzing} className="btn-primary text-sm">
              {saving ? "Saving..." : "Complete"}
            </button>
          )}
        </div>
      </div>

      {/* Analyzing Overlay */}
      <AnimatePresence>
        {analyzing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="glass-card mx-4 max-w-sm p-8 text-center"
            >
              <div className="mb-4 flex justify-center">
                <svg className="h-10 w-10 animate-spin text-[var(--accent)]" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Analyzing Your Profile</h2>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Matching your skills against available positions and calculating your role readiness...
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Incomplete Modal */}
      <AnimatePresence>
        {showIncompleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="glass-card mx-4 max-w-sm p-8 text-center"
            >
              <div className="mb-4 flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--error-bg)]">
                  <svg className="h-8 w-8 text-[var(--error)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </div>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">Steps Incomplete</h2>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Please complete the following before proceeding:
              </p>
              <ul className="mt-4 space-y-2 text-left">
                {incompleteReasons.map((reason) => (
                  <li key={reason} className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
                    <svg className="h-4 w-4 flex-shrink-0 text-[var(--error)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <circle cx="12" cy="12" r="9" strokeWidth={2} />
                    </svg>
                    {reason}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => setShowIncompleteModal(false)}
                className="btn-primary mt-6 w-full text-sm"
              >
                Go Back & Complete
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Completion Modal */}
      <AnimatePresence>
        {showCompletionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="glass-card mx-4 max-w-sm p-8 text-center"
            >
              <div className="mb-4 flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--success-bg)]">
                  <svg className="h-8 w-8 text-[var(--success)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">Analysis Complete!</h2>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Your career goals have been saved and your profile has been matched against available job positions.
              </p>
              {roleReadiness && (
                <div className="mt-4 rounded-xl bg-[var(--bg-secondary)] p-3 border border-[var(--border-subtle)]">
                  <p className="text-xs text-[var(--text-muted)]">Role Readiness for <span className="font-semibold text-[var(--text-primary)]">{careerGoal}</span></p>
                  <p className={`mt-1 text-2xl font-bold ${
                    roleReadiness.percentage >= 75 ? "text-[var(--success)]"
                      : roleReadiness.percentage >= 50 ? "text-[var(--warning)]"
                      : "text-[var(--error)]"
                  }`}>
                    {roleReadiness.percentage}%
                  </p>
                </div>
              )}
              <button
                type="button"
                onClick={() => router.push("/applicant")}
                className="btn-primary mt-6 w-full text-sm"
              >
                Check Results
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
