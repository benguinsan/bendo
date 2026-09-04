# Edit Task dialog UI

## Goal

Add the **Edit Task** modal from `prompts-img/Edit.png`: a centered dialog over the existing authenticated app shell, with the same Title / Date / Priority / Task Description / Upload Image / **Go Back** / **Done** layout as Add New Task, prefilled from the task being edited.

This pass is **pixel-faithful UI + client-side mock update**. **Done** patches the open task in that page’s React state. Do **not** add Supabase, `PATCH /api/tasks`, Clerk route protection, Settings, Calendar product UI, Agent chat, or the related taxonomy modals (`prompts-img/Edit Task Status.png`, `prompts-img/Edit Task Priority.png`, `prompts-img/Add Task Priority.png`).

Do **not** implement Delete, Mark Vital, or category CRUD.

## Skills read

- `AGENTS.md` (product scope, task storage rules, architecture layers, prompt workflow, checks, escaped plain text)
- `.agents/skills/clerk/SKILL.md` → `clerk-nextjs-patterns` (server vs client; keep current public-first `proxy.ts`, no `auth.protect()`, no `ClerkProvider`)
- `.claude/skills/shadcn/SKILL.md` plus `rules/styling.md`, `rules/forms.md`, `rules/composition.md`, `rules/icons.md`, `rules/base-vs-radix.md` (semantic tokens, `FieldGroup` + `Field`, Dialog title, `gap-*`, `size-*`, `cn()`, lucide, Base UI `render` not `asChild`, no manual overlay `z-index`)
- `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/04-linking-and-navigating.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/12-images.md`
- `prompts/design-system.md` (canonical tokens already in `app/globals.css`)
- `prompts/add-task.md` (this dialog is the same chrome; reuse, do not restyle)
- `prompts/my-task.md` / `prompts/view-task.md` / `prompts/vital-task.md` (existing Edit buttons were inert; this prompt supersedes that for Edit only)
- `prompts/create-categories.md` / `prompts/task-categories.md` (do **not** wire taxonomy-table **Edit**)

Supabase and AI SDK are **not** needed. Clerk stays plumbing-only.

## Existing code inspected

- `components/dashboard/add-task-dialog.tsx` — full Add New Task Dialog + form. Visual twin of Edit. Extract shared chrome/fields; keep create trigger + `validateNewTask` / `createMockTask` behavior unchanged.
- `lib/tasks/task-input.ts` — Zod `taskFormSchema`, `validateNewTask`, duplicate / 5-per-date helpers. Add an **update** validator that excludes the task being edited. Do not fold category rules in here.
- `lib/tasks/create-mock-task.ts` — `createMockTask` + `scheduledAtFromDateInput`. Add an update mapper; do not change create.
- `components/dashboard/dashboard-view.tsx` — client task list + Add Task. Add Edit Task for To-Do card **⋯ Edit**.
- `components/dashboard/todo-column.tsx` — maps `TaskCard` with `href`. Pass through `onEdit`.
- `components/dashboard/task-card.tsx` — **⋯** menu has inert `DropdownMenuItem` **Edit**. Wire `onEdit`. Do not restyle the card.
- `components/dashboard/completed-task-panel.tsx` — compact completed articles, **no** ⋯ menu. **Do not** add Edit here.
- `components/my-task/my-task-view.tsx` — client selectedId; list is server-mapped views (immutable today). Lift raw task list state so Done can patch list + detail.
- `components/my-task/task-detail-panel.tsx` — coral `SquarePen` **Edit task**. Wire it; leave labeled detail anatomy alone.
- `components/my-task/view-task-view.tsx` — full-page View Task; coral **Edit task**. Session-local update of that one task.
- `components/vital-task/vital-task-view.tsx` / `vital-task-detail-panel.tsx` — same pattern as My Task (list + detail Edit).
- `app/(app)/my-task/page.tsx` / `vital-task/page.tsx` / `my-task/[taskId]/page.tsx` — Server Components loading fixtures. Keep pages as Server Components; pass serializable tasks + `nowIso` into client views.
- `lib/dashboard/mock-data.ts` — fixtures unchanged as **initial** data. `toTaskView` for overdue. Extra fields (`checklist`, `contentTitle`, …) must survive an edit.
- `app/globals.css` — tokens already include `--priority-low`. **No** new tokens.
- `components/ui/dialog.tsx`, `field.tsx`, `textarea.tsx`, `radio-group.tsx`, `input-group.tsx` — already installed. **Do not** add Calendar, Popover, Sheet, Sonner, or form libraries.
- `components/task-categories/taxonomy-table.tsx` — row **Edit** is a different product (status/priority). **Do not** open this dialog from Task Categories.
- `prompts-img/Edit.png` — visual source of truth for this pass.
- `proxy.ts` / `env.ts` — unchanged.

## Decisions or assumptions

1. **No standalone `/edit-task` route.** Overlay is shadcn `Dialog`, same as Add Task. Dimmed page stays visible. Do not hand-roll a modal.
2. **Triggers (this pass):**
   - My Task detail **Edit task** (`SquarePen`)
   - View Task **Edit task**
   - Vital Task detail **Edit task**
   - Task card **⋯ → Edit** on Dashboard To-Do, My Task list, and Vital Task list
3. **Do not trigger from:** taxonomy-table Edit, Completed Task panel, Delete, Mark Vital, Add Category, or Add Task.
4. **Controlled dialog.** Edit is opened from several buttons, so `EditTaskDialog` is controlled (`open` + `task` + `onOpenChange`). Add Task may keep its internal open state and **+ Add task** trigger.
5. **Go Back / overlay / Escape close without saving.** Not `router.back()`.
6. **Done updates mock state on the current page only**, then closes. No network. Refresh or leaving the page drops the edit (same as Add Task). **Do not** invent a global task store. Dashboard-created tasks still do not appear on My Task; a My Task edit does not appear on Dashboard.
7. **No API / Supabase / Clerk.** Do not add `PATCH /api/tasks/:id`. Frontend checks are user feedback only (AGENTS.md). Reuse `taskFormSchema`; add `validateUpdatedTask` in `lib/tasks/task-input.ts`.
8. **Form fields match the PNG / Add Task:** Title, Date, Priority (Extreme / Moderate / Low), Task Description, Upload Image. Do **not** add status, category, time-of-day, or checklist editors. Preserve `id`, `status`, `createdAt`, `completedAt`, and extra fixture fields (`checklist`, `optionalItems`, `contentTitle`, `objective`, `additionalNotes`, `deadlineLabel`, `detailDescription`).
9. **Priority stays exclusive** (`RadioGroup` + square indicator), same as Add Task. Prefill the current priority.
10. **Prefill on open** from the task:
    - Title → `task.title`
    - Date → local calendar key of `scheduledAt` (`toLocalDateKey`)
    - Priority → `task.priority`
    - Description → `task.description`
    - Image preview → existing `thumbnailSrc` (fixture SVG, placeholder, or blob from a prior Add)
11. **Image is optional.** Keep the current thumbnail if the user does not pick a new file. New raster image (same MIME/size rules as Add Task) replaces it. Do **not** upload to Supabase. Do **not** revoke non-blob URLs (`/dashboard/...`). Revoke only object URLs created in this dialog session.
12. **Date UI:** identical to Add Task (`DD/MM/YYYY` display + native `type="date"` + calendar icon on the right). Do not install date-fns / react-day-picker.
13. **Update rules (frontend only):**
    - Same title / description max lengths and trim as create.
    - Duplicate detection: same normalized title + same local calendar date, **excluding** the task being edited.
    - Max 5 non-completed tasks on the same local calendar date, **excluding** the task being edited from the count, then counting it at the new date.
    - Incomplete tasks (`status !== "completed"`) must not use a **past calendar date**.
    - Completed tasks may **retain** a past scheduled date. If the user changes an incomplete task onto a past date, reject. If a completed task’s date is unchanged and already past, allow.
    - If the local date key is **unchanged**, keep the existing `scheduledAt` (do not shift the time). If the date key **changes**, set `scheduledAt` via `scheduledAtFromDateInput` (completed tasks that move to a past date: store local noon on that date; they are already completed so the “no past schedule” rule does not apply).
14. **Shared form, not a copy-paste.** Extract the dialog chrome + fields from `add-task-dialog.tsx` into a small shared module (e.g. `components/tasks/task-form-dialog.tsx`) used by Add and Edit. Title slot: Add keeps **Add New Task** with coral underline under **Add**; Edit uses **Edit Task** with coral underline under **Edit** only. Do not change Add Task’s create semantics or Dashboard **+ Add task** placement.
15. **View Task / detail thumbs** must render `blob:` / `data:` the same way `TaskCard` already does if the user uploads a new image.
16. **Do not paste Figma absolute-positioned code.** Adapt to App Router + tokens.
17. Leave `proxy.ts`, `env.ts`, Button CVA, `app/globals.css`, shell files, Create Categories, and taxonomy tables alone.
18. Prefer existing shadcn pieces. **Do not** install new UI packages.

## Visual interpretation

Canonical canvas: **1440×1024** desktop. Light mode. Semantic token classes only (`bg-primary`, `bg-card`, `text-priority-extreme`, `rounded-lg`, `font-sans`). Never raw hex or Tailwind palette colors (`bg-[#...]`, `text-red-500`).

The PNG is the Add Task dialog with a different heading. Match `prompts-img/Add task.png` layout exactly except the title string and prefilled values.

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER + SIDEBAR + PAGE (existing, dimmed by overlay)       │
│                                                             │
│   ┌───────────────────────────────────────────────────┐     │
│   │ Edit Task                       Go Back           │     │
│   │ ~~~~                                                  │     │
│   │ ┌───────────────────────────────────────────────┐ │     │
│   │ │ Title     [ prefilled                     ]   │ │     │
│   │ │ Date      [ DD/MM/YYYY                 📅 ]   │ │     │
│   │ │ Priority  ● Extreme □  ● Moderate □  ● Low □  │ │     │
│   │ │ [ Description textarea ]  [ Upload dropzone ] │ │     │
│   │ └───────────────────────────────────────────────┘ │     │
│   │ [ Done ]                                              │     │
│   └───────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

- Dialog surface: white `bg-card`, **~720–880px** (`sm:max-w-3xl` / `md:max-w-4xl` — same classes as Add Task), padding **~24–32px**, `rounded-card`. Soft shadow is Dialog default — no custom `z-*`.
- Header: title left, **Go Back** right, underlined (`Button variant="link"` as `DialogClose` / close handler).
- Title **Edit Task**: Inter medium **~16px**, `text-foreground`. Short **coral underline under “Edit” only** (nested span + `border-b-2 border-primary`). Do **not** underline “Task”.
- Inner form frame: thin `border-border`, `rounded-lg`, padding **~16–24px**. **Done sits outside** this frame, **bottom-left**.
- Overlay: default Dialog dim (do not invent a custom burgundy overlay even if the PNG looks darker).

### Form controls

Same specs as `prompts/add-task.md` (Title, Date + calendar icon, three priority dots + square radios, description \| upload, coral **Done**).

| Extra for Edit | Spec |
| --- | --- |
| Prefill | Fields show the current task when the dialog opens; they are editable. |
| Upload | Existing image may show as the dropzone preview; **Browse** still replaces. Copy **Drag&Drop files here or** + **Browse** remains when there is no new/chosen preview treatment beyond Add Task. |
| Done | Same coral default `Button`, label **Done**, `type="submit"`. |

Description + upload: **two columns on `md+`**, stack below `md`.

Use `FieldGroup` + `Field`. **No** `space-y-*`. Validation: `data-invalid` on `Field`, `aria-invalid` on the control, `FieldError` for messages.

### Typography

| Role | Style |
| --- | --- |
| Dialog title | Inter ~16px medium; coral underline on **Edit** |
| Go Back | Inter ~14px, underlined, `text-foreground` |
| Field labels | Inter ~14px medium, `text-foreground` |
| Inputs / textarea | Inter ~14px; placeholder `text-muted-foreground` |
| Done | Button default (coral, white label) |

Montserrat is **not** used on this dialog.

### Spacing

- 8px grid: `gap-2`, `gap-3`, `gap-4`, `gap-6`.
- No `space-y-*` / `space-x-*`.
- Equal width/height: `size-*`.
- Inputs `rounded-lg`. Dialog `rounded-card`.

### Colors

- Dialog `bg-card`. Done `bg-primary` / `text-primary-foreground` (no Button color overrides via `className`).
- Priority dots: `bg-priority-extreme` / `moderate` / `low` only.
- Browse `variant="outline"`.
- No `text-red-500`, `bg-[#...]`, or `dark:` overrides.

### Responsiveness (minimal)

- **`md+`:** wide dialog, description \| upload side by side.
- **Below `md`:** stacked fields; dropzone full width; Done bottom-left; no horizontal overflow at 375px.
- Dialog scrolls internally if the viewport is short.

### Pixel-perfect expectations

- Compare at ~1440px to `prompts-img/Edit.png` (chrome) and confirm field layout still matches Add Task.
- Centered white modal; **Edit** coral underline; **Go Back** top-right; inner stroked form; Done coral bottom-left.
- Opening Edit does not restyle the shell.
- Add Task still says **Add New Task** with underline under **Add**.

## Files likely to change

- `components/tasks/task-form-dialog.tsx` — **new** shared Dialog chrome + fields (title node, values, errors, image, submit)
- `components/tasks/edit-task-dialog.tsx` — **new** controlled Edit wrapper (`task`, `open`, `onUpdate`)
- `components/dashboard/add-task-dialog.tsx` — use shared form; keep **+ Add task** trigger and create flow
- `lib/tasks/task-input.ts` — `hasDuplicateTask` / `countOpenTasksOnDate` exclude-id; `validateUpdatedTask`
- `lib/tasks/create-mock-task.ts` (or `update-mock-task.ts`) — map valid input onto an existing `DashboardTask`
- `components/dashboard/dashboard-view.tsx` / `todo-column.tsx` / `task-card.tsx` — ⋯ Edit opens the dialog; patch list on Done
- `components/my-task/my-task-view.tsx` / `task-detail-panel.tsx` — list + detail Edit; client task state
- `components/my-task/view-task-view.tsx` — Edit + session-local task; blob thumbs if needed
- `components/vital-task/vital-task-view.tsx` / `vital-task-detail-panel.tsx` — list + detail Edit; client task state
- `app/(app)/my-task/page.tsx` / `vital-task/page.tsx` / `my-task/[taskId]/page.tsx` — pass `initialTasks` / `initialTask` + `nowIso` if the client view now owns list state

Do **not** change `proxy.ts`, `env.ts`, `app/globals.css`, shell components, Create Categories, taxonomy tables, or Completed Task panel chrome.

Keep files small. Pages stay Server Components; dialog and list mutation stay client.

## Implementation requirements

1. **App Router:** pages remain Server Components. Dialog, form state, and task patch live in Client Components (`"use client"`).
2. **shadcn Dialog:** visible `DialogTitle` (“Edit Task”); do not `sr-only` it. Base UI `render` on triggers/close — **not** Radix `asChild`. Do not set `z-index` on the overlay. `showCloseButton={false}` like Add Task.
3. **shadcn forms:** `FieldGroup` + `Field` (+ `FieldSet` for priority). `InputGroup` for date. `Textarea` for description. Icon-only Edit buttons keep `size="icon-lg"` + `aria-label` with no extra `size-*` on the SVG.
4. **Typed input.** Reuse Zod schema; no `any`. `validateUpdatedTask({ ..., taskId, status, existingTasks })`.
5. **Accessibility:** same as Add Task (labels, priority legend, file input via Browse, focus trap, Escape). Opening from ⋯ Edit must not activate the card overlay `Link`/`onSelect`.
6. **Images:** `next/image` for static public thumbs; `<img>` for blob/data. Meaningful `alt`. No `dangerouslySetInnerHTML`.
7. **Dates:** `formatNumericDate` for display; compare calendar days in **local** time.
8. **Reset** the form when the dialog closes. Re-hydrate from `task` when it opens (or when `task.id` changes).
9. **Do not** persist to `localStorage`, implement Delete/Mark Vital, or add PATCH routes.
10. TypeScript strict; no unused files; no unrelated refactors.

## Security requirements

- No new env vars. No service-role key. No secrets in client components.
- No `dangerouslySetInnerHTML`.
- Do not enable Clerk `auth.protect()`.
- Do not send the image or form to any external URL.
- Cap image type and size in the client (reuse `validateTaskImage`).
- Do not execute or preview non-image files.

## Acceptance criteria

- [ ] Pencil **Edit task** on `/my-task`, `/my-task/[taskId]`, and `/vital-task` opens the Edit Task dialog over the existing shell.
- [ ] Task card **⋯ → Edit** on Dashboard To-Do, My Task list, and Vital Task list opens the same dialog for that card’s task.
- [ ] Layout matches `prompts-img/Edit.png`: Edit underline, Go Back, bordered form, Title, Date+calendar icon, three priorities, description \| upload, coral Done bottom-left. Fields are prefilled.
- [ ] Go Back / overlay / Escape close without changing the task.
- [ ] Valid **Done** updates title / date / priority / description / optional image on that page’s list and/or detail; dialog closes; `status` and `createdAt` stay the same.
- [ ] Empty title, missing priority, duplicate same-day title (other task), 6th open task on a date, and past date on an **incomplete** task show field errors and do **not** save.
- [ ] Task Categories row **Edit** still does **not** open this dialog.
- [ ] Add Task still creates; title remains **Add New Task** with underline under **Add**.
- [ ] Semantic tokens only; Inter; no `bg-[#...]`.
- [ ] Narrow viewport: stacked form, no horizontal overflow.
- [ ] No ClerkProvider, no Supabase, no task API routes.
- [ ] `npm run typecheck` and `npm run lint` pass. `npm run build` because page/client composition changed.

## Checks to run

From the repo root:

```bash
npm run typecheck
npm run lint
```

Run `npm run format` (or `npx ultracite fix` on touched files) if format issues are reported.

Run `npm run build` because Dashboard / My Task / View Task / Vital Task client composition changed. If the build fails only because Clerk env vars are missing, report that as an existing env blocker.

## Exact manual test steps expected after implementation

1. `npm run dev` and open `http://localhost:3000/my-task`. Select **Submit Documents**. Click the detail **Edit** (pencil). Compare ~1440px to `prompts-img/Edit.png`: **Edit Task** heading, prefilled title, date, Extreme priority, description, dropzone, coral Done.
2. Click **Go Back** — dialog closes; detail unchanged. Re-open and press Escape — same.
3. Change the title to `Submit Documents (updated)` and click **Done** — list card and detail title update; status stays Not Started; dialog closed.
4. Re-open Edit, clear the title, Done — title error, no save.
5. Open a list card **⋯ → Edit** on another My Task — form shows that task’s title.
6. Open `/my-task/task-documents` (or View from ⋯). Click Edit, change description, Done — View Task body updates for this session. Refresh restores the fixture.
7. Open `/vital-task`, edit **Walk the dog** from the pencil and from ⋯ — list and detail update together.
8. Open `/`, To-Do card **⋯ → Edit** on the birthday task, change priority to **Low**, Done — that card’s priority updates. **+ Add task** still opens **Add New Task**.
9. On My Task, try setting Date to a **past** day on an incomplete task — date error, no save.
10. Open `/task-categories` and click a row **Edit** — no Edit Task dialog.
11. Resize to ~375px, open Edit — fields stack; Done reachable; no horizontal scrollbar.
12. Confirm no `bg-[#...]` / `text-red-500` in new Edit Task components; Extreme/Moderate/Low use priority tokens.
