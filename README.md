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
└── deepseek-harness/    # Local harness checkout (gitignored)
```

- App: [`bendo-app/README.md`](bendo-app/README.md)
- Agent: [`agent/doro/README.md`](agent/doro/README.md)

---

## ✅ Prerequisites

- Node.js `>= 22`
- [Clerk](https://dashboard.clerk.com) keys
- [Supabase](https://supabase.com/dashboard) project — run `bendo-app/supabase/schema.sql` in the SQL Editor
- Docker Desktop (optional)
- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (optional — Agent chat only)

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
