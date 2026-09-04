# Design-system showcase page

## Goal

Add a public `/design-system` page that visually presents the Figma-mapped tokens already in `app/globals.css` and the existing `Button` variants. The page is a token/specimen viewer so we can confirm coral primary, canvas, sidebar, type, radius, shadows, and status colors in the browser.

Do **not** build the Dashboard, app shell, login, or any product feature. Do **not** install extra shadcn components.

## Skills read

- `AGENTS.md` (workflow, routing layers, checks)
- `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md` (App Router `page.tsx`)
- `node_modules/next/dist/docs/01-app/01-getting-started/04-linking-and-navigating.md` (`Link`)
- `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md` (page is a Server Component; only the dark-preview toggle is a Client Component)
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md`
- `.claude/skills/shadcn/SKILL.md` and `rules/styling.md` (semantic token classes, `gap-*`, `size-*`, no raw palette colors)
- `prompts/design-system.md` (token source of truth already implemented)

Clerk, Supabase, and AI SDK are not needed.

## Existing code inspected

- `app/globals.css` — Figma tokens: primary `#ff6767`, background `#f5f8ff`, sidebar coral + white accent pill, status/priority/date, `--radius` 8px, `--radius-card` 14px, shadows, Inter/Montserrat theme fonts
- `app/layout.tsx` — Inter `--font-sans`, Montserrat `--font-heading`, Geist Mono
- `app/page.tsx` — create-next-app starter; leave it as-is except a single `Link` to `/design-system`
- `components/ui/button.tsx` — default, outline, secondary, ghost, destructive, link; sizes default/xs/sm/lg/icon*
- No other `app/` routes. Only `Button` is installed under `components/ui`

## Decisions or assumptions

1. Route is `/design-system` via `app/design-system/page.tsx`.
2. Page is a Server Component. The only Client Component is a small dark-preview toggle that adds/removes `dark` on `document.documentElement`. Do not install `next-themes`.
3. Use token utilities only (`bg-primary`, `text-status-completed`, `rounded-card`, `shadow-panel`, `font-heading`). Never raw hex or Tailwind palette colors (`bg-red-500`, `text-zinc-600`).
4. Do not add Card/Badge/Separator via the shadcn CLI. Specimen surfaces are `div`s using `bg-card`, `rounded-card`, `border`, and `shadow-panel`.
5. Do not implement Figma chrome (coral sidebar layout, search header, task cards as product UI). A compact **sidebar token preview** (coral strip + inactive/active nav pills) is allowed so those tokens can be seen.
6. Add one `Link` from the starter home to `/design-system`. Do not restyle `app/page.tsx` into the dashboard.
7. Keep the page static: no data fetching, no auth, no env vars.

## Visual interpretation

### Layout

- Full-page `bg-background text-foreground`.
- Centered column, `max-w-5xl`, horizontal padding 24px (`px-6`), vertical padding 32–48px.
- Header row: wordmark-style title + dark-preview control aligned to the right.
- Sections stacked with `flex flex-col gap-10` (8px grid; 40px between sections).
- Within a section: heading, then a wrapping grid (`grid gap-4` / `sm:grid-cols-2` / `lg:grid-cols-4` for swatches).
- Each specimen sits on `bg-card rounded-card border shadow-panel` with 16–24px inner padding.

### Typography

| Element | Token / style |
| --- | --- |
| Page title | Inter, 36px, medium, `text-foreground`. First word “Design” in `text-primary` (Figma wordmark split) |
| Page subtitle | Inter 14px `text-body` |
| Section titles | Inter 15px medium `text-primary` (Figma “To-Do” / “Task Status”) |
| Swatch labels | Inter 12px `text-muted-foreground` for the CSS variable name; 14px `text-foreground` for the human name |
| Type specimens | Greeting 36px medium; wordmark 32px semibold; nav 16px medium; task title 16px semibold; body 14px `text-body`; meta 12px `text-muted-foreground`; status 10px status colors |
| Auth sample | Montserrat `font-heading` 36px bold “Sign In” and 16px medium input placeholder in `text-muted-foreground` |

Line-height near-normal. No tight tracking.

### Spacing

- 8px grid throughout (`gap-2`, `gap-4`, `gap-6`, `gap-10`).
- Color swatch: square `size-16` with `rounded-lg` (8px).
- Nav pill preview: width ~288px max, height 59px, `rounded-[14px]` via `rounded-card`.
- Do not use `space-y-*`.

### Colors (must render from tokens)

Show these swatches, grouped:

**Brand & surfaces:** background, foreground, primary, primary-foreground, accent, secondary, muted, card, destructive, border, input, ring, body.

**Sidebar:** sidebar, sidebar-foreground, sidebar-accent, sidebar-accent-foreground.

**Status & charts:** status-not-started, status-in-progress, status-completed, priority-moderate, date-accent, chart-1…chart-5.

Each swatch: filled rectangle using the token (`bg-primary`, `bg-status-completed`, etc.) plus name and class (`bg-primary`). For foreground-only tokens, show a text sample on `bg-card` (`text-body`, `text-status-completed`).

Sidebar preview block:

- Coral `bg-sidebar text-sidebar-foreground` rounded-lg panel.
- Inactive item: transparent, white 16px medium label.
- Active item: `bg-sidebar-accent text-sidebar-accent-foreground rounded-card` white pill, coral label.

### Radius

Show four squares on `bg-primary`: `rounded-sm`, `rounded-lg` (8px), `rounded-card` (14px), `rounded-full`. Label each.

### Shadows

Three white `bg-card` panels labeled header / sidebar / panel using `shadow-header`, `shadow-sidebar`, `shadow-panel`.

### Buttons

One row (wrap on small screens) of existing `Button` variants: default, outline, secondary, ghost, destructive, link. Default size. Outline must read as Invite (coral border + coral text). Default must be coral fill + light label; hover must go to lighter coral (`accent`).

Do not pass color `className` overrides onto `Button`.

### Responsiveness

- Mobile: single column, buttons wrap with `flex flex-wrap gap-2`.
- `sm+`: 2-column swatch grid; `lg+`: 4 columns.
- Header stacks on narrow screens (`flex-col gap-4 sm:flex-row sm:items-center sm:justify-between`).

### Pixel-perfect expectations

- Canvas must be cool off-white (`#f5f8ff`), not zinc-50.
- Primary swatch and default Button must match Figma coral `#ff6767`, not a desaturated pink or the old near-black primary.
- Status labels use `text-status-*`, not Tailwind green/blue/red.
- Inter is the page sans; Montserrat appears only in the heading specimen.
- Card corners 14px; icon/button-like squares 8px.

## Files likely to change

- `app/design-system/page.tsx` — Server Component page (new)
- `app/design-system/theme-preview-toggle.tsx` — Client Component dark toggle (new)
- `app/page.tsx` — add a `Link` to `/design-system` only; do not replace the starter layout
- Optional: `app/design-system/swatch.tsx` or similar presentational helpers colocated in the folder if the page would otherwise be one oversized file. Keep helpers server-safe and tiny.

Do not change `app/globals.css` or `components/ui/button.tsx` unless a token class is missing (it should not be).

## Implementation requirements

1. Default-export a page from `app/design-system/page.tsx`. Export `metadata` title `Design system · bendo`.
2. Use `next/link` `Link` for the home ↔ design-system links.
3. Dark toggle: `"use client"`; `Button variant="outline"`; toggle `document.documentElement.classList.toggle("dark")`; accessible name “Preview dark theme” / “Preview light theme”. No persistence required.
4. Extract a small `Swatch` helper (name, className for the fill, token label) to avoid copy-paste. Typed props, no `any`.
5. All interactive pieces besides the toggle use the existing `Button`.
6. TypeScript strict; `cn()` for conditional classes; no `any`; no unused files.
7. Do not fetch Figma assets. Do not paste absolute-positioned Figma reference code.

## Security requirements

- Public static page only. No secrets, no API routes, no service-role keys.
- No user-generated content.

## Acceptance criteria

- [ ] `http://localhost:3000/design-system` renders the showcase (no auth wall).
- [ ] Page background is token canvas; title uses Inter; “Design” is primary coral.
- [ ] Color swatches cover brand, sidebar, status, and chart tokens using semantic classes.
- [ ] Sidebar preview shows coral panel + white active pill with coral text.
- [ ] Typography section shows Inter scale and a Montserrat `font-heading` sample.
- [ ] Radius and shadow specimens use `rounded-card` / `shadow-*` tokens.
- [ ] All `Button` variants are visible; default is coral; outline is coral border/text.
- [ ] Dark toggle flips `.dark` and token-backed colors change; no missing variables.
- [ ] Home has a link to `/design-system`.
- [ ] No dashboard/login/sidebar product chrome.
- [ ] `npm run typecheck` passes. Format the new files with Ultracite if needed.

## Checks to run

```bash
npm run typecheck
npm run lint
```

Run `npm run format` (or `npx ultracite fix` on touched files) if format issues are reported. Run `npm run build` because a new route was added; if Clerk env vars are missing, report that as an existing env blocker, not a page bug.

## Exact manual test steps expected after implementation

1. `npm run dev` and open `http://localhost:3000/design-system`.
2. Confirm cool off-white canvas and coral “Design” in the title.
3. Confirm primary swatch and default Button match Figma coral (`#ff6767`).
4. Confirm status row: not started red, in progress blue, completed green, moderate cyan, date accent blue.
5. Confirm sidebar preview: coral background, white active pill, coral label.
6. Hover default Button — fill should lighten toward `#ff9090`.
7. Click the dark-preview control — surfaces go dark navy-gray, primary stays coral, status colors remain defined.
8. Resize to a phone width — grids collapse to one column; buttons wrap; no horizontal overflow.
9. From `http://localhost:3000`, follow the Design system link and return via the page’s home link.
