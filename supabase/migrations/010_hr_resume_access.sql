-- Migration: 010_hr_resume_access
-- Description: Allow HR users to view applicant resumes in storage
-- Run this in the Supabase Dashboard SQL Editor:
-- https://supabase.com/dashboard/project/kojbfvzgkyvynjeaysgz/sql/new

-- HR users can read any resume in the resumes bucket
CREATE POLICY "HR users can read applicant resumes"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'resumes'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'hr_user'
    )
  );
