-- Migration: 001_create_profiles
-- Description: Creates the public.profiles table extending auth.users with role, failed_login_attempts, locked_until
-- Requirements: 1.1, 2.3

-- Extends Supabase auth.users with a public profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('applicant', 'hr_user')),
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
