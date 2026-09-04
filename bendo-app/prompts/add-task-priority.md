# Add Task Priority dialog

## Goal

Add the **Add Task Priority** modal from `prompts-img/Add Task Priority.png`. Open it from the Task Categories **+ Add New Priority** control. The dialog is a centered overlay over the existing authenticated app shell, with **Go Back**, one labeled **Task Priority Title** field, and coral **Create** / **Cancel**.

This pass is **pixel-faithful UI + client-side mock create** on `/task-categories` only. **Create** appends a new row to the Task Priority table in that page’s React state. Do **not** add Supabase, `POST` routes, Clerk route protection, Settings, Calendar product UI, Agent chat, or **+ Add Task Status**.

Do **not** implement Delete, Add Category changes, user-named category CRUD beyond the existing Create Categories page, or the task-level Add/Edit Task dialogs.

## Skills read

- `AGENTS.md` (product scope, uniqueness as a pattern for labels, architecture layers, prompt workflow, checks, escaped plain text)
- `.agents/skills/clerk/SKILL.md` → `clerk-nextjs-patterns` (server vs client; keep current public-first `proxy.ts`, no `auth.protect()`, no `ClerkProvider`)
- `.claude/skills/shadcn/SKILL.md` plus `rules/styling.md`, `rules/forms.md`, `rules/composition.md`, `rules/icons.md`, `rules/base-vs-radix.md` (semantic tokens, `FieldGroup` + `Field`, Dialog title, `gap-*`, `size-*`, `cn()`, lucide, Base UI `render` not `asChild`, no manual overlay `z-index`)
- `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/04-linking-and-navigating.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`
- `prompts/design-system.md` (canonical tokens already in `app/globals.css`)
- `prompts/task-categories.md` / `prompts/edit-task-status-priority.md` (this prompt is the deferred Add Task Priority follow-up)
- `prompts/create-categories.md` (Category Name Field + Zod; reuse validation shape, not the full-page layout)
- `prompts/edit-task.md` / `prompts/add-task.md` (Dialog chrome already used by taxonomy Edit)

Supabase and AI SDK are **not** needed. Clerk stays plumbing-only.

## Existing code inspected

- `app/(app)/task-categories/page.tsx` — Server Component rendering `TaskCategoriesView`. Keep as Server Component.
- `components/task-categories/task-categories-view.tsx` — client board with session-local status/priority rows and `EditTaxonomyDialog`. **+ Add New Priority** is an inert `type="button"` link. Wire it to open this dialog. Keep **+ Add Task Status** inert. Keep Add Category → `/task-categories/create`.
- `components/task-categories/edit-taxonomy-dialog.tsx` — Edit chrome (title + coral first-word underline + Go Back + inner bordered frame + two coral buttons). Reuse this chrome; do not copy-paste a second near-identical dialog. Create mode uses an empty field and **Create** instead of **Update**.
- `components/task-categories/taxonomy-table.tsx` — row Edit already wired; Delete inert. New rows must work with existing `onEdit` (id + label). Do not restyle the table.
- `lib/task-categories/taxonomy.ts` — fixture rows `extreme` / `moderate` / `low`. Use as **initial** data. Do **not** mutate the exported arrays. Do **not** add new ids to `TaskPriority`.
- `lib/task-categories/taxonomy-input.ts` — `TAXONOMY_LABEL_MAX`, `validateTaxonomyLabel({ name, kind, existingLabels, currentLabel })`. Reuse for create with `kind: "priority"` and `currentLabel: ""` (or a thin `validateNewTaxonomyLabel` wrapper). Do not fold this into `category-input.ts`.
- `lib/dashboard/mock-data.ts` — `TaskPriority` union and `priorityLabels`. **Do not change.** Add Task / Edit Task radios stay Extreme / Moderate / Low.
- `lib/tasks/task-input.ts` — `priorityOptions`. **Do not change.** A newly created taxonomy label must not appear as a task-form priority option.
- `components/tasks/task-form-dialog.tsx` / `edit-task-dialog.tsx` — task Add/Edit. Do **not** open those from **+ Add New Priority**.
- `components/ui/dialog.tsx`, `field.tsx`, `input.tsx`, `button.tsx` — already installed. **Do not** add AlertDialog, Sheet, Sonner, or form libraries.
- `app/globals.css` — **No** new tokens.
- `prompts-img/Add Task Priority.png` — visual source of truth for this pass.
- `proxy.ts` / `env.ts` — unchanged.

## Decisions or assumptions

1. **Trigger is `+ Add New Priority` only.** That is the existing Task Priority section link. Do **not** open this dialog from Add Category, **+ Add Task Status**, row Edit, row Delete, or task-card / detail Edit.
2. **No standalone `/add-task-priority` route.** Overlay is shadcn `Dialog`, same as taxonomy Edit. Dimmed Task Categories board stays visible. Do not hand-roll a modal.
3. **Reuse taxonomy dialog chrome.** Extend the existing edit dialog (or extract a small shared `TaxonomyLabelDialog`) with a `mode: "create" | "edit"` (or equivalent props: heading first word, submit label, initial name). Create copy: heading **Add Task Priority**, label **Task Priority Title**, submit **Create**. Edit copy and behavior stay as they are today.
4. **Create is priority-only this pass.** Do **not** implement Add Task Status even if the shared dialog could accept `kind: "status"`.
5. **Controlled dialog.** `open` + `onOpenChange`. Input starts **empty** (the PNG is an empty field). Reset when the dialog closes; remount-on-open like Edit is fine.
6. **Exact field copy from the PNG:**
   - Heading **Add Task Priority**
   - Coral underline under **Add** only. Do **not** underline “Task Priority”.
   - Label **Task Priority Title**
   - Buttons **Create** then **Cancel**, both coral default fills inside the inner frame
7. **Go Back / overlay / Escape / Cancel close without saving.** Not `router.back()`. Cancel is `type="button"` that closes the dialog (not a `Link`).
8. **Create appends a row on `/task-categories` only**, then closes. No network. Refresh or leaving the page restores the original three fixture priorities from `taxonomy.ts`. **Do not** invent a global priority store.
9. **Do not widen `TaskPriority`.** New rows are display-only taxonomy labels. Local row type is `{ id: string; label: string }`. Fixture ids stay `"extreme" | "moderate" | "low"`. Generated ids for created rows (e.g. `crypto.randomUUID()` or `priority-${crypto.randomUUID()}`) are client-only, created in the submit handler, not during render.
10. **SN is 1-based display index.** A successful create becomes row 4 (or the next index). Do not reorder existing rows; append at the end.
11. **Created rows are editable.** Existing Edit Task Priority still opens for the new row (empty-to-prefilled edit). Delete stays inert.
12. **No API / Supabase / Clerk.** Do not add `POST /api/categories` or taxonomy routes. Frontend checks are user feedback only (AGENTS.md).
13. **Label rules (frontend only):**
    - Required after trimming whitespace; whitespace-only is invalid.
    - Maximum length **50** (`TAXONOMY_LABEL_MAX`).
    - Normalize with trim + collapse internal whitespace (`normalizeTaxonomyLabel`).
    - Case-insensitive uniqueness **within the Task Priority table**. Creating `extreme` while Extreme exists is invalid.
    - Do **not** check uniqueness against Task Status names (a priority may share a name with a status).
    - Do **not** sync `lib/dashboard/mock-data.ts` or `priorityOptions`.
14. **Inner frame contains the field and both buttons**, same as taxonomy Edit (not like Add Task, where Done sits outside the stroke).
15. **Do not paste Figma absolute-positioned code.** Adapt to App Router + tokens.
16. Leave `proxy.ts`, `env.ts`, Button CVA, `app/globals.css`, shell files, Create Categories page, Add/Edit Task dialogs, `lib/dashboard/mock-data.ts` enums, and `lib/tasks/task-input.ts` alone.
17. Prefer existing shadcn pieces. **Do not** install new UI packages.
18. **Do not** implement Delete or **+ Add Task Status** in this pass.

## Visual interpretation

Canonical canvas: **1440×1024** desktop. Light mode. Semantic token classes only (`bg-primary`, `bg-card`, `text-foreground`, `rounded-card`, `font-sans`). Never raw hex or Tailwind palette colors (`bg-[#...]`, `text-red-500`).

This PNG is the Edit Task Priority dialog with a different heading, empty field, and **Create** instead of **Update**. Match `components/task-categories/edit-taxonomy-dialog.tsx` layout exactly except those copy/mode differences.

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER + SIDEBAR + TASK CATEGORIES (existing, dimmed)       │
│                                                             │
│   ┌───────────────────────────────────────────────────┐     │
│   │ Add Task Priority                Go Back          │     │
│   │ ~~~                                                   │     │
│   │ ┌───────────────────────────────────────────────┐ │     │
│   │ │ Task Priority Title                           │ │     │
│   │ │ [                                         ]   │ │     │
│   │ │ [ Create ]  [ Cancel ]                        │ │     │
│   │ └───────────────────────────────────────────────┘ │     │
│   └───────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

- Dialog surface: white `bg-card`, **~720–880px** (`sm:max-w-3xl` / `md:max-w-4xl` — same classes as taxonomy Edit), padding **~24–32px**, `rounded-card`. Soft shadow is Dialog default — no custom `z-*`.
- Header: title left, **Go Back** right, underlined (`Button variant="link"` as `DialogClose`).
- Title: Inter medium **~16px**, `text-foreground`. Short **coral underline under “Add” only** (nested span + `border-b-2 border-primary`).
- Inner form frame: thin `border-border`, `rounded-lg`, padding **~16–24px**. Field + button row live **inside** this frame.
- Overlay: default Dialog dim (do not invent a custom burgundy overlay even if the PNG looks darker).

### Form controls

| Element | Spec |
| --- | --- |
| Layout | `FieldGroup` + `Field`. Never raw `div` + `space-y-*`. |
| Label | **Task Priority Title**. `FieldLabel` associated via `htmlFor` / `useId`. |
| Input | Single-line `Input`, full width of the inner frame. No placeholder. Empty on open. `h-10` as **layout only** if needed; do not override colors via `className`. |
| Create | Coral default `Button`, white label **Create**, `type="submit"`. `size="lg"`, `min-w-24` / `px-8`. |
| Cancel | Same coral default `Button`. Visible label **Cancel**, `type="button"`, closes without saving. |
| Button row | Side-by-side, left-aligned under the input, `flex` + `gap-2` or `gap-3`. Create first, Cancel second. |
| Errors | `data-invalid` on `Field`, `aria-invalid` on the input, message in `FieldError`. |

Vertical `gap-4` / `gap-6` between label+input and the button row. No `space-y-*`.

### Typography

| Role | Style |
| --- | --- |
| Dialog title | Inter ~16px medium; coral underline on **Add** |
| Go Back | Inter ~14px, underlined, `text-foreground` (existing `Button variant="link"` treatment is fine) |
| Field label | Inter ~14px medium, `text-foreground` |
| Input | Inter ~14px, `text-foreground` |
| Create / Cancel | Button default (coral, white label) |

Montserrat is **not** used on this dialog.

### Spacing

- 8px grid: `gap-2`, `gap-3`, `gap-4`, `gap-6`.
- No `space-y-*` / `space-x-*`.
- Equal width/height: `size-*`.
- Inputs and buttons `rounded-lg`. Dialog `rounded-card`.

### Colors

- Dialog `bg-card`. Create/Cancel `bg-primary` / `text-primary-foreground` (no Button color overrides via `className`).
- Input chrome: `border-input` only. Invalid uses existing destructive field styles.
- No `text-red-500`, `bg-[#...]`, or `dark:` overrides.

### Responsiveness (minimal)

- **`md+`:** wide dialog; full-width field; buttons left-aligned.
- **Below `md`:** same stacked form; buttons may wrap (`flex-wrap`) but stay reachable; no horizontal overflow at 375px.
- Dialog scrolls internally if the viewport is short.

### Pixel-perfect expectations

- Compare at ~1440px to `prompts-img/Add Task Priority.png`.
- Centered white modal; **Add** coral underline; **Go Back** top-right; inner stroked form; empty **Task Priority Title**; coral **Create** + **Cancel** inside the stroke, bottom-left of that box.
- Opening Add does not restyle the shell. Task Categories tables remain visible (dimmed) behind the overlay.
- Edit Task Priority still says **Edit** with **Update**. Add New Task / Edit Task are unchanged.

## Files likely to change

- `components/task-categories/edit-taxonomy-dialog.tsx` — extend for create mode (or extract a shared taxonomy label dialog used by edit + add)
- `components/task-categories/task-categories-view.tsx` — open create dialog from **+ Add New Priority**; append a priority row on Create
- `lib/task-categories/taxonomy-input.ts` — only if a dedicated create helper is cleaner; otherwise reuse `validateTaxonomyLabel` with empty `currentLabel`

Optional: widen the in-view priority row type to `{ id: string; label: string }` so generated ids type-check. Do **not** change `TaskPriority` in `mock-data.ts`.

Do **not** change `proxy.ts`, `env.ts`, `app/globals.css`, shell components, Create Categories, Add/Edit Task, taxonomy-table chrome (except it already supports extra rows), or `lib/tasks/task-input.ts`.

Keep files small. Page stays a Server Component; dialog and list mutation stay client.

## Implementation requirements

1. **App Router:** `app/(app)/task-categories/page.tsx` remains a Server Component. Dialog, form state, and row append live in Client Components.
2. **shadcn Dialog:** visible `DialogTitle` (“Add Task Priority”); do not `sr-only` it. Base UI `render` on close — **not** Radix `asChild`. Do not set `z-index` on the overlay. `showCloseButton={false}`.
3. **shadcn forms:** `FieldGroup` + `Field` + `FieldLabel` + `Input` + `FieldError`. Buttons: default variant.
4. **Typed input.** Explicit Zod via existing taxonomy helpers. No `any`. Create submit generates a string id in the event handler.
5. **Accessibility:** `DialogTitle` matches the visible heading; label is programmatically associated; Create is `type="submit"`; Cancel is `type="button"`; errors use `role="alert"` via `FieldError`; **+ Add New Priority** should have a clear accessible name (the visible text is enough).
6. **Escape user input.** Render labels as React text nodes / controlled input values. No `dangerouslySetInnerHTML`.
7. **Reset** the form when the dialog closes. Open with an empty field.
8. **Do not** persist to `localStorage`, implement Delete / Add Task Status, or add POST routes.
9. TypeScript strict; no unused files; no unrelated refactors. Do not break Edit Task Status / Edit Task Priority.

## Security requirements

- No new env vars. No service-role key. No secrets in client components.
- No `dangerouslySetInnerHTML`.
- Do not enable Clerk `auth.protect()`.
- Do not send the form to any external URL.
- Presentational Create/Cancel/Logout must not call external APIs.

## Acceptance criteria

- [ ] **+ Add New Priority** on `/task-categories` opens **Add Task Priority** over the existing shell, with an empty **Task Priority Title** field.
- [ ] Layout matches `prompts-img/Add Task Priority.png`: Add underline, Go Back, bordered form, coral Create + Cancel inside the inner frame.
- [ ] Go Back / overlay / Escape / Cancel close without changing the table.
- [ ] Valid **Create** appends a new Task Priority row at the end; SN increments; dialog closes; status table unchanged.
- [ ] Empty / whitespace-only name, over-max length, and a case-insensitive duplicate of Extreme / Moderate / Low (or another created label) show a field error and do **not** save.
- [ ] The new row’s **Edit** opens **Edit Task Priority** prefilled with the created title.
- [ ] Refresh restores the original three fixture priorities.
- [ ] Dashboard `/`, `/my-task`, `/vital-task`, Add Task, and Edit Task still use Extreme / Moderate / Low only. New labels do not appear as task-form radios.
- [ ] **+ Add Task Status** and **Delete** remain inert. Add Category still goes to `/task-categories/create`.
- [ ] Semantic tokens only; Inter; no `bg-[#...]`.
- [ ] Narrow viewport: stacked form, wrapping buttons, no horizontal overflow.
- [ ] No ClerkProvider, no Supabase, no taxonomy API routes.
- [ ] `npm run typecheck` and `npm run lint` pass. `npm run build` because Task Categories client composition changed.

## Checks to run

From the repo root:

```bash
npm run typecheck
npm run lint
```

Run `npm run format` (or `npx ultracite fix` on touched files) if format issues are reported.

Run `npm run build` because Task Categories view composition changed. If the build fails only because Clerk env vars are missing, report that as an existing env blocker.

## Exact manual test steps expected after implementation

1. `npm run dev` and open `http://localhost:3000/task-categories`.
2. Click **+ Add New Priority**. Compare ~1440px to `prompts-img/Add Task Priority.png`: **Add Task Priority** heading, underline under **Add**, Go Back, empty **Task Priority Title**, coral Create + Cancel inside the inner stroke.
3. Click **Go Back** — dialog closes; still three priority rows. Re-open and press Escape — same. Re-open and click **Cancel** — same.
4. Submit empty and whitespace-only — field error, no new row.
5. Enter `Critical` and click **Create** — priority table has SN 4 **Critical**; Extreme / Moderate / Low unchanged; status table unchanged; dialog closed.
6. Re-open Add, enter `extreme` (duplicate of Extreme) — field error, no save.
7. Click **Edit** on **Critical** — **Edit Task Priority** opens, prefilled `Critical`.
8. Refresh `/task-categories` — priorities restore to Extreme / Moderate / Low only.
9. Open `/` and `/my-task` — task cards still show Extreme / Moderate / Low. Add Task / Edit Task radios are still three options. **+ Add Task Status** and **Delete** do not open this dialog.
10. Click **Add Category** — still `/task-categories/create`.
11. Resize to ~375px, open Add Task Priority — field and both buttons remain reachable; no horizontal scrollbar.
12. Confirm no `bg-[#...]` / `text-red-500` in the changed taxonomy dialog components.
