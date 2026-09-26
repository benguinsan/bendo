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
  - If down: spawns `pnpm dsh web --patch './bendo-agent(doro)/cordis.yml' --no-open` in `deepseek-harness/` (or `BENDO_HARNESS_DIR`)
  - Harness failure is **soft** — Bendo still loads; Agent chat stays offline until the bridge is up
- Quit Electron: stops **only** Next / harness processes this session spawned
- If Next spawn fails / path missing: offline page with **Retry**

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
```

Point `bendo-app` at the bridge with `DSH_CHAT_BRIDGE_URL` / `DSH_CHAT_BRIDGE_SECRET` (see `bendo-app/.env.example`). Desktop does not inject those secrets.

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
- `build:bendo` có thể copy `bendo-app/.env` vào resources (gitignore) — **không** publish dmg công khai nếu có secret
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
- Do not commit `resources/` or `.env`; treat baked secrets in a public dmg as unsafe

## Not in this skeleton

- Spawning Docker Compose from Electron
- Bundling harness/Doro into the installer
- Code signing / notarization / auto-update
- Discord bot
