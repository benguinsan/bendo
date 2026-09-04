# Add New Task dialog UI

## Goal

Replace the inert Dashboard **+ Add task** control with the **Add New Task** modal from `prompts-img/Add task.png`: a centered dialog over the existing authenticated app shell, with Title, Date, Priority, Task Description, optional image upload, **Go Back**, and **Done**.

This pass is **pixel-faithful UI + client-side mock create**. **Done** appends a new incomplete task to the Dashboard To-Do list in React state. Do **not** add Supabase, `POST /api/tasks`, Clerk route protection, Settings, the **Add Task Priority** modal (`prompts-img/Add Task Priority.png`), Vital Task, Categories, Calendar product UI, or Agent chat.

## Skills read

- `AGENTS.md` (product scope, task storage rules, architecture layers, prompt workflow, checks, escaped plain text, Zod at the server boundary later)
- `.agents/skills/clerk/SKILL.md` → `clerk-nextjs-patterns` (server vs client; keep current public-first `proxy.ts`, no `auth.protect()`, no `ClerkProvider`)
- `.claude/skills/shadcn/SKILL.md` plus `rules/styling.md`, `rules/forms.md`, `rules/composition.md`, `rules/icons.md`, `rules/base-vs-radix.md` (semantic tokens, `FieldGroup` + `Field`, Dialog title, `gap-*`, `size-*`, `cn()`, lucide, Base UI `render` not `asChild`, no manual overlay `z-index`)
- `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/12-images.md`
- `prompts/design-system.md` (canonical tokens already in `app/globals.css`)
- `prompts/dashboard.md` (shell, mock-data rules; Add task was presentational — this prompt supersedes that for the Add task control only)
- `prompts/my-task.md` (priority labels Extreme / Moderate / Low; coral underline under the first word of a panel title)

Supabase and AI SDK are **not** needed. Clerk stays plumbing-only.

## Existing code inspected

- `app/(app)/page.tsx` — Server Component Dashboard; loads `getMockTasks` and renders `TodoColumn` + status + completed. Must keep loading fixtures on the server; lift **task list state** into a client view so Done can append.
- `components/dashboard/todo-column.tsx` — **+ Add task** is `Button variant="link"` with `PlusIcon`; no handler. Wire this as `DialogTrigger`.
- `components/dashboard/task-card.tsx` — `next/image` + `unoptimized` for local thumbs. Needs a path that can render **blob/data** thumbnails from a chosen file without breaking existing fixture SVGs.
- `lib/dashboard/mock-data.ts` — `TaskPriority` is `low` \| `moderate` \| `extreme`; `priorityTextClass.low` is currently `text-muted-foreground` (no low token yet). Dashboard fixtures stay the initial list.
- `lib/dashboard/dates.ts` — `formatNumericDate` (`DD/MM/YYYY`, `en-GB`). Do not add date-fns.
- `app/globals.css` — coral `#ff6767`, `--priority-extreme`, `--priority-moderate`, `--status-completed` green. No `--priority-low` yet.
- `components/ui/*` — `button`, `card`, `dropdown-menu`, `input`, `badge`, `avatar`, `separator`, `empty`. **No** `dialog`, `field`, `textarea`, `radio-group`, `input-group`, `checkbox`, `calendar`, `popover`.
- `components.json` — `base-nova`, Tailwind v4, `iconLibrary: lucide`, Base UI (`render` not `asChild`).
- `package.json` — Next 16, React 19, Zod 4, no Supabase, no date-fns, no react-day-picker.
- `prompts-img/Add task.png` — visual source of truth for this pass.
- `proxy.ts` / `env.ts` — unchanged.

## Decisions or assumptions

1. **Trigger is Dashboard only.** Open from To-Do **+ Add task**. Do **not** add an Add task control on My Task (that page’s mock has none). Do **not** add a standalone `/add-task` route.
2. **Overlay is shadcn `Dialog`**, not Sheet/Drawer/a full page. Dimmed dashboard stays visible behind. Do not hand-roll a modal.
3. **Go Back closes** the dialog without saving (same as overlay click / Escape). It is not `router.back()`.
4. **Done creates a mock task in Dashboard client state** and then closes. No network. Refresh or leaving `/` drops the extra task. Status donuts must recompute from the updated list (new tasks are `not_started`, so Not Started % rises). Completed column is unchanged unless the user somehow completes a task (they cannot in this pass).
5. **No API / Supabase / Clerk.** Do not add `POST /api/tasks`. Frontend checks exist for user feedback only (AGENTS.md). Put a Zod schema in `lib/` so a later server route can reuse it; validate on submit in the dialog.
6. **Form fields match the PNG only:** Title, Date, Priority (Extreme / Moderate / Low), Task Description, Upload Image. Do **not** add status, category, time-of-day, or “Add Task Priority” title-creation UI.
7. **Priority is exclusive** even though the PNG draws square boxes. Use `RadioGroup` (or a single-value `ToggleGroup`), not three independent checkboxes. Default: none selected until the user picks one; Done requires a priority.
8. **New tasks:** `status: "not_started"`, `createdAt: now`, `scheduledAt` derived from the chosen **calendar date in the local timezone**. PNG has date only — no time picker. Use **local noon** on that date. If the date is **today** and noon is already past, use a time later than `now` (e.g. `now + 1 hour`, still that calendar day). Reject **past calendar dates**. Completed-past-schedule rules do not apply (new tasks are incomplete).
9. **Task rules (frontend only):**
   - Title required after trim; max length **120**.
   - Description optional; max length **2000**. Empty description stores `""`.
   - Normalize title (`trim`, collapse internal whitespace, lowercase) for duplicate detection against existing Dashboard tasks with the **same local calendar date**.
   - Max **5** non-completed, non-deleted tasks on the same local calendar date (count current Dashboard state + the new one).
10. **Image is optional and client-only.** Drag-and-drop + Browse; accept raster images (`image/png`, `image/jpeg`, `image/webp`, `image/gif`); reject others with a field error. Cap file size at **2 MB**. Preview in the dropzone. Persist on the mock task as an object URL (or data URL) `thumbnailSrc`. Do **not** upload to Supabase Storage. If no file, use `/dashboard/thumb-placeholder.svg` (add a simple local SVG). Revoke object URLs on dialog reset / unmount when appropriate.
11. **Date UI:** visible field shows `DD/MM/YYYY` (or empty). Calendar icon on the **right** via `InputGroup` + `InputGroupAddon`. Drive the value with a native `<input type="date">` (visually hidden or triggered by the icon) — **do not** install date-fns, react-day-picker, or shadcn Calendar/Popover for this pass.
12. **Install shadcn from `@shadcn`** (project default registry): `dialog`, `field`, `textarea`, `radio-group`, `input-group`, `label` as required by composition. Add `checkbox` **only** if RadioGroup cannot render the square indicator. Do **not** add Sheet, Drawer, Calendar, Popover, Sidebar, Chart, Table, Sonner, or form libraries (no react-hook-form).
13. **Low priority color.** Add `--priority-low` equal to status-completed green (`#05a301` / existing `--status-completed`). Register `@theme inline` `--color-priority-low`. Update `priorityTextClass.low` to `text-priority-low`. Use the same token for the Low dot on the form.
14. **Do not paste Figma absolute-positioned code.** Adapt to App Router + tokens.
15. Leave `proxy.ts`, `env.ts`, Button CVA, and shell files alone. Touch `app/globals.css` **only** for `--priority-low`.
16. Do **not** change My Task fixtures or `/my-task` layout. Dashboard’s **initial** three open To-Do cards stay the birthday / landing / presentation fixtures from `getMockTasks`.

## Visual interpretation

Canonical canvas: **1440×1024** desktop. Light mode. Semantic token classes only (`bg-primary`, `bg-card`, `text-priority-extreme`, `rounded-lg`, `font-sans`). Never raw hex or Tailwind palette colors (`bg-[#...]`, `text-red-500`).

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER + SIDEBAR + DASHBOARD (existing, dimmed by overlay)  │
│                                                             │
│   ┌───────────────────────────────────────────────────┐     │
│   │ Add New Task                    Go Back           │     │
│   │ ~~~~                                                  │     │
│   │ ┌───────────────────────────────────────────────┐ │     │
│   │ │ Title     [________________]                  │ │     │
│   │ │ Date      [________________] [📅]             │ │     │
│   │ │ Priority  ● Extreme □  ● Moderate □  ● Low □  │ │     │
│   │ │ [ Description textarea ]  [ Upload dropzone ] │ │     │
│   │ └───────────────────────────────────────────────┘ │     │
│   │ [ Done ]                                              │     │
│   └───────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

- Dialog surface: **white** `bg-card`, large width (**~720–880px**, `sm:max-w-3xl` / `max-w-4xl`), generous inner padding **~24–32px**, radius **~8–14px** (`rounded-xl` / `rounded-card`). Soft shadow is Dialog default — do not add custom `z-*`.
- Header row: title left, **Go Back** right, underlined (`Button variant="link"` as `DialogClose` / close handler).
- Title **Add New Task**: Inter medium/semibold **~16–18px**, `text-foreground`. Short **coral underline under “Add” only** (same nested-span / `border-b-2 border-primary` pattern as My Tasks). Do not underline “New Task”.
- Inner form frame: thin `border-border` (or `border-input/30`), `rounded-lg`, padding **~16–24px**, contains Title → Date → Priority → description/upload row. **Done sits outside** this frame, **bottom-left**, not DialogFooter-right.
- Overlay: default Dialog dim (do not invent a custom burgundy overlay).

### Form controls

| Element | Spec |
| --- | --- |
| Title | `Field` + `FieldLabel` “Title” + `Input` full width, `rounded-lg`, light border. |
| Date | `Field` + “Date” + `InputGroup`: text display `DD/MM/YYYY`, calendar icon **right** (`CalendarIcon` from lucide). |
| Priority | `FieldSet` + `FieldLegend` “Priority”. Three horizontal options: **dot + label + square indicator**. Extreme: `bg-priority-extreme` / `text-priority-extreme` red. Moderate: `bg-priority-moderate` / `text-priority-moderate` blue. Low: `bg-priority-low` / `text-priority-low` green. Dots `size-2.5 rounded-full`. Gap between options **~24–40px**. |
| Task Description | Left column. Label “Task Description”. `Textarea` tall (**~160–200px**), placeholder **Start writing here....** (four dots as in the PNG). |
| Upload Image | Right column, roughly **square**, same height as the textarea row. Label “Upload Image”. Centered image-up icon, copy **Drag&Drop files here**, then **or**, then **Browse** `Button variant="outline"`. After a file is chosen, show a preview (`object-cover`) and keep Browse to replace. |
| Done | Default coral `Button`, **wider than default** (px-8 / min-w ~100px), white label, `rounded-lg`. Bottom-left under the frame. |

Description + upload: **two columns on `md+`** (`grid-cols-[1fr_minmax(200px,280px)]` or similar), stack on small screens (description then upload).

Use `FieldGroup` + `Field` for layout. **No** `space-y-*`. Validation: `data-invalid` on `Field`, `aria-invalid` on the control, `FieldError` or `FieldDescription` for messages.

### Typography

| Role | Style |
| --- | --- |
| Dialog title | Inter ~16–18px medium/semibold; coral underline on **Add** |
| Go Back | Inter ~14px, underlined, `text-foreground` (link variant is OK if it stays readable) |
| Field labels | Inter ~14px medium/semibold, `text-foreground` |
| Inputs / textarea | Inter ~14px; placeholder `text-muted-foreground` |
| Priority labels | Inter ~14px regular |
| Done | Inter medium, `text-primary-foreground` |
| Dropzone copy | Inter ~12–13px, `text-muted-foreground`; **or** slightly smaller |

Montserrat is **not** used on this dialog.

### Spacing

- 8px grid: `gap-2`, `gap-3`, `gap-4`, `gap-6`.
- No `space-y-*` / `space-x-*`.
- Equal width/height: `size-*` (priority dots, icon tiles).
- Inputs `rounded-lg` (8px). Dialog may use `rounded-xl` / `rounded-card`.

### Colors

- Dialog `bg-card`, canvas behind unchanged.
- Done `bg-primary` / `text-primary-foreground` (no `className` color overrides on Button).
- Priority dots: extreme / moderate / low tokens only.
- Browse outline uses existing `variant="outline"` (coral border).
- No `text-red-500`, `bg-[#...]`, or `dark:` overrides.

### Responsiveness (minimal)

- **`md+`:** wide dialog, description \| upload side by side, matching the PNG.
- **Below `md`:** stacked fields; dropzone full width; Done still bottom-left; no horizontal overflow at 375px.
- Do not build a second mobile design. Dialog should scroll internally if the viewport is short.

### Pixel-perfect expectations

- Compare at ~1440px to `prompts-img/Add task.png`.
- Centered white modal; **Add** coral underline; **Go Back** top-right; inner stroked form; Done coral bottom-left.
- Priority row reads as three color-dot options with square selectors, not a dropdown.
- Dropzone shows icon + Drag&Drop + or + Browse, not a naked file input.
- Opening the dialog does not restyle the shell; Dashboard To-Do / status / completed remain the backdrop.

## Files likely to change

- `app/(app)/page.tsx` — Server Component: still call `getMockTasks` / `toTaskView` / percents helpers; pass serializable views into a client `DashboardView`.
- `components/dashboard/dashboard-view.tsx` — client: task list state, dialog open, recompute open/completed/percents, render existing columns/panels.
- `components/dashboard/todo-column.tsx` — accept `addTask` slot or `onAddTask` / `DialogTrigger` wiring; do not restyle the To-Do heading.
- `components/dashboard/add-task-dialog.tsx` — dialog chrome + form (keep this file focused; split dropzone/priority if it grows).
- `components/dashboard/task-card.tsx` — render `blob:` / `data:` thumbs with `<img>` (or equivalent); keep `next/image` for `/dashboard/*` paths.
- `lib/dashboard/mock-data.ts` — `priorityTextClass.low` → `text-priority-low` only if the token exists; no fixture list rewrite.
- `lib/tasks/task-input.ts` (name can vary) — Zod schema, normalize title, max lengths, date/priority enums.
- `lib/tasks/create-mock-task.ts` (or similar) — map valid input → `DashboardTask` (`not_started`, ids via `crypto.randomUUID()`).
- `app/globals.css` — `--priority-low` + theme color.
- `public/dashboard/thumb-placeholder.svg` — default thumb when no image.
- `components/ui/dialog.tsx`, `field.tsx`, `textarea.tsx`, `radio-group.tsx`, `input-group.tsx`, `label.tsx` — via shadcn add.

Do **not** change `proxy.ts`, `env.ts`, `app/(app)/layout.tsx`, My Task components, or sidebar/header unless a tiny trigger prop on `TodoColumn` is required (it is).

Keep files small. Page stays a Server Component; dialog and list mutation stay client.

## Implementation requirements

1. **App Router:** `page.tsx` remains a Server Component. Dialog, form state, and task append live in Client Components (`"use client"`). Do not turn the root layout into a client tree beyond what Dashboard already needs.
2. **shadcn Dialog:** required `DialogTitle` (visible “Add New Task” is enough; do not `sr-only` it). Base UI: `DialogTrigger render={<Button variant="link" />}` (or equivalent) — **not** Radix `asChild`. Do not set `z-index` on the overlay.
3. **shadcn forms:** `FieldGroup` + `Field` (+ `FieldSet` for priority). `InputGroup` + `InputGroupInput` / addons for the date field. `Textarea` for description. Icons in labeled buttons use `data-icon`; icon-only controls use `size="icon"` + `aria-label` with no extra `size-*` on the SVG.
4. **Typed input.** Zod schema; no `any`. Infer the form type from the schema. Map Zod issues onto field errors.
5. **Accessibility:** Title / Date / Description labelled; Priority group has a legend; only one priority selectable; file input is reachable via Browse (and dropzone is a label or has keyboard activation); dialog focus trap is default; Escape closes; Go Back and Done have clear names.
6. **Images:** user content is a preview only. `next/image` for static public thumbs. Meaningful `alt` on the created task (`Uploaded task image` or the title).
7. **Dates:** `formatNumericDate` for display; compare calendar days in **local** time. Do not add date-fns.
8. **Plain text:** render user title/description as React text nodes. No `dangerouslySetInnerHTML`.
9. **Reset** the form (including object URLs) when the dialog closes.
10. **Do not** persist to `localStorage`, implement Edit from this dialog, or add the new task to `getMyTasks()`.
11. TypeScript strict; no unused files; no unrelated refactors.

## Security requirements

- No new env vars. No service-role key. No secrets in client components.
- No `dangerouslySetInnerHTML`.
- Do not enable Clerk `auth.protect()`.
- Do not send the image or form to any external URL.
- Cap image type and size in the client so huge/non-image files never become thumbs.
- Do not execute or preview non-image files.

## Acceptance criteria

- [ ] `http://localhost:3000/` **+ Add task** opens the Add New Task dialog over the Dashboard shell.
- [ ] Layout matches `prompts-img/Add task.png`: Add underline, Go Back, bordered form, Title, Date+calendar icon, three priorities, description \| upload, coral Done bottom-left.
- [ ] Go Back / overlay / Escape close without adding a task.
- [ ] Done with valid Title, future-or-today Date, and Priority prepends a Not Started card to To-Do; Task Status Not Started % updates; dialog closes.
- [ ] Empty title, past date, missing priority, duplicate same-day title, and 6th task on the same date show field/form errors and do **not** add a card.
- [ ] Optional image: drag/browse preview; created card can show that image; skip uses the placeholder thumb.
- [ ] My Task `/my-task` is unchanged (no Add task, same four fixtures).
- [ ] Semantic tokens only; Low uses `text-priority-low` / `bg-priority-low`; Inter; no `bg-[#...]`.
- [ ] Narrow viewport: stacked form, no horizontal overflow.
- [ ] No ClerkProvider, no Supabase, no task API routes.
- [ ] `npm run typecheck` and `npm run lint` pass. `npm run build` because the Dashboard page composition changed.

## Checks to run

From the repo root:

```bash
npm run typecheck
npm run lint
```

Run `npm run format` (or `npx ultracite fix` on touched files) if format issues are reported.

Run `npm run build` because `app/(app)/page.tsx` and new client modules changed. If the build fails only because Clerk env vars are missing, report that as an existing env blocker.

## Exact manual test steps expected after implementation

1. `npm run dev` and open `http://localhost:3000/`. Confirm the three original To-Do cards.
2. Click **+ Add task**. Compare ~1440px to `prompts-img/Add task.png`: modal chrome, fields, dropzone, Done left.
3. Click **Go Back** — dialog closes; To-Do unchanged. Re-open and press Escape — same.
4. Submit empty Done — title (and other required fields) show errors; no new card.
5. Fill Title `Buy stamps`, pick **today or a future date**, Priority **Moderate**, a short description — Done. A new Not Started / Moderate card appears at the top (or in the open list); donuts update; dialog is closed.
6. Re-open and try the **same title + same date** — duplicate error, no second card.
7. Pick a **past date** — date error, no card.
8. Drop or browse a small PNG — preview appears; Done uses that image on the card. Try a `.txt` or huge file — error, no crash.
9. Open `/my-task` — still the four My Task fixtures; no Add task control.
10. Resize to ~375px, open the dialog — fields stack; Done reachable; no horizontal scrollbar.
11. Confirm no `bg-[#...]` / `text-red-500` in new Add Task components; Extreme/Moderate/Low use priority tokens.
