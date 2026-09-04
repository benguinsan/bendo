-- Bendo public schema
--
-- Apply in the Supabase Dashboard: SQL Editor → New query → paste → Run.
-- Idempotent: creates missing tables/indexes and replaces functions/triggers.
-- Does not drop tables or delete existing rows. Do not use this file to reset
-- a production database. Add new columns or constraints with explicit ALTER.
-- Do not use `supabase db push` / migrations for this schema.

create table if not exists public.categories (
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

create unique index if not exists categories_clerk_user_id_lower_name_uidx
  on public.categories (clerk_user_id, lower(name));

create index if not exists categories_clerk_user_id_idx
  on public.categories (clerk_user_id);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  category_id uuid references public.categories (id) on delete set null,
  content text not null,
  content_normalized text generated always as (
    lower(regexp_replace(btrim(content), '\s+', ' ', 'g'))
  ) stored,
  description text not null default '',
  status text not null default 'pending',
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
    status in ('pending', 'completed')
  ),
  constraint tasks_priority_check check (
    priority in ('low', 'moderate', 'extreme')
  ),
  constraint tasks_completed_at_status_check check (
    (status = 'completed' and completed_at is not null)
    or (status <> 'completed' and completed_at is null)
  )
);

create unique index if not exists tasks_clerk_user_id_content_scheduled_uidx
  on public.tasks (clerk_user_id, content_normalized, scheduled_at)
  where deleted_at is null;

create index if not exists tasks_clerk_user_id_live_idx
  on public.tasks (clerk_user_id)
  where deleted_at is null;

create index if not exists tasks_clerk_user_id_scheduled_date_live_idx
  on public.tasks (clerk_user_id, scheduled_date)
  where deleted_at is null;

create index if not exists tasks_category_id_idx
  on public.tasks (category_id);

create table if not exists public.task_activities (
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

create index if not exists task_activities_clerk_user_id_created_at_idx
  on public.task_activities (clerk_user_id, created_at desc);

create table if not exists public.notifications (
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

create index if not exists notifications_clerk_user_id_created_at_idx
  on public.notifications (clerk_user_id, created_at desc);

create index if not exists notifications_clerk_user_id_unread_idx
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

  if new.deleted_at is null and new.status <> 'completed' then
    select count(*)::integer
      into live_count
      from public.tasks as t
     where t.clerk_user_id = new.clerk_user_id
       and t.scheduled_date = new.scheduled_date
       and t.deleted_at is null
       and t.status <> 'completed'
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

create or replace trigger categories_set_updated_at
  before update on public.categories
  for each row
  execute procedure public.set_updated_at();

create or replace trigger tasks_before_write
  before insert or update on public.tasks
  for each row
  execute procedure public.tasks_before_write();

create or replace trigger task_activities_append_only
  before update or delete on public.task_activities
  for each row
  execute procedure public.reject_task_activity_mutation();

-- Mutation + activity: one Postgres function = one transaction.
-- See prompts/shared-transactions.md.

create or replace function public.insert_success_activity(
  p_clerk_user_id text,
  p_actor_clerk_user_id text,
  p_action text,
  p_entity_type text,
  p_entity_id uuid
)
returns void
language sql
security invoker
set search_path = ''
as $$
  insert into public.task_activities (
    clerk_user_id,
    actor_clerk_user_id,
    action,
    entity_type,
    entity_id,
    result
  ) values (
    p_clerk_user_id,
    p_actor_clerk_user_id,
    p_action,
    p_entity_type,
    p_entity_id,
    'success'
  );
$$;

create or replace function public.create_task_with_activity(
  p_clerk_user_id text,
  p_actor_clerk_user_id text,
  p_content text,
  p_description text,
  p_priority text,
  p_scheduled_at timestamptz,
  p_scheduled_date date,
  p_category_id uuid default null,
  p_thumbnail_src text default null,
  p_thumbnail_alt text default null
)
returns public.tasks
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_row public.tasks;
begin
  if p_category_id is not null then
    perform 1
      from public.categories as c
     where c.id = p_category_id
       and c.clerk_user_id = p_clerk_user_id;

    if not found then
      raise exception 'CATEGORY_NOT_FOUND'
        using errcode = 'P0001';
    end if;
  end if;

  insert into public.tasks (
    clerk_user_id,
    content,
    description,
    priority,
    scheduled_at,
    scheduled_date,
    category_id,
    thumbnail_src,
    thumbnail_alt,
    status
  ) values (
    p_clerk_user_id,
    p_content,
    p_description,
    p_priority,
    p_scheduled_at,
    p_scheduled_date,
    p_category_id,
    p_thumbnail_src,
    p_thumbnail_alt,
    'pending'
  )
  returning * into new_row;

  perform public.insert_success_activity(
    p_clerk_user_id,
    p_actor_clerk_user_id,
    'task_created',
    'task',
    new_row.id
  );

  return new_row;
end;
$$;

create or replace function public.update_task_with_activity(
  p_clerk_user_id text,
  p_actor_clerk_user_id text,
  p_task_id uuid,
  p_patch jsonb
)
returns public.tasks
language plpgsql
security invoker
set search_path = ''
as $$
declare
  old_status text;
  new_row public.tasks;
  activity_action text;
begin
  if pg_catalog.jsonb_exists(p_patch, 'category_id')
     and pg_catalog.jsonb_typeof(p_patch -> 'category_id') is distinct from 'null'
  then
    perform 1
      from public.categories as c
     where c.id = (p_patch ->> 'category_id')::uuid
       and c.clerk_user_id = p_clerk_user_id;

    if not found then
      raise exception 'CATEGORY_NOT_FOUND'
        using errcode = 'P0001';
    end if;
  end if;

  select t.status
    into old_status
    from public.tasks as t
   where t.id = p_task_id
     and t.clerk_user_id = p_clerk_user_id
     and t.deleted_at is null
   for update;

  if not found then
    return null;
  end if;

  update public.tasks as t
     set content = case
           when pg_catalog.jsonb_exists(p_patch, 'content') then p_patch ->> 'content'
           else t.content
         end,
         description = case
           when pg_catalog.jsonb_exists(p_patch, 'description') then p_patch ->> 'description'
           else t.description
         end,
         priority = case
           when pg_catalog.jsonb_exists(p_patch, 'priority') then p_patch ->> 'priority'
           else t.priority
         end,
         status = case
           when pg_catalog.jsonb_exists(p_patch, 'status') then p_patch ->> 'status'
           else t.status
         end,
         category_id = case
           when pg_catalog.jsonb_exists(p_patch, 'category_id') then (p_patch ->> 'category_id')::uuid
           else t.category_id
         end,
         thumbnail_src = case
           when pg_catalog.jsonb_exists(p_patch, 'thumbnail_src') then p_patch ->> 'thumbnail_src'
           else t.thumbnail_src
         end,
         thumbnail_alt = case
           when pg_catalog.jsonb_exists(p_patch, 'thumbnail_alt') then p_patch ->> 'thumbnail_alt'
           else t.thumbnail_alt
         end,
         scheduled_at = case
           when pg_catalog.jsonb_exists(p_patch, 'scheduled_at') then (p_patch ->> 'scheduled_at')::timestamptz
           else t.scheduled_at
         end,
         scheduled_date = case
           when pg_catalog.jsonb_exists(p_patch, 'scheduled_date') then (p_patch ->> 'scheduled_date')::date
           else t.scheduled_date
         end
   where t.id = p_task_id
     and t.clerk_user_id = p_clerk_user_id
     and t.deleted_at is null
  returning t.* into new_row;

  if not found then
    return null;
  end if;

  if old_status is distinct from 'completed' and new_row.status = 'completed' then
    activity_action := 'task_completed';
  elsif old_status = 'completed' and new_row.status is distinct from 'completed' then
    activity_action := 'task_reopened';
  else
    activity_action := 'task_updated';
  end if;

  perform public.insert_success_activity(
    p_clerk_user_id,
    p_actor_clerk_user_id,
    activity_action,
    'task',
    new_row.id
  );

  return new_row;
end;
$$;

create or replace function public.delete_task_with_activity(
  p_clerk_user_id text,
  p_actor_clerk_user_id text,
  p_task_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  deleted_id uuid;
begin
  update public.tasks as t
     set deleted_at = pg_catalog.now()
   where t.id = p_task_id
     and t.clerk_user_id = p_clerk_user_id
     and t.deleted_at is null
  returning t.id into deleted_id;

  if not found then
    return null;
  end if;

  perform public.insert_success_activity(
    p_clerk_user_id,
    p_actor_clerk_user_id,
    'task_deleted',
    'task',
    deleted_id
  );

  return deleted_id;
end;
$$;

create or replace function public.create_category_with_activity(
  p_clerk_user_id text,
  p_actor_clerk_user_id text,
  p_name text
)
returns public.categories
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_row public.categories;
begin
  insert into public.categories (clerk_user_id, name)
  values (p_clerk_user_id, p_name)
  returning * into new_row;

  perform public.insert_success_activity(
    p_clerk_user_id,
    p_actor_clerk_user_id,
    'category_created',
    'category',
    new_row.id
  );

  return new_row;
end;
$$;

create or replace function public.update_category_with_activity(
  p_clerk_user_id text,
  p_actor_clerk_user_id text,
  p_category_id uuid,
  p_name text
)
returns public.categories
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_row public.categories;
begin
  update public.categories as c
     set name = p_name
   where c.id = p_category_id
     and c.clerk_user_id = p_clerk_user_id
  returning c.* into new_row;

  if not found then
    return null;
  end if;

  perform public.insert_success_activity(
    p_clerk_user_id,
    p_actor_clerk_user_id,
    'category_updated',
    'category',
    new_row.id
  );

  return new_row;
end;
$$;

create or replace function public.delete_category_with_activity(
  p_clerk_user_id text,
  p_actor_clerk_user_id text,
  p_category_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  deleted_id uuid;
begin
  delete from public.categories as c
   where c.id = p_category_id
     and c.clerk_user_id = p_clerk_user_id
  returning c.id into deleted_id;

  if not found then
    return null;
  end if;

  perform public.insert_success_activity(
    p_clerk_user_id,
    p_actor_clerk_user_id,
    'category_deleted',
    'category',
    deleted_id
  );

  return deleted_id;
end;
$$;

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
revoke all on function public.insert_success_activity(text, text, text, text, uuid) from public, anon, authenticated;
revoke all on function public.create_task_with_activity(text, text, text, text, text, timestamptz, date, uuid, text, text) from public, anon, authenticated;
revoke all on function public.update_task_with_activity(text, text, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.delete_task_with_activity(text, text, uuid) from public, anon, authenticated;
revoke all on function public.create_category_with_activity(text, text, text) from public, anon, authenticated;
revoke all on function public.update_category_with_activity(text, text, uuid, text) from public, anon, authenticated;
revoke all on function public.delete_category_with_activity(text, text, uuid) from public, anon, authenticated;

grant execute on function public.insert_success_activity(text, text, text, text, uuid) to service_role;
grant execute on function public.create_task_with_activity(text, text, text, text, text, timestamptz, date, uuid, text, text) to service_role;
grant execute on function public.update_task_with_activity(text, text, uuid, jsonb) to service_role;
grant execute on function public.delete_task_with_activity(text, text, uuid) to service_role;
grant execute on function public.create_category_with_activity(text, text, text) to service_role;
grant execute on function public.update_category_with_activity(text, text, uuid, text) to service_role;
grant execute on function public.delete_category_with_activity(text, text, uuid) to service_role;
