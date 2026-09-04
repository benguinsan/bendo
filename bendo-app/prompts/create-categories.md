# Create Categories page UI

## Goal

Add the **Create Categories** full-page form from `prompts-img/Create Categories.png` at `/task-categories/create`, inside the existing authenticated app shell. Wire the Task Categories **Add Category** button to this route.

This pass is **pixel-faithful UI + client-side name validation**. Do **not** add Supabase, `POST /api/categories`, Clerk route protection, Settings, Calendar product UI, or Agent chat.

Do **not** implement these related screens in this pass (follow-ups):

- `prompts-img/Add Task Priority.png` (modal)
- `prompts-img/Edit Task Status.png` (modal)
- `prompts-img/Edit Task Priority.png` (modal)

Do **not** change Dashboard, My Task, View Task, Vital Task, or the Add Task dialog. Do **not** change the Task Status / Task Priority tables beyond routing **Add Category** to this page.

## Skills read

- `AGENTS.md` (product scope, category storage rules for validation only, architecture layers, prompt workflow, checks, escaped plain text)
- `.agents/skills/clerk/SKILL.md` → `clerk-nextjs-patterns` (server vs client; keep current public-first `proxy.ts`, no `auth.protect()`, no `ClerkProvider`)
- `.claude/skills/shadcn/SKILL.md` plus `rules/styling.md`, `rules/forms.md`, `rules/composition.md`, `rules/icons.md`, `rules/base-vs-radix.md` (semantic tokens, `FieldGroup` + `Field`, `gap-*`, `size-*`, `cn()`, Base UI `render` + `nativeButton={false}` for Link-as-Button, no `space-y-*`)
- `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/04-linking-and-navigating.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`
- `prompts/design-system.md` (canonical tokens already in `app/globals.css`)
- `prompts/task-categories.md` (this prompt is the deferred Create Categories follow-up)
- `prompts/add-task.md` (Field + Zod client validation pattern; reuse composition, not the dialog)
- `prompts/view-task.md` / `prompts/vital-task.md` (Go Back `Link`, coral first-word underline)

Supabase and AI SDK are **not** needed. Clerk stays plumbing-only.

## Existing code inspected

- `app/(app)/layout.tsx` — shared shell; `dynamic = "force-dynamic"`; mock profile + live date. **Do not rebuild the shell.**
- `app/(app)/task-categories/page.tsx` — Server Component rendering `TaskCategoriesView`. Keep as-is except metadata if needed (leave title).
- `components/task-categories/task-categories-view.tsx` — **Add Category** is currently `type="button"` with no navigation. Change it to a Link-styled Button to `/task-categories/create`. Do not otherwise restyle the board.
- `components/task-categories/taxonomy-table.tsx` — status/priority tables. **Do not change.**
- `lib/task-categories/taxonomy.ts` — fixed enum rows. **Do not add user-named categories here.**
- `components/app-shell/app-nav.tsx` — `/task-categories` already uses prefix matching (`pathname.startsWith("/task-categories/")`). Nested `/task-categories/create` already keeps the Task Categories white pill. No nav change required.
- `components/my-task/view-task-view.tsx` — **Go Back** is a `Link` (`text-sm underline`) in `CardAction`, not `router.back()`. Reuse that pattern; target **`/task-categories`**.
- `components/vital-task/vital-task-view.tsx` — panel title uses nested span + `border-b-2 border-primary` under the **first word** only.
- `components/dashboard/add-task-dialog.tsx` — `FieldGroup` + `Field` + `FieldLabel` + `Input` + `FieldError` + Zod via `lib/tasks/task-input.ts`. Mirror this form composition; do not copy the dialog chrome.
- `lib/tasks/task-input.ts` — Zod 4 trim/min/max pattern. Add a **separate** category schema file; do not fold category rules into task-input.
- `components/app-shell/app-header.tsx` — `Button nativeButton={false} render={<Link href="..." />}` for calendar. Use the same pattern for Add Category, Cancel, and (if needed) other button-links.
- `app/globals.css` — coral primary, canvas, `--radius-card` 14px, `--radius` 8px, `shadow-panel`. No new tokens required.
- `components/ui/*` — `button`, `card`, `field`, `input`, `label` already installed. **Do not** add Table, Dialog, AlertDialog, Sheet, Sonner, or form libraries.
- `components.json` — `base-nova`, Tailwind v4, `iconLibrary: lucide`, Base UI (`render` not `asChild`).
- `package.json` — Next 16, React 19, Zod 4, no Supabase.
- `prompts-img/Create Categories.png` — visual source of truth for this pass.
- `proxy.ts` / `env.ts` — unchanged.

## Decisions or assumptions

1. **Route is `/task-categories/create`.** Nested App Router page under the existing `(app)` group so it inherits the shell. Metadata title: `Create Categories · bendo`. Do **not** add `/create-categories`, `/categories/create`, or a modal overlay for this PNG.
2. **Reuse the existing shell.** Header (search, bell, calendar, live date) and coral sidebar stay as Dashboard built them. Nav already highlights Task Categories on this nested path. Do **not** add Settings. Do **not** relabel Agent/Help.
3. **This is a user-named category form, not a status/priority editor.** The PNG is a single **Category Name** field plus **Create** / **Cancel**. Do not add color pickers, icons, status, or priority.
4. **Presentational persistence.** **Create** must not call a network API, write to Supabase, or mutate `taxonomy.ts` / Task Status / Task Priority rows. Frontend validation is for user feedback only (AGENTS.md). A later pass can persist via `POST /api/categories`.
5. **Valid Create returns to the list.** On successful validation, `router.push("/task-categories")` (or a `Link`-equivalent navigation). The list still shows the original six taxonomy rows. Empty/whitespace-only or over-max names stay on the form with `FieldError`.
6. **Go Back** and **Cancel** both navigate to `/task-categories` without saving. They are not `router.back()`. Cancel is a coral Button-as-Link (PNG is two coral fills, not outline/ghost).
7. **Add Category** on `/task-categories` becomes a Button-as-Link to `/task-categories/create`, same coral default Button look as today.
8. **Zod schema in `lib/`** so a later server route can reuse it. Validate on submit in the client form. No react-hook-form.
9. **Category input rules (frontend only, matching AGENTS.md category storage rules as far as they apply without a store):**
   - Name is required after trimming whitespace.
   - Names that are only whitespace are invalid.
   - Maximum length **50** (`CATEGORY_NAME_MAX`).
   - Normalize with trim (and collapse internal whitespace) before considering the value valid.
   - Case-insensitive uniqueness is **not** enforced in this pass (there is no user-category list). Do not invent mock user categories.
10. **Do not persist user categories into the status/priority tables.** Those remain fixed app enums.
11. **Page is a Server Component; the form is a Client Component.** `"use client"` only on the form (or a small view that owns form state).
12. **Do not paste Figma absolute-positioned code.** Adapt to App Router + tokens.
13. Leave `proxy.ts`, `env.ts`, Button CVA, `app/globals.css`, Add Task dialog, task fixtures, taxonomy tables, and shell files alone (except Add Category becoming a Link).
14. Prefer existing shadcn pieces: Card, Field, Input, Button. Do **not** install new UI packages.

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
│ Categories   │  │ Create Categories            Go Back    │ │
│ white pill   │  │ ~~~~~~                                   │ │
│              │  │                                          │ │
│              │  │ Category Name                            │ │
│              │  │ [________________________]  (~50% width) │ │
│              │  │                                          │ │
│              │  │ [ Create ]  [ Cancel ]                   │ │
│              │  └─────────────────────────────────────────┘ │
└──────────────┴──────────────────────────────────────────────┘
```

- Main: single white `Card` / panel on cool canvas, same outer padding as Task Categories / View Task (`px-4 py-6 sm:px-6 lg:px-8 lg:py-8`).
- Panel: `bg-card`, `rounded-card` (14px), `shadow-panel`, keep Card’s existing `ring-1 ring-foreground/10`. Inner padding **~20–32px**.
- On desktop, the panel should fill remaining viewport height (`flex-1` in a `min-h-0` column) like Task Categories, not a short card floating in empty canvas. Inner content `overflow-y-auto` if needed.
- Form content is **top-left aligned** with generous leftover canvas inside the card (the PNG is sparse). Do not vertically center the field in the card.
- Below `lg`: same single column; input goes full width; no horizontal overflow at 375px.

### Page header (inside the card)

| Element | Spec |
| --- | --- |
| Heading | Inter medium **~15–16px**, `text-foreground` (black, **not** coral). Copy exactly: **Create Categories**. Use `h1`. |
| Underline | Short coral bar **only under “Create”** (same nested-span `border-b-2 border-primary` as Vital Tasks / Task Categories). Do **not** underline “Categories”. The PNG’s bar is short; first-word underline matches the rest of the app (do not underline only “Cr”). |
| Go Back | Top-right of the card header (`CardAction`). `Link` to `/task-categories`. Inter ~14px, `text-foreground`, underline + `underline-offset-2`. |

### Form

| Element | Spec |
| --- | --- |
| Layout | `FieldGroup` + `Field`. Never raw `div` + `space-y-*`. |
| Label | **Category Name**, `FieldLabel` associated with the input via `htmlFor` / `useId`. Inter medium, `text-foreground`. |
| Input | Single-line `Input`, no placeholder in the PNG. Light border (`border-input`), `rounded-lg`. Desktop width about **half the card** (`w-full max-w-xl` or `md:max-w-[50%]`). Full width below `md`. Height may use `h-10` as **layout only** if default `h-8` looks too short vs the PNG; do not override colors via `className`. |
| Create | Coral default `Button`, white label **Create**, `type="submit"`. `size="lg"`, `rounded-lg`, min width so it reads like the PNG (~80–100px, `min-w-24` / `px-8` as in Add Task’s Done). |
| Cancel | Same coral default `Button` (not outline, not destructive). Visible label **Cancel**. Button-as-Link to `/task-categories` with `nativeButton={false}` and `render={<Link href="/task-categories" />}`. |
| Button row | Side-by-side, left-aligned under the input, `flex` + `gap-2` or `gap-3`. Create first, Cancel second. |
| Errors | `data-invalid` on `Field`, `aria-invalid` on the input, message in `FieldError`. |

Vertical `gap-6` / `gap-8` between header, field, and buttons. No `space-y-*`.

### Typography

| Role | Style |
| --- | --- |
| Panel title “Create Categories” | Inter ~15px medium, foreground; coral underline on “Create” |
| Category Name label | Inter ~14px medium, foreground |
| Input | Inter ~14px, `text-foreground` |
| Go Back | Inter ~14px, foreground, underlined |
| Create / Cancel | Button default (coral, white label) |
| Nav / header | Unchanged |

Montserrat is **not** used on this page.

### Spacing

- 8px grid: `gap-2`, `gap-3`, `gap-4`, `gap-6`, `gap-8`.
- No `space-y-*` / `space-x-*`.
- Equal width/height: `size-*`.
- Buttons 8px radius (`rounded-lg`). Panel `rounded-card`.
- Title row uses Card header grid so Go Back sits top-right (`has-data-[slot=card-action]` already on CardHeader).

### Colors

- Canvas `bg-background`, panel `bg-card`, actions `bg-primary` / `text-primary-foreground`.
- Input chrome: `border-input` only. Invalid uses existing destructive field styles.
- No `text-red-500`, `bg-[#...]`, or Button color overrides via `className`.

### Responsiveness (minimal)

- **`lg+`:** one full-height board as the mock; name field ~50% width.
- **Below `lg`:** same stacked form; input and buttons full-wrap (`flex-wrap`); no horizontal page overflow at 375px.
- Do not build a second mobile design.

### Pixel-perfect expectations

- Compare at ~1440px to `prompts-img/Create Categories.png`.
- One white board on cool canvas; **Create Categories** with coral underline under **Create** only; **Go Back** top-right.
- One labeled **Category Name** field; **Create** and **Cancel** both coral, side by side.
- Sidebar **Task Categories** white pill (already pathname prefix-based).
- Inter; 14px card radius; 8px controls.
- Wordmark and sidebar stay the **existing** Dashboard shell (Dashboard / Agent labels), not a rebuild of Figma’s “To-Do” / Settings / Help.

## Files likely to change

- `app/(app)/task-categories/create/page.tsx` — **new** Server Component page + metadata
- `components/task-categories/create-category-form.tsx` — **new** client form (field, validation, submit)
- `components/task-categories/create-category-view.tsx` — **new** page layout (Card, title, Go Back, form)
- `components/task-categories/task-categories-view.tsx` — Add Category Button-as-Link to `/task-categories/create`
- `lib/task-categories/category-input.ts` — **new** Zod schema, max-length constant, `validateNewCategory` helper

Do **not** change `proxy.ts`, `env.ts`, `app/globals.css`, shell components, Add Task, taxonomy tables, or other product pages.

Keep files small. Page stays a Server Component.

## Implementation requirements

1. **App Router:** keep `(app)` layout. Create Categories `page.tsx` is a Server Component.
2. **Typed validation.** Explicit Zod schema. No `any`. Export `CATEGORY_NAME_MAX` and a small `validateNewCategory(name: string)` (or equivalent) that returns `{ success: true, data }` or `{ success: false, error: string }`.
3. **shadcn:** full Card composition on the board. Form uses `FieldGroup` + `Field` + `FieldLabel` + `Input` + `FieldError`. Buttons: default variant; Link-as-Button uses `nativeButton={false}` + `render={<Link />}`. `cn()` only when needed.
4. **Accessibility:** `h1` is “Create Categories”; label is programmatically associated; submit button is `type="submit"`; Cancel is a real link (or Button rendered as `Link`); errors use `role="alert"` via `FieldError`.
5. **Escape user input.** Render the typed name only as a controlled input value, never `dangerouslySetInnerHTML`.
6. **Do not** implement create/update/delete persistence, user-category lists, notifications, or search-on-this-page.
7. TypeScript strict; no unused files; no unrelated refactors.

## Security requirements

- No new env vars. No service-role key. No secrets in client components.
- No `dangerouslySetInnerHTML`.
- Do not enable Clerk `auth.protect()` on `/task-categories/create`.
- Presentational Create/Cancel/Logout must not call external APIs.

## Acceptance criteria

- [ ] `http://localhost:3000/task-categories/create` shows the Create Categories board inside the existing shell.
- [ ] Sidebar Task Categories item is the active white pill on this nested route.
- [ ] Header: “Create Categories” with coral underline under “Create”; Go Back top-right navigates to `/task-categories`.
- [ ] Category Name field is labeled and editable. Empty/whitespace submit shows a field error and stays on the page.
- [ ] Name longer than 50 characters shows a field error.
- [ ] Valid **Create** navigates to `/task-categories` and does **not** add a row to Task Status or Task Priority.
- [ ] **Cancel** navigates to `/task-categories` without saving.
- [ ] Task Categories **Add Category** navigates to `/task-categories/create`.
- [ ] Dashboard `/`, `/my-task`, `/vital-task`, and Add Task are unchanged.
- [ ] Semantic tokens only; Inter; card radius 14px.
- [ ] Narrow viewport: stacked form, no horizontal overflow; actions remain usable.
- [ ] No ClerkProvider, no Supabase, no category API routes, no status/priority modals.
- [ ] `npm run typecheck` and `npm run lint` pass. `npm run build` because a new page route was added.

## Checks to run

From the repo root:

```bash
npm run typecheck
npm run lint
```

Run `npm run format` (or `npx ultracite fix` on touched files) if format issues are reported.

Run `npm run build` because `app/(app)/task-categories/create/page.tsx` is new. If the build fails only because Clerk env vars are missing, report that as an existing env blocker.

## Exact manual test steps expected after implementation

1. `npm run dev` and open `http://localhost:3000/task-categories`.
2. Click **Add Category** — lands on `/task-categories/create`. Compare ~1440px width to `prompts-img/Create Categories.png`: one white board, heading underline under “Create”, Go Back, Category Name field, coral Create + Cancel.
3. Confirm sidebar: Task Categories white pill; Dashboard / Vital Task / My Task / Agent still navigate; no Settings item.
4. Click **Go Back** — lands on `/task-categories`. Open create again and click **Cancel** — same destination; taxonomy tables still show six original rows.
5. Submit with an empty name and with only spaces — field error, URL stays `/task-categories/create`.
6. Enter a valid name (e.g. `Work`) and click **Create** — navigates to `/task-categories`; status/priority tables unchanged.
7. Open `/`, `/my-task`, `/vital-task` — layouts and fixture lists unchanged. Add Task on Dashboard still works.
8. Resize to ~375px — no horizontal scrollbar; field and both buttons remain reachable.
9. Confirm no `bg-[#...]` / `text-red-500` in new Create Categories components.
