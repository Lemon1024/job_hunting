do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'applications_id_user_id_key'
      and conrelid = 'public.applications'::regclass
  ) then
    alter table public.applications
      add constraint applications_id_user_id_key unique (id, user_id);
  end if;
end
$$;

alter table public.profiles
  add column if not exists avatar_path text,
  add column if not exists theme_preference text not null default 'system',
  add column if not exists in_app_reminders_enabled boolean not null default true,
  add column if not exists reminder_lead_days smallint not null default 1;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_avatar_path_owned') then
    alter table public.profiles add constraint profiles_avatar_path_owned
      check (avatar_path is null or avatar_path like id::text || '/%');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_theme_preference_valid') then
    alter table public.profiles add constraint profiles_theme_preference_valid
      check (theme_preference in ('system', 'light', 'dark'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_reminder_lead_days_valid') then
    alter table public.profiles add constraint profiles_reminder_lead_days_valid
      check (reminder_lead_days in (0, 1, 3, 7));
  end if;
end
$$;

create table if not exists public.location_tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint location_tags_id_user_id_key unique (id, user_id),
  constraint location_tags_label_trimmed check (label = btrim(label)),
  constraint location_tags_label_length check (char_length(label) between 1 and 32)
);

create unique index if not exists location_tags_user_label_unique
  on public.location_tags (user_id, lower(label));

drop trigger if exists location_tags_set_updated_at on public.location_tags;
create trigger location_tags_set_updated_at
before update on public.location_tags
for each row execute function public.set_updated_at();

create table if not exists public.application_location_tags (
  application_id uuid not null,
  location_tag_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (application_id, location_tag_id),
  foreign key (application_id, user_id)
    references public.applications(id, user_id) on delete cascade,
  foreign key (location_tag_id, user_id)
    references public.location_tags(id, user_id) on delete cascade
);

create index if not exists application_location_tags_user_idx
  on public.application_location_tags(user_id, location_tag_id);

create or replace function public.enforce_application_location_limit()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Serialize concurrent inserts for one application so this count cannot race.
  perform pg_advisory_xact_lock(hashtextextended(new.application_id::text, 0));
  if (
    select count(*)
    from public.application_location_tags existing
    where existing.application_id = new.application_id
  ) >= 10 then
    raise exception 'An application can have at most 10 locations.' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists application_location_tags_limit on public.application_location_tags;
create trigger application_location_tags_limit
before insert on public.application_location_tags
for each row execute function public.enforce_application_location_limit();

create table if not exists public.follow_up_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid not null,
  title text not null,
  notes text,
  due_date date not null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (application_id, user_id)
    references public.applications(id, user_id) on delete cascade,
  constraint follow_up_tasks_title_trimmed check (title = btrim(title)),
  constraint follow_up_tasks_title_length check (char_length(title) between 1 and 200),
  constraint follow_up_tasks_notes_length check (notes is null or char_length(notes) <= 2000)
);

create index if not exists follow_up_tasks_user_due_idx
  on public.follow_up_tasks(user_id, completed_at, due_date);
create index if not exists follow_up_tasks_application_idx
  on public.follow_up_tasks(application_id, due_date);

drop trigger if exists follow_up_tasks_set_updated_at on public.follow_up_tasks;
create trigger follow_up_tasks_set_updated_at
before update on public.follow_up_tasks
for each row execute function public.set_updated_at();

alter table public.location_tags enable row level security;
alter table public.application_location_tags enable row level security;
alter table public.follow_up_tasks enable row level security;

drop policy if exists "location_tags_select_own" on public.location_tags;
create policy "location_tags_select_own" on public.location_tags
for select using (auth.uid() = user_id);

drop policy if exists "location_tags_insert_own" on public.location_tags;
create policy "location_tags_insert_own" on public.location_tags
for insert with check (auth.uid() = user_id);

drop policy if exists "location_tags_update_own" on public.location_tags;
create policy "location_tags_update_own" on public.location_tags
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "location_tags_delete_own" on public.location_tags;
create policy "location_tags_delete_own" on public.location_tags
for delete using (auth.uid() = user_id);

drop policy if exists "application_location_tags_select_own" on public.application_location_tags;
create policy "application_location_tags_select_own" on public.application_location_tags
for select using (auth.uid() = user_id);

drop policy if exists "application_location_tags_insert_own" on public.application_location_tags;
create policy "application_location_tags_insert_own" on public.application_location_tags
for insert with check (auth.uid() = user_id);

drop policy if exists "application_location_tags_delete_own" on public.application_location_tags;
create policy "application_location_tags_delete_own" on public.application_location_tags
for delete using (auth.uid() = user_id);

drop policy if exists "follow_up_tasks_select_own" on public.follow_up_tasks;
create policy "follow_up_tasks_select_own" on public.follow_up_tasks
for select using (auth.uid() = user_id);

drop policy if exists "follow_up_tasks_insert_own" on public.follow_up_tasks;
create policy "follow_up_tasks_insert_own" on public.follow_up_tasks
for insert with check (auth.uid() = user_id);

drop policy if exists "follow_up_tasks_update_own" on public.follow_up_tasks;
create policy "follow_up_tasks_update_own" on public.follow_up_tasks
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "follow_up_tasks_delete_own" on public.follow_up_tasks;
create policy "follow_up_tasks_delete_own" on public.follow_up_tasks
for delete using (auth.uid() = user_id);

create or replace function public.set_application_locations(
  p_application_id uuid,
  p_location_tag_ids uuid[] default '{}'
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_distinct_count integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  select count(distinct value) into v_distinct_count
  from unnest(coalesce(p_location_tag_ids, '{}'::uuid[])) as selected(value);

  if v_distinct_count > 10 then
    raise exception 'An application can have at most 10 locations.' using errcode = '23514';
  end if;

  if not exists (
    select 1 from public.applications
    where id = p_application_id and user_id = v_user_id
  ) then
    raise exception 'Application not found.' using errcode = '42501';
  end if;

  if exists (
    select 1
    from unnest(coalesce(p_location_tag_ids, '{}'::uuid[])) as selected(value)
    left join public.location_tags tag
      on tag.id = selected.value and tag.user_id = v_user_id
    where tag.id is null
  ) then
    raise exception 'A selected location does not belong to the current user.' using errcode = '42501';
  end if;

  delete from public.application_location_tags
  where application_id = p_application_id and user_id = v_user_id;

  insert into public.application_location_tags (application_id, location_tag_id, user_id)
  select p_application_id, value, v_user_id
  from (
    select distinct value
    from unnest(coalesce(p_location_tag_ids, '{}'::uuid[])) as selected(value)
  ) unique_ids;
end;
$$;

grant execute on function public.set_application_locations(uuid, uuid[]) to authenticated;

insert into public.location_tags (user_id, label)
select distinct application.user_id, left(btrim(application.city), 32)
from public.applications application
where application.city is not null
  and btrim(application.city) <> ''
  and not exists (
    select 1 from public.location_tags tag
    where tag.user_id = application.user_id
      and lower(tag.label) = lower(left(btrim(application.city), 32))
  );

insert into public.application_location_tags (application_id, location_tag_id, user_id)
select application.id, tag.id, application.user_id
from public.applications application
join public.location_tags tag
  on tag.user_id = application.user_id
 and lower(tag.label) = lower(left(btrim(application.city), 32))
where application.city is not null
  and btrim(application.city) <> ''
on conflict do nothing;

insert into public.follow_up_tasks (user_id, application_id, title, due_date)
select
  application.user_id,
  application.id,
  left('跟进：' || application.company_name || ' · ' || application.position_name, 200),
  application.next_action_date
from public.applications application
where application.next_action_date is not null
  and not exists (
    select 1 from public.follow_up_tasks task
    where task.application_id = application.id
      and task.due_date = application.next_action_date
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatars_select_own" on storage.objects;
create policy "avatars_select_own" on storage.objects
for select using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own" on storage.objects
for insert with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own" on storage.objects
for update using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
) with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own" on storage.objects
for delete using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);
