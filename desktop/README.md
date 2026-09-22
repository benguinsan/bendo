# Bendo Desktop

Electron **shell** for Bendo. Loads the existing Next.js app over HTTP — it does **not** embed a second UI.

Per repo [`AGENTS.md`](../AGENTS.md): `main` + `preload`; may spawn local Next; spawn harness comes later.

## Prerequisites

- Node.js `>= 22`
- Sibling `bendo-app/` with dependencies installed (for auto-spawn), **or** Bendo already running (Docker / Next) on the URL below

## Chạy app (cửa sổ giữ mở)

```bash
# from desktop/
npm install
# if electron binary missing:
node node_modules/electron/install.js
npm start
# aliases: npm run app   |   npm run dev
```

- Checks `http://127.0.0.1:3000` (or `BENDO_APP_URL`)
- If already up (Docker / existing Next): **attaches** — does not start a second server
- If down: spawns `npm run dev` in sibling `bendo-app/` (or `BENDO_APP_DIR`), waits, then loads
- Quit Electron: stops **only** a Next process this session spawned
- If spawn fails / path missing: offline page with **Retry**

Optional: still run web yourself in another terminal:

```bash
# from bendo-app/
docker compose up
# or: npm run dev
```

Override URL (**http/https only** — `data:` / `file:` are rejected):

```bash
BENDO_APP_URL=http://127.0.0.1:3000 npm start
BENDO_APP_DIR=../bendo-app npm start
BENDO_SPAWN_TIMEOUT_MS=90000 npm start
```

If the Next.js **dev** server logs blocked HMR from `127.0.0.1`, ensure `bendo-app/next.config.ts` includes `allowedDevOrigins: ["127.0.0.1"]` and restart the web server (or rebuild Docker).

## Kiểm tra nhanh (tự tắt sau khi OK)

Chỉ dùng để verify CI / máy local — **không** dùng để làm việc hàng ngày. Smoke **requires** Bendo already up and **does not spawn** Next:

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
├── src/main/              # BrowserWindow, health check, spawn Next, smoke mode
├── src/platform/          # Cross-platform OS helpers (npm binary, kill tree)
├── src/preload/           # Narrow bridge (platform, reload, getAppUrl)
├── static/offline.html    # Shown when Bendo URL is down
├── scripts/run-app.mjs    # npm start — real app
├── scripts/smoke.mjs      # npm run test:smoke — auto quit (no spawn)
├── prompts/               # Implementation prompts
├── skills-lock.json       # Locked skill install sources
└── package.json
```

## Security

- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true`
- No chat-bridge secret or service role in preload/renderer
- Spawn is a fixed `npm run dev` only (no shell strings from IPC)

## Not in this skeleton

- Spawning Docker Compose / dsh from Electron
- Packaging `.exe` / `.dmg` / bundling Next into asar
- Discord bot
