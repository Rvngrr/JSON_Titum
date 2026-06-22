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
  beginner: "bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-subtle)]",
  intermediate: "bg-blue-500/15 text-blue-300 border border-blue-500/30",
  advanced: "bg-purple-500/15 text-purple-300 border border-purple-500/30",
  expert: "bg-green-500/15 text-green-300 border border-green-500/30",
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

interface JobSkillStat {
  skillName: string;
  jobCount: number;
  totalJobs: number;
}

export default function SkillProfile({ onSkillsChanged }: SkillProfileProps) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [skillProfile, setSkillProfile] = useState<SkillProfileType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jobSkillStats, setJobSkillStats] = useState<Map<string, JobSkillStat>>(new Map());

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

  // Fetch job skill stats to show how many jobs require each skill
  useEffect(() => {
    async function fetchJobStats() {
      try {
        const supabase = createClient();
        
        // Get total published jobs count
        const { count: totalJobs } = await supabase
          .from("job_descriptions")
          .select("*", { count: "exact", head: true })
          .eq("status", "published");

        // Get all required skills from all published jobs
        const { data: jobSkills } = await supabase
          .from("job_required_skills")
          .select("skill_name, job_description_id, job_descriptions!inner(status)")
          .eq("job_descriptions.status", "published");

        if (jobSkills && totalJobs) {
          const statsMap = new Map<string, JobSkillStat>();
          
          for (const js of jobSkills) {
            const key = js.skill_name.toLowerCase();
            const existing = statsMap.get(key);
            if (existing) {
              existing.jobCount++;
            } else {
              statsMap.set(key, { skillName: js.skill_name, jobCount: 1, totalJobs: totalJobs || 0 });
            }
          }
          
          setJobSkillStats(statsMap);
        }
      } catch {
        // Non-critical - tooltips just won't show job stats
      }
    }
    
    fetchJobStats();
  }, [skills]);

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
      <div className="mb-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card-solid)] p-4">
        <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Add a Skill</h3>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label
              htmlFor="skill-name-input"
              className="mb-1 block text-xs font-medium text-[var(--text-muted)]"
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
              className="w-full rounded-lg border border-[var(--border-input)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              disabled={isAdding}
              aria-describedby={addError ? "add-skill-error" : undefined}
              aria-invalid={addError ? "true" : undefined}
            />
          </div>

          <div className="sm:w-40">
            <label
              htmlFor="proficiency-select"
              className="mb-1 block text-xs font-medium text-[var(--text-muted)]"
            >
              Proficiency
            </label>
            <select
              id="proficiency-select"
              value={newSkillProficiency}
              onChange={(e) => setNewSkillProficiency(e.target.value as ProficiencyLevel)}
              className="w-full rounded-lg border border-[var(--border-input)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
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
            className="btn-primary text-sm"
            aria-label="Add skill"
          >
            {isAdding ? "Adding..." : "Add Skill"}
          </button>
        </div>

        {addError && (
          <p id="add-skill-error" className="mt-2 text-xs text-[var(--error)]" role="alert">
            {addError}
          </p>
        )}
      </div>

      {/* Skills list */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card-solid)]">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Your Skills{" "}
            <span className="font-normal text-[var(--text-muted)]">({skills.length})</span>
          </h3>
          {skills.length > 0 && (
            <button
              type="button"
              onClick={async () => {
                if (!confirm("Remove all skills? This cannot be undone.")) return;
                if (!skillProfile) return;
                const supabase = createClient();
                const { error: delErr } = await supabase
                  .from("skills")
                  .delete()
                  .eq("skill_profile_id", skillProfile.id);
                if (!delErr) {
                  setSkills([]);
                  await updateSkillProfileTimestamp();
                  onSkillsChanged?.();
                }
              }}
              className="rounded px-2 py-1 text-xs font-medium text-[var(--error)] hover:bg-[var(--error-bg)]"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Legend */}
        {skills.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border-subtle)] px-4 py-2 text-xs text-[var(--text-muted)]">
            <span className="font-medium text-[var(--text-secondary)]">Legend:</span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--text-muted)]" />
              Beginner
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-400" />
              Intermediate
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-purple-400" />
              Advanced
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-400" />
              Expert
            </span>
          </div>
        )}

        {skills.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">
            <p>No skills added yet.</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Upload a resume in Career Goals to auto-extract skills, or add them manually above.
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 p-4" role="list" aria-label="Skills list">
            {skills.map((skill) => {
              const stat = jobSkillStats.get(skill.name.toLowerCase());
              const jobPercent = stat ? Math.round((stat.jobCount / stat.totalJobs) * 100) : 0;
              const tooltipText = stat
                ? `${skill.proficiency_level.charAt(0).toUpperCase() + skill.proficiency_level.slice(1)} • Required by ${stat.jobCount}/${stat.totalJobs} jobs (${jobPercent}%)`
                : `${skill.proficiency_level.charAt(0).toUpperCase() + skill.proficiency_level.slice(1)} • No matching jobs found`;
              
              return (
                <div
                  key={skill.id}
                  role="listitem"
                  title={tooltipText}
                  className={`group relative inline-flex cursor-default items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-shadow hover:shadow-md ${PROFICIENCY_COLORS[skill.proficiency_level]}`}
                >
                  <span>{skill.name}</span>
                  {stat && stat.jobCount > 0 && (
                    <span className="ml-0.5 rounded-full bg-black/10 px-1.5 py-0 text-[10px]">
                      {jobPercent}%
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill.id)}
                    disabled={removingSkillId === skill.id}
                    className="ml-0.5 rounded-full p-0.5 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/10 focus:opacity-100 focus:outline-none disabled:opacity-30"
                    aria-label={`Remove skill: ${skill.name}`}
                  >
                    {removingSkillId === skill.id ? (
                      <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                      </svg>
                    ) : (
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
