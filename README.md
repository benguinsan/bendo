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
├── agent/doro/          # Doro harness overlay (template)
├── bendo-app/           # Next.js UI + API
│   └── supabase/        # schema.sql + DB docs
└── deepseek-harness/    # Local harness checkout (gitignored)
```

- App: [`bendo-app/README.md`](bendo-app/README.md)
- Supabase: [`bendo-app/supabase/README.md`](bendo-app/supabase/README.md)
- Agent: [`agent/doro/README.md`](agent/doro/README.md)

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

Setup: [`agent/doro/README.md`](agent/doro/README.md)
