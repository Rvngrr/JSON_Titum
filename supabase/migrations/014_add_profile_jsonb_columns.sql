-- Migration: 014_add_profile_jsonb_columns
-- Description: Add JSONB columns for structured resume data (education, work_experience, certifications)
-- These columns store parsed resume sections for display and matching purposes.

ALTER TABLE public.skill_profiles
  ADD COLUMN IF NOT EXISTS work_experience JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS education JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS certifications JSONB DEFAULT '[]';
