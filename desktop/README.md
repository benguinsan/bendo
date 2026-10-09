# Bendo Desktop

Electron **shell** for Bendo. Loads the existing Next.js app over HTTP — it does **not** embed a second UI.

Per repo [`AGENTS.md`](../AGENTS.md): `main` + `preload`; may spawn local Next and DeepSeek Harness (Doro + chat-bridge). Startup goes through **Runtime Manager**; quit teardown through **Runtime Shutdown**.

## Prerequisites

- Node.js `>= 22`
- Sibling `bendo-app/` with dependencies installed (for auto-spawn), **or** Bendo already running (Docker / Next) on the URL below
- Optional for Agent chat: sibling `deepseek-harness/` with Doro overlay + `pnpm` on PATH (or harness already on `:3080`)

## Chạy app (cửa sổ giữ mở)

```bash
# from desktop/
npm install
# if electron binary missing:
node node_modules/electron/install.js
npm start
# aliases: npm run app   |   npm run dev
```

- Checks health `http://127.0.0.1:3000/api/health` (or `BENDO_HEALTH_URL`)
- If already healthy (Docker / existing Next): **attaches** — does not start a second server
- If down: spawns `npm run dev` in sibling `bendo-app/` (or `BENDO_APP_DIR`), waits for health 2xx, then loads
- After Bendo is up: checks harness health `http://127.0.0.1:3080/bendo-chat` (or `BENDO_HARNESS_HEALTH_URL`)
  - If healthy: attaches
  - If down: spawns `pnpm dsh web --patch './bendo-agent(doro)/cordis.yml' --no-open` in `deepseek-harness/` (or `BENDO_HARNESS_DIR`) with `DSH_HOME={userData}/dsh` (not `~/.dsh`; override via `BENDO_DSH_HOME`). No copy from `~/.dsh` — Save again in Bendo Agent after the switch.
  - Harness failure is **soft** — Bendo still loads; Agent chat stays offline until the bridge is up
- Quit Electron: stops **only** Next / harness processes this session spawned
- If Next spawn fails / path missing: offline page with **Retry**
- Runtime note log (dev): `release/bendo-runtime.log` — main + `[next]` / `[harness]` console lines for the current session (recreated on each launch). Packaged apps write to `userData/logs/bendo-runtime.log` instead.

Optional: still run web / harness yourself in other terminals:

```bash
# from bendo-app/
docker compose up
# or: npm run dev

# from deepseek-harness/
pnpm dsh web --patch './bendo-agent(doro)/cordis.yml' --no-open
```

Override URLs / paths (**http/https only** for URLs — `data:` / `file:` are rejected):

```bash
BENDO_APP_URL=http://127.0.0.1:3000 npm start
BENDO_HEALTH_URL=http://127.0.0.1:3000/api/health npm start
BENDO_APP_DIR=../bendo-app npm start
BENDO_SPAWN_TIMEOUT_MS=90000 npm start
BENDO_HARNESS_URL=http://127.0.0.1:3080 npm start
BENDO_HARNESS_HEALTH_URL=http://127.0.0.1:3080/bendo-chat npm start
BENDO_HARNESS_DIR=../deepseek-harness npm start
BENDO_HARNESS_SPAWN_TIMEOUT_MS=120000 npm start
# Optional: override harness settings home (default: Electron userData/dsh)
# Leading ~ is expanded (e.g. BENDO_DSH_HOME=~/dsh → $HOME/dsh).
# BENDO_DSH_HOME=~/dsh npm start
```

### Harness `$DSH_HOME` (Electron-spawned)

When Electron **spawns** harness, it sets `DSH_HOME` to `app.getPath("userData")/dsh` so `settings.yaml` / credentials from Bendo Save/apply live under the app, not shared `~/.dsh`.

- Override: `BENDO_DSH_HOME` (absolute, `~/…`, or cwd-relative; `~` → home)
- **No migrate** from `~/.dsh` — after switching, open Agent → Save model config again
- **Attach** to an already-running harness: that process keeps whatever `DSH_HOME` it started with

### User model config (durable)

After Agent **Save**, Electron main stores `{ provider, endpoint, model, apiKeyEncrypted }` in `userData/model-config.json` (`safeStorage` for the key). When harness is ready on startup, main re-applies that config to the localhost bridge. Save in the UI succeeds only when harness apply **and** this persist both succeed.

### Chat bridge credentials (local)

Electron injects `DSH_CHAT_BRIDGE_URL` / `DSH_CHAT_BRIDGE_SECRET` into **spawned** Next and harness children:

- **Env first (session-only):** if set on the Electron process, used for this run; **not** written to disk
- Else **`userData/bridge-credentials.json`** (generate / reuse / rotate every 30 days by default)
- Default URL = `{BENDO_HARNESS_URL origin}/bendo-chat` (change harness port via `BENDO_HARNESS_URL`; do not hardcode a second port for Next)
- Optional TTL override: `BENDO_BRIDGE_SECRET_TTL_MS`
- **Attach caveat:** a harness already running outside Electron must use the same secret (env or matching cordis); after rotation, restart that external harness
- Host-only `bendo-app` `.env` still works for `next dev` without Electron

If the Next.js **dev** server logs blocked HMR from `127.0.0.1`, ensure `bendo-app/next.config.ts` includes `allowedDevOrigins: ["127.0.0.1"]` and restart the web server (or rebuild Docker).

## Đóng gói (macOS) — shell + Bendo runtime

Tạo `.dmg` gồm Electron shell **và** Next standalone (`resources/bendo-app` → `Contents/Resources/bendo-app`). **Chưa** bundle harness — Agent vẫn cần dsh local hoặc soft-fail.

```bash
# from desktop/
npm install
npm run build:bendo   # next build (standalone) + sync → resources/bendo-app
npm run dist           # build:bendo + tsc + .dmg → release/
# thử nhanh không tạo dmg:
npm run pack
```

- Packaged app spawn: `server.js` qua Electron-as-Node (`ELECTRON_RUN_AS_NODE=1`)
- Dev `npm start`: vẫn sibling `bendo-app` + `npm run dev`
- Packaged credentials: public via Next build inline; bridge secret via Electron inject / `userData` (không bake `.env` vào `resources/` / `.dmg`)
- Harness / signing / auto-update: bước sau

## Kiểm tra nhanh (tự tắt sau khi OK)

Chỉ dùng để verify CI / máy local — **không** dùng để làm việc hàng ngày. Smoke **requires** Bendo already up and **does not spawn** Next or harness:

```bash
npm run test:smoke
# alias cũ: npm run smoke
```

Expect `[smoke] OK — Bendo loaded in Electron`, rồi process thoát (exit `0`).

Note: scripts gỡ `ELECTRON_RUN_AS_NODE` khi launch Electron.

## Layout

```text
desktop/
├── .agents/skills/        # Electron agent skills (electron, electron-egg, upgradelink)
├── src/main/              # BrowserWindow, Runtime Manager, spawn Next/harness, smoke mode
├── src/platform/          # Cross-platform OS helpers (npm/pnpm binary, kill tree)
├── src/preload/           # Narrow bridge (platform, reload, getAppUrl)
├── static/offline.html    # Shown when Bendo URL is down
├── resources/bendo-app/   # Next standalone staging (gitignored; from build:bendo)
├── electron-builder.yml   # Packaging (shell + extraResources bendo-app)
├── release/               # electron-builder output (gitignored)
├── scripts/run-app.mjs    # npm start — real app
├── scripts/prepare-bendo-resource.mjs
├── scripts/smoke.mjs      # npm run test:smoke — auto quit (no spawn)
├── prompts/               # Implementation prompts (gitignored)
├── skills-lock.json       # Locked skill install sources
└── package.json
```

## Security

- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true`
- No chat-bridge secret or service role in preload/renderer
- Spawn commands are fixed (`npm run dev` / packaged `server.js`, `pnpm dsh web …`) — no shell strings from IPC
- Do not commit `resources/` or `.env`; installer resources must not contain Clerk/Supabase/bridge secrets
- Bridge secret: machine-local inject + `userData/bridge-credentials.json` (not installer); env overrides are session-only
- Cloud secrets stay on Vercel (results-only APIs); do not download keys into the desktop app — see `AGENTS.md` and repo-root `AGENTS.md` → Product credentials

## Not in this skeleton

- Spawning Docker Compose from Electron
- Bundling harness/Doro into the installer
- Code signing / notarization / auto-update
- Discord bot
