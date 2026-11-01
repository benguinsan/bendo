# Bendo-app — Discord identity mapping

On-demand rules for `discord_identities` and Settings Connect Discord. **Pointer:** [`bendo-app/AGENTS.md`](../bendo-app/AGENTS.md). Product priority / bot deferred: root [`AGENTS.md`](../AGENTS.md).

Discord Gateway bot, invite links, and bot-token hosting are **out of scope** for day-to-day Next.js feature work. Identity mapping and Settings Connect may exist without the bot.

---

## Purpose

Persist Clerk user ↔ Discord account so a future Discord bot / Doro harness can resolve `discord_user_id` → `clerk_user_id` without calling Clerk on every message.

Table:

- `clerk_user_id` ← Clerk user id
- `discord_user_id` ← Discord snowflake from Clerk Discord OAuth `externalAccounts.providerUserId`

---

## Rules

- At most one Discord row per Clerk user (`clerk_user_id` unique).
- At most one Clerk user per Discord id (`discord_user_id` unique).
- Both ids required, non-empty text. Do **not** accept a user-typed Discord id from Settings UI.
- Source of Discord id: Clerk Discord OAuth only (`provider === "discord"` or `oauth_discord`; connect strategy `oauth_discord`).
- **OAuth verify on Connect/sync:** `GET /api/discord-identity` must verify with server-only `getUserOauthAccessToken(userId, "discord")` before upsert. Same pattern as `GET /api/me` (secret work on Vercel when packaged). Response: `{ data: { status, clerkUserId, discordUserId, discordUsername } }` — not a top-level status object. Cloud clients parse `data` (`parseDiscordIdentityStatusBody`). Never returns OAuth tokens. Packaged Electron proxies this GET; do not call `getUserOauthAccessToken` without `CLERK_SECRET_KEY`.
- No POST: writes only via OAuth-verified GET sync or DELETE.
- **DELETE:** Disconnect removes the row for that Clerk user (never leave a stale Discord id).
- Do not store Discord OAuth access/refresh tokens or bot tokens in this table (or any app table).
- Reads/writes server-only via Supabase service role; same RLS pattern as other public tables.
- Lookups by `clerk_user_id` (Settings / sync) use this table as app cache; Clerk remains source of the OAuth link. Bot/harness resolve by `discord_user_id` is **future** — do not couple page components to Discord bot code.

---

## API

| Method | Role |
| --- | --- |
| GET | Status + OAuth-verified sync |
| DELETE | Disconnect |
| Future | Resolve `discord_user_id` → `clerk_user_id` for bot/harness |

Cloud cutover / proxy: [`desktop-cloud-cutover.md`](./desktop-cloud-cutover.md).
