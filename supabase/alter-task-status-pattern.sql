-- Migrate task status to pending/completed pattern.
--
-- Apply in Supabase Dashboard: SQL Editor → New query → paste → Run.
-- Run once on databases that still use not_started / in_progress / completed.
-- `expired` is derived at read time (scheduled_at < now and status <> completed);
-- it is not stored in tasks.status.
--
-- After this script, re-run the function definitions from supabase/schema.sql
-- if create_task_with_activity or other RPCs were not updated by a full schema apply.

-- 1. Drop the legacy check constraint first so `pending` is allowed during migration.
alter table public.tasks
  drop constraint if exists tasks_status_check;

-- 2. Map legacy statuses to pending, then enforce the new constraint.
update public.tasks
   set status = 'pending'
 where status in ('not_started', 'in_progress');

alter table public.tasks
  add constraint tasks_status_check check (
    status in ('pending', 'completed')
  );

alter table public.tasks
  alter column status set default 'pending';

-- 3. New tasks must default to pending in the create RPC.
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

revoke all on function public.create_task_with_activity(text, text, text, text, text, timestamptz, date, uuid, text, text) from public, anon, authenticated;
grant execute on function public.create_task_with_activity(text, text, text, text, text, timestamptz, date, uuid, text, text) to service_role;
