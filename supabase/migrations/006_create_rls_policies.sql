-- Migration: 006_create_rls_policies.sql
-- Description: Enable Row-Level Security on all tables and create access policies
-- Validates: Requirements 1.4, 4.5, 5.4, 6.1

-- ============================================================================
-- Enable RLS on all tables
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_descriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_required_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Profiles policies
-- Users can read their own profile, HR can see applicant names for rankings
-- ============================================================================

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "HR users can view applicant names"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'hr_user'
    )
    AND role = 'applicant'
  );

-- ============================================================================
-- Skill profiles policies
-- Only the owner can CRUD their skill profile
-- ============================================================================

CREATE POLICY "Applicants manage own skill profile"
  ON public.skill_profiles FOR ALL
  USING (user_id = auth.uid());

-- ============================================================================
-- Skills policies
-- Only the profile owner can CRUD their skills
-- ============================================================================

CREATE POLICY "Applicants manage own skills"
  ON public.skills FOR ALL
  USING (
    skill_profile_id IN (
      SELECT id FROM public.skill_profiles WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- Job descriptions policies
-- HR users manage their own, applicants can read published
-- ============================================================================

CREATE POLICY "HR users manage own jobs"
  ON public.job_descriptions FOR ALL
  USING (hr_user_id = auth.uid());

CREATE POLICY "Applicants can view published jobs"
  ON public.job_descriptions FOR SELECT
  USING (status = 'published');

-- ============================================================================
-- Job required skills policies
-- HR users manage via job ownership, applicants can read
-- ============================================================================

CREATE POLICY "HR users manage job skills"
  ON public.job_required_skills FOR ALL
  USING (
    job_description_id IN (
      SELECT id FROM public.job_descriptions WHERE hr_user_id = auth.uid()
    )
  );

CREATE POLICY "Applicants can view job skills"
  ON public.job_required_skills FOR SELECT
  USING (
    job_description_id IN (
      SELECT id FROM public.job_descriptions WHERE status = 'published'
    )
  );

-- ============================================================================
-- Match results policies
-- Applicants see their own, HR sees matches for their jobs
-- ============================================================================

CREATE POLICY "Applicants view own matches"
  ON public.match_results FOR SELECT
  USING (applicant_id = auth.uid());

CREATE POLICY "HR views matches for own jobs"
  ON public.match_results FOR SELECT
  USING (
    job_description_id IN (
      SELECT id FROM public.job_descriptions WHERE hr_user_id = auth.uid()
    )
  );

-- ============================================================================
-- Recommendations policies
-- Only the applicant can see their own recommendations
-- ============================================================================

CREATE POLICY "Applicants view own recommendations"
  ON public.recommendations FOR SELECT
  USING (applicant_id = auth.uid());
