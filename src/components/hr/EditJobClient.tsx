"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import JobDescriptionForm from "@/components/hr/JobDescriptionForm";

interface JobInitialData {
  id: string;
  title: string;
  description: string;
  qualifications?: string | null;
  skills: Array<{ skill_name: string; importance: "required" | "preferred" }>;
}

interface EditJobClientProps {
  jobId: string;
}

export default function EditJobClient({ jobId }: EditJobClientProps) {
  const [initialData, setInitialData] = useState<JobInitialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchJob() {
      try {
        const supabase = createClient();

        const { data: job, error: jobError } = await supabase
          .from("job_descriptions")
          .select("id, title, description, qualifications")
          .eq("id", jobId)
          .single();

        if (jobError || !job) {
          setError("Job posting not found or you don't have permission to edit it.");
          setLoading(false);
          return;
        }

        const { data: skills, error: skillsError } = await supabase
          .from("job_required_skills")
          .select("skill_name, importance")
          .eq("job_description_id", jobId);

        if (skillsError) {
          setError("Failed to load job skills.");
          setLoading(false);
          return;
        }

        setInitialData({
          id: job.id,
          title: job.title,
          description: job.description,
          qualifications: job.qualifications,
          skills: (skills ?? []) as Array<{
            skill_name: string;
            importance: "required" | "preferred";
          }>,
        });
      } catch {
        setError("An unexpected error occurred while loading the job.");
      } finally {
        setLoading(false);
      }
    }

    fetchJob();
  }, [jobId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-2 text-gray-500">
          <svg
            className="h-5 w-5 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
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
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span>Loading job details...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="rounded-md bg-red-50 p-4">
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }

  if (!initialData) {
    return null;
  }

  return <JobDescriptionForm initialData={initialData} />;
}
