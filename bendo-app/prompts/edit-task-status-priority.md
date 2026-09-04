# Edit Task Status and Edit Task Priority dialogs

## Goal

Add the **Edit Task Status** and **Edit Task Priority** modals from `prompts-img/Edit Task Status.png` and `prompts-img/Edit Task Priority.png`. Open them from the Task Categories taxonomy-table **Edit** buttons. Each dialog is a centered overlay over the existing authenticated app shell, with **Go Back**, one labeled text field, and coral **Update** / **Cancel**.

This pass is **pixel-faithful UI + client-side mock label update** on `/task-categories` only. **Update** patches that row’s display label in the page’s React state. Do **not** add Supabase, `PATCH` routes, Clerk route protection, Settings, Calendar product UI, Agent chat, or the related **Add Task Priority** modal (`prompts-img/Add Task Priority.png`).

Do **not** implement Delete, **+ Add Task Status**, **+ Add New Priority**, user-named category CRUD beyond the existing Create Categories page, or the task-level Edit Task dialog.

## Skills read

- `AGENTS.md` (product scope, category uniqueness as a pattern for labels, architecture layers, prompt workflow, checks, escaped plain text)
- `.agents/skills/clerk/SKILL.md` → `clerk-nextjs-patterns` (server vs client; keep current public-first `proxy.ts`, no `auth.protect()`, no `ClerkProvider`)
- `.claude/skills/shadcn/SKILL.md` plus `rules/styling.md`, `rules/forms.md`, `rules/composition.md`, `rules/icons.md`, `rules/base-vs-radix.md` (semantic tokens, `FieldGroup` + `Field`, Dialog title, `gap-*`, `size-*`, `cn()`, lucide, Base UI `render` not `asChild`, no manual overlay `z-index`)
- `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/04-linking-and-navigating.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`
- `prompts/design-system.md` (canonical tokens already in `app/globals.css`)
- `prompts/task-categories.md` (this prompt is the deferred taxonomy Edit follow-up)
- `prompts/create-categories.md` (Category Name Field + Zod; reuse validation shape, not the full-page layout)
- `prompts/edit-task.md` / `prompts/add-task.md` (Dialog chrome: title + coral first-word underline + Go Back + inner bordered frame)

Supabase and AI SDK are **not** needed. Clerk stays plumbing-only.

## Existing code inspected

- `app/(app)/task-categories/page.tsx` — Server Component rendering `TaskCategoriesView`. Keep as Server Component; pass nothing extra unless needed.
- `components/task-categories/task-categories-view.tsx` — board with Add Category Link, two `TaxonomySection`s. **Edit** is inert today. Lift row lists into client state so Update can patch labels. Keep Add Category → `/task-categories/create`. Keep **+ Add Task Status** / **+ Add New Priority** as inert `type="button"` links.
- `components/task-categories/taxonomy-table.tsx` — row **Edit** / **Delete**. Wire `onEdit(row)`. Leave Delete inert. Do not restyle the table.
- `lib/task-categories/taxonomy.ts` — ordered fixture rows (`completed` / `in_progress` / `not_started`, `extreme` / `moderate` / `low`). Use as **initial** data. Do **not** mutate the exported arrays in place. Do **not** add/remove enum ids.
- `lib/task-categories/category-input.ts` — Zod trim/min/max for user category names. Add a **separate** taxonomy-label schema; do not fold status/priority into category-input.
- `lib/dashboard/mock-data.ts` — `TaskStatus` / `TaskPriority` unions and `statusLabels` / `priorityLabels`. **Do not change** those unions. Task pages keep using the original labels this pass (no global store).
- `lib/tasks/task-input.ts` — task create/update validators and `priorityOptions`. **Do not change.** Renaming a taxonomy label must not add a new priority/status enum value.
- `components/tasks/task-form-dialog.tsx` — Dialog chrome to copy (title slot, `DialogClose` Go Back, inner `border-border` frame, `showCloseButton={false}`, `sm:max-w-3xl` / `md:max-w-4xl`). Do **not** reuse this component; it is the Add/Edit Task form.
- `components/tasks/edit-task-dialog.tsx` — task Edit. Do **not** open it from taxonomy **Edit**.
- `components/task-categories/create-category-form.tsx` — Field + coral Create/Cancel pair. Mirror button row treatment (both default coral). Cancel here is a dialog close, not a `Link`.
- `components/ui/dialog.tsx`, `field.tsx`, `input.tsx`, `button.tsx` — already installed. **Do not** add AlertDialog, Sheet, Sonner, or form libraries.
- `app/globals.css` — tokens already include primary coral. **No** new tokens.
- `prompts-img/Edit Task Status.png` / `prompts-img/Edit Task Priority.png` — visual source of truth for this pass.
- `proxy.ts` / `env.ts` — unchanged.

## Decisions or assumptions

1. **Triggers are taxonomy-table Edit only.** Status-row Edit opens **Edit Task Status**. Priority-row Edit opens **Edit Task Priority**. Do **not** open these dialogs from task-card ⋯ Edit, My Task / Vital Task / View Task pencils, Add Task, Add Category, or Delete.
2. **No standalone `/edit-task-status` or `/edit-task-priority` route.** Overlay is shadcn `Dialog`, same as Add/Edit Task. Dimmed Task Categories board stays visible. Do not hand-roll a modal.
3. **One shared dialog, two copy variants.** A single controlled `EditTaxonomyDialog` (or equivalent) takes `kind: "status" | "priority"`, the row being edited, and sibling labels. Title / field label / validation messages switch on `kind`. Do not copy-paste two near-identical files.
4. **Controlled dialog.** Opened from several row buttons, so `open` + `target` + `onOpenChange`. Prefill the input from `row.label` when the dialog opens (or when `target.id` changes). The PNGs show an empty field as a blank mock; Edit must still prefill.
5. **Exact field copy from the PNGs:**
   - Status: heading **Edit Task Status**, label **Task Status Name**
   - Priority: heading **Edit Task Priority**, label **Task Priority Title**
   - Coral underline under **Edit** only. Do **not** underline “Task Status” / “Task Priority”.
6. **Go Back / overlay / Escape / Cancel close without saving.** Not `router.back()`. Cancel is `type="button"` that closes the dialog (not a `Link`).
7. **Update patches mock state on `/task-categories` only**, then closes. No network. Refresh or leaving the page restores fixture labels from `taxonomy.ts`. **Do not** invent a global label store. Dashboard / My Task / Vital Task / Add Task still show `statusLabels` / `priorityLabels` from `mock-data.ts`.
8. **Enum ids stay fixed.** Update changes only the **display label**. `id` remains `completed` / `in_progress` / `not_started` or `extreme` / `moderate` / `low`. Do not add, remove, or reorder rows. SN stays 1-based index.
9. **No API / Supabase / Clerk.** Do not add `PATCH /api/categories` or taxonomy routes. Frontend checks are user feedback only (AGENTS.md).
10. **Label rules (frontend only):**
    - Required after trimming whitespace; whitespace-only is invalid.
    - Maximum length **50** (`TAXONOMY_LABEL_MAX`).
    - Normalize with trim + collapse internal whitespace (same as `normalizeCategoryName`).
    - Case-insensitive uniqueness **within the same table**, excluding the row being edited. Renaming Moderate to `extreme` while Extreme exists is invalid. The same string as the current row (including case-only change that normalizes to the same value) is a valid no-op save.
    - Do **not** check uniqueness across status vs priority tables (Completed and Extreme may share a name).
    - Do **not** sync `lib/dashboard/mock-data.ts` label maps.
11. **Inner frame contains the field and both buttons.** Unlike Add/Edit Task (Done outside the stroke), these PNGs put **Update** and **Cancel** inside the bordered box, left-aligned under the input, side by side. Both buttons are coral default fills (not outline, not destructive).
12. **Do not paste Figma absolute-positioned code.** Adapt to App Router + tokens.
13. Leave `proxy.ts`, `env.ts`, Button CVA, `app/globals.css`, shell files, Create Categories page, Add/Edit Task dialogs, and other product pages alone except taxonomy Edit wiring.
14. Prefer existing shadcn pieces. **Do not** install new UI packages.
15. **Do not** implement `prompts-img/Add Task Priority.png` in this pass.

## Visual interpretation

Canonical canvas: **1440×1024** desktop. Light mode. Semantic token classes only (`bg-primary`, `bg-card`, `text-foreground`, `rounded-card`, `font-sans`). Never raw hex or Tailwind palette colors (`bg-[#...]`, `text-red-500`).

The two PNGs are the same chrome with different title/label strings. Match them to each other and to Add/Edit Task dialog width/padding, except the form body is one field + two coral buttons inside the inner stroke.

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER + SIDEBAR + TASK CATEGORIES (existing, dimmed)       │
│                                                             │
│   ┌───────────────────────────────────────────────────┐     │
│   │ Edit Task Status                 Go Back          │     │
│   │ ~~~~                                                  │     │
│   │ ┌───────────────────────────────────────────────┐ │     │
│   │ │ Task Status Name                              │ │     │
│   │ │ [ prefilled                               ]   │ │     │
│   │ │ [ Update ]  [ Cancel ]                        │ │     │
│   │ └───────────────────────────────────────────────┘ │     │
│   └───────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

Priority variant replaces the title with **Edit Task Priority** and the label with **Task Priority Title**. Same structure.

- Dialog surface: white `bg-card`, **~720–880px** (`sm:max-w-3xl` / `md:max-w-4xl` — same classes as `TaskFormDialog`), padding **~24–32px**, `rounded-card`. Soft shadow is Dialog default — no custom `z-*`.
- Header: title left, **Go Back** right, underlined (`Button variant="link"` as `DialogClose`).
- Title: Inter medium **~16px**, `text-foreground`. Short **coral underline under “Edit” only** (nested span + `border-b-2 border-primary`).
- Inner form frame: thin `border-border`, `rounded-lg`, padding **~16–24px**. Field + button row live **inside** this frame. Do not place Update/Cancel outside it.
- Overlay: default Dialog dim (do not invent a custom burgundy overlay even if the PNG looks darker).

### Form controls

| Element | Spec |
| --- | --- |
| Layout | `FieldGroup` + `Field`. Never raw `div` + `space-y-*`. |
| Label | **Task Status Name** or **Task Priority Title**. `FieldLabel` associated via `htmlFor` / `useId`. Inter medium, `text-foreground`. |
| Input | Single-line `Input`, full width of the inner frame. No placeholder in the PNGs. Light `border-input`, `rounded-lg`. Height may use `h-10` as **layout only** if default `h-8` looks too short; do not override colors via `className`. |
| Update | Coral default `Button`, white label **Update**, `type="submit"`. `size="lg"`, `rounded-lg`, `min-w-24` / `px-8` like Create / Done. |
| Cancel | Same coral default `Button` (not outline, not ghost). Visible label **Cancel**, `type="button"`, closes without saving. |
| Button row | Side-by-side, left-aligned under the input, `flex` + `gap-2` or `gap-3`. Update first, Cancel second. |
| Errors | `data-invalid` on `Field`, `aria-invalid` on the input, message in `FieldError`. |

Vertical `gap-4` / `gap-6` between label+input and the button row. No `space-y-*`.

### Typography

| Role | Style |
| --- | --- |
| Dialog title | Inter ~16px medium; coral underline on **Edit** |
| Go Back | Inter ~14px, underlined, `text-foreground` |
| Field label | Inter ~14px medium, `text-foreground` |
| Input | Inter ~14px, `text-foreground` |
| Update / Cancel | Button default (coral, white label) |

Montserrat is **not** used on these dialogs.

### Spacing

- 8px grid: `gap-2`, `gap-3`, `gap-4`, `gap-6`.
- No `space-y-*` / `space-x-*`.
- Equal width/height: `size-*`.
- Inputs and buttons `rounded-lg`. Dialog `rounded-card`.

### Colors

- Dialog `bg-card`. Update/Cancel `bg-primary` / `text-primary-foreground` (no Button color overrides via `className`).
- Input chrome: `border-input` only. Invalid uses existing destructive field styles.
- No `text-red-500`, `bg-[#...]`, or `dark:` overrides.

### Responsiveness (minimal)

- **`md+`:** wide dialog; full-width field inside the inner frame; buttons left-aligned.
- **Below `md`:** same stacked form; buttons may wrap (`flex-wrap`) but stay reachable; no horizontal overflow at 375px.
- Dialog scrolls internally if the viewport is short.

### Pixel-perfect expectations

- Compare at ~1440px to `prompts-img/Edit Task Status.png` and `prompts-img/Edit Task Priority.png`.
- Centered white modal; **Edit** coral underline; **Go Back** top-right; inner stroked form; coral **Update** + **Cancel** inside the stroke, bottom-left of that box.
- Opening Edit does not restyle the shell. Task Categories tables remain visible (dimmed) behind the overlay.
- Add/Edit Task dialogs are unchanged (Done still outside their inner frame; titles still **Add New Task** / **Edit Task**).

## Files likely to change

- `components/task-categories/edit-taxonomy-dialog.tsx` — **new** controlled Dialog (kind, row, sibling labels, `onUpdate`)
- `components/task-categories/task-categories-view.tsx` — client state for both row lists + open target; wire section Edit
- `components/task-categories/taxonomy-table.tsx` — `onEdit` callback on the Edit button
- `lib/task-categories/taxonomy-input.ts` — **new** Zod schema, `TAXONOMY_LABEL_MAX`, `validateTaxonomyLabel({ name, kind, existingLabels, currentLabel })`

Do **not** change `proxy.ts`, `env.ts`, `app/globals.css`, shell components, Create Categories, Add/Edit Task, `lib/dashboard/mock-data.ts` enums, or `lib/tasks/task-input.ts`.

Keep files small. Page stays a Server Component; dialog and list mutation stay client.

## Implementation requirements

1. **App Router:** `app/(app)/task-categories/page.tsx` remains a Server Component. Dialog, form state, and row patches live in Client Components (`"use client"` on the view or a small board wrapper).
2. **shadcn Dialog:** visible `DialogTitle` (“Edit Task Status” / “Edit Task Priority”); do not `sr-only` it. Base UI `render` on close — **not** Radix `asChild`. Do not set `z-index` on the overlay. `showCloseButton={false}` like Add/Edit Task.
3. **shadcn forms:** `FieldGroup` + `Field` + `FieldLabel` + `Input` + `FieldError`. Buttons: default variant. `cn()` only when needed.
4. **Typed input.** Explicit Zod schema. No `any`. Export `TAXONOMY_LABEL_MAX` and `validateTaxonomyLabel` that returns `{ success: true, data: { name } }` or `{ success: false, error: string }`.
5. **Accessibility:** `DialogTitle` matches the visible heading; label is programmatically associated; Update is `type="submit"`; Cancel is `type="button"`; errors use `role="alert"` via `FieldError`; each Edit button keeps `aria-label={`Edit ${row.label}`}`.
6. **Escape user input.** Render labels as React text nodes / controlled input values. No `dangerouslySetInnerHTML`.
7. **Reset** the form when the dialog closes. Re-hydrate from `target.row.label` when it opens.
8. **Do not** persist to `localStorage`, implement Delete/Add taxonomy, or add PATCH routes.
9. TypeScript strict; no unused files; no unrelated refactors.

## Security requirements

- No new env vars. No service-role key. No secrets in client components.
- No `dangerouslySetInnerHTML`.
- Do not enable Clerk `auth.protect()`.
- Do not send the form to any external URL.
- Presentational Update/Cancel/Logout must not call external APIs.

## Acceptance criteria

- [ ] Status-row **Edit** on `/task-categories` opens **Edit Task Status** over the existing shell, prefilled with that row’s label.
- [ ] Priority-row **Edit** opens **Edit Task Priority**, prefilled with that row’s label.
- [ ] Layout matches the PNGs: Edit underline, Go Back, bordered form, one labeled field, coral Update + Cancel inside the inner frame.
- [ ] Go Back / overlay / Escape / Cancel close without changing the table.
- [ ] Valid **Update** changes that row’s label in the Task Status or Task Priority table; dialog closes; SN and other rows stay the same.
- [ ] Empty / whitespace-only name, over-max length, and a case-insensitive duplicate in the **same** table show a field error and do **not** save.
- [ ] Unchanged (or equivalent normalized) name on Update closes successfully.
- [ ] Refresh restores the original six fixture labels.
- [ ] Dashboard `/`, `/my-task`, `/vital-task`, Add Task, and Edit Task still use original Extreme / Moderate / Low and status labels.
- [ ] Task card / detail **Edit** still opens the task Edit Task dialog, not these taxonomy dialogs.
- [ ] Add Category still navigates to `/task-categories/create`. **+ Add Task Status**, **+ Add New Priority**, and **Delete** remain inert.
- [ ] Semantic tokens only; Inter; no `bg-[#...]`.
- [ ] Narrow viewport: stacked form, wrapping buttons, no horizontal overflow.
- [ ] No ClerkProvider, no Supabase, no taxonomy API routes, no Add Task Priority modal.
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
2. Click **Edit** on status row **Completed**. Compare ~1440px to `prompts-img/Edit Task Status.png`: **Edit Task Status** heading, underline under **Edit**, Go Back, **Task Status Name**, prefilled `Completed`, coral Update + Cancel inside the inner stroke.
3. Click **Go Back** — dialog closes; table still shows Completed. Re-open and press Escape — same. Re-open and click **Cancel** — same.
4. Change the name to `Done` and click **Update** — status row 1 shows `Done`; other status rows unchanged; dialog closed.
5. Re-open Edit on **In Progress**, clear the field, Update — field error, no save.
6. Try renaming **Not Started** to `done` (duplicate of `Done`, case-insensitive) — field error, no save.
7. Click **Edit** on priority row **Extreme**. Compare to `prompts-img/Edit Task Priority.png`: title **Edit Task Priority**, label **Task Priority Title**, prefilled `Extreme`. Rename to `Urgent`, Update — priority table updates; status table unchanged.
8. Refresh `/task-categories` — labels restore to Completed / In Progress / Not Started and Extreme / Moderate / Low.
9. Open `/`, `/my-task`, `/vital-task` — task cards still show original Extreme / Moderate / Low (or status) labels. Task ⋯ **Edit** / pencil still opens **Edit Task**, not these dialogs.
10. Click **Add Category** — still `/task-categories/create`. **+ Add Task Status**, **+ Add New Priority**, and **Delete** do not open a dialog or change rows.
11. Resize to ~375px, open either Edit dialog — field and both buttons remain reachable; no horizontal scrollbar.
12. Confirm no `bg-[#...]` / `text-red-500` in the new dialog components.
