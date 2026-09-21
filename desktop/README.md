# Bendo Desktop

Electron **shell** for Bendo. Loads the existing Next.js app over HTTP — it does **not** embed a second UI.

Per repo [`AGENTS.md`](../AGENTS.md): `main` + `preload` only; spawn harness comes later.

## Prerequisites

- Node.js `>= 22`
- Bendo running locally (Docker Compose or Next) on the URL below

## Run

```bash
# terminal 1 — from bendo-app/
docker compose up
# or: npm run dev

# terminal 2
cd desktop
npm install
# if electron binary missing:
node node_modules/electron/install.js
npm run dev
```

Default URL: `http://127.0.0.1:3000`  
Override: `BENDO_APP_URL=http://127.0.0.1:3000 npm run dev`

## Layout

```text
desktop/
├── src/main/main.ts       # BrowserWindow + loadURL
├── src/preload/preload.ts # Narrow bridge (platform only)
├── dist/                  # Compiled output (gitignored)
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
