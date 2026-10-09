# AGENTS.md

You are a **principal-level full-stack engineer and AI implementation agent** working on **bendo**, a production-style AI-powered todolist website

Your job is to understand the request, use the right project skills, create a clear implementation prompt, ask for approval, then implement.

Monorepo map (desktop priorities, package layout): see [`../AGENTS.md`](../AGENTS.md) at the repo root.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

---

# 1. Product

bendo is a personal-first todo and project-management web app with an integrated AI agent (Doro). Desktop packaging and Electron are owned by the repo-root [`../AGENTS.md`](../AGENTS.md), not this file.

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
8. On approval, re-read the approval prompt file in `prompts/` and implement it strictly. Implement only after user approval.
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
- Application services: reusable task, category, calendar, activity, and Agent operations.
- Agent boundary: a replaceable interface for Doro / DeepSeek Harness integration; it must not be coupled directly to page components or Supabase. See section 10.
- Activity: task and category activity records, including the actor and operation result where applicable.

## Server-first component architecture

- Use React Server Components by default for presentational UI and components that read server data.
- Treat UI as server-compatible when it does not require React state or effects, event handlers, browser APIs, or client-only hooks. Server-compatible does not mean the route must be statically generated.
- Add `"use client"` only at the smallest practical interactive boundary. Do not make a parent a Client Component solely because one descendant is interactive.
- Pass serializable data or server-rendered `children` into Client Components instead of moving otherwise static UI into the client bundle.
- Appropriate Server Components include page headings, read-only task lists, summaries, metadata, and layout content.
- Appropriate Client Components include forms, dialogs, menus, optimistic updates, drag interactions, and browser-dependent behavior.
- Use `loading.tsx` or focused `Suspense` boundaries when independently slow server data should stream without blocking the surrounding UI.
- Dynamically import heavy client-only UI, such as dialogs or editors, when it is unnecessary for the initial render.
- Do not apply lazy loading mechanically when it creates request waterfalls, layout shifts, or negligible bundle savings.
- Keep server-only secrets, privileged Supabase access, and unnecessary private user data out of Client Component props.
- Do not conflate Server Components, server-side rendering, static generation, streaming, and lazy loading; choose each based on the route's rendering and interaction needs.

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
- a separate backend framework (except calling the existing DeepSeek Harness / Doro chat-bridge for the Agent)

---

# 7. Supabase source of truth

Supabase is the source of truth for all persisted Bendo application data.

Core tables:

- `tasks`
- `categories`
- `task_activities`
- `notifications`
- `discord_identities` — maps `clerk_user_id` ↔ `discord_user_id` for Discord bot / Agent resolution (see section 11)

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

# 10. Agent runtime rules

Doro (DeepSeek Harness overlay) is the Agent runtime. This Next.js app talks to it through a replaceable server-side adapter and the dsh **chat-bridge**, not from React page components.

Desktop shell / Electron packaging is **out of scope** for this file — see repo-root [`../AGENTS.md`](../AGENTS.md).

## Chat path

- Default path: **Browser → Next.js (Bendo) → harness chat-bridge** (`DSH_CHAT_BRIDGE_URL` + `DSH_CHAT_BRIDGE_SECRET`).
- The Next **server** owns the bridge call. Never put the bridge secret, harness tokens, or Supabase service role in Client Components.
- Keep the Agent boundary in `lib/agent/*` (adapter + runtime interface). Pages must not import harness process code.
- Without a reachable bridge, Agent UI may still render but chat stays offline / unavailable.
- Local Docker Compose may reach a harness on the host via `host.docker.internal` (see `.env.example`); that is an env wiring detail for this app, not a desktop shell rule.
- `DSH_CHAT_BRIDGE_*` is **local machine-only** (localhost Agent path). It is not part of the cloud (Vercel) secret set and must not be fetched from or stored on Vercel. Cloud secrets (`CLERK_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, …) are unrelated to the chat-bridge contract — see section 16.

## Discord identity vs Agent chat

- Settings **Connect Discord** and `discord_identities` support a future Discord channel. They are not required for Agent chat through the chat-bridge.
- Discord Gateway / public bot hosting is deferred; see repo-root `AGENTS.md` for product priority. Do not couple page components to Discord bot code.

## Agent chat — user model API key

There is a button on Agent chat that opens the UI for the user to add their own model configuration. Bendo does not ship a provider key in the client, the installer, or `NEXT_PUBLIC_*`.

- The button lives on Agent chat (`components/agent/`, page `app/(app)/agent`) — an added control, not a replacement for the composer or other existing controls.
- The UI (modal/dialog) opened by that button collects **Provider**, **API endpoint**, **API key**, and **Model name**, with complete per-provider instructions (where to create the key, what endpoint/model id to use, where to paste).
- Supported providers: **OpenRouter**, **Vilao**, **GPT**, **Gemini**. The user chooses one of these; do not accept a free-form provider name outside this set.
- Instructions are per provider (console/dashboard, which key to copy, and that the key is the user’s and billed by that provider).
- The value is a user-owned credential. Do not prefill it from server env, harness env, or Vercel. Do not log the raw key, echo it back in full after entry, or return it from an API. Mask the key field while typing.
- **Test connection** runs on the Next server (`POST /api/agent/model-connection`): a minimal chat ping to the user’s endpoint (15s timeout) and optional `/models` lookup (5s). It does **not** go through the harness chat-bridge. Map upstream failures to classified Vietnamese messages (`API key không hợp lệ`, `Tài khoản hết credit`, `Model không tồn tại`, `Đang bị giới hạn tốc độ, thử lại sau`, `Provider đang lỗi, thử lại sau`).
- Probe SSRF guards: only `https` endpoints whose hostname is in the per-provider allowlist (`openrouter.ai`, `api.vilao.ai`, `api.openai.com`, `generativelanguage.googleapis.com`); do not follow redirects; clear the API key from the form when the selected provider changes so a key is not sent to another provider.
- **Save / apply** runs on the Next server (`POST /api/agent/model-config`): Clerk + Zod + same endpoint allowlist, then forwards `{ action: "applyModelConfig", provider, endpoint, apiKey, model }` to the localhost DSH chat-bridge (shared secret). Harness apply (see `bendo-agent(doro)/chat-bridge.ts` + `cordis.yml` comments) writes credentials, `$DSH_HOME/settings.yaml` → `llm-pi-ai.providers.<route>` (apiKeyEnv, baseURL, models; OpenAI-compat / vilao hand-declare `openai-completions`; gemini→google omits api), and `agent-default-model` selection — not selection alone. Chat turns **require** that apply first for a real agent turn — without apply the bridge returns a Doro soft chat reply (not a hard error UI) and does not fall back to cordis `agent-default-model` (no shipped provider key). Do **not** attach model secrets to chat-turn bodies. On **Electron desktop**, Save then persists via preload IPC to `userData/model-config.json` (`safeStorage` for the key); Electron main re-applies from that file when harness is ready. **sessionStorage** remains a same-tab cache and the only client store when not in Electron.
- **Save pass = apply ∧ persist:** Treat Save as successful only when **both** harness apply **and** local durable persist succeed (on desktop). If persist fails after apply, **retry** persist (bounded; no retry on hard validation). Do not show “đã lưu” / close as success on partial success. Prefer apply then persist; do not leave a durable write that does not match a successful apply. Desktop owns durable JSON/`safeStorage` (see repo-root + `desktop/AGENTS.md`); web-without-Electron keeps sessionStorage only after apply OK.

### Plan — save model config before use (no per-turn attach)

Product path for user-owned model credentials (desktop-first Agent):

1. **Configure then use:** The user enters Provider / endpoint / API key / model name in the Agent modal, optionally **Test connection**, then **Save**. Save calls `POST /api/agent/model-config` so Harness/Doro receives and applies that config **before** chat, not by reading credentials off each chat message.
2. **Local persist on the user machine:** Survives app quit/reopen on desktop. Shape: `userData/model-config.json` — fields `provider`, `endpoint`, `model`, plus `apiKeyEncrypted` (`safeStorage`). Do **not** store this in Supabase, Vercel, or ship it inside the installer. Non-Electron keeps sessionStorage only.
3. **Apply ∧ persist, retry on partial failure:** On desktop, Save is not done until apply **and** persist both OK. Persist fail after apply → retry persist. Partial success must not be presented as saved.
4. **Apply to harness without chat payload:** Save pushes config to the local harness over the localhost DSH bridge so Doro registers the user route in `llm-pi-ai` settings and updates selection/credentials (not cordis `agent-default-model` alone — missing `llm-pi-ai.providers` → `UNKNOWN_MODEL`). Chat turns keep the existing bridge body (`message`, `sessionId`, `clerkToken`, …) and **must not** attach `apiKey`, endpoint, or full model config on every turn.
5. **Chat path stays thin:** Browser → Next `/api/agent/chat` → DSH bridge → harness uses the **already applied** model config. Do not send the raw key from the browser on each send.
6. **Out of scope for this plan:** SQLite unless multiple profiles later require it; cloud sync of provider keys; attaching model secrets to chat-turn requests.

---

# 11. Discord identity mapping rules

Persist the link between a Clerk user and their Discord account in `discord_identities` so a future Discord bot / Doro harness can resolve `discord_user_id` → `clerk_user_id` without calling Clerk on every message.

Discord Gateway bot, invite links, and bot-token hosting are **out of scope** for this Next.js app’s day-to-day feature work (product priority lives in repo-root `AGENTS.md`). Identity mapping and Settings Connect may still exist without the bot.

Table purpose:

- Map `clerk_user_id` (Clerk user id) to `discord_user_id` (Discord snowflake from Clerk Discord OAuth `externalAccounts.providerUserId`).
- Support Agent/Discord flows that create or update Bendo tasks for the correct user.

Rules:

- One Clerk user may have at most one Discord identity row (`clerk_user_id` unique).
- One Discord user id may map to at most one Clerk user (`discord_user_id` unique).
- Both ids are required, non-empty text. Do not accept a user-typed Discord id from Settings UI.
- Source of Discord id: Clerk Discord OAuth only (Settings Connect Discord / `externalAccounts` with `provider === "discord"` or `provider === "oauth_discord"`; connect flow uses strategy `oauth_discord`). Prefer verifying a usable link with server-only `getUserOauthAccessToken(userId, "discord")` before upserting.
- On successful Connect: upsert the row for the authenticated Clerk user.
- On Disconnect: delete the row for that Clerk user (and never leave a stale Discord id pointing at them).
- Do not store Discord OAuth access tokens, refresh tokens, or bot tokens in this table (or any other app table).
- All reads and writes are server-only via the Supabase service role. Same RLS pattern as other public tables.
- Lookups by `discord_user_id` (bot / harness) and by `clerk_user_id` (Settings / sync) must use this table as the app cache; Clerk remains the source of the OAuth link itself.
- Do not couple page components directly to Discord bot code; expose a thin API or server service for resolve/upsert/delete when the feature is implemented.

---

# 12. Task activity rules

- Task activities are append-only records.
- Application services create activity records by calling the matching `*_with_activity` RPC (mutation + activity in one transaction). Do not insert the activity in a second PostgREST call.
- Do not expose general-purpose PATCH or DELETE routes for task activities.
- Add activity read routes only when a feature requires them.
- Every activity query must be scoped to the authenticated Clerk user.
- Activity records include the actor, action, operation result, and timestamp.

---

# 13. API route method rules

Use consistent API methods.

Use POST for create a new resources:
- POST /api/tasks
- POST /api/categories
- POST /api/notifications

Use GET only for read or status operations:
- GET /api/tasks
- GET /api/categories
- GET /api/notifications
- GET /api/me — signed-in Clerk profile JSON for desktop → Vercel identity cutover (not used by local UI when `CLERK_SECRET_KEY` is present)

Use PATCH for partial updates to existing resources:
- PATCH /api/tasks/:task_id
- PATCH /api/categories/:category_id

Use DELETE to delete resources:
- DELETE /api/tasks/:task_id
- DELETE /api/categories/:category_id

When Discord identity routes are added, prefer:
- POST or PUT to upsert the authenticated user's `discord_identities` row after Clerk Connect
- DELETE to remove it on Disconnect
- GET (server/bot-facing, authenticated) to resolve `discord_user_id` → `clerk_user_id` when the Discord bot feature requires it

The routes above are preferred conventions, not an exhaustive API specification. Add or adjust routes when required by a feature or domain behavior.

---

# 14. Task Status Rules

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

# 15. Calender Rules

- Tasks are displayed on Calendar by their `scheduled_date` (day view).
- Only incomplete (`status = 'pending'`) tasks are shown.
- Clicking a selected day shows task details for that date.
- Completed tasks are not displayed on Calendar.

---

# 16. Security, code standards, and final rule

Never expose to browser / Client Component code:
- Supabase service role key
- `CLERK_SECRET_KEY`
- `DSH_CHAT_BRIDGE_SECRET`
- Discord bot tokens and Bendo-owned or harness-owned model API keys

The Agent chat UI (section 10) has a button that opens the flow for the **user** to add their own OpenRouter, Vilao, GPT, or Gemini model configuration (endpoint, key, model) and to test connectivity via Next. That is not a license to embed, prefetch, or return a provider key the app owns.

## Credential tiers (product distribution)

**Local `.env` / `.env.local` (and Docker) stay the full set for development** — public + cloud secrets + bridge vars. That is expected for `next dev` and local Compose. Never commit real secrets.

The tiers below govern **Electron resource / installer packaging** (and what may be returned to clients). They do not require removing secrets from local dev `.env`. See repo-root [`../AGENTS.md`](../AGENTS.md) → Product credentials.

1. **Public** — `NEXT_PUBLIC_*` (and publishable / anon equivalents). Allowed in browser and may appear in shipped client or Electron-packaged artifacts.
2. **Cloud server-only** — `CLERK_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and similar god-mode keys. On the deployed host (Vercel or equivalent) for shipped-product privileged work. Used only inside server handlers. Never returned to clients. Never packaged into the desktop installer or standalone resources copied for Electron.
3. **Local machine-only** — `DSH_CHAT_BRIDGE_URL` / `DSH_CHAT_BRIDGE_SECRET` (and timeout). Localhost Agent path between this app’s server and the harness. Not fetched from Vercel. Not shipped in the installer.

**Pattern (shipped product):** a privileged route authenticates the Clerk session, performs work with server-side secrets, and returns domain results (tasks, categories, status, …).

**Anti-pattern:** any API or bootstrap flow that returns secret key material to desktop or browser (“lend keys from Vercel”).

## Environment variables

Canonical list lives in `.env.example`. Only `NEXT_PUBLIC_*` values may reach browser code; everything else is server-only.

| Variable                                                                      | Purpose                                                                                        | Exposure        | Distribution                                      |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | --------------- | ------------------------------------------------- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`                                           | Clerk publishable key                                                                          | client + server | Public — may ship / inline in client artifacts    |
| `CLERK_SECRET_KEY`                                                            | Clerk server-side key; optional on packaged Next if `BENDO_CLOUD_API_URL` set                  | server only     | Cloud server-only (Vercel); never ship            |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` / `_SIGN_UP_URL` / `_*_FALLBACK_REDIRECT_URL` | Clerk auth route config                                                                        | client + server | Public — may ship / inline                        |
| `NEXT_PUBLIC_SUPABASE_URL`                                                    | Supabase project URL                                                                           | client + server | Public — may ship / inline                        |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`                                               | Supabase anon key                                                                              | client + server | Public — may ship / inline                        |
| `SUPABASE_SERVICE_ROLE_KEY`                                                   | Service-role DB access; optional on packaged Next if `BENDO_CLOUD_API_URL` set                 | server only     | Cloud server-only (Vercel); never ship            |
| `BENDO_CLOUD_API_URL`                                                         | Vercel origin; enables `lib/api/cloud` when secrets omitted (Electron inject)                  | server only     | `desktop/.env` / bake public config; not on Vercel |
| `DSH_CHAT_BRIDGE_URL`                                                         | dsh Doro chat-bridge URL (see section 10)                                                      | server only     | Local machine-only; not from Vercel; not in installer |
| `DSH_CHAT_BRIDGE_SECRET`                                                      | Shared secret for `x-bendo-chat-secret` (must match cordis bridge `secret`)                    | server only     | Local machine-only; not from Vercel; not in installer |
| `DSH_CHAT_TIMEOUT_MS`                                                         | Max wait for one agent turn in ms (default `120000`)                                           | server only     | Local / server config; not a cloud secret         |

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

# 17. Commands and checks

"Run available checks" (sections 2 and 17) means running these from the project root (`bendo-app/`) and reporting the results.

This project uses **Ultracite** over **oxlint** and **oxfmt** — not ESLint or Prettier.

- `npm run typecheck` — TypeScript, no emit (`tsc --noEmit`)
- `npm run lint` — Ultracite check (`ultracite check`; oxlint + format check via oxfmt)
- `npm run format` — Ultracite fix (`ultracite fix`; apply oxfmt / auto-fixes)
- `npm run build` — Next.js production build, only when the change could affect the build

Development and runtime:

- `npm run dev` — start the Next.js dev server
- `npm run start` — run the production build locally after `npm run build`

After implementation, run `typecheck` and `lint` at minimum. Use `format` when style/format issues are reported. Add `build` when routes, config, or server modules changed. Report the exact command output; do not claim a check passed without running it. Do not introduce ESLint or Prettier.
