-- Destructive rollback for the v0.2 workbench schema.
-- Back up application_location_tags, location_tags, follow_up_tasks, profiles,
-- and storage.objects before running this file.

drop policy if exists "avatars_delete_own" on storage.objects;
drop policy if exists "avatars_update_own" on storage.objects;
drop policy if exists "avatars_insert_own" on storage.objects;
drop policy if exists "avatars_select_own" on storage.objects;

delete from storage.objects where bucket_id = 'avatars';
delete from storage.buckets where id = 'avatars';

drop function if exists public.set_application_locations(uuid, uuid[]);
drop function if exists public.enforce_application_location_limit();
drop table if exists public.follow_up_tasks;
drop table if exists public.application_location_tags;
drop table if exists public.location_tags;

alter table public.profiles
  drop column if exists reminder_lead_days,
  drop column if exists in_app_reminders_enabled,
  drop column if exists theme_preference,
  drop column if exists avatar_path;

alter table public.applications
  drop constraint if exists applications_id_user_id_key;

-- PostgreSQL enums cannot safely drop a value in place. The additive
-- `manager` value intentionally remains after rollback; removing it requires
-- a separately reviewed type-rebuild migration after confirming no rows use it.
