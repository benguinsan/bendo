# Review: Cloud secret proxy workflow (desktop → Vercel)

Tài liệu review các bước **vừa triển khai**: chuyển mọi request cần `CLERK_SECRET_KEY` / `SUPABASE_SERVICE_ROLE_KEY` lên Vercel; Agent chat + health vẫn local. Bổ sung cho [`desktop-credentials-and-dsh-bridge.md`](./desktop-credentials-and-dsh-bridge.md). Bản review cũ (chỉ privilege DB) được gộp và cập nhật tại đây.

**Quy tắc sản phẩm:** root [`AGENTS.md`](../AGENTS.md) → Product credentials; [`bendo-app/AGENTS.md`](../bendo-app/AGENTS.md) §16.

---

## 1. Mục tiêu & quyết định

| Quyết định | Lý do |
| --- | --- |
| Secret-key work chạy trên **Vercel** | User cuối không cấu hình / không nhận `CLERK_SECRET_KEY` hay `SUPABASE_SERVICE_ROLE_KEY` |
| Desktop Next **forward session JWT** | Vercel gọi `auth()` / service role; desktop nhận **kết quả domain** (tasks, profile, …) |
| **Không** JWT-PEM local | Không thay `auth()` bằng verify PEM trên máy user |
| **Không** lend keys | Không API trả secret về desktop / browser |
| Stay local | `/api/agent/chat`, `/api/health`, DSH bridge |

Hai mode độc lập (có thể bật cùng lúc khi Electron strip cả hai secret):

| Mode | Điều kiện | Việc làm |
| --- | --- | --- |
| **Cloud privilege** | `BENDO_CLOUD_API_URL` + **không** `SUPABASE_SERVICE_ROLE_KEY` | Proxy / `fetchCloudApi` cho DB API |
| **Cloud auth** | `BENDO_CLOUD_API_URL` + **không** `CLERK_SECRET_KEY` | `GET /api/me`, resolve userId/profile; middleware passthrough |

Local `next dev` / Docker: giữ full secrets → cả hai mode **tắt** (local thắng).

---

## 2. Luồng triển khai (workflow)

```text
[Pack / Electron]
  desktop/.env  BENDO_CLOUD_API_URL=https://app.vercel.app
       │
       ├─ build:bendo → bake bendo-public-config.json (public URL only)
       └─ spawn Next child
              applyCloudApiUrlToEnv
              delete CLERK_SECRET_KEY
              delete SUPABASE_SERVICE_ROLE_KEY
              inject BENDO_CLOUD_API_URL

[Runtime — UI local]
  Browser (Electron) ──same-origin──► Next 127.0.0.1
       │
       ├─ /api/health          → local only (middleware skip)
       ├─ /api/agent/chat      → local; userId qua /api/me cloud; DSH local
       ├─ /api/tasks|categories|notifications|discord-identity
       │         → maybeProxyPrivilegedRequest
       │         → HTTPS Vercel + Bearer (__session)
       │         → Vercel auth() + Supabase service role
       └─ RSC pages (requireUser / loadUserTasks)
                 → fetchCloudMe / fetchCloudApi → Vercel

[Vercel]
  Secrets: CLERK_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY
  Routes: /api/me + privileged APIs (cùng codebase, secrets present → không proxy)
```

### Bước vận hành (checklist)

1. **Deploy Vercel** — cùng `bendo-app`; set `CLERK_SECRET_KEY` + `SUPABASE_SERVICE_ROLE_KEY` (+ public Clerk/Supabase). Confirm `GET /api/me` + tasks API live.
2. **`desktop/.env`** — `BENDO_CLOUD_API_URL=https://<deployment>`.
3. **Pack** — `npm run build:bendo` → `resources/bendo-app/bendo-public-config.json` chứa URL (không secret).
4. **Chạy Electron** — spawn Next không inherit hai secret; privilege + auth mode bật.
5. **Smoke** — sign-in (publishable key); dashboard CRUD; Agent chat → DSH local; `GET /api/health` local.

---

## 3. File mới — vai trò

### `bendo-app/lib/api/cloud-mode.ts`

**Vai trò:** Cờ môi trường tập trung.

| Export | Ý nghĩa |
| --- | --- |
| `hasClerkSecret()` / `hasLocalSupabaseAdmin()` | Có secret local sau validate |
| `isCloudPrivilegeMode()` | Proxy DB khi không service role |
| `isCloudAuthMode()` | Profile / userId qua cloud khi không Clerk secret |
| `getCloudApiOrigin()` | Origin trim slash |

Tách privilege vs auth để vẫn proxy DB được nếu máy có Clerk secret nhưng không có service role (hoặc ngược lại trong dev lạ). Packaged strip **cả hai** → cả hai mode on.

---

### `bendo-app/lib/api/session-token.ts`

**Vai trò:** Đọc JWT forwardable — **không verify**.

- `Authorization: Bearer …` nếu có
- else cookie `__session`

Verify thuộc Vercel `auth()`.

---

### `bendo-app/lib/api/cloud-auth.ts`

**Vai trò:** Auth path khi không có Clerk secret.

| Export | Việc làm |
| --- | --- |
| `fetchCloudMe(request?)` | `GET {cloud}/api/me` + Bearer |
| `resolveAuthedUserId` | Local `auth()` hoặc cloud me.id |
| `resolveSessionTokenForCloud` | Cookie/Bearer (auth mode) hoặc `auth().getToken()` |
| `resolveCurrentUserForApp` | Local `currentUser()` hoặc cloud me |

---

### `bendo-app/app/api/me/route.ts`

**Vai trò:** Endpoint profile session.

- Desktop (privilege mode): `maybeProxyPrivilegedRequest` → Vercel
- Vercel (có secrets): `requireApiUser` + `currentUser()` → `{ data: CloudMeUser }`

Cho phép RSC / API desktop lấy userId + profile mà không cần `CLERK_SECRET_KEY` local.

---

### `bendo-app/lib/api/cloud-privilege.ts`

**Vai trò:** Lõi proxy privileged HTTP.

| Export | Việc làm |
| --- | --- |
| `fetchCloudApi(path, init)` | Server fetch allowlist + Bearer (RSC / sync) |
| `maybeProxyPrivilegedRequest(request)` | Route handler: proxy hoặc `null` |

Allowlist: `/api/me`, `/api/tasks`, `/api/categories`, `/api/notifications`, `/api/discord-identity`.

Bỏ hop-by-hop + cookie / inbound Authorization; gắn Bearer mới từ `resolveSessionTokenForCloud`. Thiếu token → 401.

Re-export mode helpers từ `cloud-mode` để import cũ vẫn chạy.

---

### `bendo-app/lib/api/cloud-privilege-loaders.ts`

**Vai trò:** RSC / settings không đi qua route handler local — gọi thẳng cloud.

| Hàm | Cloud |
| --- | --- |
| `cloudListTasks` / `cloudGetTask` | `GET /api/tasks` … |
| `cloudListCategories` | `GET /api/categories` |
| `cloudUpsertDiscordIdentity` / `cloudDeleteDiscordIdentity` | POST/DELETE `/api/discord-identity` |

---

## 4. File sửa — vai trò trong workflow

### Env & middleware

| File | Vai trò |
| --- | --- |
| `bendo-app/env.ts` | `CLERK_SECRET_KEY` + `SUPABASE_SERVICE_ROLE_KEY` optional; `BENDO_CLOUD_API_URL` optional; runtime: cần Clerk **hoặc** cloud URL, và service role **hoặc** cloud URL |
| `bendo-app/proxy.ts` | Có Clerk secret → `clerkMiddleware` + `auth.protect`; không → passthrough. Matcher **loại** `/api/health` |
| `bendo-app/.env.example` | Comment cloud URL (Electron only) |
| `bendo-app/AGENTS.md` | §16 tiers + bảng env `BENDO_CLOUD_API_URL` |
| `AGENTS.md` (root) | Secret-key → Vercel; stay local Agent/health |

### Auth consumers

| File | Vai trò |
| --- | --- |
| `lib/api/require-api-user.ts` | `resolveAuthedUserId` (cloud hoặc local) |
| `lib/auth/require-user.ts` | RSC: `resolveCurrentUserForApp` → redirect sign-in |
| `app/api/agent/chat/route.ts` | **Không proxy**; `requireApiUser` (có thể cloud me); token cho harness qua `resolveSessionTokenForCloud` khi auth mode |

### Data path (privilege)

| File | Vai trò |
| --- | --- |
| `lib/supabase/server.ts` | `getSupabaseAdmin()` throw nếu không service role |
| `lib/tasks/load-tasks.ts` | Cloud → loaders |
| `lib/task-categories/load-categories.ts` | Cloud → loaders |
| `lib/discord/discord-identity-service.ts` | Settings sync → cloud upsert/delete |
| `lib/auth/discord-connection.ts` | Soft-skip / cloud-safe khi không đủ secret local |

### API routes (proxy đầu handler)

Pattern: `const proxied = await maybeProxyPrivilegedRequest(request); if (proxied) return proxied;` rồi logic local.

| File | Methods |
| --- | --- |
| `app/api/tasks/route.ts` | GET, POST |
| `app/api/tasks/[task_id]/route.ts` | GET, PATCH, DELETE |
| `app/api/categories/route.ts` | GET, POST |
| `app/api/categories/[category_id]/route.ts` | PATCH, DELETE |
| `app/api/notifications/route.ts` | GET, POST |
| `app/api/notifications/[notification_id]/route.ts` | PATCH |
| `app/api/discord-identity/route.ts` | POST (upsert), DELETE |

**Không proxy:** `app/api/agent/chat/route.ts`, `app/api/health/route.ts`.

### Desktop packaging / spawn

| File | Vai trò |
| --- | --- |
| `desktop/src/main/spawn-next.ts` | `applyCloudApiUrlToEnv`: đọc public config hoặc `desktop/.env`; set `BENDO_CLOUD_API_URL`; **delete** cả `CLERK_SECRET_KEY` và `SUPABASE_SERVICE_ROLE_KEY` trên child |
| `desktop/scripts/prepare-bendo-resource.mjs` | Bắt buộc `BENDO_CLOUD_API_URL` lúc `build:bendo`; ghi `bendo-public-config.json` |
| `desktop/.env.example` | Document URL + strip secrets + Agent/health stay local |
| `desktop/src/main/load-desktop-env.ts` | Load `desktop/.env` vào Electron process (URL sẵn trước spawn) |

### Docs liên quan

| File | Vai trò |
| --- | --- |
| `docs/desktop-credentials-and-dsh-bridge.md` | Credentials tiers + cloud proxy đã wire (auth + privilege) |
| `docs/cloud-privileged-api-proxy-review.md` | Review phase privilege sớm — **superseded** bởi file này |
| `docs/cloud-secret-proxy-workflow.md` | **File này** — workflow đầy đủ privilege + auth |

---

## 5. Ma trận file (quick reference)

| Path | Loại | Một dòng |
| --- | --- | --- |
| `bendo-app/lib/api/cloud-mode.ts` | **Add** | Privilege vs auth mode |
| `bendo-app/lib/api/session-token.ts` | **Add** | Forwardable JWT, no verify |
| `bendo-app/lib/api/cloud-auth.ts` | **Add** | `/api/me` client + resolve user |
| `bendo-app/app/api/me/route.ts` | **Add** | Session profile trên Vercel |
| `bendo-app/lib/api/cloud-privilege.ts` | **Add** | HTTP proxy + `fetchCloudApi` |
| `bendo-app/lib/api/cloud-privilege-loaders.ts` | **Add** | RSC/settings cloud fetch |
| `bendo-app/env.ts` | Modify | Optional secrets + cloud URL gate |
| `bendo-app/proxy.ts` | Modify | Passthrough khi không Clerk secret |
| `bendo-app/lib/api/require-api-user.ts` | Modify | Cloud userId |
| `bendo-app/lib/auth/require-user.ts` | Modify | Cloud profile RSC |
| `bendo-app/lib/auth/discord-connection.ts` | Modify | Soft-skip không secret |
| `bendo-app/lib/supabase/server.ts` | Modify | Guard admin client |
| `bendo-app/lib/tasks/load-tasks.ts` | Modify | Cloud loaders |
| `bendo-app/lib/task-categories/load-categories.ts` | Modify | Cloud loaders |
| `bendo-app/lib/discord/discord-identity-service.ts` | Modify | Cloud sync |
| `bendo-app/app/api/agent/chat/route.ts` | Modify | Auth mode token; **không** proxy body |
| `bendo-app/app/api/tasks/**` | Modify | Proxy |
| `bendo-app/app/api/categories/**` | Modify | Proxy |
| `bendo-app/app/api/notifications/**` | Modify | Proxy |
| `bendo-app/app/api/discord-identity/route.ts` | Modify | POST + proxy |
| `bendo-app/.env.example` | Modify | Cloud URL comment |
| `bendo-app/AGENTS.md` | Modify | §16 + env table |
| `AGENTS.md` | Modify | Secret → Vercel rules |
| `desktop/src/main/spawn-next.ts` | Modify | Inject URL; strip 2 secrets |
| `desktop/scripts/prepare-bendo-resource.mjs` | Modify | Bake public config |
| `desktop/.env.example` | Modify | Cloud URL doc |
| `docs/desktop-credentials-and-dsh-bridge.md` | Modify | Cross-link |
| `docs/cloud-secret-proxy-workflow.md` | **Add** | Review workflow (this file) |

---

## 6. Giới hạn & rủi ro

- Clerk trên Vercel phải chấp nhận Bearer session cùng Clerk application với publishable key trên desktop.
- **Không dùng preview URL có Vercel Deployment Protection** — browser web login được, nhưng Next desktop `fetch` server-to-server không có cookie Vercel → 302/HTML → app crash. Dùng production domain (vd. `https://bendo-psi.vercel.app`) hoặc tắt Protection / bypass token cho API.
- Middleware Vercel: `/api/*` không `auth.protect()` (tránh rewrite HTML); auth JSON qua `requireApiUser`.
- Vercel down → privileged API / `/api/me` lỗi; Agent chat vẫn gọi được DSH nếu session token còn đọc được từ cookie (userId cần `/api/me` thành công).
- Không CORS client-direct: mọi privileged call same-origin qua Next local rồi proxy.
- Packaged build **bắt buộc** `BENDO_CLOUD_API_URL` trước `build:bendo`.
- Dev thuần `bendo-app`: không set cloud URL; giữ cả hai secret local.

---

## 7. Kiểm tra đã chạy khi implement

Trong `bendo-app/`: `npm run format`, `npm run typecheck`, `npm run lint`.  
Trong `desktop/`: `npm run typecheck`.
