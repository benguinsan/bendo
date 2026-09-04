# Authenticated Dashboard UI

## Goal

Implement the **home Dashboard** from `prompts-img/Dashboard.jpg` (same layout as Figma frame `16:35` in [To-do List Web App Design (Community)](https://www.figma.com/design/JkIeeSKseY4NO9FyC6WTV6/To-do-List-Web-App-Design--Community-?node-id=16-35)). Replace the create-next-app starter at `/` with:

1. A shared **app shell** (top header + coral sidebar) matching the mock.
2. The **Dashboard page** (greeting, To-Do column, Task Status donuts, Completed Task list).

This pass is **pixel-faithful UI + mock task data**. Do **not** add Supabase, task CRUD APIs, sign-in/sign-up pages, Clerk route protection, Settings, or full My Task / Vital Task / Categories / Calendar product pages.

## Skills read

- `AGENTS.md` (product scope, architecture layers, prompt workflow, checks)
- `.agents/skills/clerk/SKILL.md` → `clerk-nextjs-patterns` (server vs client, `proxy.ts` public-first) and `clerk-setup` (`ClerkProvider` placement)
- `.claude/skills/shadcn/SKILL.md` plus `rules/styling.md`, `rules/composition.md`, `rules/icons.md` (semantic tokens, `gap-*`, `size-*`, `cn()`, lucide, Card/Avatar/Badge composition)
- `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/04-linking-and-navigating.md` (`Link`)
- `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/layout.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route-groups.md`
- `prompts/design-system.md` (canonical Figma tokens already in `app/globals.css`)

Supabase and AI SDK are **not** needed. Clerk is installed but still plumbing-only (`proxy.ts`, optional env keys, no `ClerkProvider`).

## Existing code inspected

- `app/globals.css` — coral primary `#ff6767`, canvas `#f5f8ff`, sidebar coral + white active pill, status/priority/date tokens, `--radius` 8px, `--radius-card` 14px, `shadow-header` / `shadow-sidebar` / `shadow-panel`
- `app/layout.tsx` — Inter `--font-sans`, Montserrat `--font-heading`, Geist Mono; no `ClerkProvider`
- `app/page.tsx` — create-next-app starter (replace)
- `components/ui/button.tsx` — only installed shadcn primitive (Base UI + CVA); default coral, outline Invite-style
- `components.json` — `base-nova`, Tailwind v4, `iconLibrary: lucide`
- `proxy.ts` — `clerkMiddleware()` with **no** `auth.protect()`
- `env.ts` — Clerk keys **optional** so local/docker boot without keys
- `package.json` — Next 16, React 19, `@clerk/nextjs` v7, no Supabase, no Recharts
- `prompts-img/Dashboard.jpg` — visual source of truth for this pass
- No `app/(app)` route group, no dashboard components, no task services

## Decisions or assumptions

1. **Route:** Dashboard is `/`. Use a route group `app/(app)/` so the shell wraps Dashboard and future product pages, without putting `dashboard` in the URL.
2. **No auth wall.** Do not call `auth.protect()`, do not add `ClerkProvider`, do not add `/sign-in` or `/sign-up`. Keys are optional; wrapping Clerk now would break local boot. Profile name/email/avatar are **mock data** matching the screenshot (`Sundar Gurung` / `sundargurung360@gmail.com`). Logout is a visible control with no Clerk `signOut` yet.
3. **Mock tasks only.** Typed fixtures in `lib/dashboard/` (or similar). No API routes, no Supabase client, no `tasks` table. Dashboard statistics are **derived in JS from the mock list** (AGENTS.md: no statistics tables).
4. **Personal-first Invite row:** Keep the overlapping avatars + `+ Invite` control so the page matches the attached UI. Invite is presentational (`type="button"`, no Clerk orgs, no invite API). Avatars are static local images or initials fallbacks.
5. **Search / Add task / card menus / bell / calendar:** Presentational. Header search does not filter. `+ Add task` does not open a form. Card `⋯` is a `DropdownMenu` with inert items (`Edit`, `Delete`) that do nothing. Calendar icon `Link`s to `/calendar`. Bell is a button with no panel.
6. **Nav destinations:** Sidebar links must not 404. Add **minimal stub pages** in the same shell that render only a page title (no fake task UIs). Routes:
   - `/` Dashboard (this prompt)
   - `/vital-task`
   - `/my-task`
   - `/task-categories`
   - `/agent` (occupies the mock’s **Help** nav slot; href is `/agent`, not `/help`. Label stays **Help** to match the screenshot. Stub only — no chatbot.)
   - `/calendar` (header calendar icon; **not** a sidebar item)
   - **No Settings.** Do not add a Settings nav item, `/settings` route, or Settings stub. There must be **no** `/settings` path.
7. **Do not use shadcn `Sidebar`.** The mock is a custom coral inset panel, not the default shadcn sidebar inset app. Compose `AppSidebar` + `AppHeader` with tokens.
8. **Donut charts:** SVG or CSS `conic-gradient` rings. Do **not** install Recharts / shadcn Chart for three static rings.
9. **Install only the shadcn primitives this page needs** via `npx shadcn@latest add` from the project’s default registry (`@shadcn` implied by existing `components.json`): `avatar`, `card`, `dropdown-menu`, `input`, `badge`, `separator`. Add `input-group` only if the search control cannot be composed from `Input` + `Button` without fighting layout. Do not add Sidebar, Chart, Table, Dialog, Sheet.
10. **Live header date.** Format **today** as weekday name + `DD/MM/YYYY` (screenshot style), not a hardcoded `20/06/2023`. To-Do date line: `{day} {month} • Today` using the same calendar day.
11. **Task copy** in fixtures should match the screenshot titles/descriptions so the page reads like the mock. Thumbnails: local files under `public/dashboard/` (export from Figma if available; otherwise rounded `bg-muted` placeholders). Do not hotlink arbitrary CDNs (would require `images.remotePatterns`).
12. **Do not paste Figma absolute-positioned reference code.** Adapt to App Router + Tailwind tokens.
13. Leave `app/globals.css` and `Button` CVA alone unless a token class is missing (it should not be).
14. Keep `/design-system` out of this pass (prompt exists; page may not). Do not put the app shell on a future design-system route.

## Visual interpretation

Canonical canvas: **1440×1024** desktop. Light mode is the source of truth. Use semantic token classes only (`bg-primary`, `bg-sidebar`, `text-status-completed`, `rounded-card`, `shadow-panel`, `font-sans`). Never raw hex or Tailwind palette colors (`bg-red-500`, `text-zinc-600`).

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER  100px  bg-secondary (#f8f8f8)  shadow-header         │
│  [Dash|board]     [ search ........ [🔍] ]   [🔔][📅] date   │
├──────────────┬──────────────────────────────────────────────┤
│              │  canvas bg-background (#f5f8ff)               │
│  SIDEBAR     │  greeting + invite row                        │
│  coral panel │  ┌─────────────────────┬──────────────────┐  │
│  inset under │  │ To-Do               │ Task Status      │  │
│  header      │  │ task cards          │ 3 donuts         │  │
│  ~290–330px  │  │                     ├──────────────────┤  │
│              │  │                     │ Completed Task   │  │
│  logout      │  │                     │ compact cards    │  │
│              │  └─────────────────────┴──────────────────┘  │
└──────────────┴──────────────────────────────────────────────┘
```

- **Header** is full viewport width, height **100px**, sits above the sidebar. Content: horizontal flex, vertical center, horizontal padding ~40–48px.
- **Sidebar** sits **below** the header, not under the wordmark. Inset from the left and bottom of the canvas (~16–24px) so a strip of `bg-background` shows around it. Width ~**250–290px** content (Figma nav pills are **288×59**). `bg-sidebar text-sidebar-foreground`, `shadow-sidebar`, **8px** radius on the **top-right and bottom-right** (and left if inset makes all corners visible). Column: profile → nav → `mt-auto` logout.
- **Main** fills remaining width. Vertical scroll on the main column if needed; header and sidebar stay put (`sticky` or `h-svh` shell with `overflow-hidden` on the viewport and `overflow-y-auto` on main).
- Dashboard body padding ~24–32px. Greeting row, then a **2-column grid**: To-Do ~**7fr**, right stack ~**5fr**, `gap-6`. Right stack is `flex flex-col gap-6` (Task Status then Completed Task).

### Header

| Element | Spec |
| --- | --- |
| Wordmark | Inter semibold **32px**. `Dash` = `text-primary`, `board` = `text-foreground`. `Link` to `/`. |
| Search | Centered, width ~**500–580px** on desktop, height **36px**, `rounded-lg` (8px), white/`bg-card` fill, `shadow-panel`, placeholder `Search your task here...` in `text-muted-foreground` 12–14px. Trailing **square** coral `Button` size `icon` (~36×36), white search icon, 8px radius, flush to the right of the field (attached, not a separate gap). |
| Bell / calendar | Two coral squares **34–36px**, `rounded-lg`, white lucide `Bell` and `CalendarDays`. Calendar is `Link href="/calendar"`. |
| Date | Two lines, right-aligned. Weekday Inter medium **15px** `text-foreground`. Date Inter medium **14px** `text-date-accent`. |

Do not put the wordmark inside the coral sidebar.

### Sidebar

| Element | Spec |
| --- | --- |
| Avatar | Circle **~86px**, centered, white 2–3px ring optional, `Avatar` + `AvatarFallback` initials |
| Name | Inter semibold ~16–18px, white, centered |
| Email | Inter regular ~12px, white/80, centered, `truncate` |
| Nav items | Column `gap-1` or `gap-2`, each **~288×59** max, `rounded-card` (14px). Icon + label, Inter medium **16px**. Inactive: transparent, `text-sidebar-foreground`. Active (Dashboard on `/`): `bg-sidebar-accent text-sidebar-accent-foreground` white pill, coral icon + label. |
| Icons (lucide) | Dashboard `LayoutDashboard`, Vital Task `AlertTriangle` or `ClipboardList` closest to the mock, My Task `ListTodo`, Task Categories `Folder`, Agent `BotMessageSquareIcon` (links to `/agent`), Logout `LogOut` |
| Logout | Bottom of sidebar, same inactive nav style, `button` not a route |

Active state is **pathname-based** (`usePathname` in a small client `AppNav`). Only one item is active.

### Greeting row

- Left: `Welcome back, Sundar 👋` — Inter medium **36px** `text-foreground`. First name from the mock profile.
- Right: overlapping circular photos **36px**, `rounded-lg` (Figma uses 8px squircle — prefer `rounded-lg` over `rounded-full` if it matches the mock; the attached JPG uses circles, **use circles** `rounded-full`). `-ml-2` overlap, `+ Invite` `Button variant="outline"` `size="sm"` coral border + coral text.

### To-Do column

- Section label: coral `text-primary` Inter medium **15px** with a small clipboard/list icon, then a thin `Separator`.
- `+ Add task` on the right of that row: `Button variant="link"` or ghost, coral, plus icon. Presentational.
- Subline: `{D} {Month} • Today` — 12–14px `text-muted-foreground` / body.
- Task cards: white `bg-card`, `rounded-card`, 1px `border`, light shadow (panel or none if border is enough — mock is a thin gray stroke). Inner padding ~20–24px. Vertical `gap-3` between cards.
- Card anatomy:
  - Top: **status color dot** `size-2.5` `rounded-full` (`bg-status-not-started` or `bg-status-in-progress`) + **title** Inter semibold **16px** `text-foreground` + `DropdownMenu` trigger `⋯` (`MoreHorizontal`) top-right, muted.
  - Middle: description Inter **14px** `text-body` (2–3 lines, wrap) + thumbnail **~90–118×** ~70–90px, `rounded-lg`, object-cover, right side.
  - Footer: `Priority: Moderate` with value in `text-priority-moderate`; `Status: Not Started` in `text-status-not-started` or `In Progress` in `text-status-in-progress`; `Created on: DD/MM/YYYY` `text-muted-foreground`. Labels 10–12px. Status/priority values are 10px in the mock.

Render user-provided (fixture) strings as **escaped plain text** (normal React text nodes). No `dangerouslySetInnerHTML`.

### Task Status widget

- White card, `rounded-card`, padding ~20–24px.
- Title `Task Status` — same 15px medium coral as To-Do, with icon + `Separator`.
- Three equal columns of donut + legend.
- Rings ~**90–110px**. Track is light gray (`border` / muted). Arc:
  - Completed `stroke` / conic `chart-1` / `status-completed` **green**, center **84%-like** derived %
  - In Progress `status-in-progress` **blue**
  - Not Started `status-not-started` **red**
- Center: percentage Inter medium ~18–22px `text-foreground`.
- Legend: colored dot + label 12–14px `text-foreground` under each ring.

Percentages = `round(100 * count(status) / totalTasks)` from the mock list (include both open and completed in the denominator). Do not hardcode 84/46/13 unless the fixtures happen to produce those numbers. Empty total → `0%`.

### Completed Task widget

- White card below status, `rounded-card`.
- Title `Completed Task` — use `text-primary` (design-system mapped the mock’s orange heading to primary).
- Compact cards: green status dot, title, short description, small thumbnail, `Status: Completed` `text-status-completed`, `Completed {relative}` (`2 days ago`) `text-muted-foreground` 12px.
- Show 2–3 completed fixtures.

### Typography

| Role | Style |
| --- | --- |
| Wordmark | Inter 32px semibold, split primary/foreground |
| Greeting | Inter 36px medium |
| Section titles | Inter 15px medium `text-primary` |
| Nav | Inter 16px medium |
| Task title | Inter 16px semibold |
| Description | Inter 14px `text-body` |
| Meta / placeholder | Inter 12px `text-muted-foreground` |
| Status / priority values | Inter 10–12px status tokens |
| Weekday / date | 15px foreground / 14px `text-date-accent` |

Line-height near-normal. No tight tracking. Montserrat is **not** used on this page.

### Spacing

- 8px grid (`gap-2`, `gap-3`, `gap-4`, `gap-6`).
- No `space-y-*` / `space-x-*`.
- Equal width/height: `size-*`.
- Shell: `h-svh overflow-hidden`; main `min-h-0 flex-1 overflow-y-auto`.

### Colors

Must render from tokens already in `globals.css`:

- Canvas `bg-background`, header `bg-secondary`, cards `bg-card`, sidebar `bg-sidebar`
- Primary coral actions and wordmark `Dash`
- Status: `text-status-*` / `bg-status-*` — not Tailwind green/blue/red
- Invite outline uses existing `Button variant="outline"` (no color `className` overrides on `Button`)

### Radius and shadows

- Icon tiles and search: `rounded-lg` (8px)
- Cards and nav pills: `rounded-card` (14px)
- Header `shadow-header`, sidebar `shadow-sidebar`, search/cards `shadow-panel` as needed

### Responsiveness (minimal)

Figma is desktop-first. Product asks for minimal responsive UI:

- **`lg+` (≈1024px):** layout as the mock.
- **`md`:** keep header; sidebar becomes a left `Sheet` **only if** a hamburger is added. Prefer simpler: sidebar hidden below `lg`, header gains an icon button that toggles a coral overlay/drawer. If adding `Sheet`, it needs `SheetTitle` (sr-only ok). If that is too much, collapse to a **horizontal top nav** under the header — but a slide-over is closer to the mock.
- **Main grid:** `grid-cols-1` below `lg`; To-Do then Status then Completed.
- Search field shrinks (`flex-1 max-w-xl`); wordmark can hide `board` on very small widths if overflow appears.
- **No horizontal page overflow** at 375px.

Do not build a second mobile design system.

### Pixel-perfect expectations

- Header is **above** the coral panel; wordmark is in the header, not the sidebar.
- Sidebar is coral with a **white active pill** and coral label — not a light-coral pill on white.
- Default buttons and icon tiles match `#ff6767`.
- Canvas is cool off-white `#f5f8ff`, not zinc-50.
- Task status colors match Figma hues via tokens.
- Donuts are circular with a hollow center, not pie slices.
- Inter everywhere on this page.
- Compare against `prompts-img/Dashboard.jpg` at 1440px width: spacing, pill size, card stroke, and header alignment should be recognizably the same composition.

## Files likely to change

- `app/page.tsx` — **delete** after moving Dashboard into the route group (avoid two `/` pages)
- `app/(app)/layout.tsx` — shell (header + sidebar + `{children}`)
- `app/(app)/page.tsx` — Dashboard
- `app/(app)/vital-task/page.tsx`, `my-task/page.tsx`, `task-categories/page.tsx`, `agent/page.tsx`, `calendar/page.tsx` — title-only stubs
- `components/app-shell/app-header.tsx`
- `components/app-shell/app-sidebar.tsx`
- `components/app-shell/app-nav.tsx` — client nav + logout
- `components/dashboard/todo-column.tsx`
- `components/dashboard/task-card.tsx`
- `components/dashboard/task-status-panel.tsx`
- `components/dashboard/completed-task-panel.tsx`
- `components/dashboard/status-donut.tsx`
- `lib/dashboard/mock-data.ts` — profile, team avatars, tasks, helpers for status counts / relative completed time / date formatting
- `public/dashboard/*` — thumbnails / avatar images as needed
- `components/ui/*` — only files created by `npx shadcn@latest add` for the primitives listed above

Do not change `proxy.ts`, `env.ts`, or `app/globals.css` unless a missing token blocks the UI (should not).

Keep files small. Shell layout is a Server Component; only nav pathname, dropdowns, and search input need `"use client"`.

## Implementation requirements

1. **App Router:** `(app)` route group layout wraps children with the shell. Root `app/layout.tsx` still owns `html`/`body`/fonts.
2. **Dashboard page** is a Server Component. Load mock data on the server; pass serializable props into client leaves (dropdown, nav).
3. **Typed fixtures.** Explicit types for `TaskStatus`, `TaskPriority`, `DashboardTask`. No `any`. Derive overdue in the helper if `scheduledAt < now && status !== "completed"` but **do not show a separate Overdue column** (not in the mock).
4. **shadcn:** After `add`, read the generated files. Use full `Card` composition (`CardHeader` / `CardTitle` / `CardContent`). `Avatar` always has `AvatarFallback`. `DropdownMenuItem` inside `DropdownMenuGroup`. Icons in `Button`: `data-icon`, no extra `size-*` on the SVG. `cn()` for active nav classes.
5. **Images:** `next/image` for local `/dashboard/...` files. Intrinsic sizes set. Empty alt if decorative; meaningful alt for task thumbnails.
6. **Dates:** format with `Intl.DateTimeFormat` (en-GB for `DD/MM/YYYY`) in a small helper. Relative completed time: simple “X days ago” helper (no extra date library unless already installed — `date-fns` is not in `package.json`; do not add it).
7. **Accessibility:** header search has an accessible name; icon-only buttons have `aria-label`; nav uses `<nav>`; active item `aria-current="page"`; donuts have a text percentage (not color-only).
8. **Stubs:** shared tiny presentational title in `{children}` so the shell stays visible. Metadata titles per page.
9. **Do not** implement task create/update/delete, notifications, calendar grid, categories CRUD, Settings, or Agent chat UI. There must be **no** `/help` or `/settings` route.
10. TypeScript strict; no unused files; no `any`; no unrelated refactors.

## Security requirements

- Do not add `SUPABASE_SERVICE_ROLE_KEY` usage or any new env vars.
- Do not put secrets in client components.
- Do not introduce `dangerouslySetInnerHTML` for task text.
- Do not enable Clerk `auth.protect()` on `/` in this pass (would lock the UI behind missing keys).
- Presentational Invite/Logout/Add task must not call external APIs.

## Acceptance criteria

- [ ] `http://localhost:3000` shows the Dashboard shell + To-Do / Task Status / Completed Task, not the Next.js starter.
- [ ] Header: split wordmark, search with coral square submit, bell, calendar, live weekday + `DD/MM/YYYY` in `text-date-accent`.
- [ ] Sidebar: coral inset panel, mock Sundar profile, white active pill on Dashboard, logout at the bottom.
- [ ] Greeting + overlapping avatars + outline Invite (no-op).
- [ ] To-Do cards match mock anatomy (dot, title, description, thumbnail, priority/status/created, `⋯`).
- [ ] Status donuts derived from mock tasks; completed list shows completed fixtures with green status.
- [ ] Semantic tokens only; Inter; card radius 14px; icon tiles 8px.
- [ ] Nav links to stub pages that still show the shell; Help goes to `/agent` (not `/help`); calendar icon goes to `/calendar`. No Settings item or `/settings` route.
- [ ] No ClerkProvider, no Supabase, no task API routes, no Recharts.
- [ ] Narrow viewport: no horizontal overflow; columns stack.
- [ ] `npm run typecheck` and `npm run lint` pass. `npm run build` runs because routes/layout changed.

## Checks to run

From the repo root:

```bash
npm run typecheck
npm run lint
```

Run `npm run format` (or `npx ultracite fix` on touched files) if format issues are reported.

Run `npm run build` because `app/` routes and layout changed. If the build fails only because Clerk env vars are missing, report that as an existing env blocker and confirm whether `env.ts` still treats keys as optional.

## Exact manual test steps expected after implementation

1. `npm run dev` and open `http://localhost:3000`.
2. Confirm the Next.js starter is gone. Compare the page at ~1440px width to `prompts-img/Dashboard.jpg`: header above coral sidebar, `Dash` coral / `board` dark, search centered, date on the right.
3. Confirm sidebar: avatar, Sundar name/email, Dashboard white pill, other items white on coral, Logout at the bottom.
4. Confirm greeting, invite row, three To-Do-style cards, three donuts, two+ completed cards.
5. Hover default / icon coral controls — fill should lighten toward accent (`#ff9090`).
6. Click Vital Task, My Task, Task Categories, Agent — URL is `/agent` for Agent (not `/help`); shell remains, main area is a stub title; Dashboard pill is not active. Confirm there is **no** Settings nav item. Click Dashboard wordmark or nav to return.
7. Click the header calendar icon — `/calendar` stub inside the shell.
8. Click Invite, Add task, bell, Logout, and card `⋯` — no crash, no network calls, no auth redirect.
9. Resize to ~375px — no horizontal scrollbar; content stacks; shell remains usable.
10. Open DevTools and confirm no `bg-[#...]` / `text-red-500` in dashboard components; computed `--primary` is still coral.
