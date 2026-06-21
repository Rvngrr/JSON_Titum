"use client";

import { useCallback, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ResumeUpload from "@/components/applicant/ResumeUpload";

const POPULAR_ROLES = [
  "Data Analyst",
  "Software Developer",
  "Information Technology",
  "Advertising",
  "Software Media",
  "Customer Svc",
  "Cybersecurity",
  "Web Developer",
  "AI/ML Engineer",
  "UX Designer",
];

const JOB_TYPES = ["Full time", "Part time", "Contract/Temp"];
const WORK_MODES = ["Remote", "Hybrid", "Onsite"];
const JOB_CATEGORIES = [
  "Data Analyst",
  "IT",
  "Software Dev",
  "Advertising",
  "Arts & Media",
  "Banking",
  "Customer Svc",
  "Engineering",
  "Healthcare",
  "Marketing",
];

const TOTAL_STEPS = 3;

export default function CareerGoalsPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Filter roles for autocomplete
  const filteredRoles = careerGoal.trim()
    ? POPULAR_ROLES.filter((role) =>
        role.toLowerCase().includes(careerGoal.toLowerCase())
      )
    : [];

  // Load existing data on mount
  useEffect(() => {
    async function loadExisting() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
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
            if (prefs.jobCategories)
              setSelectedCategories(prefs.jobCategories as string[]);
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

  const handleSelectRole = (role: string) => {
    setCareerGoal(role);
    setShowSuggestions(false);
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleComplete = useCallback(async () => {
    setSaving(true);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("You must be logged in to save your career goals.");
        setSaving(false);
        return;
      }

      // Get existing profile
      const { data: profile } = await supabase
        .from("skill_profiles")
        .select("id, work_preferences")
        .eq("user_id", user.id)
        .single();

      if (!profile) {
        setError("Profile not found. Please complete your profile first.");
        setSaving(false);
        return;
      }

      // Merge with existing work_preferences
      const existingPrefs =
        (profile.work_preferences as Record<string, unknown>) || {};
      const updatedPrefs = {
        ...existingPrefs,
        careerGoal: careerGoal || undefined,
        jobType: selectedJobType || undefined,
        workMode: selectedWorkMode || undefined,
        jobCategories:
          selectedCategories.length > 0 ? selectedCategories : undefined,
      };

      const { error: updateError } = await supabase
        .from("skill_profiles")
        .update({
          work_preferences: updatedPrefs,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);

      if (updateError) throw updateError;

      router.push("/applicant");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save career goals.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }, [careerGoal, selectedJobType, selectedWorkMode, selectedCategories, router]);

  return (
    <main className="flex-1 p-6 md:p-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Set Your Career Goals
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Step {currentStep} of {TOTAL_STEPS}
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => {
              const step = i + 1;
              const isCompleted = step < currentStep;
              const isActive = step === currentStep;
              return (
                <div key={step} className="flex flex-1 items-center">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                      isCompleted
                        ? "bg-blue-600 text-white"
                        : isActive
                          ? "border-2 border-blue-600 bg-white text-blue-600"
                          : "border-2 border-gray-300 bg-white text-gray-400"
                    }`}
                  >
                    {isCompleted ? (
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : (
                      step
                    )}
                  </div>
                  {step < TOTAL_STEPS && (
                    <div
                      className={`mx-2 h-0.5 flex-1 transition-colors ${
                        isCompleted ? "bg-blue-600" : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          {/* Step 1: Aspired Role */}
          {currentStep === 1 && (
            <div>
              <h2 className="mb-1 text-lg font-semibold text-gray-900">
                Aspired Role / Job
              </h2>
              <p className="mb-6 text-sm text-gray-500">
                Tell us your career goal.
              </p>

              <div className="relative" role="combobox" aria-expanded={showSuggestions && filteredRoles.length > 0} aria-haspopup="listbox" aria-controls="career-goal-listbox">
                <input
                  ref={inputRef}
                  type="text"
                  value={careerGoal}
                  onChange={(e) => {
                    setCareerGoal(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => {
                    // Delay to allow click on suggestions
                    setTimeout(() => setShowSuggestions(false), 200);
                  }}
                  placeholder="e.g. Software Developer, Data Analyst..."
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  aria-label="Career goal"
                  aria-autocomplete="list"
                />

                {/* Autocomplete dropdown */}
                {showSuggestions && filteredRoles.length > 0 && (
                  <ul
                    id="career-goal-listbox"
                    className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
                    role="listbox"
                  >
                    {filteredRoles.map((role) => (
                      <li
                        key={role}
                        role="option"
                        aria-selected={careerGoal === role}
                        className="cursor-pointer px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700"
                        onMouseDown={() => handleSelectRole(role)}
                      >
                        {role}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Popular roles */}
              <div className="mt-6">
                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-500">
                  Popular Roles
                </p>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_ROLES.map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => handleSelectRole(role)}
                      className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                        careerGoal === role
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-200 bg-gray-50 text-gray-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
                      }`}
                    >
                      {careerGoal === role && (
                        <svg
                          className="mr-1 inline h-3 w-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                      {role}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Preferences */}
          {currentStep === 2 && (
            <div>
              <h2 className="mb-1 text-lg font-semibold text-gray-900">
                Set Your Preferences
              </h2>
              <p className="mb-6 text-sm text-gray-500">
                Optional — helps us find better matches for you.
              </p>

              {/* Job Type */}
              <div className="mb-6">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Job Type
                </label>
                <div className="flex flex-wrap gap-2">
                  {JOB_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() =>
                        setSelectedJobType(
                          selectedJobType === type ? null : type
                        )
                      }
                      className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                        selectedJobType === type
                          ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm"
                          : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Work Mode */}
              <div className="mb-6">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Work Mode
                </label>
                <div className="flex flex-wrap gap-2">
                  {WORK_MODES.map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() =>
                        setSelectedWorkMode(
                          selectedWorkMode === mode ? null : mode
                        )
                      }
                      className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                        selectedWorkMode === mode
                          ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm"
                          : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* Job Categories */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Job Categories
                </label>
                <div className="flex flex-wrap gap-2">
                  {JOB_CATEGORIES.map((category) => {
                    const isSelected = selectedCategories.includes(category);
                    return (
                      <button
                        key={category}
                        type="button"
                        onClick={() => toggleCategory(category)}
                        className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                          isSelected
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-gray-200 bg-gray-50 text-gray-600 hover:border-blue-300 hover:bg-blue-50"
                        }`}
                      >
                        {isSelected && (
                          <svg
                            className="mr-1 inline h-3 w-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                        {category}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Resume Upload */}
          {currentStep === 3 && (
            <div>
              <h2 className="mb-1 text-lg font-semibold text-gray-900">
                Upload Your Resume or CV
              </h2>
              <p className="mb-6 text-sm text-gray-500">
                We&apos;ll use your resume to extract skills and improve your
                matches.
              </p>

              <ResumeUpload
                existingFilename={resumeFilename}
                onSkillsExtracted={() => {
                  // Skills extracted successfully, we can proceed
                }}
              />
            </div>
          )}
        </div>

        {/* Error display */}
        {error && (
          <div
            className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            role="alert"
          >
            {error}
          </div>
        )}

        {/* Navigation buttons */}
        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentStep === 1}
            className={`rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium transition-colors ${
              currentStep === 1
                ? "cursor-not-allowed opacity-40"
                : "text-gray-700 hover:bg-gray-50"
            }`}
          >
            Back
          </button>

          {currentStep < TOTAL_STEPS ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={currentStep === 1 && !careerGoal.trim()}
              className={`rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-colors ${
                currentStep === 1 && !careerGoal.trim()
                  ? "cursor-not-allowed bg-blue-400"
                  : "bg-blue-600 hover:bg-blue-700 shadow-sm"
              }`}
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={handleComplete}
              disabled={saving}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Saving...
                </span>
              ) : (
                "Complete"
              )}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
