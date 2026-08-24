# My Task page UI

## Goal

Replace the title-only stub at `/my-task` with the **My Task** split view from `prompts-img/My Task.png`: a **My Tasks** list on the left and a **selected-task detail** panel on the right, inside the existing authenticated app shell.

This pass is **pixel-faithful UI + mock task data**. Do **not** add Supabase, task CRUD APIs, Clerk route protection, Settings, Vital Task, Categories, Calendar, or Agent chat.

## Skills read

- `AGENTS.md` (product scope, architecture layers, prompt workflow, checks, escaped plain text)
- `.agents/skills/clerk/SKILL.md` → `clerk-nextjs-patterns` (server vs client; keep current public-first `proxy.ts`, no `auth.protect()`, no `ClerkProvider`)
- `.claude/skills/shadcn/SKILL.md` plus `rules/styling.md`, `rules/composition.md`, `rules/icons.md` (semantic tokens, `gap-*`, `size-*`, `cn()`, lucide, Card/Avatar/Empty composition, `data-icon`, no `space-y-*`)
- `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/04-linking-and-navigating.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/12-images.md`
- `prompts/design-system.md` (canonical tokens already in `app/globals.css`)
- `prompts/dashboard.md` (shell, mock-data rules, presentational menus)

Supabase and AI SDK are **not** needed. Clerk stays plumbing-only.

## Existing code inspected

- `app/(app)/layout.tsx` — shared shell; `dynamic = "force-dynamic"`; mock profile + live date
- `app/(app)/page.tsx` — Dashboard (To-Do / status / completed); leave this page’s layout and fixture list unchanged
- `app/(app)/my-task/page.tsx` — `StubPage` titled “My Task” (replace contents; keep route and metadata title)
- `components/app-shell/*` — header, coral sidebar, pathname nav (`/my-task` already exists). **Do not rebuild the shell.**
- `components/dashboard/task-card.tsx` — card anatomy matching the list in the mock; `⋯` Edit/Delete are inert; priority color is hardcoded `text-priority-moderate`
- `components/dashboard/todo-column.tsx` — Dashboard-only To-Do column with “Add task”; **do not reuse this column chrome** on My Task (different heading)
- `lib/dashboard/mock-data.ts` — `TaskStatus`, `TaskPriority` (`low` \| `moderate` \| `high`), `DashboardTask` (title, description, thumbnail, dates). Dashboard fixtures are birthday / landing / presentation / dog / meeting. **Do not change which tasks Dashboard renders.**
- `lib/dashboard/dates.ts` — `formatNumericDate` (`DD/MM/YYYY`, `en-GB`)
- `app/globals.css` — coral `#ff6767`, canvas `#f5f8ff`, `--radius-card` 14px, `--radius` 8px, `shadow-panel`, status tokens, `--priority-moderate` only (no extreme/low token yet)
- `components/ui/*` — `button`, `card`, `dropdown-menu`, `input`, `badge`, `avatar`, `separator`. No `empty`, `scroll-area`, `alert-dialog`
- `public/dashboard/*` — existing SVG thumbs (party, laptop, meeting, dog, handshake). No document / grocery / report thumbs yet
- `prompts-img/My Task.png` — visual source of truth for this pass
- `package.json` — Next 16, React 19, no Supabase, no date-fns

## Decisions or assumptions

1. **Route stays `/my-task`.** Keep `metadata.title` as `My Task · bendo`. Do not add `/my-tasks` or nested `/my-task/[id]`.
2. **Reuse the existing shell.** Header (search, bell, calendar, live date) and sidebar stay as Dashboard built them. Nav already highlights My Task via `usePathname`. Do **not** add Settings. Do **not** relabel Agent to Help in this pass.
3. **Mock data only.** No API routes, no Supabase, no PATCH/DELETE. Edit and Delete (detail buttons and card `⋯`) stay presentational: `type="button"`, no network, no confirm dialog.
4. **Do not change Dashboard’s task list.** Add My Task fixtures in `lib/dashboard/mock-data.ts` (or `lib/my-task/`) via a dedicated getter such as `getMyTasks(now)`. Dashboard continues to call `getMockTasks(now)` only.
5. **My Task list matches the screenshot (4 open tasks), not Dashboard’s mix.** Include completed tasks only if they appear in the PNG (they do not). Default selected task is the first list item (**Submit Documents**).
6. **Priority label “Extreme”.** The mock uses Extreme, not High. Extend `TaskPriority` with `"extreme"` (keep `"high"` as an alias **or** replace `"high"` everywhere it is unused — currently unused). Show the word **Extreme**. Color Extreme with a new `--priority-extreme` token equal to status-not-started red (`#f21e1e` / existing `--status-not-started`). Moderate stays `--priority-moderate`. Low (if unused on this page) can use `text-muted-foreground`.
7. **Structured detail fields** live on the fixture, not parsed from description:

   - `title` — card + detail header (e.g. `Submit Documents`)
   - `contentTitle` — body “Task Title” line (e.g. `Document Submission`); optional; omit the row if missing
   - `objective` — optional
   - `description` — card snippet and “Task Description”
   - `additionalNotes` — `string[]`; render as a bulleted list; omit the section if empty
   - `deadlineLabel` — optional (e.g. `End of Day`)

   Other list tasks may only have title + description; the detail panel still shows header meta and description, and skips empty sections.
8. **Selection is client state**, not a URL param. First task selected on load. Clicking a list card selects it. If the list is empty, both panels show an empty state (install shadcn `empty` from `@shadcn` if needed; `Empty` + `EmptyTitle` / `EmptyDescription`; do not hand-roll a one-off empty layout).
9. **Reuse `TaskCard`** for the list. Add optional `selected` and `onSelect` (button or clickable card with keyboard support). Do not break Dashboard: omit those props there. Fix priority coloring in `TaskCard` with a `priorityTextClass` map so Extreme is red and Moderate is blue (Dashboard cards are all moderate today, so this is a safe shared fix).
10. **List status/priority dots** follow **status** (same as Dashboard: `statusFillClass`) so Extreme + Not Started stays red and Moderate + In Progress stays blue, matching the PNG.
11. **Search / bell / calendar / logout** remain as in the shell. Header search does **not** filter this list.
12. **Thumbnails:** local files under `public/dashboard/` (new SVGs for documents, report, groceries; reuse `thumb-party.svg` for the birthday task). `next/image` + `unoptimized` like existing thumbs. Do not hotlink CDNs.
13. **Do not paste Figma absolute-positioned code.** Adapt to App Router + tokens.
14. Leave `proxy.ts`, `env.ts`, Button CVA, and shell files alone. Touch `app/globals.css` **only** to register `--priority-extreme` (and `@theme inline` `--color-priority-extreme`).
15. Do not install Sidebar, Chart, Table, Dialog, Sheet, or date libraries. Add `empty` only if used. Prefer `overflow-y-auto` over `scroll-area` unless layout is painful.

## Visual interpretation

Canonical canvas: **1440×1024** desktop. Light mode. Semantic token classes only (`bg-primary`, `bg-card`, `text-status-not-started`, `text-priority-extreme`, `rounded-card`, `shadow-panel`, `font-sans`). Never raw hex or Tailwind palette colors.

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER (existing)                                           │
├──────────────┬──────────────────────────────────────────────┤
│ SIDEBAR      │  canvas bg-background                         │
│ (existing)   │  px ~24–32px  py ~24–32px                     │
│ My Task pill │  ┌────────────────────┬─────────────────────┐│
│ active       │  │ My Tasks           │  Task detail        ││
│              │  │ list of cards      │  image + meta       ││
│              │  │ (scroll)           │  structured body    ││
│              │  │                    │  [🗑][✎] bottom-right││
│              │  └────────────────────┴─────────────────────┘│
└──────────────┴──────────────────────────────────────────────┘
```

- Main: **2-column grid**, `gap-6`, columns **≈ 1fr / 1fr** on `lg+` (list slightly narrower is OK, e.g. `minmax(0,1fr) minmax(0,1.05fr)`). Below `lg`: stack list then detail (`grid-cols-1`).
- Each column is a **white** `Card` / panel: `bg-card`, `rounded-card` (14px), `shadow-panel`, thin `border` if the PNG stroke needs it, inner padding **~20–24px**.
- Shell already scrolls `main`. Inside each panel, if content overflows, use `min-h-0 overflow-y-auto` so list and detail can scroll independently on tall lists. On desktop, panels should fill remaining viewport height (`flex-1` in a `min-h-0` column) so they look like the PNG’s two equal-height boards, not short cards floating in empty canvas.

### Left panel — “My Tasks”

| Element | Spec |
| --- | --- |
| Heading | Inter medium **~15px**, `text-foreground` (black, **not** coral like Dashboard “To-Do”). Copy: **My Tasks**. |
| Underline | Short coral bar **only under “My”** (≈ width of that word, 2–3px tall, `bg-primary`). Not a full-width `Separator` under the whole title. Implement with a nested span + `border-b-2 border-primary` or a small absolutely positioned bar; do not underline “Tasks”. |
| Cards | Same anatomy as Dashboard `TaskCard`: status dot, semibold 16px title, `⋯` top-right, 14px `text-body` snippet (2–3 lines) + thumbnail **~90–118×70–90px** `rounded-lg` object-cover, footer `Priority` / `Status` / `Created on: DD/MM/YYYY`. Vertical `gap-3` between cards. |
| Selected | Visible but quiet: `border-primary` or `ring-1 ring-primary` (or slightly stronger border). `aria-current="true"` or `aria-selected` on the selectable control. |
| Click | Entire card (except the `⋯` menu) selects the task. Keyboard: the selectable control is a `button` or has `tabIndex={0}` and Enter/Space. |

Do **not** show “+ Add task” or a date subline on this page (not in the PNG).

### Right panel — task detail

| Element | Spec |
| --- | --- |
| Header row | Large square thumbnail **~160–184px**, `rounded-lg`, object-cover, left. Right of image: title Inter semibold **~18–20px**; `Priority: Extreme` with Extreme in `text-priority-extreme`; `Status: Not Started` in `text-status-not-started`; `Created on: DD/MM/YYYY` in `text-muted-foreground` ~12px. Stack these meta lines with `gap-1` / `gap-2`. |
| Body | Left-aligned labeled sections. Label **bold** Inter ~14px `text-foreground` + value on the same line or immediately after (`Task Title: Document Submission`). Description is a wrapping paragraph `text-body` 14px. **Additional Notes:** label then `ul` with `list-disc` and `gap` between items (no `space-y-*`). **Deadline for Submission:** value as plain text. |
| Actions | Bottom-right of the panel: two coral **square** `Button` `size="icon"` (~34–36px, `rounded-lg`), white lucide `Trash2` and `SquarePen` (or `Pencil`). `aria-label` Delete / Edit. Do **not** put these in the list cards. |
| Empty | If nothing selected / no tasks: Empty in the detail panel; hide action buttons. |

Render all user/fixture strings as **escaped plain text** (React text nodes). No `dangerouslySetInnerHTML`. Notes are an array of strings, not markdown.

### Task copy (fixtures must read like the PNG)

**1. Submit Documents** (default selected)

- Priority Extreme, Status Not Started, created 20/06/2023 (fixture `createdAt` may stay `2023-06-20`; format with `formatNumericDate`)
- Card snippet: short document-submission line + document thumbnail
- Detail:
  - Task Title: Document Submission
  - Objective: To submit required documents for completion or review. *(Match PNG sense; keep it one sentence.)*
  - Task Description: Review the listed documents, confirm they are complete and accurate, then submit them through the designated channel before the deadline. Gather any missing paperwork first.
  - Additional Notes:
    - Ensure all documents are signed and dated.
    - If submitting in person, bring a copy of each original.
    - Double-check names and identification numbers.
  - Deadline for Submission: End of Day

**2. Complete monthly report** — Extreme, In Progress; short report snippet + report thumbnail. Detail can be description-only.

**3. Grocery shopping** — Extreme, In Progress; grocery snippet + grocery thumbnail.

**4. Attend Nischal's Birthday Party** — Moderate, Not Started; may reuse Dashboard birthday description and `thumb-party.svg`.

Scheduled times for incomplete tasks must be **in the future** relative to `now` (AGENTS.md past-schedule rule), even in fixtures.

### Typography

| Role | Style |
| --- | --- |
| Panel title “My Tasks” | Inter 15px medium, foreground; coral underline on “My” |
| List task title | Inter 16px semibold |
| Detail title | Inter 18–20px semibold |
| Section labels | Inter 14px semibold / bold |
| Body / notes | Inter 14px `text-body` |
| Meta | Inter 10–12px; status/priority token colors; created date muted |
| Nav / header | Unchanged |

Montserrat is **not** used on this page.

### Spacing

- 8px grid: `gap-2`, `gap-3`, `gap-4`, `gap-6`.
- No `space-y-*` / `space-x-*`.
- Equal width/height: `size-*`.
- Icon tiles 8px radius (`rounded-lg`). Cards/panels `rounded-card`.

### Colors

- Canvas `bg-background`, panels `bg-card`, actions `bg-primary` / `text-primary-foreground`.
- Extreme / Not Started: red tokens (`text-priority-extreme`, `text-status-not-started`).
- Moderate / In Progress: `text-priority-moderate`, `text-status-in-progress`.
- No `text-red-500`, `bg-[#...]`, or Button color overrides via `className`.

### Responsiveness (minimal)

- **`lg+`:** two equal-height boards as the mock.
- **Below `lg`:** stack; list first; detail second; still no horizontal overflow at 375px.
- Detail action buttons remain bottom-right of the detail panel.
- Do not build a second mobile design.

### Pixel-perfect expectations

- Compare at ~1440px to `prompts-img/My Task.png`.
- Two white boards on cool canvas; **My Tasks** with coral underline under **My** only.
- First card’s full document detail on the right, including notes bullets and End of Day.
- Coral trash + edit squares at the **bottom-right of the detail panel**, not in the header.
- Sidebar **My Task** white pill (already pathname-based).
- Inter; 14px card radius; 8px icon buttons.

## Files likely to change

- `app/(app)/my-task/page.tsx` — Server Component: load `getMyTasks`, `toTaskView`, pass props into a client view
- `components/my-task/my-task-view.tsx` — client: selected id, list + detail
- `components/my-task/task-detail-panel.tsx` — presentational detail
- `components/dashboard/task-card.tsx` — optional select + priority text classes
- `lib/dashboard/mock-data.ts` — `extreme` priority, detail fields, `getMyTasks`, `priorityTextClass` / `priorityLabels`
- `app/globals.css` — `--priority-extreme` + theme color
- `public/dashboard/thumb-documents.svg`, `thumb-report.svg`, `thumb-grocery.svg` (names can vary)
- `components/ui/empty.tsx` — only if `npx shadcn@latest add empty` is used

Do **not** change `app/(app)/page.tsx` fixture wiring, `proxy.ts`, `env.ts`, or shell components unless a tiny `TaskCard` prop is required (it is).

Keep files small. Page stays a Server Component; selection and menus stay client.

## Implementation requirements

1. **App Router:** keep `(app)` layout. My Task page is a Server Component that passes serializable task views into `MyTaskView`.
2. **Typed fixtures.** Extend `DashboardTask` (or a `MyTask` alias) with optional detail fields. No `any`. Overdue helper may stay; **do not** show an Overdue badge (not in the PNG).
3. **shadcn:** full Card composition on panels. Icons in Buttons: `data-icon` only when the button has a visible label; icon-only buttons use `size="icon"` + `aria-label`, no extra `size-*` on the SVG. `DropdownMenuItem` inside `DropdownMenuGroup`. `cn()` for selected card. `Avatar` unchanged.
4. **Images:** `next/image` for local thumbs; meaningful `alt` on task images.
5. **Dates:** `formatNumericDate` only; do not add date-fns.
6. **Accessibility:** list is a selection list (or buttons); selected task announced; icon-only Edit/Delete have names; heading hierarchy `h1` visually can be the panel title “My Tasks” (page has no separate greeting).
7. **Do not** implement create/update/delete persistence, notifications, filters, or search-on-this-page.
8. TypeScript strict; no unused files; no unrelated refactors (Vital Task, Settings, Agent).

## Security requirements

- No new env vars. No service-role key. No secrets in client components.
- No `dangerouslySetInnerHTML`.
- Do not enable Clerk `auth.protect()` on `/my-task`.
- Presentational Edit/Delete/Logout must not call external APIs.

## Acceptance criteria

- [ ] `http://localhost:3000/my-task` shows the two-panel My Task UI inside the existing shell, not `StubPage`.
- [ ] Sidebar My Task item is the active white pill.
- [ ] Left: “My Tasks” with coral underline under “My”; four cards matching the PNG titles/priorities/statuses.
- [ ] Clicking a card updates the right panel; first task is Submit Documents with structured detail, notes, and End of Day.
- [ ] Detail has large thumb, meta, trash + edit coral squares bottom-right; those controls do not persist changes.
- [ ] Dashboard `/` still shows the original three open To-Do fixtures (not the four My Task-only cards).
- [ ] Semantic tokens only; Extreme uses `text-priority-extreme`; Inter; card radius 14px.
- [ ] Narrow viewport: stacked columns, no horizontal overflow.
- [ ] No ClerkProvider, no Supabase, no task API routes.
- [ ] `npm run typecheck` and `npm run lint` pass. `npm run build` because the `/my-task` page changed.

## Checks to run

From the repo root:

```bash
npm run typecheck
npm run lint
```

Run `npm run format` (or `npx ultracite fix` on touched files) if format issues are reported.

Run `npm run build` because `app/(app)/my-task/page.tsx` changed. If the build fails only because Clerk env vars are missing, report that as an existing env blocker.

## Exact manual test steps expected after implementation

1. `npm run dev` and open `http://localhost:3000/my-task` (or click **My Task** from Dashboard).
2. Confirm the stub title is gone. Compare ~1440px width to `prompts-img/My Task.png`: two white boards, heading underline under “My”, Submit Documents detail on the right.
3. Confirm sidebar: My Task white pill; Dashboard / Vital Task / etc. still navigate; no Settings item.
4. Click **Complete monthly report**, **Grocery shopping**, and **Attend Nischal's Birthday Party** — detail title, status, priority, and thumbnail update each time.
5. Click the list card `⋯`, detail trash, and detail edit — no crash, no network, no navigation.
6. Open `/` — To-Do still has the Dashboard birthday / landing / presentation cards, not the grocery/report-only set.
7. Resize to ~375px — no horizontal scrollbar; list stacks above detail; edit/delete still reachable.
8. Confirm no `bg-[#...]` / `text-red-500` in new My Task components; Extreme text uses the priority-extreme token.
