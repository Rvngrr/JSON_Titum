-- Migration: 011_fix_applications_rls
-- Description: Fix HR RLS policy on applications table
-- The previous policy used a subquery on job_descriptions which can fail
-- due to RLS recursion (job_descriptions also has RLS enabled).
-- This creates a SECURITY DEFINER function to bypass the nested RLS check.

-- Create a helper function that bypasses RLS to check job ownership
CREATE OR REPLACE FUNCTION public.is_job_owner(job_id UUID, user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.job_descriptions
    WHERE id = job_id AND hr_user_id = user_id
  );
$$;

-- Drop the existing HR policy on applications
DROP POLICY IF EXISTS "HR users can read applications for own jobs" ON public.applications;

-- Recreate with the helper function to avoid RLS recursion
CREATE POLICY "HR users can read applications for own jobs"
  ON public.applications FOR SELECT
  USING (public.is_job_owner(job_description_id, auth.uid()));
