# Supabase database and data access

## Goal

Add Bendo’s **Supabase source of truth** and **server-side data access**: `supabase/schema.sql` for `tasks`, `categories`, `task_activities`, and `notifications` (applied in the SQL Editor); TypeScript database types; a server-only service-role client; application services that enforce task/category/activity rules; and thin Clerk-authenticated App Router handlers.

This pass is **database + data access only**. Do **not** replace Dashboard / My Task / Vital Task / Categories mock UI with live data. Do **not** add Supabase Auth, Clerk third-party JWT / `auth.uid()` RLS, Storage uploads, pgvector, webhooks, a `users` table, or Agent code.

## Skills read

- `AGENTS.md` (Supabase source of truth, task/category/activity rules, API method conventions, env table, server/client boundaries, Ultracite checks, no overbuild)
- `.agents/skills/supabase/SKILL.md` (verify docs/changelog; RLS + grants; never expose `service_role`; `auth.role()` deprecated; UPDATE needs SELECT + `USING`/`WITH CHECK`; `SECURITY DEFINER` pitfalls; imperative migrations via `supabase migration new`; generate types from the schema; Data API exposure / explicit `GRANT`)
- `.agents/skills/clerk/SKILL.md` → `clerk-nextjs-patterns` + `references/api-routes.md` (`await auth()`; 401 vs 403; do not mix server/client Clerk imports)
- Next.js 16 docs (read from `node_modules/next/dist/docs/` at implement time if present, otherwise the published guides): App Router Route Handlers (`route.ts`), `params` is a **Promise**, Server vs Client Components, `server-only`
- Supabase docs fetched for this prompt:
  - Changelog / breaking change: new tables may **not** be Data-API-exposed without explicit `GRANT` ([45329](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically); default flips **2026-05-30**)
  - [Securing your API](https://supabase.com/docs/guides/api/securing-your-api.md)
  - [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security.md)
  - [Generating TypeScript types](https://supabase.com/docs/guides/api/rest/generating-types.md)
  - [JS client init](https://supabase.com/docs/reference/javascript/initializing.md)
- Product UI prompts (`prompts/add-task.md`, `prompts/create-categories.md`, `prompts/clerk-authentication.md`) only for field/validation names — **do not** re-implement those UIs

AI SDK is **not** needed.

## Existing code inspected

- `package.json` — `@supabase/supabase-js` `^2.112.4` is installed; **no** `@supabase/ssr`, **no** `server-only`, **no** `supabase` CLI, **no** `app/api` routes
- `env.ts` / `.env.example` — Clerk vars only. Host `.env` already has `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (do **not** print, log, or commit values)
- No `supabase/` directory; `supabase` CLI is not on PATH
- `lib/auth/require-user.ts` — `auth.protect()` + `currentUser()` for pages. API routes must use `auth()` and return **401**, not redirect
- `lib/tasks/task-input.ts` — Zod 4 `taskFormSchema`; `TASK_TITLE_MAX` 120; `TASK_DESCRIPTION_MAX` 2000; `TASKS_PER_DATE_MAX` 5; `normalizeTaskTitle`; 5-per-date counts **incomplete**, non-deleted tasks (frontend and DB)
- `lib/task-categories/category-input.ts` — `CATEGORY_NAME_MAX` 50; trim/collapse whitespace
- `lib/dashboard/mock-data.ts` — `TaskStatus` / `TaskPriority`; `DashboardTask`; overdue is derived (`status !== "completed"` and `scheduledAt < now`). Keep mock helpers for UI this pass
- `lib/tasks/create-mock-task.ts` — local-noon `scheduledAt`; IDs are UUIDs
- `app/(app)/page.tsx` and other product pages still load mock fixtures — **leave them on mocks**
- `app/(app)/my-task/[taskId]/page.tsx` — `params: Promise<{ taskId: string }>` (Next 16). API dynamic segments must match
- `proxy.ts` — handshake-only `clerkMiddleware()`; keep it that way (middleware is not the API security boundary)
- `next.config.ts` — already side-effect-imports `./env`
- Status/priority taxonomy in `lib/task-categories/taxonomy.ts` is a **fixed app enum**, not a DB table

## Decisions or assumptions

1. **Clerk is the only auth.** Do not enable or use Supabase Auth. Do not add Clerk third-party JWT / `getToken({ template: "supabase" })` in this pass. `auth.uid()` will be null; do not write RLS that depends on it.
2. **Server-only service role.** All reads and writes go through a `createClient` that uses `SUPABASE_SERVICE_ROLE_KEY`. Mark the module `import "server-only"`. Never import it from Client Components. Disable session persistence on this client (`persistSession: false`, `autoRefreshToken: false`).
3. **RLS is deny-by-default for Data API roles.** Enable RLS on every public table. **Revoke** table privileges from `anon` and `authenticated`. **Grant** `SELECT, INSERT, UPDATE, DELETE` only to `service_role` (and `SELECT, INSERT` only on `task_activities`). No `TO authenticated` policies that would imply browser access. This is defense in depth if the anon key is used against PostgREST: RLS + no grants ⇒ no rows.
4. **Application scoping is the real authorization.** Every service method takes the Clerk `userId` and filters/writes `clerk_user_id`. Never trust a client-supplied owner id. Never query without that filter.
5. **No `users` / profiles table and no Clerk webhooks.** Store `clerk_user_id text not null` on owned rows (Clerk ids are `user_…`, not UUIDs).
6. **Manual SQL Editor apply (no migration push).** Author the schema in `supabase/schema.sql`. The operator pastes it into the Supabase Dashboard SQL Editor and runs it. Do **not** use `supabase db push` or `supabase/migrations/` for this schema. The file must be idempotent (`CREATE TABLE/INDEX IF NOT EXISTS`, `CREATE OR REPLACE` for functions/triggers). It must **not** `DROP TABLE` or delete existing rows. Do not treat it as a production reset. New columns and constraints need explicit `ALTER`.
7. **Hosted project already has keys.** Types live in `lib/supabase/database.types.ts` and must stay aligned with `supabase/schema.sql`. Do not add a `scripts/` helper or `npm run db:types` wrapper.
8. **Do not pin the Supabase CLI** for this pass (no local start, no migration push, no type-gen script).
9. **Primary keys:** `uuid primary key default gen_random_uuid()` so task ids match existing `crypto.randomUUID()` URL usage without a new extension. Accept the uuid-v4 locality tradeoff for this personal-scale app (do not add `pg_uuidv7`).
10. **Task column is `content`**, mapped to UI `title` in the service layer. Keep max lengths in one shared constants module (reuse `TASK_TITLE_MAX` / `TASK_DESCRIPTION_MAX` / `CATEGORY_NAME_MAX` / `TASKS_PER_DATE_MAX`).
11. **Calendar date vs timestamptz.** Store `scheduled_at timestamptz not null` **and** `scheduled_date date not null`. `scheduled_date` is the user’s intended local calendar day from the date picker (not `scheduled_at::date`, which is timezone-wrong). Duplicate detection uses **normalized content + `scheduled_at`**. The 5-task cap uses **`scheduled_date`**.
12. **Soft delete.** `tasks.deleted_at timestamptz`. List/update/duplicate/5-cap ignore deleted rows. DELETE API is a soft delete. Unique indexes are **partial** `where deleted_at is null`.
13. **Category delete detaches tasks.** `tasks.category_id uuid references public.categories(id) on delete set null`. Deleting a category does not delete tasks. Validate that `category_id` belongs to the same `clerk_user_id` before assign.
14. **Category uniqueness** is case-insensitive per user: unique index on `(clerk_user_id, lower(name))`. Persist `name` after the existing `normalizeCategoryName` (trim + collapse internal whitespace).
15. **DB enforces** (triggers / unique indexes / checks), not only TypeScript:
    - `content` non-empty after trim; length ≤ `TASK_TITLE_MAX`; description length ≤ `TASK_DESCRIPTION_MAX`
    - `status in ('not_started','in_progress','completed')`, `priority in ('low','moderate','extreme')`
    - incomplete insert/update cannot use `scheduled_at` in the past; completed rows may keep a past `scheduled_at`
    - max 5 non-deleted incomplete tasks per `(clerk_user_id, scheduled_date)`; enforce this cap only when the resulting row is incomplete (same predicate as `tasks_before_write` in `supabase/schema.sql`)
    - unique `(clerk_user_id, content_normalized, scheduled_at)` where `deleted_at is null`
    - completing sets `completed_at`; leaving `completed` clears `completed_at`
    - `content_normalized` is a `generated always … stored` column using the same normalize rules as `normalizeTaskTitle`
16. **Overdue is not a column.** Derive in the mapper (`status !== 'completed' && scheduled_at < now`).
17. **No statistics tables.** Counts/percentages stay derived from `tasks` in JS.
18. **`task_activities` are append-only.** Services write them in the same transaction as the mutation via `*_with_activity` RPCs (`prompts/shared-transactions.md`). **No** PATCH/DELETE activity routes. **No** GET activity route in this pass. Grant `SELECT, INSERT` only; revoke `UPDATE, DELETE` even from `service_role` if Postgres allows (otherwise block with a trigger that `raise exception` on update/delete).
19. **Notifications** exist as a table + list/create/mark-read access. Do **not** auto-insert a notification on every task mutation (that would spam the unused bell). POST is available for explicit creates; GET lists the current user’s rows; PATCH marks `read_at`.
20. **Thin API routes** per AGENTS.md. Handlers: `auth()` → 401 if unsigned → parse/Zod → call one service function → map domain errors to HTTP. No Supabase calls inside `route.ts`.
21. **Do not wire the UI.** Mock fixtures stay. Client forms stay local. This prompt must not edit dashboard/my-task/vital-task/category view components except if a shared type import path moves (avoid that).
22. **Do not add Storage.** Persist `thumbnail_src` / `thumbnail_alt` as text (nullable). APIs accept a string path/URL, not a file upload.
23. **Do not use** `.eq('foreignTable.column', value)`. If a join is needed, fetch then filter in JS, or filter on the parent table’s columns.
24. **Do not create** a browser Supabase client, `@supabase/ssr` helpers, or `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`.
25. **`NEXT_PUBLIC_SUPABASE_ANON_KEY` is required in env** (canonical AGENTS.md list) even though this pass does not use it in app code. Document it; do not ship a client that queries user tables with it.

## Files likely to change

- `supabase/schema.sql` — **new**; paste into SQL Editor. No `supabase/config.toml` (that file is only for local CLI/`supabase start`)
- `lib/supabase/database.types.ts` — **generated**, not hand-written
- `lib/supabase/server.ts` — **new** server-only service-role client
- `lib/supabase/errors.ts` — **new** typed domain error codes (optional if folded into services)
- `lib/tasks/task-service.ts` (name flexible) — **new**
- `lib/task-categories/category-service.ts` — **new**
- `lib/notifications/notification-service.ts` — **new**
- `lib/tasks/task-input.ts` — reuse; add **server** Zod schemas for create/patch (status, category_id, scheduled_at, etc.) without breaking the existing form schema
- `app/api/tasks/route.ts` — GET, POST
- `app/api/tasks/[task_id]/route.ts` — GET, PATCH, DELETE (`await params`)
- `app/api/categories/route.ts` — GET, POST
- `app/api/categories/[category_id]/route.ts` — PATCH, DELETE
- `app/api/notifications/route.ts` — GET, POST
- `app/api/notifications/[notification_id]/route.ts` — PATCH (mark read)
- `env.ts` / `.env.example` — required Supabase URL, anon key, service role key
- `package.json` / `package-lock.json` — `server-only`
- `README.md` — how to apply `schema.sql` / env vars
- `.gitignore` — keep `supabase/.temp` / local CLI junk out; **commit** `supabase/schema.sql`

Do **not** commit `.env` / `.env.local`. Do not edit `AGENTS.md` unless a new env **name** is required (it is not). Do not change `proxy.ts` auth strategy. Do not restyle UI.

## Implementation requirements

### Env

Add to `env.ts` (required, `emptyStringAsUndefined: true`) and empty placeholders in `.env.example`:

| Variable | Server schema | Client schema |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | — | `z.string().url()` (or `min(1)` if you must match Clerk style) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | — | `z.string().min(1)` |
| `SUPABASE_SERVICE_ROLE_KEY` | `z.string().min(1)` | — |

Keep existing Clerk vars. Do not add `DATABASE_URL` unless the CLI type-gen/push flow truly needs it — and then only server-side.

### Schema (public)

Lowercase snake_case unquoted identifiers. `text` not `varchar`. `timestamptz` not `timestamp`.

**`categories`**

- `id uuid primary key default gen_random_uuid()`
- `clerk_user_id text not null`
- `name text not null` with check: `char_length(name) between 1 and 50` and `name = btrim(name)`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- Unique index `categories_clerk_user_id_lower_name_uidx` on `(clerk_user_id, lower(name))`
- Index `categories_clerk_user_id_idx` on `(clerk_user_id)`

**`tasks`**

- `id uuid primary key default gen_random_uuid()`
- `clerk_user_id text not null`
- `category_id uuid null references public.categories(id) on delete set null`
- `content text not null`
- `content_normalized text generated always as (lower(regexp_replace(btrim(content), '\s+', ' ', 'g'))) stored`
- `description text not null default ''`
- `status text not null default 'not_started'`
- `priority text not null`
- `scheduled_at timestamptz not null`
- `scheduled_date date not null`
- `completed_at timestamptz null`
- `thumbnail_src text null`
- `thumbnail_alt text null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `deleted_at timestamptz null`
- Checks: status/priority enums; `char_length(btrim(content)) between 1 and 120`; `char_length(description) <= 2000`; `completed_at is not null` iff `status = 'completed'` (or enforce completed_at in the same trigger that sets it — pick one place and be consistent)
- Partial unique index on `(clerk_user_id, content_normalized, scheduled_at) where deleted_at is null`
- Indexes: `(clerk_user_id) where deleted_at is null`; `(clerk_user_id, scheduled_date) where deleted_at is null`; `(category_id)` (FK)

**`task_activities`**

- `id uuid primary key default gen_random_uuid()`
- `clerk_user_id text not null` (owner scope)
- `actor_clerk_user_id text not null`
- `action text not null` (e.g. `task_created`, `task_updated`, `task_completed`, `task_reopened`, `task_deleted`, `category_created`, `category_updated`, `category_deleted`)
- `entity_type text not null` check in (`task`, `category`)
- `entity_id uuid not null`
- `result text not null` check in (`success`, `failure`)
- `metadata jsonb null`
- `created_at timestamptz not null default now()`
- Index `(clerk_user_id, created_at desc)`

**`notifications`**

- `id uuid primary key default gen_random_uuid()`
- `clerk_user_id text not null`
- `title text not null`
- `body text not null default ''`
- `read_at timestamptz null`
- `task_id uuid null references public.tasks(id) on delete set null`
- `created_at timestamptz not null default now()`
- Index `(clerk_user_id, created_at desc)`; partial `(clerk_user_id) where read_at is null`

**Triggers (SECURITY INVOKER, `set search_path = ''`, fully qualified names)**

- `updated_at` bump on `tasks` and `categories`
- Task insert/update: reject past `scheduled_at` when the resulting status is not `completed`
- Task insert/update: if the resulting row is not deleted and not `completed`, count other non-deleted incomplete rows with the same `(clerk_user_id, scheduled_date)` and reject at 5
- Sync `completed_at` with `status`
- Optional: reject `task_activities` update/delete

Map Postgres unique/check/raise messages to stable domain codes in the service (`DUPLICATE_TASK`, `TASKS_PER_DATE_MAX`, `SCHEDULE_IN_PAST`, `DUPLICATE_CATEGORY`, `CATEGORY_NOT_FOUND`, `TASK_NOT_FOUND`, `VALIDATION`).

### Grants and RLS

In the same `schema.sql` script:

```sql
alter table public.tasks enable row level security;
alter table public.categories enable row level security;
alter table public.task_activities enable row level security;
alter table public.notifications enable row level security;

revoke all on table public.tasks from anon, authenticated, public;
-- repeat for categories, task_activities, notifications

grant select, insert, update, delete on table public.tasks to service_role;
grant select, insert, update, delete on table public.categories to service_role;
grant select, insert on table public.task_activities to service_role;
grant select, insert, update, delete on table public.notifications to service_role;
```

Do **not** add `TO anon` or `TO authenticated` policies. Do **not** use `auth.role()`. Do **not** add `SECURITY DEFINER` functions in `public`. Do **not** run Supabase CLI advisors/`db push` for this schema.

### Generated types

Keep `lib/supabase/database.types.ts` aligned with `supabase/schema.sql`. Pass `Database` into `createClient<Database>(…)`. Do not add a `scripts/` wrapper or `npm run db:types`.

### Application services

Keep layers separate. Suggested typed result:

```ts
type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string };
```

**Tasks (always `eq('clerk_user_id', userId)` and `is('deleted_at', null)` unless fetching a deleted row is required — it is not)**

- `listTasks(userId)`
- `getTask(userId, taskId)`
- `createTask(userId, input)` — Zod at the boundary; set `clerk_user_id` server-side; default `status: 'not_started'`; insert activity `task_created`
- `updateTask(userId, taskId, patch)` — category must be owned; incomplete + past schedule rejected; activity `task_updated` / `task_completed` / `task_reopened` as appropriate
- `deleteTask(userId, taskId)` — set `deleted_at`; activity `task_deleted`

**Categories**

- `listCategories(userId)`
- `createCategory` / `updateCategory` / `deleteCategory` with activities `category_*`

**Activities**

- Written inside `*_with_activity` RPCs (same transaction as the mutation). See `prompts/shared-transactions.md`. No activity HTTP routes.

**Notifications**

- `listNotifications(userId)`
- `createNotification(userId, input)`
- `markNotificationRead(userId, id)` — set `read_at` if owned

Map DB rows → a small persisted task DTO (id, content/title, description, status, priority, categoryId, scheduledAt, scheduledDate, completedAt, thumbnailSrc, thumbnailAlt, createdAt, updatedAt, isOverdue). Do not pretend checklist/objective mock fields exist in the database.

Validate category assignment with a **separate owned-category lookup**, not `.eq('categories.clerk_user_id', userId)` on a join.

### API routes

All handlers: `const { userId, isAuthenticated } = await auth();` then 401 JSON `{ error: "Unauthorized" }` when unsigned.

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/api/tasks` | list current user tasks |
| POST | `/api/tasks` | create |
| GET | `/api/tasks/[task_id]` | one task or 404 |
| PATCH | `/api/tasks/[task_id]` | partial update |
| DELETE | `/api/tasks/[task_id]` | soft delete |
| GET | `/api/categories` | list |
| POST | `/api/categories` | create |
| PATCH | `/api/categories/[category_id]` | rename |
| DELETE | `/api/categories/[category_id]` | delete (tasks detach) |
| GET | `/api/notifications` | list |
| POST | `/api/notifications` | create |
| PATCH | `/api/notifications/[notification_id]` | mark read |

HTTP mapping: 201 on create; 400 validation; 404 not found / not owned (do not leak other users’ ids — treat as 404); 409 duplicate or 5-per-date; 401 unsigned. Dynamic `params` is a Promise. Prefer `task_id` folder name to match AGENTS.md; parse as UUID.

Keep `route.ts` short. Shared `jsonError` helper is fine.

### Out of scope

- Replacing `getMockTasks` / `getMyTasks` / `getVitalTasks` in pages
- Search, calendar grid, settings, agent
- Image upload to Storage
- Activity read API
- Notification bell UI
- Seed data / copying mock fixtures into the database

## Security requirements

- `SUPABASE_SERVICE_ROLE_KEY` only in server `env.ts` + `lib/supabase/server.ts` behind `server-only`
- No service role in Client Components, `NEXT_PUBLIC_*`, README examples with real keys, or logs
- Do not put Clerk `userId` from the request body; take it from `auth()`
- Enable RLS on all four tables; revoke `anon`/`authenticated`
- Render nothing user-provided in this pass (APIs return JSON; UI still mocks). When mapping later, keep escaped plain text (AGENTS.md)
- Do not commit secrets; do not read `.env` values into chat

## Acceptance criteria

- [ ] `supabase/schema.sql` is a single SQL Editor script with tables, indexes, checks, triggers, RLS enabled, and explicit grants/revokes; it is idempotent and does not drop tables or delete rows
- [ ] Types in `lib/supabase/database.types.ts` are CLI-generated and compile
- [ ] Server client is service-role + `server-only`; no browser Supabase client
- [ ] Task, category, activity, and notification services scope every query by Clerk user id
- [ ] Creating two tasks with the same normalized content and `scheduled_at` for one user fails
- [ ] A sixth non-deleted incomplete task on the same `scheduled_date` fails
- [ ] Incomplete task with past `scheduled_at` fails; completed task may keep a past `scheduled_at`
- [ ] Completing sets `completed_at`; reopening clears it and writes activities
- [ ] Category names are unique per user case-insensitively; delete sets `tasks.category_id` to null
- [ ] No PATCH/DELETE (and no GET) activity HTTP routes
- [ ] Unsigned API calls return 401; another user’s id in the URL returns 404
- [ ] Product pages still render mock data
- [ ] `.env.example` lists the three Supabase vars; `env.ts` validates them
- [ ] `npm run typecheck` and `npm run lint` pass; `npm run build` is run because routes and env changed

## Checks to run

From the repo root:

1. Paste `supabase/schema.sql` into the hosted project's SQL Editor and run it (creates missing objects; does not wipe existing data)
2. Confirm `lib/supabase/database.types.ts` matches the applied schema
4. A **test query** via authenticated `curl` to `/api/tasks` proving insert + user-scoped select work
5. `npm run typecheck`
6. `npm run lint`
7. `npm run format` if lint reports format issues
8. `npm run build`

Report exact command output. Do not claim a check passed without running it.

## Exact manual test steps expected after implementation

Prereqs: signed-in Clerk session cookie (browser) **or** a request that includes the Clerk session; `.env` / `.env.local` already has Clerk + Supabase keys; `supabase/schema.sql` has been run in the SQL Editor.

1. `npm run dev`
2. With **no** `Authorization`/session, `curl -i http://localhost:3000/api/tasks` → **401**
3. While signed in (browser Network tab or `curl` with the session cookie from DevTools):
   - `POST /api/categories` with `{ "name": "Work" }` → **201**; second `POST` with `"work"` → **409**
   - `GET /api/categories` returns only that user’s rows
   - `POST /api/tasks` with title, `YYYY-MM-DD` date (today or future), priority, optional description → **201**; `GET /api/tasks` includes it
   - Repeat POST with the same title and same scheduled timestamp → **409**
   - Create 5 tasks on one date, sixth → **409** / `TASKS_PER_DATE_MAX`
   - `POST` with a past calendar date as an incomplete task → **400**
   - `PATCH /api/tasks/:id` `{ "status": "completed" }` → `completedAt` set; reopen `{ "status": "in_progress" }` → `completedAt` null
   - `DELETE /api/tasks/:id` → subsequent GET list omits it
   - `PATCH /api/categories/:id` rename; `DELETE` category → task `categoryId` is null (GET task)
   - `GET /api/notifications` → `[]` or the user’s rows; `POST` then `PATCH` to set `readAt`
4. `GET /api/tasks/<other-or-random-uuid>` → **404**
5. Open `/` still shows **mock** Dashboard tasks (birthday/landing/presentation), not only the API-created row
6. Confirm no `SUPABASE_SERVICE_ROLE_KEY` in any client bundle path (search: the key name appears only in `env.ts` server block and `lib/supabase/server.ts`)
