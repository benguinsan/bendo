# Task Categories page UI

## Goal

Replace the title-only stub at `/task-categories` with the **Task Categories** management board from `prompts-img/Task Categories.png`: one white panel titled **Task Categories**, an **Add Category** button, then two tables — **Task Status** and **Task Priority** — inside the existing authenticated app shell.

This pass is **pixel-faithful UI + mock taxonomy rows**. Do **not** add Supabase, category/task APIs, Clerk route protection, Settings, Calendar product UI, or Agent chat.

Do **not** implement these related screens in this pass (follow-ups):

- `prompts-img/Create Categories.png` (full-page create form)
- `prompts-img/Add Task Priority.png` (modal)
- `prompts-img/Edit Task Status.png` (modal)
- `prompts-img/Edit Task Priority.png` (modal)

Do **not** change Dashboard, My Task, View Task, Vital Task, or the Add Task dialog.

## Skills read

- `AGENTS.md` (product scope, category storage rules deferred, architecture layers, prompt workflow, checks, escaped plain text)
- `.agents/skills/clerk/SKILL.md` → `clerk-nextjs-patterns` (server vs client; keep current public-first `proxy.ts`, no `auth.protect()`, no `ClerkProvider`)
- `.claude/skills/shadcn/SKILL.md` plus `rules/styling.md`, `rules/composition.md`, `rules/icons.md` (semantic tokens, `gap-*`, `size-*`, `cn()`, lucide, Card/Table/Empty/Button composition, `data-icon`, no `space-y-*`)
- `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/04-linking-and-navigating.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`
- `prompts/design-system.md` (canonical tokens already in `app/globals.css`)
- `prompts/dashboard.md` / `prompts/my-task.md` / `prompts/view-task.md` / `prompts/vital-task.md` (shell, mock-data, Go Back, coral first-word underline)
- `prompts/add-task.md` (already deferred Add Task Priority; this prompt does not pick that modal up)

Supabase and AI SDK are **not** needed. Clerk stays plumbing-only.

## Existing code inspected

- `app/(app)/layout.tsx` — shared shell; `dynamic = "force-dynamic"`; mock profile + live date. **Do not rebuild the shell.**
- `app/(app)/task-categories/page.tsx` — `StubPage` titled “Task Categories” (replace contents; keep route and metadata title)
- `components/app-shell/app-nav.tsx` — `/task-categories` already exists; prefix matching already highlights this item. No nav change required.
- `components/app-shell/stub-page.tsx` — title-only placeholder; stop using it on this route
- `components/my-task/view-task-view.tsx` — **Go Back** is a `Link` (`text-sm underline`) in `CardAction`, not `router.back()`. Reuse that pattern; target **`/`** (Dashboard)
- `components/vital-task/vital-task-view.tsx` — panel title uses nested span + `border-b-2 border-primary` under the **first word** only
- `components/dashboard/todo-column.tsx` — **+ Add task** is `Button variant="link"` with `PlusIcon`; match that for “+ Add Task Status” / “+ Add New Priority”
- `components/dashboard/add-task-dialog.tsx` — Dialog already exists; **do not** open it from this page
- `lib/dashboard/mock-data.ts` — `TaskStatus`, `TaskPriority`, `statusLabels`, `priorityLabels`. Reuse labels. Do **not** change task fixtures or enum unions
- `lib/tasks/task-input.ts` — `priorityOptions` / Zod priority enum stay the source of truth for **tasks**. This page must **not** add/remove statuses or priorities that tasks use
- `app/globals.css` — coral primary, canvas, `--radius-card` 14px, `--radius` 8px, `shadow-panel`, status/priority tokens. No new tokens required
- `components/ui/*` — `button`, `card`, `dialog`, `empty`, `separator`, `field`. **No** `table` yet
- `components.json` — `base-nova`, Tailwind v4, `iconLibrary: lucide`, Base UI (`render` not `asChild`)
- `prompts-img/Task Categories.png` — visual source of truth for this pass
- `package.json` — Next 16, React 19, no Supabase
- `proxy.ts` / `env.ts` — unchanged

## Decisions or assumptions

1. **Route stays `/task-categories`.** Keep `metadata.title` as `Task Categories · bendo`. Do **not** add `/categories`, `/task-status`, or nested `/task-categories/create`.
2. **Reuse the existing shell.** Header (search, bell, calendar, live date) and coral sidebar stay as Dashboard built them. Nav already highlights Task Categories via `usePathname`. Do **not** add Settings. Do **not** relabel Agent/Help.
3. **Match the PNG, not a user-category list.** The screenshot is two taxonomy tables (status + priority), plus a page-level **Add Category** button. AGENTS.md user-owned `categories` (unique names, delete-vs-detach) is **out of scope**. Do not invent a third “Work / Personal” table.
4. **Status and priority remain fixed app enums.** Rows are the existing three statuses and three priorities, in **screenshot order**:
   - Status: Completed → In Progress → Not Started
   - Priority: Extreme → Moderate → Low
   SN is 1-based display index, not a stored id.
5. **Presentational mutations only.** **Add Category**, **+ Add Task Status**, **+ Add New Priority**, **Edit**, and **Delete** are `type="button"` controls: no dialogs, no confirm, no network, no local list mutation, no change to `task-input.ts` or other pages. Refresh still shows the same six rows.
6. **Go Back** is a `Link` to `/` (Dashboard), same underline style as View Task. It is not `router.back()`.
7. **Mock data only.** No `POST/PATCH/DELETE /api/categories`. No `categories` table, migrations, or generated DB types.
8. **Install shadcn `table`** from the project default registry (`@shadcn` implied by `components.json`): `npx shadcn@latest add table`. Use full Table composition (`Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`). Do **not** hand-roll `<table>` markup. Do **not** add AlertDialog, Sheet, Sonner, or form libraries.
9. **Empty states** use shadcn `Empty` if a table has zero rows (defensive; default fixtures are not empty). Do not hand-roll empty markup.
10. **Search / bell / calendar / logout** remain as in the shell. Header search does **not** filter these tables.
11. **Do not paste Figma absolute-positioned code.** Adapt to App Router + tokens.
12. Leave `proxy.ts`, `env.ts`, Button CVA, `app/globals.css`, Add Task dialog, task fixtures, and shell files alone.
13. Prefer a Server Component page + presentational view. `"use client"` is **not** required if there is no client state. Keep files small.

## Visual interpretation

Canonical canvas: **1440×1024** desktop. Light mode. Semantic token classes only (`bg-primary`, `bg-card`, `text-foreground`, `rounded-card`, `shadow-panel`, `font-sans`). Never raw hex or Tailwind palette colors (`bg-[#...]`, `text-red-500`).

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER (existing)                                           │
├──────────────┬──────────────────────────────────────────────┤
│ SIDEBAR      │  canvas bg-background                         │
│ (existing)   │  px ~24–32px  py ~24–32px                     │
│ Task         │  ┌─────────────────────────────────────────┐ │
│ Categories   │  │ Task Categories              Go Back    │ │
│ white pill   │  │ ~~~~                                     │ │
│              │  │ [ Add Category ]                         │ │
│              │  │                                          │ │
│              │  │ Task Status          + Add Task Status   │ │
│              │  │ ┌─────────────────────────────────────┐ │ │
│              │  │ │ SN | Task Status | Action           │ │ │
│              │  │ │ 1  | Completed   | [Edit] [Delete]  │ │ │
│              │  │ └─────────────────────────────────────┘ │ │
│              │  │                                          │ │
│              │  │ Task Priority        + Add New Priority  │ │
│              │  │ ┌─────────────────────────────────────┐ │ │
│              │  │ │ SN | Task Priority | Action         │ │ │
│              │  │ │ 1  | Extreme       | [Edit] [Delete]│ │ │
│              │  │ └─────────────────────────────────────┘ │ │
│              │  └─────────────────────────────────────────┘ │
└──────────────┴──────────────────────────────────────────────┘
```

- Main: single white `Card` / panel on cool canvas, same outer padding as View Task / Vital Task (`px-4 py-6 sm:px-6 lg:px-8 lg:py-8`).
- Panel: `bg-card`, `rounded-card` (14px), `shadow-panel`, thin muted border if the PNG stroke needs it (`ring-1 ring-foreground/10` is already on Card; keep or use a light `border`). Inner padding **~20–32px**.
- On desktop, the panel should fill remaining viewport height (`flex-1` in a `min-h-0` column) like View Task’s full-height board, not a short card floating in empty canvas. Inner content `overflow-y-auto` if tables overflow.
- Below `lg`: same single column; no horizontal overflow at 375px.

### Page header (inside the card)

| Element | Spec |
| --- | --- |
| Heading | Inter medium **~15–16px**, `text-foreground` (black, **not** coral). Copy: **Task Categories**. Use `h1`. |
| Underline | Short coral bar **only under “Task”** (same nested-span `border-b-2 border-primary` as Vital Tasks / My Tasks). Do **not** underline “Categories”. |
| Go Back | Top-right of the card header (`CardAction`). `Link` to `/`. Inter ~14px, `text-foreground`, underline + `underline-offset-2`. |
| Add Category | Below the title, left-aligned, prominent coral `Button` (default variant). Visible label **Add Category**. No icon required (none in the PNG). `type="button"`. |

### Section headers (each table)

| Element | Spec |
| --- | --- |
| Title | Inter medium **~15px**, `text-foreground`. Copy: **Task Status** / **Task Priority**. Use `h2`. |
| Underline | Coral bar under the **first word only** (“Task” in both titles). |
| Add link | Right-aligned `Button variant="link"` (primary coral). Copy exactly: **+ Add Task Status** and **+ Add New Priority**. Optional `PlusIcon` with `data-icon="inline-start"` only if it still reads like the PNG’s text link; the PNG is text, so **prefer text-only** `+ Add …`. |

Vertical `gap-6` / `gap-8` between the Add Category button, the status block, and the priority block. No `space-y-*`.

### Tables

| Element | Spec |
| --- | --- |
| Columns | **SN** (narrow), name column (**Task Status** or **Task Priority**), **Action** (right). |
| Header row | Light muted fill (`bg-muted` / `bg-secondary`), Inter medium ~14px, centered cells to match the PNG. |
| Body | Centered SN and name. Action cell: two coral buttons in a `flex` `gap-2` `justify-center`. |
| Border | Light gray table border, rounded corners ~8–12px (`rounded-lg` on a wrapper). Header/body separators like the PNG grid. |
| Rows | Three status rows and three priority rows as listed above. Render labels via `statusLabels` / `priorityLabels` (escaped plain text). |
| Edit | Coral `Button` (default), white `SquarePen` (or `Pencil`) + visible **Edit** label. `data-icon="inline-start"` on the icon. `aria-label` may repeat “Edit {label}”. Size `sm` or `default` so the pair fits; `rounded-lg`. |
| Delete | Same treatment with `Trash2` + **Delete**. Do **not** use `variant="destructive"` (PNG is coral, not red-destructive). |
| Icons | lucide. No extra `size-*` on icons inside Button. |

Do **not** color status/priority **names** with status/priority tokens in this table (the PNG is plain black body text).

### Typography

| Role | Style |
| --- | --- |
| Panel title “Task Categories” | Inter ~15px medium, foreground; coral underline on “Task” |
| Section titles | Inter ~15px medium, foreground; coral underline on “Task” |
| Table header | Inter ~14px medium |
| Table body | Inter ~14px regular, `text-foreground` |
| Go Back / add links | Inter ~14px; Go Back foreground underlined; add links `text-primary` |
| Add Category | Button default (coral, white label) |
| Nav / header | Unchanged |

Montserrat is **not** used on this page.

### Spacing

- 8px grid: `gap-2`, `gap-3`, `gap-4`, `gap-6`, `gap-8`.
- No `space-y-*` / `space-x-*`.
- Equal width/height: `size-*`.
- Icon+label buttons 8px radius (`rounded-lg`). Panel `rounded-card`.
- Title row uses Card header grid so Go Back sits top-right (`has-data-[slot=card-action]` already on CardHeader).

### Colors

- Canvas `bg-background`, panel `bg-card`, actions `bg-primary` / `text-primary-foreground`.
- Table chrome: `bg-muted` header, `border` / `text-muted-foreground` only for structure, not for row labels.
- No `text-red-500`, `bg-[#...]`, or Button color overrides via `className`.

### Responsiveness (minimal)

- **`lg+`:** one full-height board as the mock.
- **Below `lg`:** same stacked tables; Action buttons may wrap inside the cell (`flex-wrap`) but must stay reachable. No horizontal page overflow at 375px.
- Do not build a second mobile design.

### Pixel-perfect expectations

- Compare at ~1440px to `prompts-img/Task Categories.png`.
- One white board on cool canvas; **Task Categories** with coral underline under **Task** only; **Go Back** top-right; **Add Category** coral button under the title.
- Two tables with gray header row, SN 1–3, Edit + Delete coral buttons on every row.
- Sidebar **Task Categories** white pill (already pathname-based).
- Inter; 14px card radius; 8px controls.
- Wordmark and sidebar stay the **existing** Dashboard shell (Dashboard / Agent labels), not a rebuild of Figma’s “To-Do” / Settings / Help.

## Files likely to change

- `app/(app)/task-categories/page.tsx` — Server Component: drop `StubPage`; render the categories view
- `components/task-categories/task-categories-view.tsx` — page layout (header, Add Category, two sections)
- `components/task-categories/taxonomy-table.tsx` — shared presentational table (status vs priority via props)
- `components/ui/table.tsx` — added via shadcn CLI

Optional small helper in `lib/dashboard/` or `lib/task-categories/` for ordered row lists (id + label). Do **not** change `getMockTasks` / `getMyTasks` / `getVitalTasks`.

Do **not** change `proxy.ts`, `env.ts`, `app/globals.css`, shell components, Add Task, or other product pages.

Keep files small. Page stays a Server Component.

## Implementation requirements

1. **App Router:** keep `(app)` layout. Task Categories page is a Server Component.
2. **Typed rows.** Explicit ordered arrays of `{ id: TaskStatus; label: string }` and `{ id: TaskPriority; label: string }`. No `any`. Reuse `statusLabels` / `priorityLabels`.
3. **shadcn:** full Card composition on the board. Full Table composition. Icons in labeled Buttons: `data-icon="inline-start"`, no extra `size-*` on the SVG. Empty states use `Empty`. `cn()` only when needed.
4. **Accessibility:** `h1` is “Task Categories”; each table has a caption or `aria-labelledby` pointing at its `h2`. Icon+text buttons are fine; still give Delete/Edit a unique accessible name including the row label. Tables are real tables (not div grids).
5. **Do not** implement create/update/delete persistence, user-named categories, notifications, or search-on-this-page.
6. TypeScript strict; no unused files; no unrelated refactors.

## Security requirements

- No new env vars. No service-role key. No secrets in client components.
- No `dangerouslySetInnerHTML`. Render labels as React text nodes.
- Do not enable Clerk `auth.protect()` on `/task-categories`.
- Presentational Add/Edit/Delete/Logout must not call external APIs.

## Acceptance criteria

- [ ] `http://localhost:3000/task-categories` shows the Task Categories board inside the existing shell, not `StubPage`.
- [ ] Sidebar Task Categories item is the active white pill.
- [ ] Header: “Task Categories” with coral underline under “Task”; Go Back top-right navigates to `/`; Add Category coral button is visible and does not persist.
- [ ] Task Status table: SN 1–3, Completed / In Progress / Not Started, Edit + Delete on each row.
- [ ] Task Priority table: SN 1–3, Extreme / Moderate / Low, Edit + Delete on each row.
- [ ] “+ Add Task Status” and “+ Add New Priority” are visible and do not persist or open a modal.
- [ ] Dashboard `/`, `/my-task`, `/vital-task`, and Add Task are unchanged.
- [ ] Semantic tokens only; Inter; card radius 14px.
- [ ] Narrow viewport: stacked tables, no horizontal overflow; actions remain usable.
- [ ] No ClerkProvider, no Supabase, no category API routes, no create/edit modals.
- [ ] `npm run typecheck` and `npm run lint` pass. `npm run build` because the `/task-categories` page changed.

## Checks to run

From the repo root:

```bash
npm run typecheck
npm run lint
```

Run `npm run format` (or `npx ultracite fix` on touched files) if format issues are reported.

Run `npm run build` because `app/(app)/task-categories/page.tsx` changed. If the build fails only because Clerk env vars are missing, report that as an existing env blocker.

## Exact manual test steps expected after implementation

1. `npm run dev` and open `http://localhost:3000/task-categories` (or click **Task Categories** from the sidebar).
2. Confirm the stub title is gone. Compare ~1440px width to `prompts-img/Task Categories.png`: one white board, heading underline under “Task”, Add Category, two tables with Edit/Delete.
3. Confirm sidebar: Task Categories white pill; Dashboard / Vital Task / My Task / Agent still navigate; no Settings item.
4. Click **Go Back** — lands on Dashboard `/`.
5. Click **Add Category**, **+ Add Task Status**, **+ Add New Priority**, a row **Edit**, and a row **Delete** — no crash, no network, no dialog, tables still show the original six rows.
6. Open `/`, `/my-task`, `/vital-task` — layouts and fixture lists unchanged. Add Task on Dashboard still works.
7. Resize to ~375px — no horizontal scrollbar; both tables and action buttons remain reachable.
8. Confirm no `bg-[#...]` / `text-red-500` in new Task Categories components.
