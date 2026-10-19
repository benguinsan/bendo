# Desktop packaged — categories load failure (session review)

Review phiên debug **“Could not load categories”** trên Bendo Desktop packaged (cloud cutover), gồm triệu chứng, nguyên nhân, chỉnh sửa, và bài học. Không thay thế [`desktop-cloud-cutover.md`](./desktop-cloud-cutover.md) hay `AGENTS.md`.

**Phạm vi:** Browser → local Next `/api/categories*` → Vercel proxy; Clerk session JWT; client `browserApiFetch`.  
**Ngoài phạm vi:** Agent chat / DSH / harness packaging (đã ổn trong phiên trước).

---

## 1. Triệu chứng

| Môi trường | Hành vi |
| --- | --- |
| `npm start` / `next dev` (có secret local) | Categories load OK |
| Packaged Desktop (`BENDO_CLOUD_API_URL`, không secret) | UI: **Could not load categories.** (Add Task / category field) |
| Agent chat trên cùng build | Thường OK (không đi cloud categories proxy) |

DevTools (sau này): `Failed to load resource: net::ERR_CONTENT_DECODING_FAILED` trên `/api/categories`.

Runtime log (diagnose tạm): đôi khi `upstream=200` trong khi UI vẫn báo lỗi — gợi ý lệch server vs client.

---

## 2. Kiến trúc liên quan (nhắc ngắn)

```text
Electron renderer (Clerk JS, publishable key)
  → getToken / __session cookie
Local Next (không CLERK_SECRET / SUPABASE_SERVICE_ROLE)
  → maybeProxyPrivilegedRequest
  → Authorization: Bearer <JWT>
Vercel (auth() + service role)
  → JSON { data: ... }
```

- Secret-key work **chỉ** trên Vercel; desktop **không** lend keys.
- Proxy **không** forward cookie refresh (`__refresh__*`) lên Vercel — chỉ Bearer JWT.
- Refresh session thuộc **Clerk client** (`getToken({ skipCache: true })`), không phải endpoint Vercel “trả refresh token”.

Chi tiết cutover: [`desktop-cloud-cutover.md`](./desktop-cloud-cutover.md).

---

## 3. Lỗi đã xác định

### 3.1 `ERR_CONTENT_DECODING_FAILED` (nguyên nhân chính làm fail parse JSON)

**Cơ chế:**

1. Vercel trả body **đã nén** + `Content-Encoding: gzip|br`.
2. Node/`undici` `fetch` trên local Next **tự giải nén** body.
3. Proxy forward nguyên header `Content-Encoding` + body **đã plain**.
4. Browser thấy encoding → giải nén lần nữa → fail.

**Vì sao `npm start` local không lộ:** không proxy Vercel — một hop Next → DB, không copy `Content-Encoding` từ upstream nén.

**Sửa:** trong `forwardResponseHeaders` (`lib/api/cloud/privilege.ts`) bỏ `content-encoding` và `content-length` (cùng các hop-by-hop sẵn có). Không “tắt giải nén client”; chỉ **không báo body còn nén** khi body đã plain.

### 3.2 JWT hết hạn + proxy không refresh được

Log Vercel điển hình:

```text
x-clerk-auth-message: JWT is expired. … (reason=token-expired, token-carrier=header)
x-clerk-auth-reason: session-token-expired-refresh-non-eligible-no-refresh-cookie
```

Proxy chỉ gửi Bearer → Vercel không có refresh cookie → không refresh hộ desktop. Cookie `__session` local thường cùng JWT đã hết hạn nên “retry cookie-only” gần như vô ích.

**Sửa client:** `browserApiFetch` (`lib/api/browser-api-fetch.ts`):

1. Lần 1: `getToken({ skipCache: true })` → Bearer → fetch.
2. Nếu `401` và đã dùng Bearer → `getToken({ skipCache: true })` lại (Clerk refresh) → **một** retry Bearer.
3. Vẫn fail / không lấy được token → trả response cho UI (không loop).

Không cần parse message body để phân biệt 401 (body thường chỉ `Unauthorized`). Retry Bearer một lần sau refresh là đủ; header `x-clerk-auth-reason` chỉ hữu ích khi debug.

**Không làm:** API Vercel trả / “cho mượn” refresh token về máy user (trái cutover).

### 3.3 Race client category field

`TaskFormCategoryField` mount trong dialog (`open ? <TaskFormContent/> : null`). Pattern `cancelled = true` trên cleanup có thể **bỏ** response `200` (Strict Mode / remount / `isSignedIn` flicker) trong khi lần fetch sau fail → server log `upstream=200`, UI vẫn lỗi.

**Sửa:** `loadId` (chỉ apply kết quả load mới nhất); đọc `getToken` qua ref để không phụ thuộc identity function Clerk trong effect deps.

### 3.4 Nhầm `[error]` trong runtime log

`console.warn` từ Next đi **stderr** → Electron pipe thành `[error] [next] …`. Không đồng nghĩa request fail. `upstream=200` = proxy OK.

### 3.5 Hot-swap Resources vào `/Applications/Bendo.app`

Copy `desktop/resources/bendo-app` vào app đã ký có thể làm app không mở (vỡ code signature). Cần rebuild/`pack`/`dist` hoặc chạy từ `desktop/release/…`, không patch in-place app đã cài.

---

## 4. Chỉnh sửa đã giữ (sau khi gỡ log tạm)

| File | Thay đổi |
| --- | --- |
| `bendo-app/lib/api/cloud/privilege.ts` | Strip `content-encoding` / `content-length` khi forward response Vercel |
| `bendo-app/lib/api/browser-api-fetch.ts` | Bearer + `skipCache`; sau 401 → refresh `getToken` → retry Bearer một lần |
| `bendo-app/components/tasks/task-form-category-field.tsx` | `loadId` + `getToken` ref |
| `bendo-app/lib/task-categories/category-api-client.ts` | Dùng `browserApiFetch` + `getToken` (không log diagnose) |
| `bendo-app/lib/api/cloud/session-token.ts` | Giữ `getForwardableSessionToken` (Bearer rồi cookie); bỏ `tokenSource` diagnose |

**Đã gỡ:** log tạm `[cloud-proxy]`, `[browser-api]`, `[categories]`, và API `resolveForwardableSessionToken` / `SessionTokenSource` chỉ phục vụ diagnose.

---

## 5. Luồng đúng sau fix (categories)

```text
UI TaskFormCategoryField
  → listCategoriesViaApi({ getToken })
  → browserApiFetch("/api/categories")
       getToken({ skipCache: true }) → Bearer
       [401?] → getToken({ skipCache: true }) → Bearer retry once
  → local GET /api/categories
  → maybeProxyPrivilegedRequest
       Bearer → Vercel
       Response: drop Content-Encoding/Length, forward body plain
  → { data: PersistedCategory[] } → select options
```

---

## 6. Kiểm tra thủ công

1. Packaged / cloud mode: mở Add Task → Category dropdown có list (không “Could not load categories”).
2. DevTools Network: `/api/categories` status 200, response JSON đọc được (không `ERR_CONTENT_DECODING_FAILED`).
3. Để JWT gần hết hạn / chờ vài phút rồi mở lại dialog: lần đầu có thể 401 rồi retry Bearer thành công (không loop).
4. `npm start` local (có secret): categories vẫn OK (không đi proxy).

Rebuild desktop Next resource trước khi test packaged: `desktop` → `npm run build:bendo` (hoặc `pack` / `dist`).

---

## 7. Bài học

| Bài học | Chi tiết |
| --- | --- |
| Proxy ≠ transparent pipe | `fetch` upstream đã decode; phải chỉnh header cho khớp body |
| Test matrix | Local-with-secrets **không** thay cho packaged cloud cutover |
| Refresh ở đâu | Clerk **client**; Vercel chỉ verify JWT đã forward |
| Log level Electron | stderr Next → `[error]` trong runtime log; đọc `upstream=` / status thật |
| Diagnose rồi gỡ | Log tạm hữu ích; ship xong thì bỏ để tránh nhiễu |

---

## 8. Liên quan

- [`desktop-cloud-cutover.md`](./desktop-cloud-cutover.md) — kiến trúc cutover
- [`desktop-credentials-and-dsh-bridge.md`](./desktop-credentials-and-dsh-bridge.md) — env / strip secrets
- Root `AGENTS.md` — Product credentials / key distribution
- `bendo-app/AGENTS.md` — cloud mode / API rules
