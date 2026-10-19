# Bendo-app — Agent chat & user model config

On-demand rules for Doro / chat-bridge and the Agent model-config UI. **Always-on summary:** [`bendo-app/AGENTS.md`](../bendo-app/AGENTS.md) §6.

**Also read:**

- [`agent-model-config-save-workflow.md`](./agent-model-config-save-workflow.md) — Save = apply ∧ persist
- [`agent-model-connection-hardening.md`](./agent-model-connection-hardening.md) — Test connection / SSRF
- [`agent-model-dynamic-route-ab.md`](./agent-model-dynamic-route-ab.md) — harness apply route
- Desktop persist: [`../desktop/AGENTS.md`](../desktop/AGENTS.md), root [`../AGENTS.md`](../AGENTS.md)

Desktop shell / Electron packaging is **out of scope** here — root / `desktop/AGENTS.md`.

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
