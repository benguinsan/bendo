# bendo

A project created with create-benguin-app

This is a [Next.js](https://nextjs.org) project bootstrapped with
[`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app)
via **create-ben-app**, with **Clerk** authentication plumbing.

## Getting Started

1. Copy env vars and add Clerk keys from the [Clerk Dashboard](https://dashboard.clerk.com):

```bash
cp .env.example .env.local
```

2. Install and run:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). This starter includes Clerk
**plumbing** (`@clerk/nextjs`, `proxy.ts`, env keys) but does **not** add Sign in /
Sign up pages or wrap the app in `ClerkProvider`. Official Clerk Skills are already
in `.agents/skills/` (Claude Code also has `.claude/skills/`). Start with `/clerk`
and follow the [Next.js quickstart](https://clerk.com/docs/nextjs/getting-started/quickstart)
to implement auth UI.

## Authentication (Clerk)

- Publishable key: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (client + server)
- Secret key: `CLERK_SECRET_KEY` (**server only** — never expose to the browser)
- Boundary: `proxy.ts` (`clerkMiddleware`) for Next.js 16+
- Auth UI / protected pages: implement via official Clerk Skills — this starter
  does not ship `/sign-in`, `/sign-up`, or `/dashboard`

Magic Links, MFA, Social Auth, Passkeys, User Impersonation, Organizations, and
Billing are configured in the [Clerk Dashboard](https://dashboard.clerk.com) and
implemented with the matching official skill — not as a second auth system.

## Learn More

- [Clerk Skills](https://clerk.com/docs/guides/ai/skills)
- [Clerk + Next.js](https://clerk.com/docs/nextjs/getting-started/quickstart)
- [Next.js Documentation](https://nextjs.org/docs)
