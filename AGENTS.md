# AGENTS.md (monorepo)

You are working in the **Bendo** monorepo. This file is the **map and priority layer**: layout, product priorities, credential distribution, and desktop/harness invariants.

| Concern | Where |
| --- | --- |
| Next.js UI / API / Supabase / Clerk / task domain / Agent adapter | [`bendo-app/AGENTS.md`](bendo-app/AGENTS.md) |
| Electron shell only (IPC, packaging checks, durable model persist) | [`desktop/AGENTS.md`](desktop/AGENTS.md) |
| Agent chat + Save/apply/persist detail | [`docs/bendo-app-agent-chat.md`](docs/bendo-app-agent-chat.md) |
| Task / category / status / calendar | [`docs/bendo-app-task-domain.md`](docs/bendo-app-task-domain.md) |
| Discord identity (no public bot yet) | [`docs/bendo-app-discord-identity.md`](docs/bendo-app-discord-identity.md) |
| Cloud cutover, credentials/bridge, startup, OAuth, slim harness | [`docs/desktop-cloud-cutover.md`](docs/desktop-cloud-cutover.md), [`docs/desktop-credentials-and-dsh-bridge.md`](docs/desktop-credentials-and-dsh-bridge.md), [`docs/desktop-electron-startup-flow.md`](docs/desktop-electron-startup-flow.md), [`docs/desktop-oauth-bendo-protocol.md`](docs/desktop-oauth-bendo-protocol.md), [`docs/desktop-doro-minimal-components.md`](docs/desktop-doro-minimal-components.md), [`docs/desktop-ship-mvp-checklist.md`](docs/desktop-ship-mvp-checklist.md) (Windows-first ship) |

- Changing **web/API/DB/Agent adapter** → `bendo-app/AGENTS.md` (prompt → approval → implement).
- Changing **desktop shell, packaging, harness lifecycle, monorepo layout** → **this file** + `desktop/AGENTS.md`. Do not put Electron packaging rules into `bendo-app/AGENTS.md`.
- Do not maintain a second full copy of web rules here.

---

## Repo layout

```text
bendo/
├── AGENTS.md                 # This file — monorepo map + desktop invariants
├── README.md                 # Human overview
├── bendo-app/                # Next.js product (Docker or npm)
│   └── AGENTS.md             # Web always-on invariants
├── desktop/                  # Electron shell (loads local Bendo URL)
│   └── packaging/bendo-agent(doro)/  # Tracked Doro snapshot for release builds
├── .github/workflows/        # ci.yaml (bendo-app), desktop-windows.yml (dist:win)
└── deepseek-harness/         # Local checkout (gitignored, separate repo)
    └── bendo-agent(doro)/    # Doro overlay you dogfood (persona, tools, chat-bridge)
```

There is **no** `agent/doro/` install template. Dev uses the harness-checkout overlay; CI copies `desktop/packaging/bendo-agent(doro)/` into the harness before `build:harness` — keep the two in sync before a release.

---

## Product priorities

1. **Desktop-first Agent (non-tech):** user machine runs Doro/harness so Bendo does not need to host harness for desktop Agent chat.
2. **Web `bendo-app`:** task product, auth, sync (Clerk + Supabase). UI/API source of truth.
3. **Discord public bot:** deferred until desktop local Agent path is in place. Connect Discord / `discord_identities` may exist without the bot (see [`docs/bendo-app-discord-identity.md`](docs/bendo-app-discord-identity.md)).

---

## Product credentials / key distribution

**Canonical** narrative for what may ship vs stay on Vercel vs stay on localhost. Local `bendo-app` `.env` / `.env.local` (and Docker) may hold the **full** set for `next dev` — never commit real secrets.

Distribution rules apply when building Electron resources / the installer (`build:bendo`, standalone → `desktop/resources/`, `pack` / `dist`), not everyday local `.env` usage:

| Tier | Examples | Rule |
| --- | --- | --- |
| Public | `NEXT_PUBLIC_*` | May ship / inline in client artifacts |
| Cloud server-only | `CLERK_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Vercel (or equivalent) only. Packaged Next forwards session JWT and receives **results**. No local JWT-PEM as product path. No lend-keys API. |
| Local machine-only | `DSH_CHAT_BRIDGE_URL` / `DSH_CHAT_BRIDGE_SECRET` | Localhost Agent path only. Not from Vercel. Not in installer. |

**Stay local (never Vercel):** `/api/agent/chat`, `/api/health`, DSH bridge between local Bendo and local harness.

Env catalog: `bendo-app/.env.example`. Chat-bridge contract: [`bendo-app/AGENTS.md`](bendo-app/AGENTS.md) §6 and [`docs/bendo-app-agent-chat.md`](docs/bendo-app-agent-chat.md).

---

## Desktop shell invariants

- Shell = Electron (Wails later = shell-only swap). TypeScript/JS fine. Sibling package `desktop/`, not Electron embedded inside `bendo-app` as the only way to run the web app.
- Shell = `main` + `preload`; load Bendo via URL (dev: Docker / `localhost`). Do **not** embed a second React product UI or copy Electron Chromium source layouts.
- Agent-on-user-machine = **local Bendo** + **local dsh/Doro** + localhost bridge. Loading only a cloud Bendo URL does **not** put the Agent on the user machine.
- Bridge: `DSH_CHAT_BRIDGE_URL` → `http://127.0.0.1:<port>/bendo-chat` (or equivalent); bind localhost only.
- When Electron **spawns** harness: `DSH_HOME` = `{userData}/dsh` (override `BENDO_DSH_HOME`). No auto-migrate `~/.dsh`. Attaching to an external harness does not rewrite that process’s home.
- Main may spawn/stop Next and harness; tear down on quit. App-owned harness credentials stay out of renderer/preload.
- **User model config:** Save/apply before chat; durable persist on the machine (`userData` + `safeStorage`). Save = **apply ∧ persist**. Detail: [`docs/bendo-app-agent-chat.md`](docs/bendo-app-agent-chat.md) and [`desktop/AGENTS.md`](desktop/AGENTS.md).
- Docker Next → host harness: `host.docker.internal` (`bendo-app/.env.example`).
- Clerk and Supabase stay cloud-backed unless a later prompt moves them.
- No Discord Gateway / public bot invite in the desktop Agent MVP.
- Do not rewrite Doro into Go/Electron main.

---

## Harness / Doro

- Overlay: `deepseek-harness/bendo-agent(doro)/` (dev); release snapshot: `desktop/packaging/bendo-agent(doro)/`
- Chat: Next server → bridge secret → harness ([`docs/bendo-app-agent-chat.md`](docs/bendo-app-agent-chat.md))
- Adapter: `bendo-app/lib/agent/*`. Pages must not import harness or Electron main.
- User model config applied before chat; do **not** attach provider/endpoint/API key/model on each chat-turn bridge body.

---

## Docs

- Short README per package; root `README.md` is the human index.
- Always-on: this file + `bendo-app/AGENTS.md` + `desktop/AGENTS.md`.
- On-demand detail lives under `docs/` (table at top).
