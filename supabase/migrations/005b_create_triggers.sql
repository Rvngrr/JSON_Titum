-- Migration: 005b_create_triggers
-- Description: Creates database triggers for match recalculation notifications
-- Requirements: 3.5, 4.3, 5.1

-- Trigger function: notify when a skill profile is updated (used on skill_profiles table)
CREATE OR REPLACE FUNCTION notify_profile_updated()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify('profile_updated', json_build_object('user_id', NEW.user_id)::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function: notify when a skill is added (resolves user_id via skill_profile)
CREATE OR REPLACE FUNCTION notify_skill_added()
RETURNS TRIGGER AS $$
DECLARE
  resolved_user_id UUID;
BEGIN
  SELECT user_id INTO resolved_user_id FROM public.skill_profiles WHERE id = NEW.skill_profile_id;
  PERFORM pg_notify('profile_updated', json_build_object('user_id', resolved_user_id)::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function: notify when a skill is removed (resolves user_id via skill_profile, uses OLD)
CREATE OR REPLACE FUNCTION notify_skill_removed()
RETURNS TRIGGER AS $$
DECLARE
  resolved_user_id UUID;
BEGIN
  SELECT user_id INTO resolved_user_id FROM public.skill_profiles WHERE id = OLD.skill_profile_id;
  PERFORM pg_notify('profile_updated', json_build_object('user_id', resolved_user_id)::text);
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger on skill_profiles update
CREATE TRIGGER on_skill_profile_updated
  AFTER UPDATE ON public.skill_profiles
  FOR EACH ROW EXECUTE FUNCTION notify_profile_updated();

-- Trigger on skill insert (new skill added)
CREATE TRIGGER on_skill_added
  AFTER INSERT ON public.skills
  FOR EACH ROW EXECUTE FUNCTION notify_skill_added();

-- Trigger on skill delete (skill removed)
CREATE TRIGGER on_skill_removed
  AFTER DELETE ON public.skills
  FOR EACH ROW EXECUTE FUNCTION notify_skill_removed();

-- Trigger function: notify when a job description is created or updated
CREATE OR REPLACE FUNCTION notify_job_updated()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify('job_updated', json_build_object('job_id', NEW.id)::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on job_descriptions insert or update
CREATE TRIGGER on_job_description_updated
  AFTER INSERT OR UPDATE ON public.job_descriptions
  FOR EACH ROW EXECUTE FUNCTION notify_job_updated();
