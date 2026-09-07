# Agent chat UI

## Goal

Replace the title-only stub at `/agent` with the **Agent chat** screen from `prompts-img/Frame 2424.png`: a conversation header, scrollable message history (date separators, text bubbles, one audio bubble), and a bottom composer, inside the existing authenticated app shell.

This pass is **pixel-faithful presentational UI + mock chat fixtures + local send**. Do **not** wire Vercel AI SDK, OpenRouter, streaming, Supabase chat tables, DeepSeek harness, voice recording/playback of real audio files, attachments, emoji picker, or Settings.

## Skills read

- `AGENTS.md` (product scope — presentational Agent UI; Agent boundary must stay replaceable; prompt workflow; checks; escaped plain text)
- `.agents/skills/clerk/SKILL.md` → `clerk-nextjs-patterns` (server vs client; page stays behind existing `requireUser()` / app layout)
- `.claude/skills/shadcn/SKILL.md` plus `rules/styling.md`, `rules/composition.md`, `rules/icons.md` (semantic tokens, `gap-*`, `size-*`, `cn()`, lucide, Avatar/Button/Input composition, `data-icon`, no `space-y-*`)
- `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/12-images.md`
- `prompts/design-system.md` (canonical tokens in `app/globals.css`)
- `prompts/my-task.md` (shell reuse, mock-data rules, presentational menus)

Supabase schema changes and AI SDK are **not** needed. Clerk stays plumbing-only (authenticated page + user avatar/name for the “sent” side).

## Existing code inspected

- `app/(app)/layout.tsx` — shared shell; `dynamic = "force-dynamic"`; Clerk profile via `toDashboardProfile`
- `app/(app)/agent/page.tsx` — `StubPage` titled “Agent” (replace contents; keep route and `metadata.title`)
- `components/app-shell/*` — header, coral sidebar, pathname nav (`/agent` already exists with `BotMessageSquareIcon`). **Do not rebuild the shell.**
- `components/app-shell/stub-page.tsx` — current Agent placeholder
- `lib/auth/to-dashboard-profile.ts` / `lib/dashboard/task-types.ts` — `DashboardProfile` (`fullName`, `avatarSrc`, `initials`, …)
- `app/globals.css` — coral primary, canvas `#f5f8ff`, `--date-accent` / `--priority-moderate` blues, `--radius-card` 14px, `shadow-panel`
- `components/ui/*` — `button`, `avatar`, `input`, `card`, `dropdown-menu`, `separator`. Prefer these over new primitives.
- `prompts-img/Frame 2424.png` — visual source of truth for this pass
- `prompts-img/doro.jpeg` — Doro agent avatar asset (copy into `public/`, do not hotlink from `prompts-img/`)
- `deepseek-harness/bendo-agent(doro)/personality.md` — agent identity is **Doro** (not “Leslie Alexander”); harness stays out of this pass
- `package.json` — Next 16, React 19, no `ai` / AI SDK package yet

## Decisions or assumptions

1. **Route stays `/agent`.** Keep `metadata.title` as `Agent · bendo`. Do not add nested chat routes or thread IDs.
2. **Reuse the existing shell.** Header and sidebar stay as-is. Nav already highlights Agent. Do **not** add Settings or Help.
3. **Presentational Agent UI only.** No `/api/agent`, no AI SDK, no Supabase chat persistence, no DeepSeek harness coupling. Keep a thin local message model so a future Agent boundary can replace fixtures later without rewriting the view layout.
4. **Agent identity is Doro**, not the mock’s “Leslie Alexander / Web Designer”:
   - Display name: **Doro**
   - Subtitle: **Task assistant** (or **Bendo assistant** — pick one; default **Task assistant**)
   - Avatar: `public/agent/doro.jpeg` (copy from `prompts-img/doro.jpeg`)
5. **User side** uses the authenticated `DashboardProfile` (avatar + name for sent bubbles). Pass profile from the server page into the client view.
6. **Mock conversation** seeds the thread to match the PNG structure (two date groups, agent text, user text, agent audio, agent text). Copy may be Doro-flavored Vietnamese/English task help rather than the mock’s placeholder lorem — keep bubble lengths similar so layout matches.
7. **Local send only.** Composer appends a **user** text message with the current time. Do **not** invent an AI reply in this pass (no fake streaming). Empty submit is a no-op. Clear the input after send. Auto-scroll to the latest message after send / on mount.
8. **Audio bubble is visual-only.** Render the play button, duration `0:56`, and waveform progress (~40% filled) like the PNG. Play is a `type="button"` with `aria-label`; no `<audio>`, no media fetch. Do not install waveform libraries — SVG or simple CSS bars are enough.
9. **Attachment and emoji** icons are presentational (`type="button"`, no pickers). **Header `⋯`** is presentational (optional inert `DropdownMenu` with no actions, or a ghost icon button only).
10. **Color mapping (mock blues → tokens).** The PNG uses blue accents, not coral. Map without raw hex:
    - Send button / play button / received-bubble border / waveform progress → `bg-date-accent` / `border-date-accent` / `text-date-accent` (or `priority-moderate` if date-accent is too light for fill — prefer the stronger blue for filled controls)
    - Sent bubble fill → light tint of that blue (`bg-date-accent/15` or similar)
    - Do **not** restyle the coral app shell primary for this page
    - Do **not** add new CSS tokens unless existing ones cannot express the sent-bubble tint; prefer opacity modifiers on `--date-accent` / `--priority-moderate`
11. **Do not paste absolute-positioned Figma/export code.** Adapt to App Router + tokens + flex/grid.
12. Leave `proxy.ts`, `env.ts`, Button CVA defaults, and shell files alone. Touch `app/globals.css` only if a chat-specific token is truly required (prefer not to).
13. Do not install Sidebar, Sheet, ScrollArea, emoji, or audio libraries. Prefer `overflow-y-auto` for the message list.
14. Render all message strings as **escaped plain text** (React text nodes). No `dangerouslySetInnerHTML`, no markdown renderer in this pass.

## Visual interpretation

Canonical reference: `prompts-img/Frame 2424.png`. Light mode. Semantic token classes only (`bg-card`, `text-foreground`, `text-muted-foreground`, `text-body`, `border-date-accent`, `bg-date-accent`, `rounded-card`, `shadow-panel`, `font-sans`). Never raw Tailwind palette colors (`blue-500`, etc.) or hardcoded hex in components.

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER (existing)                                           │
├──────────────┬──────────────────────────────────────────────┤
│ SIDEBAR      │  canvas bg-background                         │
│ (existing)   │  padding ~24–32px                             │
│ Agent pill   │  ┌──────────────────────────────────────────┐│
│ active       │  │ Chat panel (bg-card, rounded-card,       ││
│              │  │  shadow-panel, flex col, fill height)    ││
│              │  │  ┌ header: avatar + name + subtitle + ⋯ ┐││
│              │  │  ├ messages (scroll)                     │││
│              │  │  │  date · agent · user · audio · …      │││
│              │  │  ├ composer (input + icons + send)       │││
│              │  │  └──────────────────────────────────────┘││
│              │  └──────────────────────────────────────────┘│
└──────────────┴──────────────────────────────────────────────┘
```

- Main content: one white chat panel filling remaining viewport height (`h-full` / `min-h-0` flex column inside main). Soft outer padding so the panel sits on the canvas like other pages.
- Panel: `bg-card`, `rounded-card` (14px), `shadow-panel`, thin border if the PNG needs it, inner horizontal padding ~20–24px.
- Column structure: **header (shrink-0) → messages (flex-1 min-h-0 overflow-y-auto) → composer (shrink-0)**.
- Below `md`: same single column; reduce padding; keep composer usable above the mobile home indicator.

### Header

| Element | Spec |
| --- | --- |
| Avatar | Circular ~40–48px, Doro image, object-cover |
| Name | Inter semibold/medium ~16px, `text-foreground` — **Doro** |
| Subtitle | ~12–13px, `text-muted-foreground` — **Task assistant** |
| Menu | Vertical ellipsis (`EllipsisVertical`), muted, top-right; presentational |

### Date separators

- Centered label (e.g. `August 21`) between two thin horizontal rules (`Separator` or `border-t`), ~12px `text-muted-foreground`.
- Vertical spacing between date groups and messages matches the PNG (comfortable, not cramped).

### Messages

| Kind | Alignment | Bubble | Avatar | Timestamp |
| --- | --- | --- | --- | --- |
| Agent text | Left | White fill, thin `border-date-accent` (or priority-moderate), rounded ~10–12px, padding ~12–14px, `text-body` ~14px | Doro left of bubble, top-aligned | Below bubble, left, ~11–12px muted (`10:15 pm`) |
| User text | Right | Soft blue fill (`bg-date-accent/15`), no border (or very subtle), same radius/padding | User avatar right of bubble, top-aligned | Below bubble, right-aligned |
| Agent audio | Left | Wider pill/rounded rect, blue border; circular filled play control (`bg-date-accent`); duration under play; waveform with ~40% progress tint | Doro | Below, left |

- Max bubble width ~65–75% of panel so long text wraps like the mock.
- Consecutive same-side messages keep avatar alignment; do not collapse avatars unless it clearly matches the PNG (PNG shows avatar on each row — keep avatar per row).
- Use lucide `Play` (filled look via button styling), not a custom icon font.

### Composer

| Element | Spec |
| --- | --- |
| Field | Full-width row: bordered rounded input (~44–48px tall), placeholder **Write a message...** |
| Icons | Paperclip + Smile, muted, inside or immediately right of the field (match PNG: inside the field on the right) |
| Send | Square ~40–44px, `rounded-lg`, `bg-date-accent` (or stronger blue token), white paper-plane icon (`Send` / `SendHorizontal`), `aria-label="Send message"` |
| Behavior | Enter submits (Shift+Enter optional: not required). Disabled or no-op when trimmed empty. |

### Responsiveness

- Desktop: panel fills main workspace under header.
- Mobile: full-width panel with reduced horizontal padding; composer stays sticky at the bottom of the panel (not the viewport outside the panel).
- Touch targets for play / send / icon buttons ≥ 40px where practical.

## Fixture content (structure must match PNG)

Seed messages in `lib/agent/mock-messages.ts` (or similar):

1. **August 21**
   - Agent text (long paragraph about helping with tasks) — morning/evening times as in PNG spirit (`10:15 pm`)
   - User short reply (`12:15 pm`)
   - Agent audio `0:56` (`06:00 pm`) — visual only
2. **August 22**
   - Agent short text (`06:00 pm`)

Ids, `role: "agent" | "user"`, `kind: "text" | "audio"`, `createdAt` ISO, optional `durationLabel` for audio. Format times with a small helper (`en-US` lowercase `am`/`pm` like the PNG, or `format` via `Intl.DateTimeFormat`).

New user messages from the composer use `role: "user"`, `kind: "text"`, `createdAt: new Date().toISOString()`, and group under today’s date separator (insert separator if the last group is a different calendar day).

## Files likely to change

- `app/(app)/agent/page.tsx` — load profile, render `AgentView`
- `components/agent/agent-view.tsx` — client chat shell (header, list, composer state)
- `components/agent/chat-header.tsx` — Doro header row
- `components/agent/chat-message-list.tsx` — date groups + scroll container
- `components/agent/chat-message-bubble.tsx` — text bubble (agent/user)
- `components/agent/chat-audio-bubble.tsx` — visual audio row
- `components/agent/chat-composer.tsx` — input + icons + send
- `lib/agent/mock-messages.ts` — fixtures + types + time/date format helpers
- `public/agent/doro.jpeg` — copied from `prompts-img/doro.jpeg`
- Optionally thin `lib/agent/types.ts` if types should stay separate from fixtures

Do **not** change shell nav labels, Dashboard, My Task, Vital Task, Categories, Calendar, or API routes in this pass.

## Implementation requirements

1. Server `AgentPage`: `await requireUser()` (or rely on layout — keep consistent with other pages that call it), pass `toDashboardProfile(user)` into `AgentView`.
2. Client `AgentView` owns `messages` state initialized from fixtures; composer appends user messages only.
3. Message list scrolls to bottom on mount and when `messages.length` increases (`ref` + `scrollIntoView` or `scrollTop = scrollHeight`).
4. Accessibility: chat region `aria-label="Conversation with Doro"`; composer form with labeled input (`sr-only` or `aria-label`); send and play have `aria-label`s.
5. Images: `next/image` for Doro and user avatars where practical; local `/agent/doro.jpeg` and Clerk `avatarSrc` (remote Clerk images may need existing `images.remotePatterns` — reuse whatever Dashboard/sidebar already uses, or fall back to `AvatarImage` like the sidebar).
6. Keep components small and presentational; no business logic beyond local append + formatters.
7. Prefer existing `Button`, `Avatar`, `Input`, `Separator`.

## Security requirements

- No service-role keys or secrets in client code.
- No `dangerouslySetInnerHTML` for message bodies.
- Do not persist chat to Supabase or localStorage in this pass (in-memory only).
- Do not call external LLM endpoints.

## Acceptance criteria

- `/agent` shows the chat UI matching Frame 2424 layout (header, dated messages, audio row, composer), not `StubPage`.
- Agent is labeled **Doro** / **Task assistant** with the Doro avatar.
- User bubbles use the signed-in profile avatar.
- Blues use design tokens (`date-accent` / `priority-moderate`), not raw hex or `blue-*` utilities.
- Sending a non-empty message appends a right-aligned user bubble and clears the input; no fake agent reply.
- Audio play / attach / emoji / `⋯` do not navigate or throw.
- Shell header + sidebar still work; Agent nav item stays active.
- `npm run typecheck` and `npm run lint` pass from `bendo-app/`.

## Checks to run

From `bendo-app/`:

- `npm run typecheck`
- `npm run lint`
- `npm run format` if lint reports format issues
- `npm run build` only if page/server imports break the build unexpectedly

## Manual test steps

1. Sign in and open **Agent** from the sidebar.
2. Confirm header shows Doro + Task assistant + avatar; `⋯` is visible and inert.
3. Confirm August 21 / August 22 separators and the four seeded rows (text, text, audio, text) layout like the PNG (sides, borders, timestamps).
4. Confirm the audio row shows play, `0:56`, and partial waveform; clicking play does nothing harmful.
5. Type a message and click Send (and try Enter): message appears on the right with your avatar and a timestamp; input clears.
6. Submit empty message: nothing is added.
7. Resize to mobile width: panel and composer remain usable; messages scroll independently of the shell header.
8. Navigate away and back: fixtures reset (in-memory; expected for this pass).
