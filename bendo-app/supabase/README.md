# 🗄️ Supabase

Database source of truth for Bendo. Auth is **Clerk** (not Supabase Auth). The app talks to Postgres with the **service role** key on the server only.

## Apply schema

1. Open [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql/new).
2. Paste `schema.sql` → **Run**.

`schema.sql` is **idempotent**: creates missing tables/indexes and replaces functions/triggers. It does **not** drop tables or delete rows. Do not use it to wipe production.

Do **not** use `supabase db push` / CLI migrations for this project.

## After schema changes

1. Update `schema.sql` (new columns/constraints → explicit `ALTER`, not “edit and re-run create”).
2. Align `lib/supabase/database.types.ts`.
3. Re-run the changed SQL (or full `schema.sql` when safe) in the Dashboard.

## Tables

| Table | Purpose |
| --- | --- |
| `categories` | User categories; unique name per user (case-insensitive) |
| `tasks` | Tasks; soft-delete via `deleted_at` |
| `task_activities` | Append-only activity log |
| `notifications` | In-app notifications |

All rows are scoped by `clerk_user_id`.

### Tasks (quick rules)

- Status stored: `pending` | `completed` only (`expired` is derived in app code).
- Priority: `low` | `moderate` | `extreme`.
- Max **5** non-deleted incomplete tasks per `scheduled_date` per user (enforced in DB).
- Duplicate title+schedule blocked via `content_normalized` + `scheduled_at`.

## RPCs (mutation + activity)

Use these instead of separate insert/update + activity writes:

- `create_task_with_activity` / `update_task_with_activity` / `delete_task_with_activity`
- `create_category_with_activity` / `update_category_with_activity` / `delete_category_with_activity`

## Security

- RLS enabled on all public tables above.
- `anon` / `authenticated`: **no** table grants.
- `service_role`: table + RPC access (server-only; never expose to the browser).

Env (see `bendo-app/.env.example`):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (**server only**)

## One-off scripts

| File | When |
| --- | --- |
| `alter-task-status-pattern.sql` | Legacy DBs still using `not_started` / `in_progress` → migrate to `pending` / `completed` |

Prefer a fresh apply of `schema.sql` for new projects.
