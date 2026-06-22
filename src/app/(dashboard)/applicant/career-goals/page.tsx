"use client";

import { useCallback, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import ResumeUpload from "@/components/applicant/ResumeUpload";

const POPULAR_ROLES = [
  "Data Analyst", "Software Developer", "Information Technology",
  "Advertising", "Software Media", "Customer Svc",
  "Cybersecurity", "Web Developer", "AI/ML Engineer", "UX Designer",
];
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
  const [careerGoal, setCareerGoal] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedJobType, setSelectedJobType] = useState<string | null>(null);
  const [selectedWorkMode, setSelectedWorkMode] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [resumeFilename, setResumeFilename] = useState<string | null>(null);

  const filteredRoles = careerGoal.trim()
    ? POPULAR_ROLES.filter((r) => r.toLowerCase().includes(careerGoal.toLowerCase()))
    : [];

  useEffect(() => {
    async function loadExisting() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profile } = await supabase
          .from("skill_profiles")
          .select("work_preferences, resume_file_path")
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
        }
      } catch (err) {
        console.error("Failed to load career goals:", err);
      }
    }
    loadExisting();
  }, []);

  const handleSelectRole = (role: string) => { setCareerGoal(role); setShowSuggestions(false); };
  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) => prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]);
  };
  const handleNext = () => { if (currentStep < TOTAL_STEPS) setCurrentStep((p) => p + 1); };
  const handleBack = () => { if (currentStep > 1) setCurrentStep((p) => p - 1); };

  const handleComplete = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError("You must be logged in."); setSaving(false); return; }
      const { data: profile } = await supabase
        .from("skill_profiles").select("id, work_preferences").eq("user_id", user.id).single();
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
      router.push("/applicant");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save career goals.");
    } finally {
      setSaving(false);
    }
  }, [careerGoal, selectedJobType, selectedWorkMode, selectedCategories, router]);

  return (
    <main className="flex-1 p-6 md:p-10">
      <div className="mx-auto max-w-2xl space-y-8">
        {/* Header */}
        <motion.header initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Set Your Career Goals</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Step {currentStep} of {TOTAL_STEPS}</p>
        </motion.header>

        {/* Progress bar */}
        <div className="mx-auto flex w-full max-w-xs items-center justify-center">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => {
            const step = i + 1;
            const isCompleted = step < currentStep;
            const isActive = step === currentStep;
            return (
              <div key={step} className="flex items-center" style={{ flex: step < TOTAL_STEPS ? 1 : 'none' }}>
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

        {/* Step Content */}
        <motion.div key={currentStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="glass-card p-6">
          {currentStep === 1 && (
            <div>
              <h2 className="mb-1 text-lg font-semibold text-[var(--text-primary)]">Aspired Role / Job</h2>
              <p className="mb-6 text-sm text-[var(--text-muted)]">Tell us your career goal.</p>
              <div className="relative" role="combobox" aria-expanded={showSuggestions && filteredRoles.length > 0} aria-haspopup="listbox">
                <input ref={inputRef} type="text" value={careerGoal}
                  onChange={(e) => { setCareerGoal(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  placeholder="e.g. Software Developer, Data Analyst..."
                  className="input-glass w-full px-4 py-3 text-sm"
                  aria-label="Career goal" aria-autocomplete="list"
                />
                {showSuggestions && filteredRoles.length > 0 && (
                  <ul className="absolute z-10 mt-1 w-full glass-card py-1 max-h-48 overflow-auto" role="listbox">
                    {filteredRoles.map((role) => (
                      <li key={role} role="option" aria-selected={careerGoal === role}
                        className="cursor-pointer px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--accent)]"
                        onMouseDown={() => handleSelectRole(role)}
                      >{role}</li>
                    ))}
                  </ul>
                )}
              </div>
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
            </div>
          )}

          {currentStep === 2 && (
            <div>
              <h2 className="mb-1 text-lg font-semibold text-[var(--text-primary)]">Set Your Preferences</h2>
              <p className="mb-6 text-sm text-[var(--text-muted)]">Optional — helps us find better matches.</p>
              <div className="mb-6">
                <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">Job Type</label>
                <div className="flex flex-wrap gap-2">
                  {JOB_TYPES.map((type) => (
                    <button key={type} type="button" onClick={() => setSelectedJobType(selectedJobType === type ? null : type)}
                      className={`rounded-xl border px-4 py-2 text-sm font-medium transition-all ${
                        selectedJobType === type ? "border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)]"
                          : "border-[var(--border-input)] bg-[var(--bg-card-solid)] text-[var(--text-secondary)] hover:border-[var(--accent)]"
                      }`}>{type}</button>
                  ))}
                </div>
              </div>
              <div className="mb-6">
                <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">Work Mode</label>
                <div className="flex flex-wrap gap-2">
                  {WORK_MODES.map((mode) => (
                    <button key={mode} type="button" onClick={() => setSelectedWorkMode(selectedWorkMode === mode ? null : mode)}
                      className={`rounded-xl border px-4 py-2 text-sm font-medium transition-all ${
                        selectedWorkMode === mode ? "border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)]"
                          : "border-[var(--border-input)] bg-[var(--bg-card-solid)] text-[var(--text-secondary)] hover:border-[var(--accent)]"
                      }`}>{mode}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">Job Categories</label>
                <div className="flex flex-wrap gap-2">
                  {JOB_CATEGORIES.map((cat) => (
                    <button key={cat} type="button" onClick={() => toggleCategory(cat)}
                      className={`rounded-full border px-3 py-1.5 text-sm transition-all ${
                        selectedCategories.includes(cat) ? "border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)]"
                          : "border-[var(--border-input)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-[var(--accent)]"
                      }`}>{cat}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div>
              <h2 className="mb-1 text-lg font-semibold text-[var(--text-primary)]">Upload Your Resume</h2>
              <p className="mb-6 text-sm text-[var(--text-muted)]">Optional — we&apos;ll extract skills to better match you.</p>
              {resumeFilename && (
                <p className="mb-4 text-sm text-[var(--success-text)]">Current resume: <strong>{resumeFilename}</strong></p>
              )}
              <ResumeUpload />
            </div>
          )}
        </motion.div>

        {/* Error */}
        {error && (
          <div role="alert" className="glass-card p-3 border-l-4 border-l-[var(--error)]">
            <p className="text-sm text-[var(--error-text)]">{error}</p>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex items-center justify-between">
          {currentStep > 1 ? (
            <button type="button" onClick={handleBack} className="btn-secondary text-sm">Back</button>
          ) : <div />}
          {currentStep < TOTAL_STEPS ? (
            <button type="button" onClick={handleNext} className="btn-primary text-sm">Next</button>
          ) : (
            <button type="button" onClick={handleComplete} disabled={saving} className="btn-primary text-sm">
              {saving ? "Saving..." : "Complete"}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
