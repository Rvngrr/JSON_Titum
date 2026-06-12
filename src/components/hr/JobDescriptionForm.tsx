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
  description: string;
  qualifications: string;
  skills: SkillEntry[];
}

interface JobDescriptionFormProps {
  /** Optional initial data for edit mode (pre-fills form fields) */
  initialData?: {
    id: string;
    title: string;
    description: string;
    qualifications?: string | null;
    skills: Array<{ skill_name: string; importance: "required" | "preferred" }>;
  };
}

export default function JobDescriptionForm({ initialData }: JobDescriptionFormProps) {
  const router = useRouter();

  const [formData, setFormData] = useState<JobFormData>({
    title: initialData?.title ?? "",
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
        // Insert new job description
        const { data: jobData, error: insertError } = await supabase
          .from("job_descriptions")
          .insert({
            hr_user_id: user.id,
            title: formData.title.trim(),
            description: formData.description.trim(),
            qualifications: formData.qualifications.trim() || null,
            status: "published",
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

        setSuccess("Job description created successfully!");
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
        <div role="alert" aria-live="assertive" className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div role="status" aria-live="polite" className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* Title */}
      <div className="mb-4">
        <label htmlFor="job-title" className="mb-1 block text-sm font-medium text-gray-700">
          Job Title <span aria-hidden="true">*</span>
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
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="e.g. Senior Software Engineer"
        />
        {validationErrors.title && (
          <p id="title-error" className="mt-1 text-sm text-red-600" role="alert">
            {validationErrors.title}
          </p>
        )}
      </div>

      {/* Description */}
      <div className="mb-4">
        <label htmlFor="job-description" className="mb-1 block text-sm font-medium text-gray-700">
          Description <span aria-hidden="true">*</span>
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
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Describe the role, responsibilities, and expectations..."
        />
        {validationErrors.description && (
          <p id="description-error" className="mt-1 text-sm text-red-600" role="alert">
            {validationErrors.description}
          </p>
        )}
      </div>

      {/* Qualifications */}
      <div className="mb-4">
        <label htmlFor="job-qualifications" className="mb-1 block text-sm font-medium text-gray-700">
          Qualifications
        </label>
        <textarea
          id="job-qualifications"
          name="qualifications"
          value={formData.qualifications}
          onChange={(e) => handleFieldChange("qualifications", e.target.value)}
          rows={3}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Optional: education, certifications, years of experience..."
        />
      </div>

      {/* Skills */}
      <fieldset className="mb-6">
        <legend className="mb-2 text-sm font-medium text-gray-700">
          Skills <span aria-hidden="true">*</span>
        </legend>
        {validationErrors.skills && (
          <p className="mb-2 text-sm text-red-600" role="alert" aria-live="assertive">
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
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                aria-label={`Skill ${index + 1} name`}
              />

              <label htmlFor={`skill-importance-${index}`} className="sr-only">
                Skill {index + 1} importance
              </label>
              <select
                id={`skill-importance-${index}`}
                value={skill.importance}
                onChange={(e) => handleSkillChange(index, "importance", e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                className="rounded-md border border-gray-300 px-2 py-2 text-sm text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addSkill}
          className="mt-3 rounded-md border border-blue-300 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          + Add Skill
        </button>
      </fieldset>

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        aria-disabled={isSubmitting}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
