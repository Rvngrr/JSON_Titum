-- Migration: 003_create_jobs
-- Description: Creates job_descriptions and job_required_skills tables for HR job management
-- Requirements: 4.1

-- Job descriptions posted by HR users
CREATE TABLE public.job_descriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hr_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  qualifications TEXT,
  status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Required/preferred skills for a job description
CREATE TABLE public.job_required_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_description_id UUID NOT NULL REFERENCES public.job_descriptions(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  importance TEXT DEFAULT 'required' CHECK (importance IN ('required', 'preferred')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
