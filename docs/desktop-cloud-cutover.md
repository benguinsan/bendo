# Desktop → Vercel cloud cutover (Clerk + Supabase)

Tóm tắt phần vừa triển khai: packaged / Electron-spawned Next **không** giữ `CLERK_SECRET_KEY` hay `SUPABASE_SERVICE_ROLE_KEY`; công việc cần secret chạy trên **Vercel**, desktop forward **session JWT** và nhận **kết quả domain**.

**Liên quan:** packaging / strip `.env` / DSH inject → [`desktop-credentials-and-dsh-bridge.md`](./desktop-credentials-and-dsh-bridge.md).  
**Rule:** root `AGENTS.md` Product credentials; `bendo-app/AGENTS.md` §16.

**Không trong phạm vi doc này:** Agent chat / DSH / bundle harness (vẫn local).

---

## 1. Mục tiêu

| Quyết định | Lý do |
| --- | --- |
| Secret-key work trên **Vercel** | User cuối không cấu hình / không nhận god-mode keys |
| Desktop Next forward session JWT | Vercel gọi `auth()` + service role; desktop nhận JSON domain |
| **Không** lend keys | Không API trả secret về desktop / browser |
| **Không** JWT-PEM verify local | Verify thuộc Vercel `auth()` |
| Stay local | `/api/agent/chat`, `/api/health`, DSH bridge |

Hai mode độc lập (packaged thường bật cả hai sau khi strip secrets):

| Mode | Điều kiện | Việc làm |
| --- | --- | --- |
| **Cloud Clerk** `isCloudClerkMode()` | `BENDO_CLOUD_API_URL` + **không** `CLERK_SECRET_KEY` | Identity qua `GET /api/me` |
| **Cloud Supabase** `isCloudSupabaseMode()` | `BENDO_CLOUD_API_URL` + **không** `SUPABASE_SERVICE_ROLE_KEY` | Proxy / `fetchCloudApi` cho DB API |

Local `next dev` / Docker / Vercel host: giữ full secrets → cả hai mode **tắt** (local thắng). Nếu cùng process có cả URL lẫn secret → **không** proxy.

---

## 2. Luồng runtime

```text
[Electron spawn Next]
  inject BENDO_CLOUD_API_URL (desktop/.env hoặc bendo-public-config.json)
  delete CLERK_SECRET_KEY
  delete SUPABASE_SERVICE_ROLE_KEY
  inject DSH_* (Agent local — ngoài cutover này)

[Browser → local Next]
  Sign-in Clerk UI (publishable key, cookie __session trên origin local)

  RSC / requireUser
       → isCloudClerkMode → fetchCloudMe
       → GET {cloud}/api/me + Bearer(__session)
       → Vercel auth() + currentUser() → { data: MeUser }

  Settings Discord
       → isCloudSupabaseMode → GET {cloud}/api/discord-identity + Bearer
       → Vercel: OAuth token verify + best-effort sync discord_identities
       → { data: DiscordIdentityStatus }

  /api/tasks|categories|notifications|discord-identity|me
       → maybeProxyPrivilegedRequest (isCloudSupabaseMode + allowlist)
       → HTTPS Vercel + Bearer
       → Vercel auth() + Supabase service role → JSON

  RSC loaders (load-tasks / load-categories / loadDiscordIdentityForSettings)
       → cloudList* / cloudGetDiscordIdentity via fetchCloudApi

  /api/agent/chat, /api/health
       → local only (không proxy)
```

JWT lấy từ đâu: sau sign-in, Clerk set cookie `__session` trên origin desktop. Packaged **đọc** (Bearer hoặc cookie) và forward — **không** verify local.

**Race sau sign-in:** client Clerk có thể đã “signed-in” trong khi RSC chưa đọc được cookie → `requireUser` đá `/sign-in` và Clerk đá lại `/` (reload loop). Handle: `components/auth/post-sign-in-bridge.tsx` — khi `SignedIn`, poll `GET /api/me` với retry có giới hạn + delay tăng dần; hết hạn thì dừng và cho Sign out.

---

## 3. Các phần đã làm (theo thứ tự)

### 3.1 `GET /api/me` (cloud identity)

- `app/api/me/route.ts` — trên host có Clerk secret: `requireApiUser` + `currentUser` → `{ data: MeUser }`
- `lib/api/cloud/me-user.ts` — shape profile (id, name, email, externalAccounts, …)
- Local/web UI ngày thường **không** bắt buộc gọi route này; dành cho desktop cutover (và smoke trên Vercel)

### 3.1b `GET /api/discord-identity` (Discord link status + mapping sync)

- `app/api/discord-identity/route.ts` — `GET`: verify Discord OAuth token (`getUserOauthAccessToken`), best-effort upsert/delete `discord_identities`, return **`{ data: DiscordIdentityStatus }`** (fields inside `data`: `status`, `clerkUserId`, `discordUserId`, `discordUsername`). Not a top-level status object. Cloud parse: `parseDiscordIdentityStatusBody`. Never returns the OAuth token.
- Settings: `loadDiscordIdentityForSettings` — cloud mode `cloudGetDiscordIdentity()`; local secrets same resolve+sync in-process.
- `POST` / `DELETE` unchanged (explicit write / Disconnect); success bodies also use `{ data: … }`.

### 3.2 Cloud mode flags

- `lib/api/cloud/mode.ts`
  - `hasClerkSecret` / `hasSupabaseServiceRole`
  - `isCloudClerkMode` / `isCloudSupabaseMode`
  - `getCloudApiOrigin`
- `env.ts` — hai secret **optional** nếu có `BENDO_CLOUD_API_URL` (runtime: cần Clerk **hoặc** cloud URL; service role **hoặc** cloud URL)

### 3.3 Session token + cloud Clerk auth

- `lib/api/cloud/session-token.ts` — `getForwardableSessionToken` (Bearer hoặc `__session`)
- `lib/api/cloud/auth.ts` — `fetchCloudMe`, `resolveAuthedUserId`, `resolveCurrentUserForApp`, `resolveSessionTokenForCloud`
- Wire: `require-api-user`, `require-user`, agent chat token resolve
- `proxy.ts` — không Clerk secret → middleware passthrough (sign-in vẫn publishable key)

### 3.4 Cloud Supabase privilege proxy

- `lib/api/cloud/privilege.ts` — allowlist + `fetchCloudApi` + `maybeProxyPrivilegedRequest`
- `lib/api/cloud/privilege-loaders.ts` — RSC / Discord sync helpers
- Wire đầu handler: tasks, categories, notifications, discord-identity, `/api/me`
- Wire loaders: `load-tasks`, `load-categories`, `syncDiscordIdentityForSettings`

**Allowlist**

```text
/api/me
/api/tasks (+ /:id)
/api/categories (+ /:id)
/api/notifications (+ /:id)
/api/discord-identity
```

**Không allowlist:** `/api/agent/chat`, `/api/health`

### 3.5 Electron spawn strip

- `desktop/src/main/spawn-next.ts` → `applyCloudApiUrlToEnv`
  - Set `BENDO_CLOUD_API_URL`
  - `delete env.CLERK_SECRET_KEY` + `delete env.SUPABASE_SERVICE_ROLE_KEY`
- Áp dụng khi spawn packaged **và** Electron-spawned `nextDev` nếu có cloud URL

### 3.6 Folder layout

```text
bendo-app/lib/api/cloud/
  mode.ts              # flags Clerk vs Supabase
  session-token.ts     # đọc JWT forward
  me-user.ts           # MeUser + toMeUser
  auth.ts              # fetchCloudMe + resolve*
  privilege.ts         # allowlist + proxy + fetchCloudApi
  privilege-loaders.ts # cloud list/get/discord
  index.ts             # re-export
```

Giữ `lib/api/require-api-user.ts` / `respond.ts` ngoài folder (dùng chung).

---

## 4. Vận hành / smoke

1. **Vercel** — deploy `bendo-app` với full cloud secrets; smoke sign-in + CRUD + `GET /api/me`.
2. **`desktop/.env`** — `BENDO_CLOUD_API_URL=https://<deployment>`.
3. **`npm run build:bendo`** — bake `bendo-public-config.json`; strip `.env*` khỏi resources.
4. **Pack / run Electron** — Next child nhận cloud URL, không nhận hai secret.
5. **Smoke packaged** — sign-in (publishable); dashboard CRUD qua Vercel; `/api/health` local; Agent (nếu bật) vẫn DSH local.

---

## 5. Việc còn lại (ngoài cutover này)

- Rebuild installer và smoke end-to-end trên máy sạch.
- Bundle harness / Doro vào Electron resources (sau).
- Discord public bot (sau).

---

## 6. File chính

| File | Vai trò |
| --- | --- |
| `bendo-app/lib/api/cloud/*` | Cutover helpers |
| `bendo-app/app/api/me/route.ts` | Profile endpoint trên cloud |
| `bendo-app/app/api/{tasks,categories,notifications,discord-identity}/**` | Proxy đầu handler |
| `bendo-app/env.ts` | Secret optional khi có cloud URL |
| `bendo-app/proxy.ts` | Clerk middleware hoặc passthrough |
| `desktop/src/main/spawn-next.ts` | Inject URL + strip secrets |
| `desktop/.env.example` | Doc `BENDO_CLOUD_API_URL` |
