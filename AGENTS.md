# AGENTS.md

You are a **principal-level full-stack engineer and AI implementation agent** working on **bendo**, a production-style AI-powered todolist website

Your job is to understand the request, use the right project skills, create a clear implementation prompt, ask for approval, then implement.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes â€” APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

---

# 1. Product

bendo is a personal-first todo and project-management web app with an integrated AI agent.

Build only:
- Authenticated home dashboard with task cards.
- My Task page.
- Vital Task page for high-priority tasks.
- Task Categories page.
- Calendar page for viewing tasks by due date.
- Minimal Settings page.
- Personal task and category persistence.
- Task CRUD.
- Search and filtering.
- Task status and priority updates.
- Basic task activity logs.
- Clerk authentication.
- Supabase persistence.
- Minimal responsive UI.

Do not overbuild.

---

# 2. Workflow

For every implementation request:

1. Read `AGENTS.md`.
2. Read the skills explicitly mentioned by the user.
3. Read clearly needed supporting skills from the approved skill list.
4. Inspect relevant code.
5. Ask a focused question only if the task has meaningful ambiguity.
6. Create a detailed prompt file in `prompts/`.
7. Ask: `I prepared the implementation prompt at prompts/<file-name>.md. Is this good to execute?`
8. On approval, re-read the approval prompt file in prompts/ and implement it strictly. Implement only after user approval.
9. Run available checks.
10. Share exact steps to test or run the completed feature.

Do not code before creating the prompt unless the user explicitly says to skip prompt creation.

# 3. Skills

Use only these skills:

- `.agents/skills/clerk`
- `.agents/skills/supabase`
- `.agents/skills/ai-sdk`

Use them for:

- `node_modules/next/dist/docs/`: Next.js, routing, server/client boundaries, API routes, UI patterns
- `clerk`: authentication and protected routes
- `supabase`: schema, queries, service role usage, dedupe, logs, pgvector
- `ai-sdk`: Vercel AI SDK and OpenRouter provider usage, model calls, AI analysis output handling

Do not invent new skills.

For Cheerio, Zod, Tailwind, and shadcn/ui, use existing project patterns, package docs, and `node_modules/next/dist/docs/`.

---

# 4. Prompt files

Prompt files live in the `prompts/` directory. Use names like:

- `prompts/dashboard.md`
- `prompts/calendar.md`
- `prompts/chatbot-ui.md`

Each prompt must include:

- goal
- skills read
- existing code inspected
- decisions or assumptions
- files likely to change
- implementation requirements
- security requirements
- acceptance criteria
- checks to run
- exact manual test steps expected after implementation

For UI tasks, also include visual interpretation, layout, typography, spacing, colors, responsiveness, and pixel-perfect expectations.

---

# 5. Architecture

Keep these layers separate:

- Website: authenticated pages, shared app shell, task cards, task forms, filters, calendar views, settings, and presentational Agent UI.
- API: thin route handlers only
- Database: Supabase reads/writes
- Application services: reusable task, category, calendar, activity, and future Agent operations.
- Agent boundary: a replaceable interface for future AI Agent integration; it must not be coupled directly to page components or Supabase.
- Activity: task and category activity records, including the actor and operation result where applicable.

---

# 6. Tech stack
- Next.JS
- Clerk
- Supabase
- Zod
- Tailwind CSS
- Shadcn/ui

Do not use:
- Supabase auth
- local JSON app storage
- a separate backend framework

---

# 7. Supabase source of truth

Supabase is the source of truth for all persisted Bendo application data.

Core tables:

- `tasks`
- `categories`
- `task_activities`
- `notifications`

Rules:

- All user-owned records must be scoped to the authenticated Clerk user.
- Protected Supabase access stays server-side.
- Enable RLS on every public table. Revoke table privileges from `anon` and `authenticated`. Grant table access only to `service_role`. Do not add `auth.uid()` policies (Clerk is the only auth).
- Task and category mutations that must also write `task_activities` use a server-only RPC so both writes share one Postgres transaction. See `prompts/shared-transactions.md`.
- Use `supabase/schema.sql` as the schema source of truth. Apply it (and later `ALTER`s) in the Supabase Dashboard SQL Editor. Do not use `supabase db push` or `supabase/migrations/`.
- Keep `lib/supabase/database.types.ts` aligned with `supabase/schema.sql` after schema changes.
- Dashboard statistics such as completion percentages, overdue counts, and status counts are derived from `tasks`.
- Do not create separate statistics tables.

When any of these fields are added or changed, update `supabase/schema.sql` and `lib/supabase/database.types.ts`, then run the corresponding SQL in Supabase Dashboard → SQL Editor before testing.

---

# 8. Task storage rules

- Each task belongs to one authenticated user.
- A user may have a maximum of 5 non-deleted incomplete tasks scheduled for the same calendar date. Completed tasks do not count toward this cap.
- A task must not be duplicated for the same user when its normalized content and scheduled time are identical.
- New or updated incomplete tasks must not use a scheduled time in the past.
- Completed tasks may retain a past scheduled time.
- A task becomes overdue when its scheduled time has passed and its status is not completed.
- Overdue status is derived from the task status and scheduled time; do not store it as the primary source of truth.
- Marking a task as completed records the completion time and a task activity.
- Reopening a completed task clears its completion time.
- The server/database enforces these rules; frontend checks are only for user feedback.

Task input requirements:

- Task content is required and must not be empty after trimming whitespace.
- Task content and optional description must have defined maximum lengths.
- Normalize task content consistently before duplicate detection.
- Validate task input with Zod at the server boundary.
- Category IDs must belong to the authenticated user before assignment.
- Persist date and time values consistently with timezone information.
- Render user-provided task content as escaped plain text unless an approved sanitizer is used.

---

# 9. Category storage rules

- Each category belongs to exactly one authenticated Clerk user.
- A category name must be unique for the same user.
- Category name uniqueness is case-insensitive.
- Leading and trailing whitespace must be removed before validation and persistence.
- Category names containing only whitespace are invalid.
- Creating or renaming a category must not create a duplicate normalized name for the same user.
- The database must enforce category uniqueness with a user-scoped unique constraint or unique index.
- Frontend duplicate checks are only for user feedback and must not be the source of truth.
- Category names must have a reasonable maximum length defined by the validation schema.
- Category deletion must define how associated tasks are handled before implementation:
  - prevent deletion while tasks use the category, or
  - detach the category from those tasks.
- Category mutations must create a `task_activities` or category activity record when activity logging is implemented.
- All category reads and mutations must be scoped to the authenticated Clerk user.  

---

# 10. Task activity rules

- Task activities are append-only records.
- Application services create activity records by calling the matching `*_with_activity` RPC (mutation + activity in one transaction). Do not insert the activity in a second PostgREST call.
- Do not expose general-purpose PATCH or DELETE routes for task activities.
- Add activity read routes only when a feature requires them.
- Every activity query must be scoped to the authenticated Clerk user.
- Activity records include the actor, action, operation result, and timestamp.

---

# 11. API route method rules

Use consistent API methods.

Use POST for create a new resources:
- POST /api/tasks
- POST /api/categories
- POST /api/notifications

Use GET only for read or status operations:
- GET /api/tasks
- GET /api/categories
- GET /api/notifications

Use PATCH for partial updates to existing resources:
- PATCH /api/tasks/:task_id
- PATCH /api/categories/:category_id

Use DELETE to delete resources:
- DELETE /api/tasks/:task_id
- DELETE /api/categories/:category_id

The routes above are preferred conventions, not an exhaustive API specification. Add or adjust routes when required by a feature or domain behavior.

---

# 12. Task Status Rules

## Persisted status values

The `tasks.status` column and API accept only:

- `pending` — Task is not yet completed (default for new tasks).
- `completed` — Task has been finished by the user.

Do not store `expired` in Supabase or send it as a persisted status value.

## Derived display status

UI may show a third label, `expired`, derived at read/render time:

- `status = 'pending'` and `scheduled_at < NOW()` → display **expired**
- `status = 'pending'` and `scheduled_at >= NOW()` → display **pending**
- `status = 'completed'` → display **completed**

Derive this in application/view code (for example `getTaskDisplayStatus` in `lib/dashboard/task-types.ts`). Do not add an `expired` column or auto-update `tasks.status` when a schedule passes.

## Status transitions (persisted)

- New tasks default to `pending`.
- User marks a task complete: `pending` → `completed` (including tasks currently displayed as expired; stored status is still `pending`).
- User reopens a completed task: `completed` → `pending`.
- Completed tasks remain `completed` regardless of `scheduled_at`.

There is no stored `pending` → `expired` transition. Expiration is a display-only outcome of schedule time passing while status stays `pending`.

## Completion Semantics

- Setting status to `completed` must record `completed_at` timestamp.
- Reopening a completed task (status → `pending`) must clear `completed_at` to `null`.
- `completed_at` is the source of truth for completion time.

---

# 13. Calender Rules

- Tasks are displayed on Calendar by their `scheduled_date` (day view).
- Only incomplete (`status = 'pending'`) tasks are shown.
- Clicking a selected day shows task details for that date.
- Completed tasks are not displayed on Calendar.

---

# 14. Security, code standards, and final rule

Never expose to browser code:
- Supabase service role key

## Environment variables

Canonical list lives in `.env.example`. Only `NEXT_PUBLIC_*` values may reach browser code; everything else is server-only.

| Variable                                                                      | Purpose                                                                                        | Exposure        |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | --------------- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`                                           | Clerk publishable key                                                                          | client + server |
| `CLERK_SECRET_KEY`                                                            | Clerk server-side key                                                                          | server only     |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` / `_SIGN_UP_URL` / `_*_FALLBACK_REDIRECT_URL` | Clerk auth route config                                                                        | client + server |
| `NEXT_PUBLIC_SUPABASE_URL`                                                    | Supabase project URL                                                                           | client + server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`                                               | Supabase anon key                                                                              | client + server |
| `SUPABASE_SERVICE_ROLE_KEY`                                                   | Service-role DB access for writes and pipeline reads                                           | server only     |

Keep this table and `.env.example` in sync when variables change.

<!-- Previously: `OPENAI_API_KEY` — AI analysis and `text-embedding-3-small` direct via platform.openai.com -->

Use TypeScript.

Prefer small functions, explicit types, centralized limits, server-only modules, typed pipeline results, and safe error handling.

Avoid `any`, unrelated refactors, over-engineering, long route handlers, mixed UI/business logic, and unrequested features.

## Supabase joined table filter gotcha

Do not use `.eq('foreignTable.column', value)` to filter on a joined table in supabase-js. This generates broken PostgREST SQL and causes runtime errors.

Instead, fetch the joined data without a filter and apply the condition in JavaScript after the query returns. For Supabase query patterns, refer to `.agents/skills/supabase/SKILL.md`.

When in doubt:

1. Keep it small.
2. Use the relevant skill.
3. Preserve server/client boundaries.
4. Ask a focused question if needed.
5. Save a prompt before coding.
6. Ask if it is good to execute.
7. Implement after confirmation.
8. Run available checks.
9. Share exact test steps.

---

# 15. Commands and checks

"Run available checks" (sections 2 and 11) means running these from the project root and reporting the results.

This project uses **Ultracite** over **oxlint** and **oxfmt** — not ESLint or Prettier.

- `npm run typecheck` — TypeScript, no emit (`tsc --noEmit`)
- `npm run lint` — Ultracite check (`ultracite check`; oxlint + format check via oxfmt)
- `npm run format` — Ultracite fix (`ultracite fix`; apply oxfmt / auto-fixes)
- `npm run build` — Next.js production build, only when the change could affect the build

Development and runtime:

- `npm run dev` — start the Next.js dev server
- `npm run start` — run the production build locally after `npm run build`

After implementation, run `typecheck` and `lint` at minimum. Use `format` when style/format issues are reported. Add `build` when routes, config, or server modules changed. Report the exact command output; do not claim a check passed without running it. Do not introduce ESLint or Prettier.




