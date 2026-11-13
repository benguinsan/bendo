# Bendo web app

The Next.js UI and API for Bendo. The primary local workflow uses Docker Compose and opens in a browser at **http://localhost:3000**.

Clerk handles authentication and Supabase stores application data. These services remain external; Compose starts only the web app. Doro chat is optional and needs a separate harness process.

## Local Docker setup

Run these commands from `bendo-app/`:

```bash
cp .env.example .env.local
```

Fill in the Clerk and Supabase values:

```dotenv
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Keep the sign-in/sign-up paths from `.env.example`. Apply `supabase/schema.sql` to a new Supabase project using the [database setup instructions](supabase/README.md).

The local app uses these keys directly on its server; `BENDO_CLOUD_API_URL` is not needed. `CLERK_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and the Doro bridge secret must stay server-only.

Start the development server:

```bash
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000). Signed-out visitors are sent to `/sign-in`; sign up or sign in to open the dashboard.

Compose bind-mounts this directory for live reload, including `.env.local` for Next.js runtime configuration. Container volumes hold `node_modules` and `.next`. Environment files are excluded from the Docker image.

```bash
docker compose logs -f web-app
docker compose restart web-app
docker compose down
```

Restart the service after editing `.env.local`. This Dockerfile runs `next dev`; it is a local development setup.

## Optional Doro chat

Set `DSH_CHAT_BRIDGE_URL` and `DSH_CHAT_BRIDGE_SECRET` in `.env.local`, and configure the same secret in the separately running harness.

- Docker Desktop → host harness: `http://host.docker.internal:3080/bendo-chat`
- Host `npm run dev` → host harness: `http://127.0.0.1:3080/bendo-chat`

Compose does not start or configure the harness. In Agent, configure your provider, endpoint, API key, and model, then save before chatting. Browser mode uses a same-tab session cache; Electron's encrypted model-config persistence does not apply to the browser.

Without a reachable bridge, task management still works and chat stays offline. See the [root setup guide](../README.md#optional-doro-chat) and [Agent configuration contract](../docs/bendo-app-agent-chat.md).

## Run without Docker

Requires Node.js 22+ and the same environment configuration:

```bash
npm ci
npm run dev
```

## Application data and authentication

Product pages load user task data from Supabase through server-side services. Task/category mutations that also record activity use RPCs so both writes share one transaction. See [database details](supabase/README.md).

Clerk middleware lives in `proxy.ts`; protected product routes use `requireUser()`. Service-role database access and bridge calls stay on the Next.js server.

## Checks

Run from this directory with dependencies installed:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

Linting uses Ultracite with Oxlint/Oxfmt. See [architecture](../docs/architecture.md) for the other existing run modes and [desktop documentation](../desktop/README.md) for the Electron shell.
