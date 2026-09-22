# Electron spawn Next (local `bendo-app`)

## Goal

When Bendo is not already reachable at `BENDO_APP_URL`, Electron **main** starts a local Next.js process from the sibling `bendo-app/` package, waits until HTTP answers, then loads the app. On quit, tear down **only** the Next child this session spawned.

This is the M3 “spawn Next” step from the desktop roadmap. Docker Compose spawn and harness/dsh spawn stay out of scope.

## Skills / docs read

- Root [`AGENTS.md`](../../AGENTS.md) — Electron may spawn/stop Next; tear down on quit; no secrets in renderer/preload
- [`desktop/AGENTS.md`](../AGENTS.md) — main owns lifecycle; platform differences behind adapters; security (no arbitrary shell from renderer)
- [`.agents/skills/electron/SKILL.md`](../.agents/skills/electron/SKILL.md) — Electron process model; main lifecycle (`app.whenReady`, `before-quit` / `will-quit` / `window-all-closed`); keep privileged work in main
- [`.agents/skills/electron/examples/processes/main-process.md`](../.agents/skills/electron/examples/processes/main-process.md) — app lifecycle events for quit teardown
- Node `child_process.spawn` (main has full Node access; never from renderer/preload)
- Existing desktop health + URL helpers

## Existing code inspected

- `src/main/main.ts` — window, `loadBendo`, offline page, IPC reload; no child processes yet
- `src/main/bendo-url.ts` — `getBendoAppUrl` / `resolveBendoAppUrl` (http/https only)
- `src/main/check-bendo.ts` — `isBendoReachable`
- `static/offline.html` — manual “start Docker/Next then Retry”
- `scripts/run-app.mjs` / `smoke.mjs` — launch Electron only; warn if Bendo down
- `bendo-app/package.json` — `dev` = `next dev`, `start` = `next start`
- README currently lists spawning Next as “not in this skeleton”

## Decisions / assumptions

1. **Reuse if up:** If `isBendoReachable(url)` is already OK (Docker Compose, existing `npm run dev`, etc.), do **not** spawn. Log that we are attaching to an existing server.
2. **Spawn command:** Prefer `npm run dev` in `bendo-app/` (dev DX). Not `next start` (needs a prior build). Not Docker Compose.
3. **Working directory:** Default resolve sibling `../bendo-app` relative to the monorepo root (desktop’s parent). Override with `BENDO_APP_DIR` (absolute or relative path). Fail with a clear offline reason if the directory / `package.json` is missing.
4. **Port / URL:** Continue using `getBendoAppUrl()` (default `http://127.0.0.1:3000`). Do not invent a second port. Spawn inherits env so Next can still honor its own `PORT` if set; health wait must use the same resolved URL.
5. **Wait:** After spawn, poll `isBendoReachable` until success or timeout (suggested default ~60s, configurable via `BENDO_SPAWN_TIMEOUT_MS`). Show offline (or a short “starting…” offline reason) if timeout / spawn exit early.
6. **Teardown:** On `before-quit` / app quit, stop the spawned child (and its process group where needed so `next`/npm grandchildren die). Do **not** stop a server we did not spawn. Follow Electron main-process quit lifecycle from the skill (`before-quit` / `will-quit`).
7. **Platform:** Windows vs Unix differences for npm binary and process-tree kill live under `src/platform/` (or a small helper used only from main). No scattered `process.platform` in business flow beyond that adapter.
8. **Smoke mode:** `DESKTOP_SMOKE=1` keeps **no spawn in smoke** so CI stays fast and deterministic. Document in README.
9. **Secrets:** Do not put Clerk/Supabase/bridge secrets into Electron env beyond what the child inherits from the developer’s shell / `bendo-app/.env` (Next loads its own). Do not expose spawn APIs to preload/renderer.
10. **Offline copy:** Update offline messaging to mention that desktop may auto-start Next when `bendo-app` is present.

## Out of scope

- Spawning Docker Compose
- Spawning dsh / Doro / chat-bridge
- Packaging / electron-builder / bundling Next into the asar
- Changing `bendo-app` Next config beyond what desktop already documents (`allowedDevOrigins`)
- Dotenv loader inside Electron (optional later)

## Files likely to change

- `desktop/src/main/spawn-next.ts` (new) — resolve dir, spawn, wait, stop
- `desktop/src/platform/process.ts` (new, or similar) — npm command + kill tree helpers
- `desktop/src/main/main.ts` — ensure Next before `loadBendo`; register quit teardown
- `desktop/src/main/check-bendo.ts` — optional `waitForBendo` poll helper (or keep polling in spawn module)
- `desktop/.env.example` — `BENDO_APP_DIR`, `BENDO_SPAWN_TIMEOUT_MS`, note on reuse-if-up
- `desktop/README.md` — one-command flow when Next is down; Docker still works without spawn
- `desktop/static/offline.html` — copy tweak only if needed

## Implementation requirements

1. Add a main-process module that:
   - Resolves `bendo-app` path (`BENDO_APP_DIR` or sibling default)
   - Validates `package.json` exists
   - Spawns `npm run dev` with `stdio` logged to main console (prefix `[next]`), `cwd` = app dir, `shell: false`, correct npm executable per OS
   - Tracks the child handle; on unexpected exit before ready, surface failure reason
2. Wire startup in `main.ts`:
   - Resolve URL
   - If reachable → load
   - Else → spawn → wait → load (or offline on failure)
3. Register teardown so quitting the app kills the spawned Next tree when owned.
4. Keep IPC surface unchanged (no new renderer spawn controls).
5. Preserve security flags (`contextIsolation`, no `nodeIntegration`, sandbox).
6. Update README + `.env.example` for the new env vars and behavior.

## Security requirements

- Spawn only a fixed command (`npm` + `run` + `dev`), never user-supplied shell strings from IPC
- Path from `BENDO_APP_DIR` must be a filesystem directory we control (no remote URLs)
- Do not move secrets into preload/renderer
- Do not disable sandbox / contextIsolation

## Acceptance criteria

- With Bendo **already** on `:3000` (e.g. Docker): `npm start` in `desktop/` opens Bendo and does **not** start a second Next
- With Bendo **down** and sibling `bendo-app` installed: `npm start` spawns Next, waits, then loads the app
- Quitting Electron stops the spawned Next (port freed; no orphan `node`/`next` from this session)
- Missing `bendo-app` / spawn failure → offline page with a clear reason; Retry still works
- `npm run typecheck` passes in `desktop/`
- Smoke test still documents that it requires a pre-started server (no spawn)

## Checks to run

From `desktop/`:

```bash
npm run typecheck
npm run build
```

Manual (optional if environment allows):

1. Stop anything on `:3000`; `cd desktop && npm start` → Next starts, window loads Bendo
2. Quit app → confirm nothing still listening on `:3000` from that spawn
3. `docker compose up` (or existing Next); `npm start` → no duplicate spawn; app loads
4. Offline: point `BENDO_APP_DIR` at a missing path → offline reason mentions path / spawn failure

## Exact manual test steps (after implementation)

1. `cd desktop && npm run typecheck && npm run build`
2. Ensure port 3000 is free; run `npm start`; confirm console shows Next spawn + eventual load
3. Quit; confirm port 3000 is free again
4. Start Bendo via Docker; run `npm start` again; confirm logs say attaching / no spawn; UI loads
