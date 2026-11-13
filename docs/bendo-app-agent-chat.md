# Bendo-app — Agent chat & user model config

On-demand rules for Doro / chat-bridge and the Agent model-config UI. **Always-on summary:** [`bendo-app/AGENTS.md`](../bendo-app/AGENTS.md) §6.

**Also read:**

- [`agent-model-config.md`](./agent-model-config.md) — Test connection / SSRF, harness apply route, Save = apply ∧ persist, startup re-apply
- Desktop persist: [`../desktop/AGENTS.md`](../desktop/AGENTS.md), root [`../AGENTS.md`](../AGENTS.md)

Desktop shell / Electron packaging is **out of scope** here — root / `desktop/AGENTS.md`.

---


## Local setup from a fresh clone

The parent repository does not include `deepseek-harness/`: it is a separate, gitignored checkout. Do this once if you want Agent chat; skip it for task management alone.

Use Node.js 22.19+ within 22.x (or Node.js 24.x) and **pnpm 11.7.0**. If pnpm is missing, install that version with `npm install --global pnpm@11.7.0`. Harness native dependencies may also need your OS compiler/Python toolchain; see the [pinned upstream setup](https://github.com/deepseek-ai/deepseek-harness/tree/dsh-v0.1.3-alpha.1).

### Prepare the harness once

From the Bendo repository root:

```bash
git clone --branch dsh-v0.1.3-alpha.1 --depth 1 https://github.com/deepseek-ai/deepseek-harness.git deepseek-harness
node -e "require('node:fs').cpSync('desktop/packaging/bendo-agent(doro)', 'deepseek-harness/bendo-agent(doro)', { recursive: true })"
cd deepseek-harness
pnpm install --frozen-lockfile
pnpm run build
```

The pinned tag matches the harness revision used by Bendo's existing packaging workflow. Copy the tracked Doro overlay as shown; cloning the upstream harness alone does not add Bendo tools. Do not substitute upstream `master` without checking compatibility.

### Web through Docker

Generate a local shared secret, for example:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Copy that value into `DSH_CHAT_BRIDGE_SECRET` in **both** files:

- `bendo-app/.env.local` — also set `DSH_CHAT_BRIDGE_URL=http://host.docker.internal:3080/bendo-chat`.
- `deepseek-harness/.env` — create this file if absent, with `DSH_CHAT_BRIDGE_SECRET=<the same generated value>`.

Keep the secret private and do not commit either file. The Docker Desktop host address is for the Next.js container; a host-run Next.js server instead uses `http://127.0.0.1:3080/bendo-chat`.

With the web app running, open another terminal at the Bendo repository root:

```bash
cd deepseek-harness
pnpm dsh web --patch './bendo-agent(doro)/cordis.yml' --no-open
```

Keep this terminal running. If you changed the web environment, restart its service from the Bendo repository root:

```bash
docker compose -f bendo-app/compose.yaml restart web-app
```

Open Agent in the web app, configure provider/endpoint/API key/model, then Save before chatting. The browser caches configuration for the current tab; it does not use Electron's encrypted desktop configuration file.

### Desktop with automatic startup

Stop Docker web and any manually started harness before switching to the [desktop source workflow](../README.md#2b-run-the-desktop-app-from-source).

After the one-time preparation above, `npm start` in `desktop/` can spawn the harness itself. Electron injects bridge credentials into its Next.js/harness children, uses `userData/dsh` as the harness settings home, and re-applies saved model configuration when ready. No manual shared-secret copy is needed for this auto-start path.

Configure and save your model in the desktop Agent before chatting. Manually started web harnesses and Electron-spawned harnesses can use different settings homes; do not assume switching modes carries the model selection over automatically.

### Check what is running

From the host, these probes should return successful JSON responses:

```bash
curl --fail http://127.0.0.1:3000/api/health
curl --fail http://127.0.0.1:3080/bendo-chat
```

These probes confirm process liveness, not database access, model credentials, or a completed chat turn. If chat is offline, inspect the harness terminal and web logs, confirm the same bridge secret on both sides for Docker, and save a valid model configuration.

---

## 1. Chat path

- Default: **Browser → Next.js (Bendo) → harness chat-bridge** (`DSH_CHAT_BRIDGE_URL` + `DSH_CHAT_BRIDGE_SECRET`).
- The Next **server** owns the bridge call. Never put the bridge secret, harness tokens, or Supabase service role in Client Components.
- Keep the Agent boundary in `lib/agent/*`. Pages must not import harness process code.
- Without a reachable bridge, Agent UI may still render but chat stays offline.
- Docker Compose may reach host harness via `host.docker.internal` (see `.env.example`).
- `DSH_CHAT_BRIDGE_*` is **local machine-only**. Not part of the Vercel secret set; not fetched from or stored on Vercel. Cloud secrets are unrelated to the chat-bridge contract.

## 2. Discord vs Agent chat

- Settings Connect Discord / `discord_identities` support a future Discord channel — not required for Agent chat via the bridge.
- Discord Gateway / public bot hosting is deferred (root AGENTS). Do not couple page components to Discord bot code.
- Identity detail: [`bendo-app-discord-identity.md`](./bendo-app-discord-identity.md).

## 3. User model API key UI

Button on Agent chat opens UI for the user to add **their** model config. Bendo does not ship a provider key in the client, installer, or `NEXT_PUBLIC_*`.

- Control on Agent chat (`components/agent/`, `app/(app)/agent`) — additive, not a replacement for the composer.
- Collect: **Provider**, **API endpoint**, **API key**, **Model name**, with per-provider instructions.
- Supported providers: **OpenRouter**, **Vilao**, **GPT**, **Gemini** only — no free-form provider names.
- User-owned credential: do not prefill from server/harness/Vercel env; do not log raw key, echo full key, or return it from an API; mask while typing.

### Test connection

- `POST /api/agent/model-connection` on Next server: minimal chat ping (15s) + optional `/models` (5s). **Not** via harness bridge.
- Map upstream failures to classified Vietnamese messages (`API key không hợp lệ`, `Tài khoản hết credit`, `Model không tồn tại`, `Đang bị giới hạn tốc độ, thử lại sau`, `Provider đang lỗi, thử lại sau`).
- SSRF: `https` only; hostname in per-provider allowlist (`openrouter.ai`, `api.vilao.ai`, `api.openai.com`, `generativelanguage.googleapis.com`); no redirects; clear API key when provider changes.

### Configure then use / Save

- User enters config → optional Test → **Save**. Save applies to harness **before** chat — not by attaching credentials to each chat message.
- `POST /api/agent/model-config`: Clerk + Zod + allowlist → bridge `{ action: "applyModelConfig", provider, endpoint, apiKey, model }`.
- Harness apply writes credentials, `$DSH_HOME/settings.yaml` → `llm-pi-ai.providers.<route>`, and `agent-default-model` selection (see `bendo-agent(doro)/chat-bridge.ts` + cordis comments).
- Chat turns **require** apply first for a real agent turn; without apply the bridge returns a Doro soft chat reply (not hard error UI) and does not fall back to cordis default with a shipped provider key.
- Do **not** attach model secrets to chat-turn bodies (`message`, `sessionId`, `clerkToken`, … only).

### Persist

- Desktop: preload IPC → `userData/model-config.json` + `safeStorage` for the key; main re-applies when harness ready. Not in Supabase, Vercel, or installer.
- **sessionStorage** = same-tab cache / only client store when not in Electron.
- **Save pass = apply ∧ persist** (desktop). Apply single-shot (no auto-retry); surface error; do not persist on apply fail. Persist fail after apply → bounded persist retry. No “đã lưu” on partial success. Prefer apply then persist.
- Out of scope: SQLite (unless multi-profile later); cloud sync of provider keys; model secrets on chat-turn requests.
