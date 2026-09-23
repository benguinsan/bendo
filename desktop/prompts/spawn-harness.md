# Electron spawn DeepSeek Harness (Doro + chat-bridge)

## Goal

When the local dsh web/chat-bridge is not already reachable, Electron **main** starts DeepSeek Harness from the sibling `deepseek-harness/` checkout with the Doro overlay patch, waits until the web port answers, then continues loading Bendo. On quit, tear down **only** the harness child this session spawned.

This is the M4 “spawn harness” step from the desktop roadmap (after spawn Next). Packaging and Discord Gateway stay out of scope.

## Skills / docs read

- Root [`AGENTS.md`](../../AGENTS.md) — Electron may spawn/stop Next **and** harness; bind bridge to localhost; `DSH_CHAT_BRIDGE_URL` → `http://127.0.0.1:<port>/bendo-chat`; model/API keys stay in harness env — never renderer/preload; do not rewrite Doro into Electron main
- [`desktop/AGENTS.md`](../AGENTS.md) — main owns lifecycle; platform differences behind adapters; agent runtime not imported by UI; security (no arbitrary shell from renderer)
- [`.agents/skills/electron/SKILL.md`](../.agents/skills/electron/SKILL.md) — main owns privileged work; process separation; quit lifecycle
- [`.agents/skills/electron/examples/processes/main-process.md`](../.agents/skills/electron/examples/processes/main-process.md) — `before-quit` / `will-quit` teardown
- Existing `spawn-next.ts` + `platform/process.ts` patterns (reuse-if-up, pipe logs, kill tree, smoke no-spawn)
- Doro overlay: `deepseek-harness/bendo-agent(doro)/cordis.yml` — start with  
  `pnpm dsh web --patch './bendo-agent(doro)/cordis.yml'`  
  Bridge: `POST http://127.0.0.1:3080/bendo-chat` (default web port 3080)
- Harness README: pass `--no-open` so Electron does not open a second browser window

## Existing code inspected

- `src/main/main.ts` — `ensureBendoServer` then load; `before-quit` → `stopSpawnedNext` only
- `src/main/spawn-next.ts` — resolve dir, spawn `npm run dev`, wait, stop owned child
- `src/main/check-bendo.ts` — generic HTTP reachability + wait poll (reusable for harness URL)
- `src/platform/process.ts` — `getNpmCommand` / `shouldDetachChild` / `killProcessTree` (needs pnpm sibling)
- `bendo-app/.env.example` — `DSH_CHAT_BRIDGE_URL` / `DSH_CHAT_BRIDGE_SECRET` owned by Next, not Electron
- Desktop README — “spawn harness comes later”

## Decisions / assumptions

1. **Reuse if up:** If the harness health URL is already reachable (manual `pnpm dsh web`, existing session, etc.), do **not** spawn. Log that we are attaching.
2. **Spawn command (fixed):** From harness cwd:  
   `pnpm` + `dsh` + `web` + `--patch` + `./bendo-agent(doro)/cordis.yml` + `--no-open`  
   Never user-supplied shell strings from IPC. Prefer local checkout (`pnpm dsh …`) over `npx @deepseek-ai/dsh` for this MVP (overlay path lives in that checkout).
3. **Working directory:** Default sibling `../deepseek-harness` relative to desktop package root (`app.getAppPath()` parent). Override with `BENDO_HARNESS_DIR` (absolute or relative to cwd). Fail clearly if missing / no `package.json` / no Doro overlay files (`bendo-agent(doro)/cordis.yml`).
4. **Health URL:** Default `http://127.0.0.1:3080` (dsh web default). Override with `BENDO_HARNESS_URL` (http/https only, same validation style as `BENDO_APP_URL`). Poll with the same reachability helper used for Bendo (any HTTP response = up). Do **not** POST to `/bendo-chat` from Electron (would need the bridge secret).
5. **Soft-fail vs Bendo:** Harness spawn/attach failure must **not** block loading Bendo. Log a clear `[harness]` warning; window still loads Next (Agent chat stays offline until bridge is up). Only Next failure uses the offline page.
6. **Order:** After `ensureBendoServer` succeeds (or in parallel after URL resolve — prefer **after** Next is up so Doro tools can reach `localhost:3000`), call `ensureHarnessServer`. Do not require harness before showing the UI.
7. **Wait:** Poll health until success or timeout (default ~90s — harness cold start is slower than Next; configurable via `BENDO_HARNESS_SPAWN_TIMEOUT_MS`). On timeout / early exit: stop owned child, log reason, continue without blocking UI.
8. **Teardown:** On `before-quit`, stop spawned harness tree **and** spawned Next (existing). Do not stop a harness we did not spawn.
9. **Platform:** Add `getPnpmCommand` next to `getNpmCommand` in `src/platform/` (`pnpm` / `pnpm.cmd`). Reuse `shouldDetachChild` + `killProcessTree`.
10. **Smoke mode:** `DESKTOP_SMOKE=1` never spawns harness (same as Next).
11. **Secrets:** Do not put `DSH_CHAT_BRIDGE_SECRET`, model keys, or Clerk secrets into Electron env for the renderer. Child inherits the developer shell / harness `.env`. Do not rewrite `bendo-app` env from Electron. Do not expose spawn APIs to preload/renderer.
12. **Optional env for child only:** May set `BENDO_API_BASE_URL` on the harness child to the resolved Bendo URL if unset (helps Doro tools when Next is on a non-default port). Do not invent bridge secrets.

## Out of scope

- Spawning Docker Compose
- Packaging dsh into the Electron asar / shipping a bundled harness binary
- Changing Doro / chat-bridge TypeScript inside `deepseek-harness/`
- Injecting or generating `DSH_CHAT_BRIDGE_SECRET` into `bendo-app/.env`
- Opening the dsh web UI in a second BrowserWindow
- Discord Gateway / public bot
- Hard-failing the whole app when harness is missing

## Files likely to change

- `desktop/src/main/spawn-harness.ts` (new) — resolve dir, validate overlay, spawn, wait, stop
- `desktop/src/main/harness-url.ts` (new, or fold into spawn module) — `getHarnessUrl` / resolve http(s) only
- `desktop/src/platform/process.ts` — `getPnpmCommand`
- `desktop/src/main/main.ts` — ensure harness after Bendo; quit teardown for harness
- `desktop/.env.example` — `BENDO_HARNESS_DIR`, `BENDO_HARNESS_URL`, `BENDO_HARNESS_SPAWN_TIMEOUT_MS`
- `desktop/README.md` — document spawn harness + soft-fail + env vars

## Implementation requirements

1. Add a main-process module that:
   - Resolves harness path (`BENDO_HARNESS_DIR` or sibling default)
   - Validates `package.json` + `bendo-agent(doro)/cordis.yml`
   - Spawns fixed `pnpm dsh web --patch './bendo-agent(doro)/cordis.yml' --no-open` with logs prefixed `[harness]`, `cwd` = harness dir, `shell: false`, correct pnpm per OS
   - Tracks owned child; surfaces spawn/exit errors in logs
2. Wire startup in `main.ts`:
   - Ensure Bendo (existing)
   - Then ensure harness (soft-fail)
   - Load Bendo URL (or offline only if Bendo failed)
3. Register teardown: quit → `stopSpawnedHarness` + existing `stopSpawnedNext`
4. Keep IPC surface unchanged
5. Preserve security flags (`contextIsolation`, no `nodeIntegration`, sandbox)
6. Update README + `.env.example`

## Security requirements

- Fixed argv only; no IPC-driven shell
- `BENDO_HARNESS_DIR` must be a local filesystem directory
- No secrets in preload/renderer
- Do not disable sandbox / contextIsolation
- Do not bind or advertise the bridge beyond localhost defaults already in dsh/Doro

## Acceptance criteria

- With harness **already** on `:3080`: `npm start` attaches — no second dsh
- With harness **down** and sibling `deepseek-harness` + Doro overlay present: Electron spawns dsh with patch + `--no-open`, waits, logs ready; Bendo loads
- Missing harness / spawn failure → Bendo still loads; console shows clear `[harness]` reason (no offline page solely for harness)
- Quitting Electron stops **only** harness/Next children this session spawned
- Smoke still no-spawn for harness
- `npm run typecheck` (and `npm run build`) pass in `desktop/`

## Checks to run

From `desktop/`:

```bash
npm run typecheck
npm run build
```

Manual (optional if environment allows):

1. Stop anything on `:3080`; start desktop → console shows harness spawn + ready (or soft-fail if checkout missing)
2. Quit → confirm port 3080 freed when we owned the process
3. Start harness manually; start desktop → attach / no duplicate spawn
4. Smoke with Bendo up → no harness spawn

## Exact manual test steps (after implementation)

1. `cd desktop && npm run typecheck && npm run build`
2. Free port 3080; `npm start`; confirm `[harness]` spawn logs and Bendo window
3. Quit; confirm 3080 free if we spawned
4. Pre-start `pnpm dsh web --patch './bendo-agent(doro)/cordis.yml' --no-open` in harness; `npm start` → attach only
