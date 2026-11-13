# Bendo

A personal task manager with two local interfaces: a **web app through Docker Compose** and an **Electron desktop app**. Both use the same Next.js product and the same Clerk/Supabase services. **Doro**, the optional AI assistant, runs in a separate local harness.

**Stack:** Next.js · React.js · TypeScript · Tailwind CSS / shadcn · Clerk · Supabase · Docker · Electron

## Choose how to run

| Mode | What starts locally | What you open |
| --- | --- | --- |
| Web | Docker runs the Next.js development server | Browser at `http://localhost:3000` |
| Desktop | Electron starts a host Next.js server and, if prepared, Doro | Electron window at `http://127.0.0.1:3000` |

Clerk authentication and the Supabase database remain external in both modes. This is local application hosting, not a fully offline stack. Local development does not require a deployed Bendo API or `BENDO_CLOUD_API_URL`.

Features include task CRUD, dashboard, search, priorities, categories, calendar, incomplete-task reminders, and optional task management through Doro chat.

## 1. Clone and configure once

Commands below use Bash: macOS/Linux, or Git Bash on Windows. Run them in the stated directory.

- **Web:** Git and Docker Desktop with Compose.
- **Desktop:** Git, Node.js 22.19+ within 22.x (or Node.js 24.x), and npm.
- **Optional Doro:** the same Node.js version, pnpm 11.7.0, and the harness setup linked below.

Clone the **development** branch containing this setup:

```bash
git clone --branch development https://github.com/benguinsan/bendo.git
cd bendo
cp bendo-app/.env.example bendo-app/.env.local
```

Fill these values in `bendo-app/.env.local` using your Clerk application and Supabase project:

| Variable | Where to get it |
| --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk Dashboard → API keys |
| `CLERK_SECRET_KEY` | Clerk Dashboard → API keys |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project API keys |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase server/service-role key |

Keep the sign-in/sign-up paths from the example. Leave `BENDO_CLOUD_API_URL` unset for these local workflows. Never commit `.env.local`; secret keys stay on the Next.js server.

For a new Supabase project, apply `bendo-app/supabase/schema.sql` in the SQL Editor, following the [database setup guide](bendo-app/supabase/README.md).

Use a Clerk development instance for local work. For desktop OAuth, configure the local origin `http://127.0.0.1:3000` and redirect `http://127.0.0.1:3000/auth/desktop-handoff` in Clerk. See [OAuth setup](docs/desktop-oauth-bendo-protocol.md#2-clerk-dashboard-bắt-buộc-cấu-hình-tay).

## 2A. Run the web app with Docker

From the repository root, with Docker Desktop running:

```bash
docker compose -f bendo-app/compose.yaml up --build
```

Leave that terminal open and wait for Next.js to report ready. Open [http://localhost:3000](http://localhost:3000), sign up or sign in, then create a task. Saving a task verifies the database setup as well as the UI.

Compose mounts source and `.env.local` for live reload. Dependencies and the Next.js cache live in container volumes; no host `npm ci` is required for this mode. The Dockerfile runs `next dev`, not a production server.

From another terminal at the repository root:

```bash
docker compose -f bendo-app/compose.yaml logs -f web-app
docker compose -f bendo-app/compose.yaml restart web-app
docker compose -f bendo-app/compose.yaml down
```

Restart after changing `.env.local`. For chat, complete [Doro setup](docs/bendo-app-agent-chat.md#local-setup-from-a-fresh-clone), start the harness separately, then save your model configuration in Agent.

## 2B. Run the desktop app from source

Use the same `bendo-app/.env.local` from step 1. Stop the Docker web service first if you started it:

```bash
# From the repository root; only needed if Docker web is running.
docker compose -f bendo-app/compose.yaml down
```

Also stop any manually started Next.js or Doro process before using this auto-start workflow. For desktop chat, first complete the [one-time Doro preparation](docs/bendo-app-agent-chat.md#local-setup-from-a-fresh-clone); you do not need to launch the harness yourself.

From the repository root:

```bash
cd bendo-app
npm ci
cd ../desktop
npm ci
npm start
```

Electron builds its shell, starts Next.js on the host, and opens the app. It starts the prepared harness in the background and shares session/bridge credentials with its child processes. Docker is not required for this mode.

Sign in, create a task, and optionally open Agent → configure your model → Save → chat. Without a prepared harness, task management still works; chat stays offline. Quit Electron to stop processes it started.

Subsequent launches only need `npm start` from `desktop/`. This source-development workflow does not build an installer; see [desktop setup and packaging](desktop/README.md).

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Port 3000 is occupied | Stop the previous Docker/Next process before switching modes. |
| Invalid environment or sign-in fails | Fill all five keys in `bendo-app/.env.local`, check the Clerk instance, and restart the server. |
| Dashboard opens but tasks cannot be saved | Check the Supabase schema and server key; web health alone does not verify database access. |
| Doro is offline | Complete harness preparation and follow the separate web/desktop startup instructions in [Doro setup](docs/bendo-app-agent-chat.md#local-setup-from-a-fresh-clone). |
| Desktop model Save is denied | Use the auto-start workflow above; attaching to an existing server needs shared session credentials. See [desktop attachment](desktop/README.md#attaching-to-an-existing-docker-server). |
| Dependencies changed after pulling | Rebuild Docker for web; run `npm ci` again in the affected host package for desktop. |

## Documentation

- [Web app setup and commands](bendo-app/README.md)
- [Doro setup and model configuration](docs/bendo-app-agent-chat.md)
- [Database setup](bendo-app/supabase/README.md)
- [Desktop setup and packaging](desktop/README.md)
- [Architecture](docs/architecture.md) · [Current status](STATUS.md)
