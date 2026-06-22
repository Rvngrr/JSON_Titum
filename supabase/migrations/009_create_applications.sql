-- Migration: 009_create_applications
-- Description: Creates the applications table for job application tracking
-- Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 2.1

-- Applications submitted by applicants to job descriptions
CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  job_description_id UUID NOT NULL REFERENCES public.job_descriptions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(applicant_id, job_description_id)
);

-- Enable RLS
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Applicants can insert their own applications
CREATE POLICY "Applicants can insert own applications"
  ON public.applications FOR INSERT
  WITH CHECK (applicant_id = auth.uid());

-- Applicants can read their own applications
CREATE POLICY "Applicants can read own applications"
  ON public.applications FOR SELECT
  USING (applicant_id = auth.uid());

-- HR users can read applications for their jobs
CREATE POLICY "HR users can read applications for own jobs"
  ON public.applications FOR SELECT
  USING (
    job_description_id IN (
      SELECT id FROM public.job_descriptions WHERE hr_user_id = auth.uid()
    )
  );

-- No UPDATE policy (immutable records)
-- No DELETE policy for users (only CASCADE from parent tables)
