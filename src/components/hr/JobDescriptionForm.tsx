"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface SkillEntry {
  name: string;
  importance: "required" | "preferred";
}

interface JobFormData {
  title: string;
  companyName: string;
  description: string;
  qualifications: string;
  skills: SkillEntry[];
}

interface JobDescriptionFormProps {
  /** Optional initial data for edit mode (pre-fills form fields) */
  initialData?: {
    id: string;
    title: string;
    company_name?: string | null;
    description: string;
    qualifications?: string | null;
    skills: Array<{ skill_name: string; importance: "required" | "preferred" }>;
  };
}

export default function JobDescriptionForm({ initialData }: JobDescriptionFormProps) {
  const router = useRouter();

  const [formData, setFormData] = useState<JobFormData>({
    title: initialData?.title ?? "",
    companyName: initialData?.company_name ?? "",
    description: initialData?.description ?? "",
    qualifications: initialData?.qualifications ?? "",
    skills: initialData?.skills?.map((s) => ({
      name: s.skill_name,
      importance: s.importance,
    })) ?? [{ name: "", importance: "required" }],
  });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const isEditMode = !!initialData?.id;

  function handleFieldChange(field: keyof Omit<JobFormData, "skills">, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  function handleSkillChange(index: number, field: keyof SkillEntry, value: string) {
    setFormData((prev) => {
      const updatedSkills = [...prev.skills];
      updatedSkills[index] = { ...updatedSkills[index], [field]: value };
      return { ...prev, skills: updatedSkills };
    });
    // Clear skills validation error
    if (validationErrors.skills) {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next.skills;
        return next;
      });
    }
  }

  function addSkill() {
    setFormData((prev) => ({
      ...prev,
      skills: [...prev.skills, { name: "", importance: "required" }],
    }));
  }

  function removeSkill(index: number) {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index),
    }));
  }

  function validate(): boolean {
    const errors: Record<string, string> = {};

    if (!formData.title.trim()) {
      errors.title = "Title is required.";
    }

    if (!formData.description.trim()) {
      errors.description = "Description is required.";
    }

    // Filter out empty skill names and check for at least one required skill
    const nonEmptySkills = formData.skills.filter((s) => s.name.trim() !== "");
    const hasRequiredSkill = nonEmptySkills.some((s) => s.importance === "required");

    if (!hasRequiredSkill) {
      errors.skills = "At least one required skill must be specified.";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setError("You must be logged in to create a job description.");
        setIsSubmitting(false);
        return;
      }

      // Filter out empty skills
      const validSkills = formData.skills.filter((s) => s.name.trim() !== "");

      if (isEditMode) {
        // Update existing job description
        const { error: updateError } = await supabase
          .from("job_descriptions")
          .update({
            title: formData.title.trim(),
            company_name: formData.companyName.trim() || null,
            description: formData.description.trim(),
            qualifications: formData.qualifications.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", initialData!.id);

        if (updateError) {
          setError("Failed to update job description. Please try again.");
          setIsSubmitting(false);
          return;
        }

        // Delete existing skills and re-insert
        const { error: deleteSkillsError } = await supabase
          .from("job_required_skills")
          .delete()
          .eq("job_description_id", initialData!.id);

        if (deleteSkillsError) {
          setError("Failed to update skills. Please try again.");
          setIsSubmitting(false);
          return;
        }

        // Insert updated skills
        const skillRows = validSkills.map((skill) => ({
          job_description_id: initialData!.id,
          skill_name: skill.name.trim(),
          importance: skill.importance,
        }));

        const { error: insertSkillsError } = await supabase
          .from("job_required_skills")
          .insert(skillRows);

        if (insertSkillsError) {
          setError("Failed to save skills. Please try again.");
          setIsSubmitting(false);
          return;
        }

        setSuccess("Job description updated successfully!");
      } else {
        // Insert new job description with draft status
        const { data: jobData, error: insertError } = await supabase
          .from("job_descriptions")
          .insert({
            hr_user_id: user.id,
            title: formData.title.trim(),
            company_name: formData.companyName.trim() || null,
            description: formData.description.trim(),
            qualifications: formData.qualifications.trim() || null,
            status: "draft",
          })
          .select("id")
          .single();

        if (insertError || !jobData) {
          setError("Failed to create job description. Please try again.");
          setIsSubmitting(false);
          return;
        }

        // Insert skills
        const skillRows = validSkills.map((skill) => ({
          job_description_id: jobData.id,
          skill_name: skill.name.trim(),
          importance: skill.importance,
        }));

        const { error: skillsError } = await supabase
          .from("job_required_skills")
          .insert(skillRows);

        if (skillsError) {
          setError("Job created but failed to save skills. Please edit the job to add skills.");
          setIsSubmitting(false);
          return;
        }

        setSuccess("Job description created as draft. You can publish it from the dashboard.");
      }

      // Redirect to HR dashboard after short delay for user to see success message
      setTimeout(() => {
        router.push("/hr");
      }, 1500);
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} aria-label="Job description form" noValidate>
      {error && (
        <div role="alert" aria-live="assertive" className="mb-4 rounded-xl bg-[var(--error-bg)] p-3 text-sm text-[var(--error-text)]">
          {error}
        </div>
      )}

      {success && (
        <div role="status" aria-live="polite" className="mb-4 rounded-xl bg-[var(--success-bg)] p-3 text-sm text-[var(--success-text)]">
          {success}
        </div>
      )}

      {/* Title */}
      <div className="mb-4">
        <label htmlFor="job-title" className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
          Job Title <span aria-hidden="true" className="text-[var(--error)]">*</span>
        </label>
        <input
          id="job-title"
          type="text"
          name="title"
          value={formData.title}
          onChange={(e) => handleFieldChange("title", e.target.value)}
          required
          aria-required="true"
          aria-invalid={!!validationErrors.title}
          aria-describedby={validationErrors.title ? "title-error" : undefined}
          className="input-glass w-full px-4 py-2.5 text-sm"
          placeholder="e.g. Senior Software Engineer"
        />
        {validationErrors.title && (
          <p id="title-error" className="mt-1 text-xs text-[var(--error-text)]" role="alert">
            {validationErrors.title}
          </p>
        )}
      </div>

      {/* Company Name */}
      <div className="mb-4">
        <label htmlFor="company-name" className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
          Company Name
        </label>
        <input
          id="company-name"
          type="text"
          name="companyName"
          value={formData.companyName}
          onChange={(e) => handleFieldChange("companyName", e.target.value)}
          className="input-glass w-full px-4 py-2.5 text-sm"
          placeholder="e.g. TechCorp, Google, Startup XYZ"
        />
      </div>

      {/* Description */}
      <div className="mb-4">
        <label htmlFor="job-description" className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
          Description <span aria-hidden="true" className="text-[var(--error)]">*</span>
        </label>
        <textarea
          id="job-description"
          name="description"
          value={formData.description}
          onChange={(e) => handleFieldChange("description", e.target.value)}
          required
          aria-required="true"
          aria-invalid={!!validationErrors.description}
          aria-describedby={validationErrors.description ? "description-error" : undefined}
          rows={5}
          className="input-glass w-full px-4 py-2.5 text-sm"
          placeholder="Describe the role, responsibilities, and expectations..."
        />
        {validationErrors.description && (
          <p id="description-error" className="mt-1 text-xs text-[var(--error-text)]" role="alert">
            {validationErrors.description}
          </p>
        )}
      </div>

      {/* Qualifications */}
      <div className="mb-4">
        <label htmlFor="job-qualifications" className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
          Qualifications
        </label>
        <textarea
          id="job-qualifications"
          name="qualifications"
          value={formData.qualifications}
          onChange={(e) => handleFieldChange("qualifications", e.target.value)}
          rows={3}
          className="input-glass w-full px-4 py-2.5 text-sm"
          placeholder="Optional: education, certifications, years of experience..."
        />
      </div>

      {/* Skills */}
      <fieldset className="mb-6">
        <legend className="mb-2 text-sm font-medium text-[var(--text-primary)]">
          Skills <span aria-hidden="true" className="text-[var(--error)]">*</span>
        </legend>
        {validationErrors.skills && (
          <p className="mb-2 text-xs text-[var(--error-text)]" role="alert" aria-live="assertive">
            {validationErrors.skills}
          </p>
        )}

        <div className="space-y-3">
          {formData.skills.map((skill, index) => (
            <div key={index} className="flex items-center gap-2">
              <label htmlFor={`skill-name-${index}`} className="sr-only">
                Skill {index + 1} name
              </label>
              <input
                id={`skill-name-${index}`}
                type="text"
                value={skill.name}
                onChange={(e) => handleSkillChange(index, "name", e.target.value)}
                placeholder="Skill name (e.g. React, Python)"
                className="input-glass flex-1 px-4 py-2.5 text-sm"
                aria-label={`Skill ${index + 1} name`}
              />

              <label htmlFor={`skill-importance-${index}`} className="sr-only">
                Skill {index + 1} importance
              </label>
              <select
                id={`skill-importance-${index}`}
                value={skill.importance}
                onChange={(e) => handleSkillChange(index, "importance", e.target.value)}
                className="input-glass rounded-xl px-3 py-2.5 text-sm"
                aria-label={`Skill ${index + 1} importance`}
              >
                <option value="required">Required</option>
                <option value="preferred">Preferred</option>
              </select>

              <button
                type="button"
                onClick={() => removeSkill(index)}
                disabled={formData.skills.length === 1}
                aria-label={`Remove skill ${index + 1}`}
                className="rounded-xl border border-[var(--border-input)] px-2 py-2 text-sm text-[var(--error)] hover:bg-[var(--error-bg)] transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addSkill}
          className="mt-3 rounded-full border border-[var(--accent)] px-4 py-2 text-sm text-[var(--accent)] hover:bg-[var(--accent-light)] transition-colors"
        >
          + Add Skill
        </button>
      </fieldset>

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        aria-disabled={isSubmitting}
        className="btn-primary w-full text-sm"
      >
        {isSubmitting
          ? isEditMode
            ? "Updating..."
            : "Creating..."
          : isEditMode
            ? "Update Job Description"
            : "Create Job Description"}
      </button>
    </form>
  );
}
