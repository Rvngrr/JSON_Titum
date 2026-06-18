-- Migration: 013_fix_job_delete_rls
-- Description: Fix HR job deletion by splitting the FOR ALL policy into explicit operations.
-- The FOR ALL policy can conflict with the applicant SELECT policy, causing silent delete failures.

-- Drop the existing broad policy
DROP POLICY IF EXISTS "HR users manage own jobs" ON public.job_descriptions;

-- Create explicit per-operation policies for HR users
CREATE POLICY "HR users can select own jobs"
  ON public.job_descriptions FOR SELECT
  USING (hr_user_id = auth.uid());

CREATE POLICY "HR users can insert own jobs"
  ON public.job_descriptions FOR INSERT
  WITH CHECK (hr_user_id = auth.uid());

CREATE POLICY "HR users can update own jobs"
  ON public.job_descriptions FOR UPDATE
  USING (hr_user_id = auth.uid())
  WITH CHECK (hr_user_id = auth.uid());

CREATE POLICY "HR users can delete own jobs"
  ON public.job_descriptions FOR DELETE
  USING (hr_user_id = auth.uid());

-- Also fix the job_required_skills FOR ALL policy (same issue)
DROP POLICY IF EXISTS "HR users manage job skills" ON public.job_required_skills;

CREATE POLICY "HR users can select job skills"
  ON public.job_required_skills FOR SELECT
  USING (
    job_description_id IN (
      SELECT id FROM public.job_descriptions WHERE hr_user_id = auth.uid()
    )
  );

CREATE POLICY "HR users can insert job skills"
  ON public.job_required_skills FOR INSERT
  WITH CHECK (
    job_description_id IN (
      SELECT id FROM public.job_descriptions WHERE hr_user_id = auth.uid()
    )
  );

CREATE POLICY "HR users can update job skills"
  ON public.job_required_skills FOR UPDATE
  USING (
    job_description_id IN (
      SELECT id FROM public.job_descriptions WHERE hr_user_id = auth.uid()
    )
  )
  WITH CHECK (
    job_description_id IN (
      SELECT id FROM public.job_descriptions WHERE hr_user_id = auth.uid()
    )
  );

CREATE POLICY "HR users can delete job skills"
  ON public.job_required_skills FOR DELETE
  USING (
    job_description_id IN (
      SELECT id FROM public.job_descriptions WHERE hr_user_id = auth.uid()
    )
  );
