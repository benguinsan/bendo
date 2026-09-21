# Bendo Desktop

Electron **shell** for Bendo. Loads the existing Next.js app over HTTP — it does **not** embed a second UI.

Per repo [`AGENTS.md`](../AGENTS.md): `main` + `preload` only; spawn harness comes later.

## Prerequisites

- Node.js `>= 22`
- Bendo web running locally (Docker Compose or Next) on the URL below

## Chạy app (cửa sổ giữ mở)

```bash
# terminal 1 — from bendo-app/
docker compose up
# or: npm run dev

# terminal 2 — from desktop/
npm install
# if electron binary missing:
node node_modules/electron/install.js
npm start
# aliases: npm run app   |   npm run dev
```

- Checks `http://127.0.0.1:3000` (or `BENDO_APP_URL`)
- Opens Electron and **keeps the window open**
- If Bendo is down: offline page with **Retry**

Override URL (**http/https only** — `data:` / `file:` are rejected):

```bash
BENDO_APP_URL=http://127.0.0.1:3000 npm start
```

If the Next.js **dev** server logs blocked HMR from `127.0.0.1`, ensure `bendo-app/next.config.ts` includes `allowedDevOrigins: ["127.0.0.1"]` and restart the web server (or rebuild Docker).

## Kiểm tra nhanh (tự tắt sau khi OK)

Chỉ dùng để verify CI / máy local — **không** dùng để làm việc hàng ngày:

```bash
npm run test:smoke
# alias cũ: npm run smoke
```

Expect `[smoke] OK — Bendo loaded in Electron`, rồi process thoát (exit `0`).

Note: scripts gỡ `ELECTRON_RUN_AS_NODE` khi launch Electron.

## Layout

```text
desktop/
├── src/main/              # BrowserWindow, health check, optional smoke mode
├── src/preload/           # Narrow bridge (platform, reload, getAppUrl)
├── static/offline.html    # Shown when Bendo URL is down
├── scripts/run-app.mjs    # npm start — real app
├── scripts/smoke.mjs      # npm run test:smoke — auto quit
└── package.json
```

## Security

- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true`
- No chat-bridge secret or service role in preload/renderer

## Not in this skeleton

- Spawning Docker / Next / dsh from Electron
- Packaging `.exe` / `.dmg`
- Discord bot
