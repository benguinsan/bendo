-- Add discord_identities mapping table (clerk_user_id ↔ discord_user_id).
--
-- Apply in Supabase Dashboard: SQL Editor → New query → paste → Run.
-- Safe to re-run: uses IF NOT EXISTS / create or replace where possible.
-- For a full idempotent schema apply, prefer supabase/schema.sql.

create table if not exists public.discord_identities (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  discord_user_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint discord_identities_clerk_user_id_check check (
    char_length(clerk_user_id) > 0
  ),
  constraint discord_identities_discord_user_id_check check (
    char_length(discord_user_id) > 0
  )
);

create unique index if not exists discord_identities_clerk_user_id_uidx
  on public.discord_identities (clerk_user_id);

create unique index if not exists discord_identities_discord_user_id_uidx
  on public.discord_identities (discord_user_id);

create or replace trigger discord_identities_set_updated_at
  before update on public.discord_identities
  for each row
  execute procedure public.set_updated_at();

alter table public.discord_identities enable row level security;

revoke all on table public.discord_identities from anon, authenticated, public;

grant select, insert, update, delete on table public.discord_identities to service_role;
