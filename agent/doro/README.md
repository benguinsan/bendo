# 🤖 Doro agent overlay

Starter DeepSeek Harness overlay for Bendo Agent chat. Customize freely (`cordis.yml`, persona markdown, model, secrets).

## Files

| File | Role |
| --- | --- |
| `cordis.yml` | Model, web search, tools, chat bridge |
| `persona.ts` + `*.md` | Personality, operations, safety |
| `tools.ts` / `bendo-api.ts` | Bendo API tools |
| `chat-bridge.ts` | `POST /bendo-chat` for `bendo-app` |

---

## Self-host (for Agent chat)

### 1. Clone harness

```bash
git clone https://github.com/deepseek-ai/deepseek-harness.git
cd deepseek-harness
pnpm install
```

### 2. Add this overlay

```bash
# from the Bendo repo root
cp -R agent/doro /path/to/deepseek-harness/doro
```

### 3. Configure (optional)

Edit `doro/cordis.yml` as needed:

- Chat model → `agent-default-model`
- Web search → `web` / `web-search-deepseek` (separate from chat)
- Bridge secret → `bendo-chat-bridge.config.secret`
- Persona → `personality.md`, `operations.md`, `safety.md`

### 4. Start

```bash
pnpm dsh web --patch './doro/cordis.yml'
```

Bridge: `http://127.0.0.1:3080/bendo-chat`

### 5. Connect Bendo

In `bendo-app/.env.local`, pick **one** URL:

**Local** (`npm run dev`):

```bash
DSH_CHAT_BRIDGE_URL=http://127.0.0.1:3080/bendo-chat
DSH_CHAT_BRIDGE_SECRET=<same as cordis bridge secret>
```

**Docker** (`docker compose up`):

```bash
DSH_CHAT_BRIDGE_URL=http://host.docker.internal:3080/bendo-chat
DSH_CHAT_BRIDGE_SECRET=<same as cordis bridge secret>
```

Optional: `DEEPSEEK_API_KEY` if using default DeepSeek web search; `BENDO_API_BASE_URL=http://localhost:3000` for tools.
