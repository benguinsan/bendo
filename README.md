# Bendo

A personal task-management web app, run locally in your browser through Docker Compose, with an optional AI assistant (**Doro**).

**Stack:** Next.js · React.js · TypeScript · Tailwind CSS / shadcn · Clerk · Supabase · Docker

## Features

- Dashboard, quick add, search, and task status overview
- Task CRUD, priorities, personal categories, and calendar views
- Incomplete-task reminders
- Clerk authentication and user-scoped task data in Supabase
- Optional Doro chat with task-management tools through a local DeepSeek Harness bridge

## What runs locally

Docker Compose runs the Next.js web app at **http://localhost:3000**. It uses the development server with source mounts for live reload.

Clerk authentication and the Supabase database remain external services. Running the web app locally does not make the whole application offline or start those services in Docker. Doro also needs a separately running harness; Compose does not start it.

## Run with Docker

### 1. Prepare services and environment

You need Docker Desktop with Compose, a Clerk application, and a Supabase project.

From the repository root:

```bash
cd bendo-app
cp .env.example .env.local
```

Fill in these values in `bendo-app/.env.local`:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk server key |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase server access |

Use the local Clerk/Supabase configuration above; `BENDO_CLOUD_API_URL` is not needed for this workflow. Keep server keys out of `NEXT_PUBLIC_*` variables and never commit `.env.local`.

For a new database, apply `bendo-app/supabase/schema.sql` using the Supabase SQL Editor, following the [database setup guide](bendo-app/supabase/README.md).

### 2. Start the web app

From `bendo-app/`:

```bash
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000), then sign up or sign in. The source mount makes `.env.local` available to Next.js at runtime; dependencies and the Next.js cache stay in container volumes.

Useful commands from the same directory:

```bash
docker compose logs -f web-app
docker compose restart web-app
docker compose down
```

Restart `web-app` after changing `.env.local`. The current Docker setup is for local development, not a production image.

## Optional: Doro chat

Core task features work without Doro. Live chat requires a separate DeepSeek Harness checkout with the Bendo Doro overlay. That gitignored checkout is not included when cloning this repository.

For Docker Desktop, set these server-only values in `bendo-app/.env.local`:

```dotenv
DSH_CHAT_BRIDGE_URL=http://host.docker.internal:3080/bendo-chat
DSH_CHAT_BRIDGE_SECRET=replace_with_a_shared_secret
```

The harness process must use the same `DSH_CHAT_BRIDGE_SECRET`. In an existing configured harness checkout, start Doro separately:

```bash
cd deepseek-harness
pnpm dsh web --patch './bendo-agent(doro)/cordis.yml' --no-open
```

The `cd` above starts from the repository root. Configure the shared secret in the harness environment before launching it. Then open Agent in Bendo, configure your model, and save before chatting. Without a reachable bridge, chat stays offline.

See [Agent chat and model configuration](docs/bendo-app-agent-chat.md) for the bridge contract and browser configuration behavior.

## Run without Docker

With Node.js 22+ and the same `.env.local` setup, run from `bendo-app/`:

```bash
npm ci
npm run dev
```

If the harness runs on the same host, use `http://127.0.0.1:3080/bendo-chat` for `DSH_CHAT_BRIDGE_URL` instead of the Docker Desktop host address.

## Repository and documentation

```text
bendo/
├── bendo-app/           # Next.js web app, Docker configuration, and database schema
├── docs/               # Architecture and feature contracts
├── desktop/            # Existing Electron shell and packaging
└── deepseek-harness/    # Separate local harness checkout (gitignored)
```

- [Web app setup and commands](bendo-app/README.md)
- [Database setup](bendo-app/supabase/README.md)
- [Architecture](docs/architecture.md) · [Current status](STATUS.md)
- [Existing desktop setup and packaging](desktop/README.md)
