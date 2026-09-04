# Design system from Figma

## Goal

Implement bendo’s **app design system** from the Figma file [To-do List Web App Design (Community)](https://www.figma.com/design/JkIeeSKseY4NO9FyC6WTV6/To-do-List-Web-App-Design--Community-?node-id=16-34). Map the file’s colors, type, radius, shadows, and semantic status colors onto the existing shadcn/Tailwind v4 token layer so later pages (dashboard, tasks, calendar, settings) can use `bg-primary`, `text-muted-foreground`, `bg-sidebar`, and status utilities instead of raw hex.

This prompt is **tokens + theme + font + Button alignment only**. Do **not** build Dashboard, sidebar chrome, search header, login screens, or any product page.

## Skills read

- `AGENTS.md` (workflow, architecture, checks)
- `.claude/skills/shadcn/SKILL.md` and `.claude/skills/shadcn/customization.md` (semantic CSS variables, `@theme inline`, no raw Tailwind palette colors)
- `.claude/skills/shadcn/rules/styling.md` (semantic colors, variants first)
- `node_modules/next/dist/docs/01-app/01-getting-started/13-fonts.md` (`next/font/google` in the root layout)
- Figma plugin skill `figma-design-to-code` (design context is a reference, adapt to this stack)

Clerk, Supabase, and AI SDK are not needed.

## Existing code inspected

- `app/globals.css` — default shadcn Nova/neutral OKLCH tokens; `--radius: 0.625rem`; Geist mapped via `--font-sans`
- `app/layout.tsx` — Geist + Geist Mono via `next/font/google`; metadata still generic
- `app/page.tsx` — create-next-app starter (hardcoded zinc/black, not token-based)
- `components/ui/button.tsx` — only installed shadcn primitive; Base UI Button + CVA variants
- `components.json` — `style: base-nova`, Tailwind v4, `cssVariables: true`, `iconLibrary: lucide`
- `package.json` — Next 16, React 19, Tailwind 4, shadcn 4
- Figma pages:
  - `16:34` Main Design (all screens)
  - `324:2132` Components (nav, icon buttons, login/register, checkbox)
  - `16:35` Dashboard (canonical authenticated chrome)
  - `449:1406` Login (auth type + primary button)
- The Figma file has **no Variables or published Styles**; tokens are extracted from fills/text on those frames.

## Decisions or assumptions

1. **Scope is the theme, not screens.** Product pages stay out of this change.
2. **Light mode is the source of truth.** Figma is light-only. Keep `.dark` tokens so shadcn dark classes do not break; derive a coral-tinted dark palette from the same hues. Do not invent a second Figma dark design.
3. **Reuse shadcn semantic names.** Map Figma fills onto `--primary`, `--background`, `--sidebar-*`, `--muted-*`, `--destructive`, `--chart-*`. Add only the extra tokens the file needs that shadcn does not have: task status, priority, and a date accent.
4. **Fonts:** Inter is the app UI font (nav, titles, body). Montserrat is the secondary/auth font (login headings, some placeholders). Replace Geist Sans with Inter. Keep Geist Mono as `--font-mono`.
5. **Foreground black:** Prefer Figma `#212427` (Sign In) over pure `#000000` for `--foreground`. Logo/body black in Dashboard is close enough to map to the same token.
6. **Primary button:** Default fill `#ff6767`, lighter hover/pressed `#ff9090`, label `#f8f9fb`. Figma login radius is `5px`; use the global 8px radius so buttons match icon tiles and search, not a one-off 5px.
7. **Sidebar active state on Dashboard** is a **white pill + coral label**. Components-page Variant2 (`#ff9090` on a light canvas) is the isolated-component view, not the in-app active style. Token the Dashboard behavior: `--sidebar-accent: white`, `--sidebar-accent-foreground: #ff6767`.
8. **Do not add a `/design-system` showcase page.** Do not install extra shadcn components in this pass.
9. **Do not paste Figma absolute-positioned reference code.** Adapt tokens only.
10. Hex values below are the source of truth; convert to OKLCH in `globals.css` to match the existing token format.

## Visual interpretation

### Layout language (document only; do not implement chrome)

- Desktop canvas **1440×1024**.
- Top bar **100px**, light gray (`#f8f8f8`), soft bar shadow.
- Coral sidebar sits under the bar, ~330px content width, top/bottom-right radius **8px**.
- Main workspace is a cool off-white (`#f5f8ff`) with white/light panels at **14px** radius.
- Search is **36px** tall, **8px** radius, coral square search control on the right.
- Icon buttons (bell, calendar) are **34–36px** squares, **8px** radius, solid coral.

### Typography

| Role | Family | Weight | Size | Color |
| --- | --- | --- | --- | --- |
| Wordmark (`Dash`/`board`) | Inter | Semi Bold 600 | 32px | `#ff6767` + `#212427` |
| Greeting | Inter | Medium 500 | 36px | `#212427` |
| Section titles (To-Do, Task Status) | Inter | Medium 500 | 15px | `#ff6767` (Completed Task heading uses `#f24e1e`; map to primary unless a dedicated token is added) |
| Nav item | Inter | Medium 500 | 16px | white / primary when active |
| Task title | Inter | Semi Bold 600 | 16px | `#212427` |
| Body / description | Inter | Regular 400 | 14px | `#747474` |
| Meta (created on, placeholders) | Inter Regular / Montserrat SemiBold | 400/600 | 12px | `#a1a3ab` |
| Priority / status labels | Inter | Regular 400 | 10px | see status colors |
| Auth heading (Sign In) | Montserrat | Bold 700 | 36px | `#212427` |
| Auth inputs / login CTA | Montserrat | Medium 500 | 16px | placeholder `#999`, CTA `#f8f9fb` |
| Weekday | Inter | Medium 500 | 15px | `#212427` |
| Date under weekday | Inter | Medium 500 | 14px | `#3abeff` |

Line-height is near-normal (Figma `leading-[normal]`). Do not add tight tracking.

### Spacing

- 8px grid. Recurring padding inside task cards ~24px. Nav items **288×59** with **14px** radius. Avatar **86px** in sidebar, overlapping invite avatars **36px** at **8px** radius.

### Colors (canonical hex)

| Token intent | Hex |
| --- | --- |
| Primary / sidebar / brand | `#ff6767` |
| Primary hover / lighter coral | `#ff9090` |
| App canvas | `#f5f8ff` |
| Top bar | `#f8f8f8` |
| Surfaces / cards / auth card | `#ffffff` |
| Primary button label / auth bg tint | `#f8f9fb` |
| Foreground | `#212427` |
| Body / secondary text | `#747474` |
| Muted / placeholder / card border | `#a1a3ab` |
| Auth input border | `#565454` |
| Auth placeholder | `#999999` |
| Link (Create One) | `#008bd9` |
| Date accent | `#3abeff` |
| Priority moderate | `#42ade2` |
| Status not started | `#f21e1e` |
| Status in progress | `#0225ff` |
| Status completed | `#05a301` (also `#04c400` in one label; use `#05a301`) |
| Completed-section orange | `#f24e1e` — do not add a separate token; use primary |

### Radius

- Global `--radius`: **8px** (`0.5rem`) so `rounded-lg` matches search, icon buttons, invite avatars.
- Nav pills and task cards: **14px** → expose as `--radius-xl` via existing calc, or a dedicated `--radius-card: 14px` registered in `@theme inline` as `--radius-card`.
- Auth card: **10px**.

### Shadows

- Header: `0 4px 12px rgba(0,0,0,0.07)`
- Sidebar: `0 4px 12px rgba(0,0,0,0.08)`
- Panels / search: soft stacked shadow, visually `0 5px 11px rgba(0,0,0,0.04)` (ignore Figma’s far 100px+ layers that resolve to 0 opacity)
- Register as `--shadow-header`, `--shadow-sidebar`, `--shadow-panel` if Tailwind v4 theme shadow tokens are used; otherwise CSS variables consumed later. Do not add unused utility sprawl.

### Responsiveness

Token work is global. Do not add breakpoints or a mobile sidebar in this pass.

### Pixel-perfect expectations

- Primary coral must match `#ff6767`, not a generic red or the previous near-black shadcn primary.
- Canvas must read cool off-white (`#f5f8ff`), not zinc-50 / pure white.
- Status greens/blues/reds must be the Figma hues, not Tailwind `green-500` / `blue-600`.
- Inter must be the default `font-sans`. Montserrat available as `font-heading` (or `font-display`) for auth/wordmark-adjacent UI later.

## Files likely to change

- `app/globals.css` — all color, radius, shadow, and extra semantic tokens; `@theme inline` registrations
- `app/layout.tsx` — Inter + Montserrat via `next/font/google`; CSS variables `--font-sans`, `--font-heading`; keep Geist Mono
- `components/ui/button.tsx` — only if default/outline sizes need alignment with coral primary, 8px radius, and white-on-coral label (prefer token changes over CVA rewrites)

Do **not** change `app/page.tsx` except if a font/class on `<body>` makes the starter unreadable; do not restyle it into the dashboard.

## Implementation requirements

1. **Theme mapping** in `:root` (and a coherent `.dark`):

   | CSS variable | Figma |
   | --- | --- |
   | `--background` | `#f5f8ff` |
   | `--foreground` | `#212427` |
   | `--card` / `--popover` | `#ffffff` |
   | `--card-foreground` / `--popover-foreground` | `#212427` |
   | `--primary` | `#ff6767` |
   | `--primary-foreground` | `#f8f9fb` |
   | `--secondary` | `#f8f8f8` |
   | `--secondary-foreground` | `#212427` |
   | `--muted` | `#f8f8f8` |
   | `--muted-foreground` | `#a1a3ab` |
   | `--accent` | `#ff9090` (light coral hover) |
   | `--accent-foreground` | `#ffffff` |
   | `--destructive` | `#f21e1e` |
   | `--border` | `#a1a3ab` (use a low-opacity mix if full `#a1a3ab` is too heavy on white cards; target the 1px gray card stroke) |
   | `--input` | `#565454` |
   | `--ring` | `#ff6767` |
   | `--sidebar` | `#ff6767` |
   | `--sidebar-foreground` | `#ffffff` |
   | `--sidebar-primary` | `#ffffff` |
   | `--sidebar-primary-foreground` | `#ff6767` |
   | `--sidebar-accent` | `#ffffff` |
   | `--sidebar-accent-foreground` | `#ff6767` |
   | `--sidebar-border` | transparent / primary-tinted |
   | `--sidebar-ring` | `#ffffff` |
   | `--chart-1` | `#05a301` completed |
   | `--chart-2` | `#0225ff` in progress |
   | `--chart-3` | `#f21e1e` not started |
   | `--chart-4` | `#42ade2` moderate |
   | `--chart-5` | `#3abeff` date |

2. **Extra tokens** (define in `:root` / `.dark`, register in `@theme inline`):

   | Variable | Hex | Tailwind color |
   | --- | --- | --- |
   | `--status-not-started` | `#f21e1e` | `status-not-started` |
   | `--status-in-progress` | `#0225ff` | `status-in-progress` |
   | `--status-completed` | `#05a301` | `status-completed` |
   | `--priority-moderate` | `#42ade2` | `priority-moderate` |
   | `--date-accent` | `#3abeff` | `date-accent` |
   | `--text-body` | `#747474` | `text-body` (or `--color-body`) |

3. **Radius:** `--radius: 0.5rem`. Add `--radius-card: 0.875rem` (14px) in `@theme inline`.

4. **Fonts in `app/layout.tsx`:**
   - `Inter({ variable: "--font-sans", subsets: ["latin"] })`
   - `Montserrat({ variable: "--font-heading", subsets: ["latin"] })`
   - Keep `Geist_Mono` as `--font-geist-mono` / `--font-mono`
   - Apply both variables on `<html>`
   - Point `@theme inline` `--font-sans` at Inter and `--font-heading` at Montserrat

5. **Button:** After tokens, default variant must render coral background + `#f8f9fb` text. Outline should be usable for Invite (coral border + coral text on transparent/white). Do not add one-off hex in `button.tsx` if tokens already produce this. Do not change CVA structure unless a token gap remains.

6. **Dark theme:** Recolor, do not drop `.dark`. Primary stays coral; backgrounds go to a dark navy-gray; sidebar can remain coral or a deeper coral. No `next-themes` install unless already present (it is not).

7. Keep TypeScript strict, no `any`, no unrelated refactors, no new skill files.

## Security requirements

- No secrets, env vars, or client exposure of server keys.
- No new API routes.
- User-provided content is out of scope (no rendering of task text in this pass).

## Acceptance criteria

- [ ] `app/globals.css` light tokens match the Figma hex table (OKLCH equivalents).
- [ ] `--primary` is coral `#ff6767`, not near-black.
- [ ] `--background` is `#f5f8ff`.
- [ ] `--sidebar` is coral with white foreground; `--sidebar-accent` is the white active pill.
- [ ] Status / priority / date tokens exist and are registered for Tailwind (`text-status-completed`, etc.).
- [ ] Inter is the default sans; Montserrat is `--font-heading`; Geist Mono remains mono.
- [ ] `--radius` is 8px; card radius 14px is available.
- [ ] Existing `Button` default variant is coral with light label; no raw `bg-[#ff6767]` in components.
- [ ] No dashboard / login / sidebar page implementation.
- [ ] `.dark` still defines a full token set.
- [ ] `npm run typecheck` and `npm run lint` pass.

## Checks to run

From the repo root:

```bash
npm run typecheck
npm run lint
```

Run `npm run format` only if lint reports format issues. Run `npm run build` because `app/layout.tsx` and global CSS changed.

## Exact manual test steps expected after implementation

1. `npm run dev` and open `http://localhost:3000`.
2. In DevTools → root `html`/`body`, confirm computed `--primary` is coral, `--background` is cool off-white, `--font-sans` is Inter.
3. In the console, evaluate `getComputedStyle(document.documentElement).getPropertyValue('--status-completed')` (and in-progress / not-started) and confirm they are set.
4. Temporarily inspect `components/ui/button.tsx` usage: default classes resolve to `bg-primary` / `text-primary-foreground` (coral + near-white), not the old dark primary.
5. Toggle a `dark` class on `<html>` and confirm the page does not lose token definitions (colors change, no missing variables).
6. Confirm the starter `app/page.tsx` was not turned into the Figma dashboard.
7. Compare sidebar/primary coral against the Figma Dashboard frame (`16:35`) — hue should match `#ff6767`, not a desaturated pink.
