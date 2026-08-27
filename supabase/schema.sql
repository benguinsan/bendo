-- Bendo public schema
--
-- Run this in the Supabase Dashboard: SQL Editor → New query → paste → Run.
-- Safe to re-run: it drops existing Bendo objects first, then recreates them.
-- Do not use `supabase db push` / migrations for this schema.

drop table if exists public.notifications cascade;
drop table if exists public.task_activities cascade;
drop table if exists public.tasks cascade;
drop table if exists public.categories cascade;

drop function if exists public.reject_task_activity_mutation();
drop function if exists public.tasks_before_write();
drop function if exists public.set_updated_at();

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_clerk_user_id_check check (char_length(clerk_user_id) > 0),
  constraint categories_name_check check (
    char_length(name) between 1 and 50
    and name = btrim(name)
  )
);

create unique index categories_clerk_user_id_lower_name_uidx
  on public.categories (clerk_user_id, lower(name));

create index categories_clerk_user_id_idx
  on public.categories (clerk_user_id);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  category_id uuid references public.categories (id) on delete set null,
  content text not null,
  content_normalized text generated always as (
    lower(regexp_replace(btrim(content), '\s+', ' ', 'g'))
  ) stored,
  description text not null default '',
  status text not null default 'not_started',
  priority text not null,
  scheduled_at timestamptz not null,
  scheduled_date date not null,
  completed_at timestamptz,
  thumbnail_src text,
  thumbnail_alt text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint tasks_clerk_user_id_check check (char_length(clerk_user_id) > 0),
  constraint tasks_content_check check (
    char_length(btrim(content)) between 1 and 120
  ),
  constraint tasks_description_check check (char_length(description) <= 2000),
  constraint tasks_status_check check (
    status in ('not_started', 'in_progress', 'completed')
  ),
  constraint tasks_priority_check check (
    priority in ('low', 'moderate', 'extreme')
  ),
  constraint tasks_completed_at_status_check check (
    (status = 'completed' and completed_at is not null)
    or (status <> 'completed' and completed_at is null)
  )
);

create unique index tasks_clerk_user_id_content_scheduled_uidx
  on public.tasks (clerk_user_id, content_normalized, scheduled_at)
  where deleted_at is null;

create index tasks_clerk_user_id_live_idx
  on public.tasks (clerk_user_id)
  where deleted_at is null;

create index tasks_clerk_user_id_scheduled_date_live_idx
  on public.tasks (clerk_user_id, scheduled_date)
  where deleted_at is null;

create index tasks_category_id_idx
  on public.tasks (category_id);

create table public.task_activities (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  actor_clerk_user_id text not null,
  action text not null,
  entity_type text not null,
  entity_id uuid not null,
  result text not null,
  metadata jsonb,
  created_at timestamptz not null default now(),
  constraint task_activities_clerk_user_id_check check (char_length(clerk_user_id) > 0),
  constraint task_activities_actor_check check (char_length(actor_clerk_user_id) > 0),
  constraint task_activities_action_check check (
    action in (
      'task_created',
      'task_updated',
      'task_completed',
      'task_reopened',
      'task_deleted',
      'category_created',
      'category_updated',
      'category_deleted'
    )
  ),
  constraint task_activities_entity_type_check check (
    entity_type in ('task', 'category')
  ),
  constraint task_activities_result_check check (result in ('success', 'failure'))
);

create index task_activities_clerk_user_id_created_at_idx
  on public.task_activities (clerk_user_id, created_at desc);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  title text not null,
  body text not null default '',
  read_at timestamptz,
  task_id uuid references public.tasks (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint notifications_clerk_user_id_check check (char_length(clerk_user_id) > 0),
  constraint notifications_title_check check (char_length(btrim(title)) > 0)
);

create index notifications_clerk_user_id_created_at_idx
  on public.notifications (clerk_user_id, created_at desc);

create index notifications_clerk_user_id_unread_idx
  on public.notifications (clerk_user_id)
  where read_at is null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

create or replace function public.tasks_before_write()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  live_count integer;
begin
  if tg_op = 'UPDATE' then
    new.updated_at := pg_catalog.now();
  end if;

  if new.status = 'completed' then
    if new.completed_at is null then
      new.completed_at := pg_catalog.now();
    end if;
  else
    new.completed_at := null;
  end if;

  if new.deleted_at is null and new.status <> 'completed'
     and new.scheduled_at < pg_catalog.now() then
    raise exception 'SCHEDULE_IN_PAST'
      using errcode = 'P0001';
  end if;

  if new.deleted_at is null then
    select count(*)::integer
      into live_count
      from public.tasks as t
     where t.clerk_user_id = new.clerk_user_id
       and t.scheduled_date = new.scheduled_date
       and t.deleted_at is null
       and t.id is distinct from new.id;

    if live_count >= 5 then
      raise exception 'TASKS_PER_DATE_MAX'
        using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.reject_task_activity_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'task_activities are append-only'
    using errcode = 'P0001';
end;
$$;

create trigger categories_set_updated_at
  before update on public.categories
  for each row
  execute procedure public.set_updated_at();

create trigger tasks_before_write
  before insert or update on public.tasks
  for each row
  execute procedure public.tasks_before_write();

create trigger task_activities_append_only
  before update or delete on public.task_activities
  for each row
  execute procedure public.reject_task_activity_mutation();

alter table public.categories enable row level security;
alter table public.tasks enable row level security;
alter table public.task_activities enable row level security;
alter table public.notifications enable row level security;

revoke all on table public.categories from anon, authenticated, public;
revoke all on table public.tasks from anon, authenticated, public;
revoke all on table public.task_activities from anon, authenticated, public;
revoke all on table public.notifications from anon, authenticated, public;

grant select, insert, update, delete on table public.categories to service_role;
grant select, insert, update, delete on table public.tasks to service_role;
grant select, insert on table public.task_activities to service_role;
grant select, insert, update, delete on table public.notifications to service_role;

revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.tasks_before_write() from public, anon, authenticated;
revoke all on function public.reject_task_activity_mutation() from public, anon, authenticated;
