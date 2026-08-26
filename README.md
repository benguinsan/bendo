# bendo

A personal-first todo and project-management web app with Clerk authentication.

This is a [Next.js](https://nextjs.org) project bootstrapped with
[`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app)
via **create-ben-app**.

## Getting Started

1. Copy env vars and add Clerk keys from the [Clerk Dashboard](https://dashboard.clerk.com):

```bash
cp .env.example .env.local
```

Required: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`. Sign-in and
sign-up URLs default to `/sign-in` and `/sign-up`; after auth, users land on `/`.

2. Install and run:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Unsigned visitors are sent
to `/sign-in`. Create an account or sign in to open the dashboard.

## Authentication (Clerk)

- Publishable key: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (client + server)
- Secret key: `CLERK_SECRET_KEY` (**server only** — never expose to the browser)
- Session handshake: `proxy.ts` (`clerkMiddleware`) for Next.js 16+
- Pages: `/sign-in`, `/sign-up` (prebuilt Clerk components, shadcn theme)
- Product routes under `app/(app)/` call `auth.protect()` via `requireUser()`

Magic Links, MFA, Social Auth, Passkeys, User Impersonation, Organizations, and
Billing are configured in the [Clerk Dashboard](https://dashboard.clerk.com) and
implemented with the matching official skill — not as a second auth system.

## Learn More

- [Clerk Skills](https://clerk.com/docs/guides/ai/skills)
- [Clerk + Next.js](https://clerk.com/docs/nextjs/getting-started/quickstart)
- [Next.js Documentation](https://nextjs.org/docs)
