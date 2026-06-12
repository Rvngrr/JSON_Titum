-- Migration: 002_create_skill_profiles
-- Description: Creates skill_profiles and skills tables for applicant skill management
-- Requirements: 3.1

-- Skill profiles for applicants
CREATE TABLE public.skill_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  resume_file_path TEXT,
  raw_resume_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Individual skills linked to a profile
CREATE TABLE public.skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_profile_id UUID NOT NULL REFERENCES public.skill_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  proficiency_level TEXT CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
  source TEXT NOT NULL CHECK (source IN ('resume_parsed', 'manual')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
