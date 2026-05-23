create extension if not exists "pgcrypto";

create type public.application_status as enum (
  'todo',
  'applied',
  'screening',
  'exam',
  'interview1',
  'interview2',
  'interview3',
  'hr',
  'offer',
  'rejected',
  'silent',
  'closed'
);

create type public.application_priority as enum ('high', 'medium', 'low');
create type public.application_event_type as enum ('note', 'exam', 'interview', 'follow', 'result', 'status', 'create');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '秋招投递助手',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_name text not null,
  position_name text not null,
  city text,
  channel text,
  status public.application_status not null default 'applied',
  priority public.application_priority not null default 'medium',
  applied_date date,
  next_action_date date,
  job_url text,
  salary_range text,
  resume_version text,
  contact_name text,
  contact_info text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint todo_has_no_required_applied_date check (status <> 'todo' or applied_date is null)
);

create index applications_user_updated_idx on public.applications(user_id, updated_at desc);
create index applications_user_status_idx on public.applications(user_id, status);
create index applications_user_next_action_idx on public.applications(user_id, next_action_date);

create trigger applications_set_updated_at
before update on public.applications
for each row execute function public.set_updated_at();

create table public.application_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid not null references public.applications(id) on delete cascade,
  type public.application_event_type not null default 'note',
  title text not null,
  description text,
  event_date date not null default current_date,
  created_at timestamptz not null default now()
);

create index application_events_user_date_idx on public.application_events(user_id, event_date desc);
create index application_events_application_idx on public.application_events(application_id, event_date desc);

alter table public.profiles enable row level security;
alter table public.applications enable row level security;
alter table public.application_events enable row level security;

create policy "profiles_select_own" on public.profiles
for select using (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
for update using (auth.uid() = id)
with check (auth.uid() = id);

create policy "applications_select_own" on public.applications
for select using (auth.uid() = user_id);

create policy "applications_insert_own" on public.applications
for insert with check (auth.uid() = user_id);

create policy "applications_update_own" on public.applications
for update using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "applications_delete_own" on public.applications
for delete using (auth.uid() = user_id);

create policy "events_select_own" on public.application_events
for select using (auth.uid() = user_id);

create policy "events_insert_own" on public.application_events
for insert with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.applications
    where applications.id = application_events.application_id
      and applications.user_id = auth.uid()
  )
);

create policy "events_delete_own" on public.application_events
for delete using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', '秋招投递助手'));
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
