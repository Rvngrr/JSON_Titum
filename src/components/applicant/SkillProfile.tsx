"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Skill, SkillProfile as SkillProfileType } from "@/types";

type ProficiencyLevel = "beginner" | "intermediate" | "advanced" | "expert";

const PROFICIENCY_LEVELS: ProficiencyLevel[] = [
  "beginner",
  "intermediate",
  "advanced",
  "expert",
];

const PROFICIENCY_COLORS: Record<ProficiencyLevel, string> = {
  beginner: "bg-gray-100 text-gray-700",
  intermediate: "bg-blue-100 text-blue-700",
  advanced: "bg-purple-100 text-purple-700",
  expert: "bg-green-100 text-green-700",
};

const SOURCE_LABELS: Record<Skill["source"], { label: string; className: string }> = {
  resume_parsed: {
    label: "Parsed from resume",
    className: "bg-amber-100 text-amber-700",
  },
  manual: {
    label: "Manually added",
    className: "bg-indigo-100 text-indigo-700",
  },
};

interface SkillProfileProps {
  /** Called when skills are modified (add or remove) */
  onSkillsChanged?: () => void;
}

export default function SkillProfile({ onSkillsChanged }: SkillProfileProps) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [skillProfile, setSkillProfile] = useState<SkillProfileType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add skill form state
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillProficiency, setNewSkillProficiency] = useState<ProficiencyLevel>("intermediate");
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Remove skill state
  const [removingSkillId, setRemovingSkillId] = useState<string | null>(null);

  const fetchSkillProfile = useCallback(async () => {
    try {
      setError(null);
      const supabase = createClient();

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setError("You must be logged in to view your skill profile.");
        setLoading(false);
        return;
      }

      // Fetch skill profile
      const { data: profileData, error: profileError } = await supabase
        .from("skill_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (profileError && profileError.code !== "PGRST116") {
        // PGRST116 = no rows returned (profile doesn't exist yet)
        setError("Failed to load skill profile.");
        setLoading(false);
        return;
      }

      if (!profileData) {
        // No skill profile exists yet - create one
        const { data: newProfile, error: createError } = await supabase
          .from("skill_profiles")
          .insert({ user_id: user.id })
          .select()
          .single();

        if (createError) {
          setError("Failed to create skill profile.");
          setLoading(false);
          return;
        }

        setSkillProfile(newProfile);
        setSkills([]);
        setLoading(false);
        return;
      }

      setSkillProfile(profileData);

      // Fetch skills for this profile
      const { data: skillsData, error: skillsError } = await supabase
        .from("skills")
        .select("*")
        .eq("skill_profile_id", profileData.id)
        .order("created_at", { ascending: false });

      if (skillsError) {
        setError("Failed to load skills.");
        setLoading(false);
        return;
      }

      setSkills(skillsData ?? []);
      setLoading(false);
    } catch {
      setError("An unexpected error occurred.");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSkillProfile();
  }, [fetchSkillProfile]);

  const updateSkillProfileTimestamp = useCallback(async () => {
    if (!skillProfile) return;

    const supabase = createClient();
    await supabase
      .from("skill_profiles")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", skillProfile.id);
  }, [skillProfile]);

  const handleAddSkill = useCallback(async () => {
    const trimmedName = newSkillName.trim();
    if (!trimmedName) {
      setAddError("Skill name is required.");
      return;
    }

    if (!skillProfile) {
      setAddError("Skill profile not found. Please refresh the page.");
      return;
    }

    // Check for duplicate skill name (case-insensitive)
    const isDuplicate = skills.some(
      (s) => s.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (isDuplicate) {
      setAddError("This skill already exists in your profile.");
      return;
    }

    setIsAdding(true);
    setAddError(null);

    try {
      const supabase = createClient();

      const { data: newSkill, error: insertError } = await supabase
        .from("skills")
        .insert({
          skill_profile_id: skillProfile.id,
          name: trimmedName,
          proficiency_level: newSkillProficiency,
          source: "manual" as const,
        })
        .select()
        .single();

      if (insertError) {
        setAddError("Failed to add skill. Please try again.");
        setIsAdding(false);
        return;
      }

      // Update skill_profile updated_at to trigger recalculation
      await updateSkillProfileTimestamp();

      setSkills((prev) => [newSkill, ...prev]);
      setNewSkillName("");
      setNewSkillProficiency("intermediate");
      setIsAdding(false);
      onSkillsChanged?.();
    } catch {
      setAddError("An unexpected error occurred.");
      setIsAdding(false);
    }
  }, [newSkillName, newSkillProficiency, skillProfile, skills, updateSkillProfileTimestamp, onSkillsChanged]);

  const handleRemoveSkill = useCallback(
    async (skillId: string) => {
      setRemovingSkillId(skillId);

      try {
        const supabase = createClient();

        const { error: deleteError } = await supabase
          .from("skills")
          .delete()
          .eq("id", skillId);

        if (deleteError) {
          setError("Failed to remove skill. Please try again.");
          setRemovingSkillId(null);
          return;
        }

        // Update skill_profile updated_at to trigger recalculation
        await updateSkillProfileTimestamp();

        setSkills((prev) => prev.filter((s) => s.id !== skillId));
        setRemovingSkillId(null);
        onSkillsChanged?.();
      } catch {
        setError("An unexpected error occurred.");
        setRemovingSkillId(null);
      }
    },
    [updateSkillProfileTimestamp, onSkillsChanged]
  );

  if (loading) {
    return (
      <section aria-label="Skill profile" className="w-full">
        <div className="flex items-center justify-center py-8" role="status" aria-live="polite">
          <svg
            className="h-6 w-6 animate-spin text-blue-600"
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
          <span className="ml-2 text-sm text-gray-600">Loading skill profile...</span>
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Skill profile" className="w-full">
      {/* Error banner */}
      {error && (
        <div
          className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700"
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-center gap-2">
            <svg
              className="h-4 w-4 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Add skill form */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-700">Add a Skill</h3>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label
              htmlFor="skill-name-input"
              className="mb-1 block text-xs font-medium text-gray-600"
            >
              Skill Name
            </label>
            <input
              id="skill-name-input"
              type="text"
              value={newSkillName}
              onChange={(e) => {
                setNewSkillName(e.target.value);
                setAddError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddSkill();
                }
              }}
              placeholder="e.g., React, Python, Project Management"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={isAdding}
              aria-describedby={addError ? "add-skill-error" : undefined}
              aria-invalid={addError ? "true" : undefined}
            />
          </div>

          <div className="sm:w-40">
            <label
              htmlFor="proficiency-select"
              className="mb-1 block text-xs font-medium text-gray-600"
            >
              Proficiency
            </label>
            <select
              id="proficiency-select"
              value={newSkillProficiency}
              onChange={(e) => setNewSkillProficiency(e.target.value as ProficiencyLevel)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={isAdding}
            >
              {PROFICIENCY_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleAddSkill}
            disabled={isAdding || !newSkillName.trim()}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Add skill"
          >
            {isAdding ? "Adding..." : "Add Skill"}
          </button>
        </div>

        {addError && (
          <p id="add-skill-error" className="mt-2 text-xs text-red-600" role="alert">
            {addError}
          </p>
        )}
      </div>

      {/* Skills list */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-700">
            Your Skills{" "}
            <span className="font-normal text-gray-500">({skills.length})</span>
          </h3>
        </div>

        {skills.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500">
            <p>No skills added yet.</p>
            <p className="mt-1 text-xs text-gray-400">
              Upload a resume to auto-extract skills, or add them manually above.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100" aria-label="Skills list">
            {skills.map((skill) => (
              <li
                key={skill.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="flex flex-1 flex-wrap items-center gap-2">
                  {/* Skill name */}
                  <span className="text-sm font-medium text-gray-900">
                    {skill.name}
                  </span>

                  {/* Proficiency badge */}
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${PROFICIENCY_COLORS[skill.proficiency_level]}`}
                  >
                    {skill.proficiency_level.charAt(0).toUpperCase() +
                      skill.proficiency_level.slice(1)}
                  </span>

                  {/* Source indicator */}
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${SOURCE_LABELS[skill.source].className}`}
                  >
                    {SOURCE_LABELS[skill.source].label}
                  </span>
                </div>

                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => handleRemoveSkill(skill.id)}
                  disabled={removingSkillId === skill.id}
                  className="flex-shrink-0 rounded-md p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                  aria-label={`Remove skill: ${skill.name}`}
                >
                  {removingSkillId === skill.id ? (
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
                  ) : (
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
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
