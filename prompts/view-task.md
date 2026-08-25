# View Task page UI

## Goal

Add the **View Task** full-page detail from `prompts-img/View Task.png`: a single white board with a large thumbnail, title + priority/status/created meta, **Go Back**, a plain description, a numbered list, an **Optional** section, and three coral icon actions (delete, edit, mark vital).

This pass is **pixel-faithful UI + mock task data**. Do **not** add Supabase, task CRUD APIs, Clerk route protection, Settings, Vital Task product UI, Categories, Calendar, or Agent chat.

Do **not** replace the My Task split view (`/my-task` list + `TaskDetailPanel`). View Task is a **separate route** opened from a task.

## Skills read

- `AGENTS.md` (product scope, architecture layers, prompt workflow, checks, escaped plain text)
- `.agents/skills/clerk/SKILL.md` → `clerk-nextjs-patterns` (server vs client; keep current public-first `proxy.ts`, no `auth.protect()`, no `ClerkProvider`)
- `.claude/skills/shadcn/SKILL.md` plus `rules/styling.md`, `rules/composition.md`, `rules/icons.md` (semantic tokens, `gap-*`, `size-*`, `cn()`, lucide, Card/Empty composition, `data-icon`, no `space-y-*`)
- `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/04-linking-and-navigating.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/12-images.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/dynamic-routes.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md` (`params` is a `Promise`; `PageProps`)
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/not-found.md`
- `prompts/design-system.md` (canonical tokens already in `app/globals.css`)
- `prompts/dashboard.md` / `prompts/my-task.md` (shell, mock-data rules, presentational menus)

Supabase and AI SDK are **not** needed. Clerk stays plumbing-only.

## Existing code inspected

- `app/(app)/layout.tsx` — shared shell; `dynamic = "force-dynamic"`; mock profile + live date. **Do not rebuild the shell.**
- `app/(app)/my-task/page.tsx` — Server Component: `getMyTasks` → `MyTaskView`. Keep the two-panel list + detail. Do **not** turn this into View Task.
- `components/my-task/my-task-view.tsx` — client selection; list `TaskCard` `onSelect`. Keep click-to-select.
- `components/my-task/task-detail-panel.tsx` — labeled Task Title / Objective / Task Description / Additional Notes / Deadline; **two** icon buttons (trash, edit). Different layout from the PNG. Leave this panel’s anatomy alone.
- `components/dashboard/task-card.tsx` — `⋯` Edit/Delete inert; optional `selected` / `onSelect`. Dashboard cards have no select handler.
- `components/app-shell/app-nav.tsx` — `pathname === item.href` only, so `/my-task/:id` would **not** keep My Task as the white pill. Must fix prefix matching for this nested route.
- `lib/dashboard/mock-data.ts` — `DashboardTask` with optional My Task fields (`contentTitle`, `objective`, `additionalNotes`, `deadlineLabel`). Birthday fixture `task-birthday` exists in **both** `getMockTasks` and `getMyTasks` (same id). No checklist / optional-items fields yet. No `getTaskById`.
- `lib/dashboard/dates.ts` — `formatNumericDate` (`DD/MM/YYYY`, `en-GB`)
- `app/globals.css` — coral primary, canvas, `--radius-card` 14px, `--radius` 8px, `shadow-panel`, status/priority tokens
- `components/ui/*` — `button`, `card`, `dropdown-menu`, `empty`. No `alert-dialog` required for this pass
- `public/dashboard/thumb-party.svg` — reuse for the PNG’s party thumbnail
- `prompts-img/View Task.png` — visual source of truth for this pass
- `package.json` — Next 16, React 19, no Supabase, no date-fns
- `proxy.ts` / `env.ts` — unchanged

## Decisions or assumptions

1. **Route is `/my-task/[taskId]`.** Nested under My Task so the sidebar can stay on My Task. Example: `/my-task/task-birthday`. Do **not** add `/view-task`, `/tasks/[id]`, or a query-param overlay. Do **not** change `/my-task` itself into this layout.
2. **Reuse the existing shell.** Header and coral sidebar stay as-is. Search / bell / calendar / logout remain presentational. Header search does **not** filter this page.
3. **My Task split view stays.** Clicking a My Task list card still **selects** the right panel. Add a **View** item to the card `⋯` menu that `Link`s to `/my-task/[taskId]`. Do not navigate on card click on My Task (that would break `prompts/my-task.md`).
4. **Dashboard entry.** Dashboard To-Do cards have no detail panel. Clicking the card (same overlay-button pattern as My Task select, but as a `Link`) navigates to `/my-task/[taskId]`. Also add **View** to the Dashboard `⋯` menu. Do **not** select-highlight Dashboard cards.
5. **Lookup is mock-only.** Add `getTaskById(id, now)` that searches the union of `getMockTasks(now)` and `getMyTasks(now)` by `id` (first match). Duplicate `task-birthday` is the same logical task. Unknown ids call `notFound()`.
6. **Tasks created in the Add Task dialog this session are not on this route.** They live only in Dashboard client state. Do not invent a client store or URL for those. View Task reads server fixtures only.
7. **Structured View Task body fields** live on the fixture, not parsed from description:

   - `description` — intro paragraph on View Task (and still the card snippet)
   - `checklist` — optional `string[]`; numbered list (`<ol>`); omit the list if empty/missing
   - `optionalItems` — optional `string[]`; **Optional:** heading + bullets; omit the section if empty/missing

   Do **not** reuse My Task’s `contentTitle` / `objective` / `additionalNotes` / `deadlineLabel` as View Task labels. Those stay for `TaskDetailPanel` only. View Task does **not** show “Task Title:”, “Objective:”, “Task Description:”, “Additional Notes:”, or “Deadline for Submission:”.
8. **Birthday fixture matches the PNG** (the default visual). Keep `id: "task-birthday"`, Moderate, Not Started, `createdAt` `2023-06-20`, `thumb-party.svg`. Set:

   - Title: `Attend Nischal's Birthday Party`
   - Description: `Buy gifts on the way and pick up cake from the bakery. (6 PM | Fresh Elements)` (no trailing `.....`)
   - Checklist:
     1. `A cake, with candles to blow out. (Layer cake, cupcake, flat sheet cake)`
     2. `The birthday song.`
     3. `A place to collect gifts.`
   - Optional:
     - `Paper cone-shaped party hats, paper whistles that unroll.`
     - `Games, activities (carry an object with your knees, then drop it into a milk bottle.)`
     - `Lunch: sandwich halves, or pizza slices, juice, pretzels, potato chips...THEN cake & candles and the song.`

   Update **both** birthday copies in `getMockTasks` and `getMyTasks` so Dashboard / My Task / View Task stay consistent. Other fixtures may omit `checklist` / `optionalItems`; View Task then shows header + description + actions only.
9. **Go Back** is a text control, top-right of the **card**, underlined, `text-foreground` (not coral). It is a `Link` to `/my-task` (or `Button variant="link"` rendering a `Link`). It is **not** `router.back()` (must not leave the app). It is **not** the Add Task dialog’s Go Back.
10. **Actions stay presentational.** Delete, Edit, and Mark Vital are `type="button"`, no network, no confirm dialog, no navigation, no mock-state mutation. Mark Vital does **not** open `/vital-task`.
11. **Unknown task UI.** `notFound()` plus `app/(app)/my-task/[taskId]/not-found.tsx` inside the app shell: shadcn `Empty` + a Go Back `Link` to `/my-task`. Do not hand-roll a one-off empty layout.
12. **Sidebar active state.** In `app-nav.tsx`, Dashboard (`/`) is active only on exact `/`. Other items are active when `pathname === href` **or** `pathname.startsWith(href + "/")`. Then `/my-task/task-birthday` shows the My Task white pill, matching the PNG.
13. **Params.** The page is a Server Component. `await params` (Promise). Prefer `PageProps<'/my-task/[taskId]'>` if `next typegen` types exist; otherwise explicit `{ params: Promise<{ taskId: string }> }`. `generateMetadata` uses the task title when found.
14. **Do not paste Figma absolute-positioned code.** Adapt to App Router + tokens.
15. Leave `proxy.ts`, `env.ts`, Button CVA, `app/globals.css`, Add Task dialog, and Dashboard column chrome alone. No new CSS tokens.
16. Do not install Dialog, Sheet, AlertDialog, Calendar, or date libraries. Prefer `overflow-y-auto` over `scroll-area`.

## Visual interpretation

Canonical canvas: **1440×1024** desktop. Light mode. Semantic token classes only (`bg-primary`, `bg-card`, `text-status-not-started`, `text-priority-moderate`, `rounded-card`, `shadow-panel`, `font-sans`). Never raw hex or Tailwind palette colors.

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER (existing)                                           │
├──────────────┬──────────────────────────────────────────────┤
│ SIDEBAR      │  canvas bg-background                         │
│ (existing)   │  px ~24–32px  py ~24–32px                     │
│ My Task pill │  ┌─────────────────────────────────────────┐ │
│ active       │  │ [thumb]  Title              Go Back     │ │
│              │  │          Priority / Status              │ │
│              │  │          Created on                     │ │
│              │  │                                         │ │
│              │  │  description paragraph                  │ │
│              │  │  1. …  2. …  3. …                       │ │
│              │  │  Optional:                              │ │
│              │  │  • …                                    │ │
│              │  │                    [🗑] [✎] [!]         │ │
│              │  └─────────────────────────────────────────┘ │
└──────────────┴──────────────────────────────────────────────┘
```

- Main: one full-width white board filling the canvas (not two columns).
- Board: `Card` with `bg-card`, `rounded-card` (14px), `shadow-panel`, thin `border` if the PNG stroke needs it, inner padding **~24–32px**.
- On desktop, the card should feel like the PNG’s tall board (`flex-1 min-h-0` in the shell main), not a short card floating in empty canvas. Body text can `overflow-y-auto` if it exceeds the viewport.
- Do **not** show a page heading “View Task” or “My Tasks”. The PNG has no extra title above the card.

### Card header

| Element | Spec |
| --- | --- |
| Thumbnail | Left. Square **~184–208px** (`size-48` / `size-52`), `rounded-lg`, `object-cover`. Larger than My Task’s ~160–184px detail thumb. |
| Title | Right of image. Inter semibold **~20–24px**, `text-foreground`. `h1`. |
| Priority | `Priority: Moderate` — label `text-foreground` ~14px; value uses `priorityTextClass` (Moderate = `text-priority-moderate`). |
| Status | `Status: Not Started` — value uses `statusTextClass` (Not Started = `text-status-not-started`). |
| Created | `Created on: DD/MM/YYYY` — `text-muted-foreground` ~12px. `formatNumericDate` only. |
| Go Back | Top-right of the **card** (same row as the thumb/title block, aligned to the top). Underlined, ~14px, `text-foreground`. Do not put it in the app header. |

Stack meta lines with `gap-1` / `gap-2`. Title + meta sit in a `flex` row with the thumb; Go Back is `ml-auto` on that header row (or a nested header with title block + link).

### Card body

| Element | Spec |
| --- | --- |
| Description | Unlabeled wrapping paragraph, `text-body` 14px. **No** “Task Description:” label. |
| Checklist | Native numbered list (`<ol className="list-decimal">`) with `pl-5`, `flex flex-col gap-1` (no `space-y-*`). `text-body` 14px. Numbers visible like the PNG. |
| Optional | Heading **Optional:** Inter semibold ~14px `text-foreground` (or `text-body` if that matches the PNG’s slightly muted label — prefer `text-foreground` + font-semibold). Then `ul` `list-disc` `pl-5` `gap-1` `text-body` 14px. |
| Actions | Bottom-right of the card: **three** coral square `Button` `size="icon"` (~34–36px, `rounded-lg`), white lucide `Trash2`, `SquarePen` (or `Pencil`), `CircleAlert` (circle + exclamation, matching the PNG — not `TriangleAlert`). `aria-label` Delete / Edit / Mark vital. Order: delete, edit, mark vital. |

Render all fixture strings as **escaped plain text** (React text nodes). No `dangerouslySetInnerHTML`. Lists are `string[]`, not markdown.

### Typography

| Role | Style |
| --- | --- |
| Task title | Inter 20–24px semibold |
| Priority / Status labels | Inter 14px regular; colored values via tokens |
| Created on | Inter 12px muted |
| Go Back | Inter 14px underline |
| Description / lists | Inter 14px `text-body` |
| Optional heading | Inter 14px semibold |
| Nav / header | Unchanged |

Montserrat is **not** used on this page.

### Spacing

- 8px grid: `gap-2`, `gap-3`, `gap-4`, `gap-6`.
- No `space-y-*` / `space-x-*`.
- Equal width/height: `size-*` (thumb, icon buttons).
- Icon tiles 8px radius (`rounded-lg`). Card `rounded-card`.
- Header thumb-to-text gap ~20–24px. Body stacked below the header with `gap-4` / `gap-6`. Actions `mt-auto` + `justify-end`.

### Colors

- Canvas `bg-background`, card `bg-card`, actions `bg-primary` / `text-primary-foreground`.
- Moderate / In Progress: `text-priority-moderate`, `text-status-in-progress`.
- Extreme / Not Started: `text-priority-extreme`, `text-status-not-started`.
- Go Back is foreground/underline, **not** `text-primary`, so it matches the PNG (black link, not coral).
- No `text-red-500`, `bg-[#...]`, or Button color overrides via `className`.

### Responsiveness (minimal)

- **`lg+`:** full-width board as the mock; thumb left, meta right, Go Back top-right, actions bottom-right.
- **Below `lg`:** stack thumb above title/meta; Go Back still top-right of the card; actions still bottom-right; no horizontal overflow at 375px.
- Do not build a second mobile design.

### Pixel-perfect expectations

- Compare at ~1440px to `prompts-img/View Task.png`.
- One white board on cool canvas; **no** My Tasks list column.
- Party thumb + **Attend Nischal's Birthday Party**; Moderate blue; Not Started coral; Created on 20/06/2023.
- **Go Back** top-right underlined.
- Unlabeled intro sentence, then **1. 2. 3.** cake / song / gifts, then **Optional:** bullets.
- Three coral squares bottom-right: trash, edit, circle-exclamation.
- Sidebar **My Task** white pill while on `/my-task/task-birthday`.
- Inter; 14px card radius; 8px icon buttons.

## Files likely to change

- `app/(app)/my-task/[taskId]/page.tsx` — Server Component: `await params`, `getTaskById`, `toTaskView`, `notFound()`, `generateMetadata`, render view
- `app/(app)/my-task/[taskId]/not-found.tsx` — Empty + Go Back
- `components/my-task/view-task-view.tsx` (name can vary) — presentational full-page card (Server Component is fine if no client state; buttons can be inert without `"use client"`)
- `components/dashboard/task-card.tsx` — optional `href` for card click; **View** `DropdownMenuItem` via `Link` (`render` / Base UI, not Radix `asChild`)
- `components/dashboard/dashboard-view.tsx` — pass `href={`/my-task/${task.id}`}` into To-Do cards (and completed cards only if they should be viewable; completed **may** link the same way so View Task works for them)
- `components/my-task/my-task-view.tsx` — pass view `href` into the `⋯` menu only; keep `onSelect` for the card surface
- `components/app-shell/app-nav.tsx` — prefix-aware active state
- `lib/dashboard/mock-data.ts` — `checklist`, `optionalItems`, birthday copy, `getTaskById`

Do **not** change `TaskDetailPanel` layout, Add Task dialog, `proxy.ts`, `env.ts`, or `app/globals.css`.

Keep files small. Page stays a Server Component.

## Implementation requirements

1. **App Router:** keep `(app)` layout. Dynamic segment `[taskId]`. Await `params`. Call `notFound()` when missing.
2. **Typed fixtures.** Extend `DashboardTask` with optional `checklist?: string[]` and `optionalItems?: string[]`. Include them on `DashboardTaskView` via `toTaskView`. No `any`.
3. **shadcn:** full Card composition (`CardHeader` / `CardContent`; actions can be a second `CardContent` or `CardFooter` with `mt-auto justify-end`). Icons in labeled buttons use `data-icon`; icon-only buttons use `size="icon"` + `aria-label`, no extra `size-*` on the SVG. `DropdownMenuItem` inside `DropdownMenuGroup`. `Empty` for not-found. `cn()` only when needed.
4. **Linking:** `next/link` for Go Back, View menu, and Dashboard card navigation. Prefetch is default — do not disable it.
5. **Images:** `next/image` + `unoptimized` for `/dashboard/*` thumbs; meaningful `alt`. If a future blob thumb ever appeared here, follow `TaskCard`’s `<img>` exception — it should not appear on this server page.
6. **Dates:** `formatNumericDate` only; do not add date-fns.
7. **Accessibility:** one `h1` (task title); Go Back is a real link; icon-only actions have names; numbered list is an `ol`; Optional is a heading (`h2` is fine).
8. **Do not** implement persist delete/edit/vital, notifications, filters, or search-on-this-page.
9. TypeScript strict; no unused files; no unrelated refactors (Vital Task page, Settings, Agent, Add Task).

## Security requirements

- No new env vars. No service-role key. No secrets in client components.
- No `dangerouslySetInnerHTML`.
- Do not enable Clerk `auth.protect()` on `/my-task/[taskId]`.
- Presentational Edit/Delete/Vital/Logout must not call external APIs.
- Do not put task ids from the URL into unsanitized HTML.

## Acceptance criteria

- [ ] `http://localhost:3000/my-task/task-birthday` shows the View Task board inside the existing shell, matching `prompts-img/View Task.png` (thumb, meta, Go Back, description, numbered list, Optional, three coral icons).
- [ ] Sidebar My Task item is the active white pill on that URL.
- [ ] `/my-task` is still the two-panel My Task UI; selecting cards still updates `TaskDetailPanel`; that panel still has two buttons, not three.
- [ ] My Task card `⋯` → **View** opens `/my-task/{id}`. Card click on My Task still only selects.
- [ ] Dashboard To-Do card click (and `⋯` View) opens `/my-task/{id}` for fixture ids.
- [ ] Go Back returns to `/my-task`.
- [ ] `/my-task/not-a-real-id` shows the not-found Empty + Go Back, not a crash.
- [ ] Delete / Edit / Mark vital do not persist, navigate, or error.
- [ ] Semantic tokens only; Inter; card radius 14px; no `bg-[#...]`.
- [ ] Narrow viewport: stacked header, no horizontal overflow.
- [ ] No ClerkProvider, no Supabase, no task API routes.
- [ ] `npm run typecheck` and `npm run lint` pass. `npm run build` because a new dynamic page was added.

## Checks to run

From the repo root:

```bash
npm run typecheck
npm run lint
```

Run `npm run format` (or `npx ultracite fix` on touched files) if format issues are reported.

Run `npm run build` because `app/(app)/my-task/[taskId]/page.tsx` is new. If the build fails only because Clerk env vars are missing, report that as an existing env blocker.

## Exact manual test steps expected after implementation

1. `npm run dev` and open `http://localhost:3000/my-task/task-birthday`. Compare ~1440px to `prompts-img/View Task.png`: one white board, party thumb, Go Back, numbered cake/song/gifts, Optional bullets, three coral icons.
2. Confirm sidebar: My Task white pill; Dashboard / Vital Task / etc. still navigate.
3. Click **Go Back** — land on `/my-task` split view, not `/` and not off-site.
4. On My Task, click **Attend Nischal's Birthday Party** — right panel still selects (two action buttons). Open that card’s `⋯` → **View** — full View Task page with checklist + Optional.
5. Open **Submit Documents** via `⋯` View — header + description (and any fields that fixture has); no fake birthday checklist.
6. From Dashboard `/`, click the birthday To-Do card — same View Task URL. `⋯` View also works.
7. Click trash, edit, and mark-vital — no crash, no network, no navigation.
8. Visit `/my-task/does-not-exist` — Empty not-found + Go Back to My Task.
9. Resize to ~375px — no horizontal scrollbar; Go Back and the three actions still reachable.
10. Confirm no `bg-[#...]` / `text-red-500` in new View Task components; Moderate/Not Started use priority/status tokens.
