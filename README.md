# 📋 Bendo

Personal-first todo app with an optional AI assistant (**Doro**).

**Stack:** Next.js · Clerk · Supabase · Tailwind / shadcn · DeepSeek Harness (optional)

---

## ✨ Key Features

- 📊 **Dashboard** — overview, status, quick add
- ✅ **My Task / Vital Task** — browse, edit, complete (including high-priority)
- 🏷️ **Task Categories** — personal categories
- 📅 **Calendar** — pending tasks by date
- 🔔 **Notifications** — in-app feed
- 🤖 **Agent (Doro)** — chat backed by a self-hosted DeepSeek Harness overlay
- 🔐 **Auth** — Clerk; data scoped per user
- 🗄️ **Persistence** — Supabase

---

## 📁 Project Structure

```text
bendo/
├── AGENTS.md            # Agent monorepo map
├── bendo-app/           # Next.js UI + API
│   └── supabase/        # schema.sql + DB docs
├── desktop/             # Electron shell (loads local Bendo URL)
└── deepseek-harness/    # Local harness checkout (gitignored); Doro overlay lives here
```

- App: [`bendo-app/README.md`](bendo-app/README.md)
- Desktop: [`desktop/README.md`](desktop/README.md)
- Supabase: [`bendo-app/supabase/README.md`](bendo-app/supabase/README.md)
- Agents: [`AGENTS.md`](AGENTS.md) (repo map) · [`bendo-app/AGENTS.md`](bendo-app/AGENTS.md) (app rules)

---

## ✅ Prerequisites

- Node.js `>= 22`
- [Clerk](https://dashboard.clerk.com) keys
- [Supabase](https://supabase.com/dashboard) project — apply schema (see below)
- Docker Desktop (optional)
- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (optional — Agent chat only)

---

## 🗄️ Supabase

Bendo stores tasks, categories, notifications, and activity in Supabase. Auth is Clerk; the server uses the **service role** key only.

1. Create a Supabase project.
2. Paste and run `bendo-app/supabase/schema.sql` in the [SQL Editor](https://supabase.com/dashboard/project/_/sql/new).
3. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`.

Full details (tables, RPCs, RLS, one-off scripts): [`bendo-app/supabase/README.md`](bendo-app/supabase/README.md)

---

## 💻 Run Locally

```bash
cd bendo-app
cp .env.example .env.local   # fill Clerk + Supabase
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 🐳 Run with Docker

```bash
cd bendo-app
cp .env.example .env.local   # fill Clerk + Supabase
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000). Stop with `docker compose down`.

---

## 🤖 Agent chat

Optional. Without a harness bridge, Agent UI works but chat stays offline.

Doro runs as an overlay inside the local DeepSeek Harness checkout (for example `deepseek-harness/bendo-agent(doro)/`). Point `bendo-app` at the chat bridge with `DSH_CHAT_BRIDGE_URL` and `DSH_CHAT_BRIDGE_SECRET` — see `bendo-app/.env.example`.

---

## 🪟 Desktop Windows installer (GitHub Actions)

Build the unsigned NSIS `.exe` on a Windows runner, then **E2E on a clean Windows PC** (Actions ≠ E2E).

Workflow: [`.github/workflows/desktop-windows.yml`](.github/workflows/desktop-windows.yml)

1. **CI** (`windows-latest`) → `npm run dist:win` → `Bendo-<version>-win-x64.exe`
2. **Clean Win machine** → download → install → login / CRUD / Agent chat

### Run the workflow

1. Repo **Settings → Secrets and variables → Actions** — set:

   | Kind | Name | Example |
   | --- | --- | --- |
   | Variable | `BENDO_CLOUD_API_URL` | `https://bendo-psi.vercel.app` |
   | Secret | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_…` |
   | Secret | `NEXT_PUBLIC_SUPABASE_URL` | `https://….supabase.co` |
   | Secret | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ…` |

   Optional: `HARNESS_REPOSITORY` (default `deepseek-ai/deepseek-harness`), `HARNESS_TOKEN` if that repo is private.

2. **Actions → Desktop Windows → Run workflow**
   - Optional: `publish_release` + `release_tag` (e.g. `v0.1.0-beta.1`) to attach the `.exe` to a GitHub Release
   - Otherwise download the Actions artifact `bendo-desktop-win-x64`

CI injects the ship Doro overlay from [`desktop/packaging/bendo-agent(doro)/`](desktop/packaging/bendo-agent(doro)/) into the harness checkout before pack. Keep that folder in sync with the overlay you dogfood locally.

Details: [`desktop/README.md`](desktop/README.md) · ship checklist [`docs/desktop-ship-mvp-checklist.md`](docs/desktop-ship-mvp-checklist.md) §E.
