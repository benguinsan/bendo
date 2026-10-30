# AGENTS.md (desktop)

Principal-level engineer on **Bendo Desktop** (Electron). This file = **Electron-only** always-on rules.

| Concern | Where |
| --- | --- |
| Monorepo map, product priorities, credential tiers | [`../AGENTS.md`](../AGENTS.md) |
| Next.js product / API / Agent adapter | [`../bendo-app/AGENTS.md`](../bendo-app/AGENTS.md) |
| Agent chat + Save/apply/persist product contract | [`../docs/bendo-app-agent-chat.md`](../docs/bendo-app-agent-chat.md) |
| Cloud cutover / bridge env / startup / OAuth / slim harness | [`../docs/desktop-cloud-cutover.md`](../docs/desktop-cloud-cutover.md), [`../docs/desktop-credentials-and-dsh-bridge.md`](../docs/desktop-credentials-and-dsh-bridge.md), [`../docs/desktop-electron-startup-flow.md`](../docs/desktop-electron-startup-flow.md), [`../docs/desktop-oauth-bendo-protocol.md`](../docs/desktop-oauth-bendo-protocol.md), [`../docs/desktop-doro-minimal-components.md`](../docs/desktop-doro-minimal-components.md) |

Next.js is out of scope unless the task explicitly needs shared changes.

---

## Skills

Under `desktop/.agents/skills/` (do not invent new folders):

- `.agents/skills/electron`
- `.agents/skills/electron-egg` — reference only; Bendo shell is plain Electron, not Electron EGG
- `.agents/skills/upgradelink` — when packaging / auto-update is in scope

Clerk / Supabase / Next skills stay in `bendo-app/.agents/`.

---

## Workflow

1. Read this file (+ root AGENTS / on-demand docs as needed).
2. Inspect Electron code; read `electron` skill when relevant.
3. Ask only if ambiguity blocks work.
4. Write `prompts/<feature>.md`; ask approval before coding (unless user skips prompts).
5. Implement approved scope only; run checks; report exact test/run steps.
6. On merge: put the prompt's goal, decisions and acceptance in the commit/PR body; update `docs/` only for non-obvious decisions. Move the finished prompt to `prompts/done/` (gitignored — never commit).

If the task already has an approved `prompts/*.md`, implement it directly — do not rewrite the prompt or ask for approval again.

---

## Versioning

- Every packaged release needs an explicit semver in `package.json` `version` (e.g. `Bendo-${version}-…` artifacts).
- After changing embedded runtimes under `resources/` (bendo-app, harness), re-run prepare and **bump** desktop version — do not reuse a version for a new snapshot.
- Prefer recording which runtime snapshot matches which desktop version (manifest / release notes / prepare log).
- `npm start` / unpackaged is not a versioned shippable artifact.

---

## Architecture

- `src/main/` — lifecycle, native APIs, IPC, spawn Next/harness.
- `src/preload/` — narrow typed API via `contextBridge`.
- `src/platform/` — platform-specific adapters.
- `scripts/` — prepare (`build:bendo`, `build:harness`), `check-pack-ops`, `run-electron-builder`, smoke.
- `packaging/` — tracked Doro overlay snapshot for CI/release (see `packaging/README.md`).
- CI: `.github/workflows/desktop-windows.yml` runs `ops:pack-ready` then `dist:win`. Do not weaken the secret-strip checks to make CI pass.
- Shared business logic stays framework-independent (not Electron-only).

---

## Security (Electron)

- `contextIsolation` on; `nodeIntegration` off.
- Renderer must not import `electron`, `fs`, `child_process`, or other privileged Node modules.
- Validate every IPC payload in main; expose only allowlisted preload methods.
- Do not execute arbitrary shell commands from renderer input.

**Credentials:** follow root [`AGENTS.md`](../AGENTS.md) → Product credentials. Desktop specifics:

- Strip `.env*` from Next standalone / `resources/bendo-app` in `build:bendo` — do not regress.
- Never put cloud secrets, bridge secrets, bot tokens, or provider keys in renderer, preload, `resources/`, or electron-builder artifacts.
- Shipped artifacts: **public** (`NEXT_PUBLIC_*`) only. Spawned Next for shipped product: secret work → Vercel (session forward, results only). Stay local: `/api/agent/chat`, `/api/health`, DSH bridge.
- No “download secrets from Vercel into Electron/Next `process.env`”; no shipped Clerk JWT PEM as stand-in for cloud `auth()`.

---

## Platform

- No Windows-only paths/shells/env assumptions; use path APIs and adapters.
- Do not scatter `process.platform` through business logic.
- Packaging config must stay valid for Windows, macOS, and Linux targets (even if a given release ships macOS-first).

---

## Agent runtime & model config (desktop-owned)

- UI must not import harness process code; runtime behind an interface; support cancellation / safe errors.
- Shared agent logic independent of Electron APIs where possible.

**Durable user model config** (product detail in [`docs/bendo-app-agent-chat.md`](../docs/bendo-app-agent-chat.md)):

- Persist under `app.getPath("userData")` (`model-config.json`); prefer `safeStorage` for the key. Fields: `provider`, `endpoint`, `apiKey`, `model`. Not Supabase / Vercel / installer.
- Separate from `$DSH_HOME/settings.yaml` (harness `llm-pi-ai`).
- **Save = apply ∧ persist.** Apply single-shot on Save (no auto-retry); persist retry bounded after apply OK. No success UI on partial success.
- On harness ready: re-apply from disk (retry transient bridge failures only; not HTTP 400). Never attach model secrets to chat-turn bodies.

---

## Checks

From `desktop/package.json` (no lint script): `npm run typecheck`; `npm run test:smoke` when main/runtime changes; `npm run ops:pack-ready` when Electron config, prepare scripts or `packaging/` change. Report exact commands and results.
