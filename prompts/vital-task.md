# Vital Task page UI

## Goal

Replace the title-only stub at `/vital-task` with the **Vital Tasks** split view from `prompts-img/Vitals.png` (same layout as Figma frame `351:284` in [To-do List Web App Design (Community)](https://www.figma.com/design/JkIeeSKseY4NO9FyC6WTV6/To-do-List-Web-App-Design--Community-?node-id=351-284)): a **Vital Tasks** list on the left and a **selected-task detail** panel on the right, inside the existing authenticated app shell.

This pass is **pixel-faithful UI + mock task data**. Do **not** add Supabase, task CRUD APIs, Clerk route protection, Settings, Categories, Calendar product UI, or Agent chat.

Do **not** change Dashboard, My Task (`/my-task` list + `TaskDetailPanel`), or View Task (`/my-task/[taskId]`) layouts.

## Skills read

- `AGENTS.md` (product scope, architecture layers, prompt workflow, checks, escaped plain text)
- `.agents/skills/clerk/SKILL.md` → `clerk-nextjs-patterns` (server vs client; keep current public-first `proxy.ts`, no `auth.protect()`, no `ClerkProvider`)
- `.claude/skills/shadcn/SKILL.md` plus `rules/styling.md`, `rules/composition.md`, `rules/icons.md` (semantic tokens, `gap-*`, `size-*`, `cn()`, lucide, Card/Empty composition, `data-icon`, no `space-y-*`)
- `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/04-linking-and-navigating.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/12-images.md`
- `prompts/design-system.md` (canonical tokens already in `app/globals.css`)
- `prompts/dashboard.md` / `prompts/my-task.md` / `prompts/view-task.md` (shell, mock-data rules, presentational menus, split-view selection)

Supabase and AI SDK are **not** needed. Clerk stays plumbing-only.

## Existing code inspected

- `app/(app)/layout.tsx` — shared shell; `dynamic = "force-dynamic"`; mock profile + live date. **Do not rebuild the shell.**
- `app/(app)/vital-task/page.tsx` — `StubPage` titled “Vital Task” (replace contents; keep route and metadata title)
- `app/(app)/my-task/page.tsx` + `components/my-task/my-task-view.tsx` — two-panel list + `TaskDetailPanel`; card click selects; `href` is for the `⋯` **View** menu only. Keep this page as-is.
- `components/my-task/task-detail-panel.tsx` — labeled Task Title / Objective / Task Description / Additional Notes / Deadline; two coral icon buttons. **Do not reuse this body anatomy** on Vital Task (the PNG has unlabeled paragraphs + a numbered list).
- `components/my-task/view-task-view.tsx` — full-page View Task: Go Back + unlabeled description + `ol` checklist + Optional + **three** buttons (trash, edit, mark vital). Do **not** put that full-page card on `/vital-task`. Reuse only the unlabeled-description + numbered-list pattern.
- `components/dashboard/task-card.tsx` — status dot, title, `⋯`, snippet, thumb, Priority/Status/Created; optional `selected` / `onSelect` / `href`. Reuse as-is.
- `components/app-shell/app-nav.tsx` — `/vital-task` already exists; prefix matching already highlights nested paths. No nav change required unless the label/href is wrong (it is not).
- `lib/dashboard/mock-data.ts` — `getMockTasks` (Dashboard, includes completed `task-dog` “Walk the dog”), `getMyTasks`, `getTaskById` (union of those two). No `getVitalTasks`. No `detailDescription` field yet. Dashboard completed dog must stay completed/moderate — do **not** reuse `task-dog` as the Vital list item.
- `lib/dashboard/dates.ts` — `formatNumericDate` (`DD/MM/YYYY`, `en-GB`)
- `app/globals.css` — coral primary, canvas, `--radius-card` 14px, `--radius` 8px, `shadow-panel`, status/priority tokens including `--priority-extreme` and `--priority-moderate`
- `components/ui/*` — `button`, `card`, `dropdown-menu`, `empty`. No new primitives required
- `public/dashboard/thumb-dog.svg` — reuse for Walk the dog. No hospital/grandma thumb yet
- `prompts-img/Vitals.png` — visual source of truth for this pass
- `package.json` — Next 16, React 19, no Supabase, no date-fns
- `proxy.ts` / `env.ts` — unchanged

## Decisions or assumptions

1. **Route stays `/vital-task`.** Keep `metadata.title` as `Vital Task · bendo`. Do **not** add `/vitals`, `/vital-tasks`, or nested `/vital-task/[id]`. Selection is client state, same as My Task.
2. **Reuse the existing shell.** Header (search, bell, calendar, live date) and coral sidebar stay as Dashboard built them. Nav already highlights Vital Task via `usePathname`. Do **not** add Settings. Do **not** relabel Agent/Help.
3. **Mock data only.** No API routes, no Supabase, no PATCH/DELETE. Edit and Delete (detail buttons and card `⋯`) stay presentational: `type="button"`, no network, no confirm dialog.
4. **Vital is a dedicated fixture list, not a filter.** The PNG includes **Extreme** (Walk the dog) and **Moderate** (Take grandma to hospital), so this is **not** `priority === "extreme"`. Add `getVitalTasks(now)` in `lib/dashboard/mock-data.ts`. Do **not** add an unused `isVital` flag in this pass.
5. **Do not change Dashboard or My Task fixture lists.** Dashboard still uses `getMockTasks` (completed `task-dog` stays in Completed Task). My Task still uses `getMyTasks`. Vital uses only `getVitalTasks`.
6. **Do not reuse `task-dog`.** Dashboard’s completed “Walk the dog” (`id: "task-dog"`) has different status, priority, and copy. Vital’s walk-the-dog fixture gets a new id (`task-walk-dog`). Grandma is `task-grandma`.
7. **Default selected task** is the first list item (**Walk the dog**). Two open tasks only; no completed tasks on this page (none in the PNG).
8. **Mark Vital remains inert.** View Task’s third button still does not mutate this list or navigate here. Do not wire a shared vital store.
9. **View from `⋯`.** Pass `href={`/my-task/${task.id}`}` into `TaskCard` the same way My Task does: card click **selects**; **View** opens View Task. Include vital fixtures in `getTaskById` so those URLs resolve (`[...getMockTasks(now), ...getMyTasks(now), ...getVitalTasks(now)]`, first match). Unknown ids still `notFound()` on View Task.
10. **Structured detail fields** live on the fixture, not parsed from description:

    - `title` — card + detail header
    - `description` — card snippet and the **first unlabeled** detail paragraph
    - `detailDescription` — optional second unlabeled paragraph; omit the second `<p>` if missing
    - `checklist` — optional `string[]`; numbered list (`<ol>`); omit if empty/missing

    Do **not** show My Task labels (“Task Title:”, “Objective:”, “Task Description:”, “Additional Notes:”, “Deadline for Submission:”). Do **not** show View Task’s **Go Back**, **Optional**, or Mark Vital button.
11. **Selection is client state.** First task selected on load. Clicking a list card selects it. If the list is empty, both panels show shadcn `Empty` (do not hand-roll a one-off empty layout). Hide detail action buttons when nothing is selected.
12. **Reuse `TaskCard`.** Pass `selected`, `onSelect`, and `href`. Do not change Dashboard card behavior.
13. **List status/priority dots** follow **status** (`statusFillClass`) so Extreme + Not Started stays red and Moderate + In Progress stays blue, matching the PNG.
14. **Search / bell / calendar / logout** remain as in the shell. Header search does **not** filter this list. No “+ Add task” on this page.
15. **Thumbnails:** reuse `public/dashboard/thumb-dog.svg` for Walk the dog. Add a local SVG for grandma/hospital under `public/dashboard/` (e.g. `thumb-hospital.svg`). `next/image` + `unoptimized` like existing thumbs. Do not hotlink CDNs.
16. **Do not paste Figma absolute-positioned code.** Adapt to App Router + tokens.
17. Leave `proxy.ts`, `env.ts`, Button CVA, `app/globals.css`, Add Task dialog, `TaskDetailPanel`, `ViewTaskView`, and shell files alone.
18. Do not install Dialog, Sheet, AlertDialog, Calendar, or date libraries. Prefer `overflow-y-auto` over `scroll-area`. Do not extract a shared `SplitTaskView` unless it is a one-file, zero-behavior-change helper — a dedicated `VitalTaskView` that mirrors `MyTaskView` is preferred.

## Visual interpretation

Canonical canvas: **1440×1024** desktop. Light mode. Semantic token classes only (`bg-primary`, `bg-card`, `text-status-not-started`, `text-priority-extreme`, `rounded-card`, `shadow-panel`, `font-sans`). Never raw hex or Tailwind palette colors.

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER (existing)                                           │
├──────────────┬──────────────────────────────────────────────┤
│ SIDEBAR      │  canvas bg-background                         │
│ (existing)   │  px ~24–32px  py ~24–32px                     │
│ Vital Task   │  ┌────────────────────┬─────────────────────┐│
│ white pill   │  │ Vital Tasks        │  Task detail        ││
│              │  │ list of cards      │  image + meta       ││
│              │  │ (scroll)           │  paragraphs + 1. 2. ││
│              │  │                    │  [🗑][✎] bottom-right││
│              │  └────────────────────┴─────────────────────┘│
└──────────────┴──────────────────────────────────────────────┘
```

- Main: **2-column grid**, `gap-6`. Figma boards are **423×837** (list) and **511×837** (detail) — use `lg:grid-cols-[minmax(0,423fr)_minmax(0,511fr)]` (or `minmax(0,1fr) minmax(0,1.2fr)`). Below `lg`: stack list then detail (`grid-cols-1`).
- Each column is a **white** `Card` / panel: `bg-card`, `rounded-card` (14px), `shadow-panel`, thin `border` if the PNG stroke needs it, inner padding **~20–24px** (Figma list cards sit ~29px from the board edge).
- Shell already scrolls `main`. Inside each panel, if content overflows, use `min-h-0 overflow-y-auto` so list and detail can scroll independently. On desktop, panels should fill remaining viewport height (`flex-1` in a `min-h-0` column) so they look like the PNG’s two equal-height boards, not short cards floating in empty canvas.

### Left panel — “Vital Tasks”

| Element | Spec |
| --- | --- |
| Heading | Inter medium **~15px**, `text-foreground` (black, **not** coral like Dashboard “To-Do”). Copy: **Vital Tasks**. |
| Underline | Short coral bar **only under “Vital”** (Figma line width **43px** vs title **87px**). 2–3px tall, `bg-primary` / `border-b-2 border-primary`. Do **not** underline “Tasks”. Same nested-span trick as My Tasks. |
| Cards | Same anatomy as Dashboard / My Task `TaskCard`: status dot, semibold 16px title, `⋯` top-right, 14px `text-body` snippet (2 lines) + thumbnail **~88×88px** in Figma (existing card thumbs ~90–118×70–90px are fine), footer `Priority` / `Status` / `Created on: DD/MM/YYYY`. Vertical `gap-3` between cards. Figma card height **134px**. |
| Selected | Visible but quiet: `border-primary` (already on `TaskCard`). `aria-current="true"` on the selectable control. |
| Click | Entire card (except the `⋯` menu) selects the task. Keyboard: the selectable control is a `button`. |

Do **not** show “+ Add task” or a date subline (not in the PNG).

### Right panel — task detail

| Element | Spec |
| --- | --- |
| Header row | Square thumbnail **158×158** in Figma (`size-40` / `size-44` is close; My Task uses ~160–176px — match that). `rounded-lg`, object-cover, left. Right of image: title Inter semibold **~16–20px**; `Priority: Extreme` with Extreme in `text-priority-extreme`; `Status: Not Started` in `text-status-not-started`; `Created on: DD/MM/YYYY` in `text-muted-foreground` ~12px. Stack meta with `gap-1` / `gap-2`. |
| Body | Unlabeled wrapping paragraphs, `text-body` 14px. **No** “Task Description:” label. Then a native numbered list (`<ol className="list-decimal">`) with `pl-5`, `flex flex-col gap-1` (no `space-y-*`). Numbers visible like the PNG (1–6). |
| Actions | Bottom-right of the panel: **two** coral square `Button` `size="icon"` / `icon-lg` (~34–36px, `rounded-lg`), white lucide `Trash2` and `SquarePen` (or `Pencil`). `aria-label` Delete / Edit. Order: delete, then edit. **No** Mark Vital / `CircleAlert`. |
| Empty | If nothing selected / no tasks: `Empty` in the detail panel; hide action buttons. |

Render all fixture strings as **escaped plain text** (React text nodes). No `dangerouslySetInnerHTML`. Lists are `string[]`, not markdown.

### Task copy (fixtures must read like the PNG / Figma)

**1. Walk the dog** (default selected) — `id: "task-walk-dog"`

- Priority Extreme, Status Not Started, created 20/06/2023 (`createdAt` `2023-06-20`; format with `formatNumericDate`)
- Thumbnail: `/dashboard/thumb-dog.svg`
- Card snippet / first detail paragraph: `Take the dog to the park and bring treats as well.` (PNG card shows a trailing `.....` via line-clamp; do not force ellipsis in the stored string unless needed for match)
- Second paragraph (`detailDescription`): `Take Luffy and Jiro for a leisurely stroll around the neighborhood. Enjoy the fresh air and give them the exercise and mental stimulation they need for a happy and healthy day. Don't forget to bring along squeaky and fluffy for some extra fun along the way!`
- Checklist:
  1. `Listen to a podcast or audiobook`
  2. `Practice mindfulness or meditation`
  3. `Take photos of interesting sights along the way`
  4. `Practice obedience training with your dog`
  5. `Chat with neighbors or other dog walkers`
  6. `Listen to music or an upbeat playlist`

**2. Take grandma to hospital** — `id: "task-grandma"`

- Priority Moderate, Status In Progress, created 20/06/2023
- Card / description: `Go back home and take grandma to the hospital.` (PNG truncates to `Go back home and take grandma to the hosp....`)
- Thumbnail: new local hospital/grandma SVG
- Detail can be description-only (no `detailDescription` / checklist unless copy exists — Figma does not show grandma selected)

Scheduled times for incomplete tasks must be **in the future** relative to `now` (AGENTS.md past-schedule rule), even in fixtures.

### Typography

| Role | Style |
| --- | --- |
| Panel title “Vital Tasks” | Inter 15px medium, foreground; coral underline on “Vital” |
| List task title | Inter 16px semibold |
| Detail title | Inter 16–20px semibold |
| Body / list | Inter 14px `text-body` |
| Meta | Inter 10–12px; status/priority token colors; created date muted |
| Nav / header | Unchanged |

Montserrat is **not** used on this page.

### Spacing

- 8px grid: `gap-2`, `gap-3`, `gap-4`, `gap-6`.
- No `space-y-*` / `space-x-*`.
- Equal width/height: `size-*`.
- Icon tiles 8px radius (`rounded-lg`). Cards/panels `rounded-card`.
- Header thumb-to-text gap ~15–24px. Body stacked below the header with `gap-4` / `gap-6`. Actions `mt-auto` + `justify-end`.

### Colors

- Canvas `bg-background`, panels `bg-card`, actions `bg-primary` / `text-primary-foreground`.
- Extreme / Not Started: `text-priority-extreme`, `text-status-not-started`.
- Moderate / In Progress: `text-priority-moderate`, `text-status-in-progress`.
- No `text-red-500`, `bg-[#...]`, or Button color overrides via `className`.

### Responsiveness (minimal)

- **`lg+`:** two equal-height boards as the mock; list slightly narrower than detail.
- **Below `lg`:** stack; list first; detail second; still no horizontal overflow at 375px.
- Detail action buttons remain bottom-right of the detail panel.
- Do not build a second mobile design.

### Pixel-perfect expectations

- Compare at ~1440px to `prompts-img/Vitals.png`.
- Two white boards on cool canvas; **Vital Tasks** with coral underline under **Vital** only.
- First card’s Walk the dog detail on the right: dog thumb, Extreme/Not Started, two paragraphs, numbered 1–6, coral trash + edit at the **bottom-right of the detail panel**.
- Sidebar **Vital Task** white pill (already pathname-based).
- Inter; 14px card radius; 8px icon buttons.
- Wordmark and sidebar stay the **existing** Dashboard shell (Dashboard / Agent labels), not a rebuild of Figma’s “To-Do” / Settings / Help.

## Files likely to change

- `app/(app)/vital-task/page.tsx` — Server Component: load `getVitalTasks`, `toTaskView`, pass props into a client view; drop `StubPage`
- `components/vital-task/vital-task-view.tsx` — client: selected id, list + detail
- `components/vital-task/vital-task-detail-panel.tsx` — presentational detail (header + unlabeled body + two buttons)
- `lib/dashboard/mock-data.ts` — `detailDescription?`, `getVitalTasks`, include vitals in `getTaskById`
- `public/dashboard/thumb-hospital.svg` (name can vary)

Do **not** change `app/(app)/page.tsx` fixture wiring, `TaskDetailPanel`, `ViewTaskView`, `MyTaskView`, `proxy.ts`, `env.ts`, `app/globals.css`, or shell components.

Keep files small. Page stays a Server Component; selection and menus stay client.

## Implementation requirements

1. **App Router:** keep `(app)` layout. Vital Task page is a Server Component that passes serializable task views into `VitalTaskView`.
2. **Typed fixtures.** Extend `DashboardTask` (and `toTaskView` output) with optional `detailDescription?: string`. Reuse existing `checklist?: string[]`. No `any`. Overdue helper may stay; **do not** show an Overdue badge (not in the PNG).
3. **shadcn:** full Card composition on panels. Icons in Buttons: `data-icon` only when the button has a visible label; icon-only buttons use `size="icon"` / `icon-lg` + `aria-label`, no extra `size-*` on the SVG. `DropdownMenuItem` inside `DropdownMenuGroup`. `cn()` for selected card (already in `TaskCard`). Empty states use `Empty`.
4. **Images:** `next/image` for local thumbs; meaningful `alt` on task images.
5. **Dates:** `formatNumericDate` only; do not add date-fns.
6. **Accessibility:** list is a selection list (buttons); selected task announced; icon-only Edit/Delete have names; heading hierarchy `h1` is the panel title “Vital Tasks”; numbered list is an `ol`.
7. **Do not** implement create/update/delete persistence, notifications, filters, search-on-this-page, or Mark Vital state.
8. TypeScript strict; no unused files; no unrelated refactors (Dashboard, My Task, View Task, Settings, Agent, Add Task).

## Security requirements

- No new env vars. No service-role key. No secrets in client components.
- No `dangerouslySetInnerHTML`.
- Do not enable Clerk `auth.protect()` on `/vital-task`.
- Presentational Edit/Delete/Logout must not call external APIs.

## Acceptance criteria

- [ ] `http://localhost:3000/vital-task` shows the two-panel Vital Tasks UI inside the existing shell, not `StubPage`.
- [ ] Sidebar Vital Task item is the active white pill.
- [ ] Left: “Vital Tasks” with coral underline under “Vital”; two cards — Walk the dog (Extreme, Not Started) and Take grandma to hospital (Moderate, In Progress).
- [ ] Clicking a card updates the right panel; first task is Walk the dog with two paragraphs, numbered 1–6, and trash + edit only.
- [ ] Detail has large thumb, meta, coral squares bottom-right; those controls do not persist changes.
- [ ] Dashboard `/` still shows the original To-Do / Completed fixtures, including completed **Walk the dog**.
- [ ] `/my-task` is unchanged (four cards, labeled `TaskDetailPanel`, two buttons).
- [ ] `/my-task/task-walk-dog` and `/my-task/task-grandma` resolve via View Task (header + whatever fields those fixtures have); `/my-task/task-dog` remains the Dashboard completed dog if opened.
- [ ] Semantic tokens only; Extreme uses `text-priority-extreme`; Inter; card radius 14px.
- [ ] Narrow viewport: stacked columns, no horizontal overflow.
- [ ] No ClerkProvider, no Supabase, no task API routes.
- [ ] `npm run typecheck` and `npm run lint` pass. `npm run build` because the `/vital-task` page changed.

## Checks to run

From the repo root:

```bash
npm run typecheck
npm run lint
```

Run `npm run format` (or `npx ultracite fix` on touched files) if format issues are reported.

Run `npm run build` because `app/(app)/vital-task/page.tsx` changed. If the build fails only because Clerk env vars are missing, report that as an existing env blocker.

## Exact manual test steps expected after implementation

1. `npm run dev` and open `http://localhost:3000/vital-task` (or click **Vital Task** from the sidebar).
2. Confirm the stub title is gone. Compare ~1440px width to `prompts-img/Vitals.png`: two white boards, heading underline under “Vital”, Walk the dog detail on the right with numbered 1–6.
3. Confirm sidebar: Vital Task white pill; Dashboard / My Task / etc. still navigate; no Settings item.
4. Click **Take grandma to hospital** — detail title, status, priority, and thumbnail update; no fake dog checklist.
5. Click the list card `⋯` → **View** — opens `/my-task/{id}` View Task page. Go Back returns to `/my-task` (existing View Task behavior). Clicking the card itself only selects.
6. Click detail trash and detail edit — no crash, no network, no navigation.
7. Open `/` — Completed Task still includes the original **Walk the dog** card. To-Do is still birthday / landing / presentation.
8. Open `/my-task` — still the four My Task cards and labeled detail panel.
9. Resize to ~375px — no horizontal scrollbar; list stacks above detail; edit/delete still reachable.
10. Confirm no `bg-[#...]` / `text-red-500` in new Vital Task components; Extreme text uses the priority-extreme token.
