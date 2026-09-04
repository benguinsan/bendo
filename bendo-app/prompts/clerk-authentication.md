# Clerk authentication

## Goal

Turn the existing Clerk **plumbing** into a working authenticated app: wrap the tree with `ClerkProvider`, add dedicated `/sign-in` and `/sign-up` pages, require a signed-in Clerk user for every product page, and replace mock sidebar/greeting identity plus the inert Logout control with the signed-in Clerk user.

This pass is **authentication only**. Do **not** add Supabase user sync, webhooks, organizations, billing, Settings, or task/category APIs.

## Skills read

- `AGENTS.md` (product: Clerk auth + authenticated home dashboard; env table; no overbuild; Ultracite checks)
- `.agents/skills/clerk/SKILL.md` → routes to:
  - `.agents/skills/clerk-setup/SKILL.md` (`ClerkProvider` inside `<body>`, Next.js 16 `proxy.ts`, shadcn theme via `@clerk/ui`, do not expose `CLERK_SECRET_KEY`)
  - `.agents/skills/clerk-nextjs-patterns/SKILL.md` + `references/server-vs-client.md` (`await auth()`, `currentUser()` vs `useAuth`/`useClerk`; never mix server/client imports)
  - `.agents/skills/clerk-nextjs-patterns/references/middleware-strategies.md` (**stale on protection:** still shows `createRouteMatcher` + `auth.protect()` in `proxy.ts`)
  - `.agents/skills/clerk-nextjs-patterns/references/api-routes.md` (401 vs 403; no API routes in this pass)
  - `.agents/skills/clerk-custom-ui/SKILL.md` (shadcn theme only; **no** custom `useSignIn`/`useSignUp` flows)
- Clerk Next.js quickstart: https://clerk.com/docs/nextjs/getting-started/quickstart
- Clerk `SignIn` (catch-all page): https://clerk.com/docs/nextjs/reference/components/authentication/sign-in
- Clerk protect-content (resource-based): https://clerk.com/docs/nextjs/guides/secure/protect-content
- Clerk `clerkMiddleware`: https://clerk.com/docs/reference/nextjs/clerk-middleware (`createRouteMatcher` **deprecated**; keep `clerkMiddleware()` for session handshake only)
- Clerk migrate-from-create-route-matcher: https://clerk.com/docs/guides/development/upgrading/upgrade-guides/migrate-from-create-route-matcher
- `node_modules/next/dist/docs/` — App Router layouts/pages, route groups, Server vs Client Components, `proxy.ts` file convention (Next 16). Read the relevant guides before writing code.

Supabase and AI SDK are **not** needed.

## Existing code inspected

- `package.json` — Next `16.3.0`, React 19, `@clerk/nextjs` `^7.7.0` (current SDK, not Core 2). No `@clerk/ui` yet.
- `proxy.ts` — `clerkMiddleware()` + matcher including `/api`, `/trpc`, `/__clerk`. **No** `auth.protect()`. Keep this file as handshake-only.
- `app/layout.tsx` — fonts + `<html>`/`<body>`; **no** `ClerkProvider`.
- `app/(app)/layout.tsx` — `dynamic = "force-dynamic"`; shared `AppShell`; passes `mockProfile`.
- `app/(app)/page.tsx` — greeting uses `mockProfile.firstName`.
- Product pages (all under `app/(app)/`): `/`, `/vital-task`, `/my-task`, `/my-task/[taskId]`, `/task-categories`, `/task-categories/create`, `/calendar`, `/agent`.
- `components/app-shell/app-sidebar.tsx` — client; mock name/email/avatar; Logout button has **no** `signOut`.
- `components/app-shell/app-header.tsx` — Dash|board wordmark, search, bell, calendar, date. **Do not** add `UserButton` / Sign in buttons here (would break the dashboard mock).
- `lib/dashboard/mock-data.ts` — `DashboardProfile` + `mockProfile` (Sundar Gurung). Task fixtures stay.
- `env.ts` — Clerk keys **optional** so the app boots without keys; sign-in/up URL defaults `/sign-in` `/sign-up`; no fallback redirect vars.
- `env.with-clerk.ts` — unused duplicate with **required** keys. Merge into `env.ts` and delete.
- `.env.example` — keys + sign-in/up URLs; missing `_*_FALLBACK_REDIRECT_URL`.
- `next.config.ts` — side-effect `import "./env"` (build/dev validate env).
- `components.json` — shadcn `base-nova` is present → **must** apply Clerk shadcn theme.
- `README.md` — documents plumbing-only (no Sign in / Sign up / `ClerkProvider`).
- No `app/sign-in`, `app/sign-up`, or `app/api` routes.
- `compose.yaml` bind-mounts the repo; `.dockerignore` excludes `.env*`. Dev Docker sees host env at runtime. Do not copy secrets into the image.

## Decisions or assumptions

1. **Do not run `clerk init`.** `@clerk/nextjs`, `proxy.ts`, and env var names already exist from the scaffold. `clerk init` would fight this tree. Finish wiring by hand. Optionally run `npx clerk@latest doctor` after implementation if the CLI is available; do not treat a sandboxed CLI failure as authoritative.
2. **Use existing local Clerk keys.** Do not print, log, or commit secret/publishable keys. Do not ask the user to paste keys into chat. If keys are missing at implement time, fail env validation and tell the user to copy `.env.example` → `.env.local` (or keep their existing `.env`) and fill keys from the Clerk Dashboard. Do **not** read `.env` / `.env.local` into the prompt, commits, or chat.
3. **Prebuilt Clerk UI, not custom flows.** Dedicated catch-all pages:
   - `app/sign-in/[[...sign-in]]/page.tsx` → `<SignIn />`
   - `app/sign-up/[[...sign-up]]/page.tsx` → `<SignUp />`
   Do not build `useSignIn` / `useSignUp` forms.
4. **`/` is the authenticated dashboard**, not a public marketing page. Unsigned users must land on `/sign-in`. After sign-in/sign-up, fallback redirect is `/`.
5. **Resource-based protection (current Clerk, `@clerk/nextjs` v7.5+).** Do **not** use deprecated `createRouteMatcher()` or `auth.protect()` inside `clerkMiddleware()` (would warn in dev and is scheduled for removal). Keep `export default clerkMiddleware()` in `proxy.ts` for session handshake. Call `await auth.protect()` (or a small `requireUser()` helper that wraps it) in:
   - `app/(app)/layout.tsx` (layout reads `currentUser()` for the shell)
   - **every** `page.tsx` under `app/(app)/` (layouts do not re-run on client navigations; each page is the real gate)
   Sign-in/sign-up pages must **not** call `auth.protect()`.
6. **Do not add `@clerk/eslint-plugin`.** This repo uses Ultracite/oxlint, not ESLint. Manual `auth.protect()` on `(app)` pages is enough. Do not introduce ESLint.
7. **Identity in the shell comes from Clerk.** Map `currentUser()` → `DashboardProfile` on the server and pass it into `AppShell`. Stop using `mockProfile` in layout and dashboard greeting. Keep the `DashboardProfile` type. Remove the unused `mockProfile` constant if nothing else needs it.
8. **Keep the coral sidebar Logout control.** Wire it with `useClerk().signOut({ redirectUrl: "/sign-in" })` (AppSidebar is already a Client Component). Do not add header `UserButton` / `SignInButton` / `SignUpButton`. Signed-out users never see the shell.
9. **Clerk keys become required** in `env.ts` (same shape as `env.with-clerk.ts`, plus fallback redirect URLs). Keep `emptyStringAsUndefined: true`. Delete `env.with-clerk.ts`.
10. **shadcn theme is required** because `components.json` exists. Install `@clerk/ui`. `ClerkProvider` inside `<body>` with `appearance={{ theme: shadcn }}`. Import `@clerk/ui/themes/shadcn.css` in `app/globals.css`. Use `ClerkProvider dynamic` so auth data is not statically cached.
11. **No orgs, billing, webhooks, user table, or API routes** in this pass. Future APIs must still `await auth()` and return 401 when unsigned (middleware is not the security boundary).
12. **Do not change task UI, mock tasks, or dashboard layout** except the greeting name source.
13. **Do not add a Settings page** or `/settings`.
14. Prefer a tiny `requireUser()` / `toDashboardProfile()` in `lib/auth/` over copying mapping logic. Keep functions small and typed. No `any`.

## Files likely to change

- `app/layout.tsx` — `ClerkProvider` inside `<body>`
- `app/globals.css` — `@import "@clerk/ui/themes/shadcn.css"`
- `app/(app)/layout.tsx` — `requireUser()` + real profile
- `app/(app)/page.tsx` — greeting from Clerk first name
- `app/(app)/**/page.tsx` — `await auth.protect()` / `requireUser()` at top of each page
- `app/sign-in/[[...sign-in]]/page.tsx` — **new**
- `app/sign-up/[[...sign-up]]/page.tsx` — **new**
- `app/(auth)/layout.tsx` or similar — **new** optional centered chrome for sign-in/up (must **not** use `AppShell`)
- `components/app-shell/app-sidebar.tsx` — Logout → `signOut`
- `lib/auth/require-user.ts` (name flexible) — `auth.protect()` + `currentUser()`
- `lib/auth/to-dashboard-profile.ts` (name flexible) — Clerk user → `DashboardProfile`
- `lib/dashboard/mock-data.ts` — stop exporting unused `mockProfile` if unused
- `proxy.ts` — keep handshake `clerkMiddleware()`; do not add route matchers for auth gates
- `env.ts` — required keys + fallback redirect URLs
- `env.with-clerk.ts` — delete after merge
- `.env.example` — add fallback redirect URLs; keep key placeholders empty
- `package.json` / `package-lock.json` — `@clerk/ui`
- `README.md` — replace plumbing-only language with how to run signed-in locally

Do **not** commit `.env` / `.env.local`. Do not add fallback URL values that contain secrets.

## Implementation requirements

### Env

Canonical vars (keep AGENTS.md table in sync via `.env.example` only; do not edit `AGENTS.md` unless a var name must change):

| Variable | Role |
| --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | required, client + server |
| `CLERK_SECRET_KEY` | required, server only |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | default `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | default `/sign-up` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | default `/` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | default `/` |

Add the two fallback vars to `env.ts` `client` + `runtimeEnv` and `.env.example`.

### Provider and theme

```tsx
<body>
  <ClerkProvider dynamic appearance={{ theme: shadcn }}>
    {children}
  </ClerkProvider>
</body>
```

`ClerkProvider` must be **inside** `<body>`, not wrapping `<html>`.

### Auth pages (visual)

Auth routes live **outside** `app/(app)/` so they do not get the coral sidebar/header.

Layout:

- Full viewport `bg-background`, centered column, horizontal padding (`px-4`).
- Above the Clerk card: the same Dash|board wordmark as the header (`text-primary` “Dash” + `text-foreground` “board”), linking to `/` is fine (protect will bounce unsigned users back to sign-in).
- Clerk component centered; no app shell, no mock profile, no extra marketing copy.
- Light mode only. Semantic tokens only (`bg-background`, `text-primary`, `font-sans`). No raw hex, no `bg-red-500`.
- Narrow (~375px): card fits, no horizontal overflow, adequate tap targets.
- Desktop: card visually centered on the canvas.

Typography: Inter via `--font-sans`. Do not restyle Clerk internals beyond the shadcn theme (coral primary comes from CSS variables).

### Product pages

- Shared helper, e.g. `requireUser()`, must `await auth.protect()` then `currentUser()`. If user is still missing, `redirect("/sign-in")`.
- Call it from `(app)/layout.tsx` and from **each** `(app)` `page.tsx`.
- Greeting: `Welcome back, {firstName} 👋`. If `firstName` is empty, use a short fallback (`"there"` or the email local-part) — never crash, never show “Sundar” unless that is the signed-in user.
- Profile mapping:
  - `fullName`: Clerk `fullName` or `[firstName, lastName].join(" ").trim()` or username or email
  - `email`: primary email address or `""`
  - `avatarSrc`: `imageUrl` or `""` (Avatar fallback initials still work)
  - `initials`: first letters of first/last name, else first letter of email, else `"?"`
- Avatar uses existing shadcn `Avatar` / `AvatarImage` (plain `img`). Do **not** add `images.remotePatterns` unless you switch to `next/image`.
- Logout: existing sidebar visual (icon + “Logout”, full-width row). It must sign out and send the user to `/sign-in`. Give the control a clear accessible name.

### What not to do

- No `createRouteMatcher`.
- No `UserButton` in the header.
- No custom sign-in form.
- No Clerk orgs / `OrganizationSwitcher`.
- No webhooks, no `users` table, no Supabase.
- No new task/category/notification API routes.
- No unrelated refactors or design-system restyles.

## Security requirements

- Never import or expose `CLERK_SECRET_KEY` (or `env.CLERK_SECRET_KEY`) in Client Components or `NEXT_PUBLIC_*` vars.
- Only `NEXT_PUBLIC_*` may reach the browser.
- Do not commit real keys. Do not print `.env` contents.
- `auth.protect()` / `requireUser()` on every `(app)` page is the auth gate; `proxy.ts` is handshake only.
- Render Clerk names/emails as escaped React text (default). No `dangerouslySetInnerHTML`.
- Do not add general-purpose user PATCH/DELETE routes.
- Future APIs: unsigned → **401**; authenticated but forbidden → **403**. None in this pass.

## Acceptance criteria

- [ ] Root layout wraps children with `ClerkProvider` **inside** `<body>`, shadcn theme + `dynamic`.
- [ ] `@clerk/ui` installed; `app/globals.css` imports `@clerk/ui/themes/shadcn.css`.
- [ ] `/sign-in` and `/sign-up` catch-all pages render Clerk `<SignIn />` / `<SignUp />` on a centered canvas **without** the app shell.
- [ ] Visiting `/` (and every other `(app)` route) while signed out redirects to `/sign-in`.
- [ ] After sign-in or sign-up, user lands on `/` dashboard.
- [ ] Sidebar shows the signed-in user’s name, email, and avatar (or initials fallback). Dashboard greeting uses that user’s first name (or fallback), not Sundar unless they are Sundar.
- [ ] Logout signs out and returns to `/sign-in`. A later visit to `/` requires signing in again.
- [ ] `proxy.ts` still exports `clerkMiddleware()` with the existing matcher; **no** `createRouteMatcher`.
- [ ] `env.ts` requires Clerk keys; fallback redirect URLs exist; `env.with-clerk.ts` is gone; `.env.example` updated.
- [ ] No Supabase, no webhooks, no orgs, no Settings, no API routes, no header `UserButton`.
- [ ] Dashboard/task UI otherwise unchanged (mock tasks still render when signed in).
- [ ] `npm run typecheck` and `npm run lint` pass. `npm run build` runs because layouts, proxy/env, and routes changed.

## Checks to run

From the repo root:

```bash
npm run typecheck
npm run lint
npm run build
```

Run `npm run format` (or `npx ultracite fix` on touched files) if format issues are reported.

If `build` fails only because Clerk keys are unset in that environment, report that clearly; do not weaken key validation to make CI/docker “pass empty”.

Optional: `npx clerk@latest doctor` on the **host** (not a sandbox) after wiring.

## Exact manual test steps expected after implementation

Prereq: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` set in local env (`.env` or `.env.local`). `npm run dev`.

1. Open a private/incognito window to `http://localhost:3000/`. Confirm redirect to `/sign-in`. Confirm **no** coral sidebar. Confirm Dash|board wordmark + Clerk sign-in card, coral primary via shadcn theme.
2. Open `/sign-up` the same way. Confirm dedicated sign-up card, link to sign-in works, no app shell.
3. Create a test account (or sign in with an existing Clerk test user). Confirm redirect to `/` dashboard.
4. On `/`, greeting uses **this** user’s first name. Sidebar name/email/avatar match the Clerk user (not Sundar unless that is the account). Mock tasks still show.
5. Click sidebar **Logout**. Confirm redirect to `/sign-in`. Hitting `/`, `/my-task`, `/vital-task`, `/task-categories`, `/calendar`, `/agent` while signed out all bounce to sign-in.
6. Sign in again. Client-navigate Dashboard → My Task → Vital Task → Categories → Calendar. Session holds; sidebar identity stays correct.
7. Resize sign-in to ~375px: card usable, no horizontal scrollbar.
8. Confirm header still has search / bell / calendar / date and **no** Clerk `UserButton`.
9. Confirm `.env` / `.env.local` were not staged for commit. `.env.example` has empty key placeholders plus the four public Clerk URL vars.
