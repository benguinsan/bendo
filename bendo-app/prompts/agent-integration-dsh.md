# Agent chat → Doro (dsh) via Next.js proxy

## Goal

Wire bendo-app’s existing `/agent` chat UI to **Doro** running in DeepSeek Harness by using **Direction 1**: the browser talks only to bendo `POST /api/agent/...`; the Next.js server proxies to a dsh Host that loads `bendo-agent(doro)`.

This pass establishes the **Agent boundary**, a **server-only Doro/dsh adapter**, thin API routes, and UI send → assistant reply (request/response first). Full token streaming, chat persistence in Supabase, audio messages, and iframe embedding are **out of scope**.

## Skills read

- `AGENTS.md` (Agent boundary must not couple page components or Supabase directly; thin API routes; Clerk auth; env table; prompt workflow; checks)
- `.agents/skills/clerk/SKILL.md` → `clerk-nextjs-patterns` + API routes (`requireApiUser` / session JWT for tool auth)
- `.agents/skills/supabase/SKILL.md` — **not** for chat tables this pass (no new chat schema)
- `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md` (Route Handlers)
- DeepSeek Harness (read-only reference, do not vendor into page components):
  - `deepseek-harness/docs/api-gateway.md` — Client/Host Remotes use `/api/remote.mux` WebSocket (heavy for first cut)
  - `deepseek-harness/packages/api/session-controller` — `session.prompt` / followup semantics
  - `deepseek-harness/bendo-agent(doro)/*` — persona, tools, `BENDO_API_*`, `cordis.yml`
  - `deepseek-harness/packages/webhook/webhook` — fire-and-forget; **not** suitable as the chat reply path (no completion payload)

AI SDK skill is **not** required for this direction (runtime stays dsh).

## Existing code inspected

- `app/(app)/agent/page.tsx` — authenticated page → `AgentView` + Clerk profile
- `components/agent/*` — presentational chat; `AgentView.handleSend` only appends local user messages
- `lib/agent/types.ts`, `lib/agent/mock-messages.ts` — local `ChatMessage` model + fixtures
- `lib/api/require-api-user.ts`, `lib/api/respond.ts`, `app/api/tasks/route.ts` — API auth + JSON helpers pattern
- `env.ts` / `.env.example` — no dsh URLs yet
- `deepseek-harness/bendo-agent(doro)/cordis.yml` — Doro patch (persona, tools, default model); run via `pnpm dsh web --patch './bendo-agent(doro)/cordis.yml'`
- `deepseek-harness/bendo-agent(doro)/tools.ts` + `bendo-api.ts` — tools call bendo `/api/*` with `Authorization: Bearer <Clerk JWT>`

## Decisions or assumptions

1. **Direction 1 only.** Browser never calls dsh directly. No iframe of `:3080`.
2. **Agent boundary interface** lives under `lib/agent/` (e.g. `AgentRuntime` / `sendChatTurn`). Page components depend on this interface + a thin client fetch helper — not on dsh types, cordis, or harness packages.
3. **First concrete adapter = Doro over HTTP bridge on the dsh Host**, not a full Typert WebSocket client inside Next.js.
   - Reason: dsh’s native Client path is `/api/remote.mux` + generated Remotes; shipping that from a Next route is high cost and couples builds.
   - Add a **small trusted HTTP ingress plugin** in `deepseek-harness/bendo-agent(doro)/` (e.g. `chat-bridge.ts`) registered from `cordis.yml`, that:
     - Accepts `POST` with `{ message, sessionId?, clerkToken }` (plus optional auth shared secret).
     - Creates or resumes one Session/Agent for that conversation.
     - Injects `clerkToken` into the process/tool config used as `BENDO_API_TOKEN` **for that turn** (prefer per-request override over mutating global env long-term).
     - Admits the user prompt (`followup` / equivalent), **waits until the agent is idle**, returns `{ sessionId, replyText }` (and optional error).
   - Bind the route only on localhost / private network in docs; protect with `DSH_BENDO_CHAT_SECRET` (or similar) shared with bendo server env.
4. **bendo proxy route:** `POST /api/agent/chat` (preferred convention; create resource-like turn).
   - `requireApiUser()`; reject 401 if unauthenticated.
   - Validate body with Zod: `{ message: string (trimmed, max length), sessionId?: string }`.
   - Obtain a Clerk session JWT suitable for Bearer calls to bendo APIs (same token Doro tools need). Prefer `auth().getToken()` / documented Clerk server session token — do **not** put the token in the browser→dsh path.
   - Call `AgentRuntime.sendTurn({ userId, message, sessionId, clerkToken })` → dsh bridge.
   - Return `{ data: { sessionId, reply: { id, role: "agent", kind: "text", body, createdAt } } }` matching existing respond helpers.
5. **UI:** On send, append user bubble immediately; show a simple “Doro is typing…” / disabled composer while waiting; on success append agent text bubble; on failure show an inline error (no toast library required — reuse muted error text near composer if no shared pattern exists). Persist `sessionId` in React state for follow-ups in the same page visit (memory only; no Supabase chat table).
6. **Fixtures:** Keep mock seed messages for empty-state polish **or** start with an empty thread once live — pick **empty thread + short welcome agent text from Doro on first successful open is optional**. Default: **clear mock conversation when live mode is enabled**; if `DSH_CHAT_BRIDGE_URL` is unset, keep current mock-only send (dev fallback) **or** show a clear “Agent offline” error. Prefer: **live required when env set; otherwise show error on send** so we do not silently pretend AI works.
7. **Env (server-only):**
   - `DSH_CHAT_BRIDGE_URL` — e.g. `http://127.0.0.1:3080/bendo-chat` (exact path owned by the bridge plugin)
   - `DSH_CHAT_BRIDGE_SECRET` — shared secret header
   - Optional: `DSH_CHAT_TIMEOUT_MS` (default ~120000)
   - Update `env.ts` + `.env.example` + `AGENTS.md` env table
8. **No Supabase chat persistence** this pass. No changes to `tasks` / `categories` schema.
9. **Streaming** is Phase 2 (SSE from Next while bridge streams). This pass is **one JSON reply per turn**.
10. **Do not** import `@deepseek-ai/*` into client components. Server adapter may use `fetch` only to the bridge (preferred) so bendo-app does not need to depend on the harness monorepo packages.
11. Audio bubble / attach / emoji stay presentational.

## Architecture (target)

```
[AgentView] --POST JSON--> [/api/agent/chat]
                               | requireApiUser + Clerk JWT
                               v
                     [AgentRuntime / DshChatAdapter]  (server-only)
                               | secret + message + sessionId + clerkToken
                               v
                     [dsh Host :3080 + Doro patch]
                               | tools use JWT → bendo /api/tasks…
                               v
                     { sessionId, replyText }
```

## Files likely to change

**bendo-app**

- `lib/agent/types.ts` — extend with turn request/result types if needed
- `lib/agent/agent-runtime.ts` — interface + factory
- `lib/agent/dsh-chat-adapter.ts` — `fetch` to bridge (server-only)
- `lib/agent/chat-api-client.ts` — browser helper calling `/api/agent/chat`
- `app/api/agent/chat/route.ts` — thin POST handler
- `components/agent/agent-view.tsx` — wire send + loading + sessionId + agent reply
- `components/agent/chat-composer.tsx` — optional `disabled` / busy prop
- `env.ts`, `.env.example`
- `AGENTS.md` — env table row for dsh bridge vars
- `prompts/agent-integration-dsh.md` — this file

**deepseek-harness/bendo-agent(doro)**

- `chat-bridge.ts` (or similar) — HTTP ingress plugin using Host webServer / existing HTTP registration pattern in harness
- `cordis.yml` — insert bridge plugin + config (`path`, `secret`)
- Brief comment in `cordis.yml` header on required env (`BENDO_API_BASE_URL` still used as tool base; per-request JWT from bridge)

Do **not** change unrelated task pages or shell nav.

## Implementation requirements

1. Discover how `dsh web` registers HTTP routes (`ctx.webServer` / host-webserver). Match that pattern for the bridge; do not invent a second HTTP stack.
2. Bridge must wait for agent idle / final assistant text before responding; document timeout behavior (504 upstream → 504/502 from Next).
3. Map bridge failures to stable API errors (`AGENT_UNAVAILABLE`, `VALIDATION`, `UNAUTHORIZED`) via existing `jsonError` / `fromServiceResult` style.
4. Escape plain text only in UI (existing rule).
5. Session continuity: same `sessionId` for subsequent messages in one browser tab; new page load may start a new session (acceptable).
6. Security:
   - Bridge rejects missing/invalid shared secret.
   - Bridge rejects empty message.
   - Never log full JWTs.
   - Never expose `DSH_CHAT_BRIDGE_SECRET` or service-role keys to the client.
7. Manual smoke path documented in acceptance + test steps.

## Security requirements

- Clerk gate on `/api/agent/chat`.
- Shared secret on bendo→dsh bridge.
- Per-user Clerk JWT only used server-side for Doro tools calling back into bendo APIs.
- No `dangerouslySetInnerHTML`.
- Do not commit secrets.

## Acceptance criteria

- With dsh running Doro patch + bridge, and bendo env configured, a signed-in user can send a message on `/agent` and receive a Doro text reply in the same thread.
- A second message in the same visit reuses `sessionId` (multi-turn).
- Browser network tab shows only `/api/agent/chat` (not `:3080`).
- Without bridge URL/secret (or dsh down), send fails with a clear error; no fake local “AI” reply.
- Doro tools can still call bendo `/api/tasks` when JWT is valid (verify with a prompt that lists tasks, if token + app are up).
- `npm run typecheck` and `npm run lint` pass in `bendo-app/`.
- Bridge plugin loads via existing `pnpm dsh web --patch './bendo-agent(doro)/cordis.yml'`.

## Checks to run

From `bendo-app/`:

- `npm run typecheck`
- `npm run lint`
- `npm run format` if needed

From `deepseek-harness/` (smoke only):

- Start `pnpm dsh web --patch './bendo-agent(doro)/cordis.yml'` and confirm bridge route responds to a secret-authenticated curl with a trivial message (or fails loudly if model/provider misconfigured).

## Manual test steps

1. Start bendo-app (`npm run dev` or docker compose) with Clerk + Supabase working.
2. Set `DSH_CHAT_BRIDGE_URL`, `DSH_CHAT_BRIDGE_SECRET` in bendo `.env.local`.
3. From harness root, export `BENDO_API_BASE_URL=http://localhost:3000` and run dsh with Doro patch (bridge inserted).
4. Sign in → open **Agent** → send “Xin chào”.
5. Confirm user bubble then agent bubble; confirm DevTools only hits `/api/agent/chat`.
6. Send a follow-up; confirm continuity.
7. Stop dsh; send again; confirm error state in UI.
8. (Optional) Ask Doro to list tasks; confirm tools hit bendo API with the forwarded JWT.

## Out of scope / Phase 2+

- SSE/token streaming into bubbles
- Supabase-persisted chat history
- Embedding dsh GUI
- Audio/file/emoji real handling
- Replacing Doro tools with AI SDK
