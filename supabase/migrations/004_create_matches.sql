-- Migration: 004_create_matches
-- Description: Creates match_results table with unique constraint on (applicant_id, job_description_id)
-- Requirements: 5.1, 6.1

-- Match results (per applicant per job)
CREATE TABLE public.match_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  job_description_id UUID NOT NULL REFERENCES public.job_descriptions(id) ON DELETE CASCADE,
  match_percentage INTEGER NOT NULL CHECK (match_percentage >= 0 AND match_percentage <= 100),
  matched_skills JSONB DEFAULT '[]',
  missing_skills JSONB DEFAULT '[]',
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(applicant_id, job_description_id)
);
