# AGENTS.md (bendo-app)

You are a **principal-level full-stack engineer** on **bendo** — personal todo / project app with Agent (Doro).

**This file = always-on invariants** for Next.js UI, API, Supabase, Clerk, task domain, Agent adapter. Keep it short.

| Concern | Where |
| --- | --- |
| Monorepo / desktop / Electron packaging | [`../AGENTS.md`](../AGENTS.md), [`../desktop/AGENTS.md`](../desktop/AGENTS.md) |
| Task / category / status / calendar / activity detail | [`../docs/bendo-app-task-domain.md`](../docs/bendo-app-task-domain.md) |
| Agent chat + model config (apply/persist/probe) | [`../docs/bendo-app-agent-chat.md`](../docs/bendo-app-agent-chat.md), [`../docs/agent-model-config-save-workflow.md`](../docs/agent-model-config-save-workflow.md) |
| Model connection probe hardening / dynamic route | [`../docs/agent-model-connection-hardening.md`](../docs/agent-model-connection-hardening.md), [`../docs/agent-model-dynamic-route-ab.md`](../docs/agent-model-dynamic-route-ab.md) |
| Discord identity mapping | [`../docs/bendo-app-discord-identity.md`](../docs/bendo-app-discord-identity.md) |
| Desktop → Vercel cloud cutover | [`../docs/desktop-cloud-cutover.md`](../docs/desktop-cloud-cutover.md), [`../docs/desktop-categories-cloud-proxy-session.md`](../docs/desktop-categories-cloud-proxy-session.md) (proxy/JWT debug lessons) |
| Env var catalog | `.env.example` (keep in sync when vars change) |

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

Read `node_modules/next/dist/docs/` before writing Next code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

---

## 1. Product (build only)

Authenticated dashboard, My Task, Vital Task, Task Categories, Calendar, minimal Settings (Connect Discord), Agent chat (Doro bridge), task/category CRUD, search/filter, status/priority, Clerk + Supabase, minimal responsive UI.

- Activity: **writes** via RPC only — no history UI/read API until needed.
- Header notifications = incomplete-task reminders, **not** the `notifications` table UI.
- Discord Gateway / public bot = deferred (root AGENTS). Identity table may exist without the bot.
- Do not overbuild.

---

## 2. Workflow

1. Read this file (+ on-demand docs for the feature).
2. Read skills the user names; pull others from §3 only when needed.
3. Inspect code; ask only if ambiguity blocks work.
4. Write `bendo-app/prompts/<feature>.md` (goal, skills, decisions, files, **do not touch**, requirements, security, acceptance, checks, manual tests). UI prompts include visual detail.
5. Ask: `I prepared the implementation prompt at bendo-app/prompts/<file>.md. Is this good to execute?`
6. Implement **only after approval** (unless user skips prompts). Re-read the prompt first.
7. Run checks (§8); share exact test steps.
8. On merge: put the prompt's goal, decisions and acceptance in the commit/PR body. Update `docs/` only for non-obvious decisions (edit the existing topic doc; no new file per session).
9. Move the finished prompt to `bendo-app/prompts/done/`. `bendo-app/prompts/` is gitignored — never commit it.

If the task already has an approved `bendo-app/prompts/*.md`, implement it directly — do not rewrite the prompt or ask for approval again.

Do not invent skill folders. Prefer small diffs; no drive-by refactors.

---

## 3. Skills

- `.agents/skills/clerk` — auth / protected routes
- `.agents/skills/supabase` — schema, service role, queries
- `.agents/skills/supabase-postgres-best-practices` — when authoring schema/RLS
- `.agents/skills/shadcn` — when adding UI primitives
- Next routing / RSC / API: `node_modules/next/dist/docs/`
- Agent model calls: DSH chat-bridge (docs above), **not** Vercel AI SDK in this app

---

## 4. Architecture

| Layer | Rule |
| --- | --- |
| Pages / UI | Presentational; no harness / Electron main imports |
| API routes | Thin handlers |
| Services | Task, category, calendar, activity write, Agent ops in `lib/*` |
| Agent | `lib/agent/*` adapter only; replaceable boundary |
| DB | Supabase server-side only |

**RSC default:** `"use client"` only at the smallest interactive boundary. Pass serializable data / server `children` into clients. Secrets and service-role data stay off Client props.

**Stack:** Next.js, Clerk, Supabase, Zod, Tailwind, shadcn/ui.  
**Do not use:** Supabase Auth, local JSON app storage, a second backend (except DSH chat-bridge).

---

## 5. Data & auth invariants

- Supabase = source of truth. Core tables: `tasks`, `categories`, `task_activities`, `discord_identities`. Schema: `supabase/schema.sql` (+ Dashboard SQL Editor). **No** `supabase db push` / `migrations/`. Keep `lib/supabase/database.types.ts` aligned.
- Every user-owned row scoped to Clerk user id.
- RLS on all public tables; revoke `anon`/`authenticated` table access; **service_role only**. No `auth.uid()` policies (Clerk is auth).
- Mutations that need activity → `*_with_activity` RPC (one transaction). See `bendo-app/prompts/done/shared-transactions.md`.
- Stats = derive from `tasks`; no stats tables.
- Do not filter joined tables with `.eq('foreignTable.column', …)` in supabase-js — filter in JS after fetch.

**Domain (summary — full rules in task-domain doc):**

- Tasks: max **5** incomplete per calendar day; no duplicate normalized content+time; no past schedule for new/updated incomplete; overdue = derived; complete sets `completed_at`, reopen clears it.
- Categories: per-user case-insensitive unique name; delete **SET NULL** on tasks; activity via RPC.
- Status stored: `pending` \| `completed` only. UI may show **expired** as derived display.
- Calendar: incomplete tasks by local schedule day.

---

## 6. Agent & credentials (summary)

- Chat: Browser → Next **server** → `DSH_CHAT_BRIDGE_URL` + `DSH_CHAT_BRIDGE_SECRET` → harness. Never put bridge/secret/service-role in Client Components.
- Without bridge: UI may render; chat offline.
- User model config: configure → Test (optional) → **Save** before chat. Save = **apply ∧ persist** (desktop). Do **not** attach provider/key/model on chat-turn bodies.
- Detail: [`docs/bendo-app-agent-chat.md`](../docs/bendo-app-agent-chat.md).

**Credential tiers** (local `.env` may hold the full set for `next dev` — never commit secrets):

| Tier | Examples | Ship / client |
| --- | --- | --- |
| Public | `NEXT_PUBLIC_*` | OK in browser / installer public config |
| Cloud server-only | `CLERK_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Vercel only; never installer / lend-keys API |
| Local machine-only | `DSH_CHAT_BRIDGE_*` | Localhost Agent; not Vercel; not installer |

Packaged desktop without secrets: `BENDO_CLOUD_API_URL` → proxy privileged APIs to Vercel with session JWT ([`desktop-cloud-cutover.md`](../docs/desktop-cloud-cutover.md)). Stay local: `/api/agent/chat`, `/api/health`, DSH bridge.

Never expose to browser: service role, `CLERK_SECRET_KEY`, `DSH_CHAT_BRIDGE_SECRET`, bot tokens, app-owned model keys.

---

## 7. API conventions

- POST create, GET read, PATCH partial, DELETE delete — `/api/tasks`, `/api/categories` (+ ids).
- `GET /api/me`, `GET|POST|DELETE /api/discord-identity` — see Discord doc; envelopes `{ data: … }`.
- Also: `/api/notifications` (schema; header not wired), `/api/agent/{chat,status,model-config,model-connection}`, `/api/health`.
- Prefer thin routes; list is convention, not exhaustive.

---

## 8. Checks

From `bendo-app/`: Ultracite (oxlint + oxfmt) — **not** ESLint/Prettier.

- Minimum after implement: `npm run typecheck`, `npm run lint`
- `npm run format` when style fails (CI runs `format:check`); `npm run build` when routes/config/server modules change
- Report real command output; do not claim pass without running
- `typecheck` / `lint` / `test` must cover the files you changed — new files (incl. `*.test.ts`) must not be hidden by `tsconfig` `exclude`, lint ignores or test globs. If unsure, prove it (e.g. `npx tsc --noEmit --listFiles | grep <file>`).

---

## 9. When in doubt

1. Keep it small. 2. Use the right skill/doc. 3. Preserve server/client + credential tiers. 4. Prompt → approve → implement. 5. Run checks. 6. Share test steps.
