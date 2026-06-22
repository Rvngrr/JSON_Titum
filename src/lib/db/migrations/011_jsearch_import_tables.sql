-- Migration: 011_jsearch_import_tables
-- Description: Creates new tables and extends existing tables for JSearch job import,
-- career intelligence features, and LLM caching.
-- Requirements: 2.1, 3.1, 3.5, 3.6, 6.1, 19.1, 19.6, 20.2

-- =============================================================================
-- NEW TABLE: api_response_cache
-- Stores raw API responses from JSearch/Indeed to avoid redundant API calls.
-- =============================================================================
CREATE TABLE public.api_response_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL,
  location TEXT NOT NULL,
  api_source TEXT NOT NULL,
  raw_response JSONB NOT NULL,
  job_count INTEGER NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint: only one cache entry per query+location+source combination
ALTER TABLE public.api_response_cache
  ADD CONSTRAINT uq_api_response_cache_query_location_source
  UNIQUE (query, location, api_source);

-- =============================================================================
-- NEW TABLE: api_rate_limits
-- Tracks monthly API request counts to enforce free-tier limits.
-- =============================================================================
CREATE TABLE public.api_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_source TEXT NOT NULL UNIQUE,
  request_count INTEGER NOT NULL DEFAULT 0,
  month_year TEXT NOT NULL,
  limit_max INTEGER NOT NULL DEFAULT 200,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- NEW TABLE: skill_difficulty_catalog
-- Classifies skills as easy or hard for Hidden Gem detection.
-- =============================================================================
CREATE TABLE public.skill_difficulty_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_name TEXT NOT NULL UNIQUE,
  difficulty TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =============================================================================
-- EXTEND TABLE: applications
-- Add status and applied_at columns to the existing applications table.
-- The table already has: id, applicant_id, job_description_id, created_at,
-- and UNIQUE(applicant_id, job_description_id).
-- =============================================================================
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'applied',
  ADD COLUMN IF NOT EXISTS applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- =============================================================================
-- NEW TABLE: llm_results_cache
-- Caches LLM responses for skill extraction, proficiency analysis, ATS keywords,
-- and ATS analysis to avoid redundant LLM API calls.
-- =============================================================================
CREATE TABLE public.llm_results_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT NOT NULL,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('skill_extraction', 'proficiency_analysis', 'ats_keywords', 'ats_analysis')),
  source_id UUID NULL,
  source_hash TEXT NOT NULL,
  result_json JSONB NOT NULL,
  provider TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint: one cached result per cache_key + operation_type combination
ALTER TABLE public.llm_results_cache
  ADD CONSTRAINT uq_llm_results_cache_key_operation
  UNIQUE (cache_key, operation_type);

-- Index for efficient lookup by source_id and operation_type
CREATE INDEX idx_llm_cache_source
  ON public.llm_results_cache (source_id, operation_type);

-- =============================================================================
-- EXTEND TABLE: job_descriptions
-- Add columns for external job import metadata, salary, employment type, etc.
-- =============================================================================
ALTER TABLE public.job_descriptions
  ADD COLUMN IF NOT EXISTS external_job_id TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS source_company TEXT,
  ADD COLUMN IF NOT EXISTS job_link TEXT,
  ADD COLUMN IF NOT EXISTS salary_min NUMERIC,
  ADD COLUMN IF NOT EXISTS salary_max NUMERIC,
  ADD COLUMN IF NOT EXISTS salary_currency TEXT,
  ADD COLUMN IF NOT EXISTS salary_period TEXT,
  ADD COLUMN IF NOT EXISTS employment_type TEXT,
  ADD COLUMN IF NOT EXISTS location_city TEXT,
  ADD COLUMN IF NOT EXISTS location_state TEXT,
  ADD COLUMN IF NOT EXISTS highlights JSONB,
  ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ;

-- =============================================================================
-- EXTEND TABLE: skill_profiles
-- Add columns for comprehensive applicant data (experience, education, etc.)
-- =============================================================================
ALTER TABLE public.skill_profiles
  ADD COLUMN IF NOT EXISTS total_years_experience NUMERIC,
  ADD COLUMN IF NOT EXISTS work_experience JSONB,
  ADD COLUMN IF NOT EXISTS education JSONB,
  ADD COLUMN IF NOT EXISTS certifications JSONB,
  ADD COLUMN IF NOT EXISTS external_urls JSONB,
  ADD COLUMN IF NOT EXISTS work_preferences JSONB;

-- =============================================================================
-- EXTEND TABLE: skills
-- Add columns to track when skills were last used and when they were added.
-- =============================================================================
ALTER TABLE public.skills
  ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS added_at TIMESTAMPTZ DEFAULT NOW();
