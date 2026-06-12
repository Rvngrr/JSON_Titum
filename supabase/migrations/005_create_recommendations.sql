-- Migration: 005_create_recommendations
-- Description: Creates recommendations table for AI-generated improvement suggestions
-- Requirements: 7.1

-- AI recommendations (per applicant per job)
CREATE TABLE public.recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  job_description_id UUID NOT NULL REFERENCES public.job_descriptions(id) ON DELETE CASCADE,
  suggestion_type TEXT NOT NULL CHECK (suggestion_type IN ('skill_to_add', 'skill_to_improve')),
  skill_name TEXT NOT NULL,
  description TEXT NOT NULL,
  impact_score INTEGER CHECK (impact_score >= 1 AND impact_score <= 10),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
