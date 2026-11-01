# Desktop OAuth — `bendo://` protocol handoff

Doc này mô tả luồng OAuth (Clerk Sign-in / Discord Connect) chạy trên **browser hệ thống**, callback về **local Next**, rồi OS mở **Electron** qua custom protocol `bendo://` — tránh redirect về UI Vercel và tránh để user kẹt trên tab browser.

**Liên quan:** [`desktop-cloud-cutover.md`](./desktop-cloud-cutover.md) (secret → Vercel).

---

## 1. Workflow

```text
[Electron BrowserWindow]
  User Sign-in (Google) / Connect Discord
       │
       ├─ openExternal / will-navigate intercept
       ▼
[System browser]
  Clerk + provider OAuth
       │
       │  redirectUrl / forceRedirectUrl (absolute, Electron only)
       ▼
  http://127.0.0.1:<port>/auth/desktop-handoff?next=/…[&clerk params…]
       │
       │  page builds deep link
       ▼
  bendo://auth/callback?target=<encodeURIComponent(local http URL + query/hash)>
       │
       │  OS opens default handler for bendo://
       ▼
[Electron main]
  parseBendoProtocolUrl → validate target (loopback / app origin)
  focus BrowserWindow
  loadURL(target)   ← session/handshake Clerk chạy trong cookie jar của app
       ▼
  /  hoặc  /settings  (theo next=)
```

**Vì sao có bước http handoff?**  
Clerk thường **không** chấp nhận `bendo://` làm Allowed redirect URL. Redirect vẫn là `http://127.0.0.1:…`; protocol chỉ dùng để OS **đưa user vào cửa sổ Electron**.

**Web thuần (không Electron):** không set absolute handoff; Sign-in/Discord giữ path tương đối như trước (`/`, `/settings`).

---

## 2. Clerk Dashboard (bắt buộc cấu hình tay)

Packaged desktop picks the first free Next port in **3000–3009** (and harness **3080–3089**). Allow every origin / handoff URL in that Next range so OAuth still works when 3000 is busy:

**Origins (10):**

- `http://127.0.0.1:3000`
- `http://127.0.0.1:3001`
- `http://127.0.0.1:3002`
- `http://127.0.0.1:3003`
- `http://127.0.0.1:3004`
- `http://127.0.0.1:3005`
- `http://127.0.0.1:3006`
- `http://127.0.0.1:3007`
- `http://127.0.0.1:3008`
- `http://127.0.0.1:3009`

**Desktop handoff redirect URLs (10):**

- `http://127.0.0.1:3000/auth/desktop-handoff`
- `http://127.0.0.1:3001/auth/desktop-handoff`
- `http://127.0.0.1:3002/auth/desktop-handoff`
- `http://127.0.0.1:3003/auth/desktop-handoff`
- `http://127.0.0.1:3004/auth/desktop-handoff`
- `http://127.0.0.1:3005/auth/desktop-handoff`
- `http://127.0.0.1:3006/auth/desktop-handoff`
- `http://127.0.0.1:3007/auth/desktop-handoff`
- `http://127.0.0.1:3008/auth/desktop-handoff`
- `http://127.0.0.1:3009/auth/desktop-handoff`

Optional if you also use the hostname form: the same ten ports on `http://localhost:…` and `http://localhost:…/auth/desktop-handoff`.

Không bắt buộc (và thường không được) đăng ký `bendo://` trong Clerk.

**Clerk production với tên miền riêng** (vd. `clerk.bendo.app`): phải thêm host đó vào `isIdentityOAuthHost` (`desktop/src/main/oauth-navigation.ts`). Nếu không, `will-navigate`/`will-redirect` sẽ coi đó là host lạ và đẩy ra browser ngoài.

---

## 3. File đã thêm / chỉnh

### 3.1 Desktop (`desktop/`)

| File | Thêm / sửa | Chức năng chính |
| --- | --- | --- |
| `src/main/protocol.ts` | **Thêm** | Đăng ký scheme, parse/validate `bendo://`, load + focus cửa sổ |
| `src/main/main.ts` | **Sửa** | Single-instance, `open-url`, argv protocol, gắn window + flush pending |
| `electron-builder.yml` | **Sửa** | `protocols` + macOS `CFBundleURLTypes` cho `bendo` |

**Đã có từ slice OAuth browser (vẫn dùng chung):**

| File | Vai trò trong workflow |
| --- | --- |
| `src/main/open-external.ts` | `openExternalUrl` — mở http(s) trong OS browser |
| `src/main/oauth-navigation.ts` | Intercept navigate/redirect/popup OAuth → không chiếm BrowserWindow |
| `src/preload/preload.ts` | Expose `bendoDesktop.openExternal` |

### 3.2 bendo-app (`bendo-app/`)

| File | Thêm / sửa | Chức năng chính |
| --- | --- | --- |
| `app/auth/desktop-handoff/page.tsx` | **Thêm** | Landing http → build `bendo://` → `location.replace` / link “Open Bendo” |
| `lib/desktop/desktop-handoff.ts` | **Thêm** | Build handoff URL + protocol URL; `resolveDesktopAppOrigin` |
| `components/auth/desktop-aware-clerk.tsx` | **Thêm** | Sign-in/up Electron: `forceRedirectUrl` → handoff absolute |
| `app/(auth)/sign-in/[[...sign-in]]/page.tsx` | **Sửa** | Dùng `DesktopAwareSignIn` |
| `app/(auth)/sign-up/[[...sign-up]]/page.tsx` | **Sửa** | Dùng `DesktopAwareSignUp` |
| `components/settings/discord-connect-controls.tsx` | **Sửa** | Discord `redirectUrl` absolute handoff khi có `bendoDesktop` |
| `proxy.ts` | **Sửa** | Public route `/auth/desktop-handoff(.*)` |
| `lib/agent/bendo-desktop.d.ts` | **Sửa** (slice trước) | Type `openExternal` trên `window.bendoDesktop` |
| `lib/desktop/open-external.ts` | **Có sẵn** | `tryOpenExternalUrl` từ renderer |
| `lib/desktop/use-desktop-focus-refresh.ts` | **Có sẵn** | Focus/visibility → refresh sau OAuth |

### 3.3 Docs

| File | Thêm / sửa |
| --- | --- |
| `docs/desktop-cloud-cutover.md` | **Sửa** — đoạn OAuth Electron + `bendo://` |
| `docs/desktop-oauth-bendo-protocol.md` | **Thêm** — file này |

---

## 4. Symbol / function map

### Desktop — `protocol.ts`

| Symbol | Việc làm |
| --- | --- |
| `BENDO_PROTOCOL` | Scheme `"bendo"` |
| `registerBendoProtocolClient()` | `setAsDefaultProtocolClient` (dev: kèm `execPath` + entry) |
| `parseBendoProtocolUrl(raw)` | Parse `bendo://auth/callback?target=…`; chỉ cho phép target http(s) loopback / cùng origin app |
| `handleBendoProtocolUrl(raw)` | Validate → `loadURL(target)` → focus window |
| `flushPendingProtocolUrl()` | Xử lý URL tới trước khi có BrowserWindow |
| `findProtocolUrlInArgv(argv)` | Lấy `bendo://…` từ argv (Win/Linux) |
| `setProtocolMainWindow(win)` | Giữ ref cửa sổ chính cho callback |

### Desktop — `main.ts` (hooks)

| Hook / chỗ gọi | Việc làm |
| --- | --- |
| `app.requestSingleInstanceLock()` | Một process; instance 2 forward protocol |
| `second-instance` | `handleBendoProtocolUrl` hoặc focus window |
| `open-url` (macOS) | Protocol khi app đang chạy / cold start |
| `createWindow` → `setProtocolMainWindow` + `attachOAuthExternalNavigation` | Gắn window + chặn OAuth in-window |
| `whenReady` → `registerBendoProtocolClient` + `flushPendingProtocolUrl` | Đăng ký scheme + xử lý pending |

### Desktop — OAuth ra browser

| Symbol | File | Việc làm |
| --- | --- | --- |
| `openExternalUrl` | `open-external.ts` | Validate http(s) + `shell.openExternal` |
| `shouldOpenOAuthExternally` / `attachOAuthExternalNavigation` | `oauth-navigation.ts` | Discord / Google / Clerk OAuth path → browser |

### bendo-app — handoff

| Symbol | File | Việc làm |
| --- | --- | --- |
| `DESKTOP_HANDOFF_PATH` | `desktop-handoff.ts` | `"/auth/desktop-handoff"` |
| `BENDO_PROTOCOL_CALLBACK` | cùng file | `"bendo://auth/callback"` |
| `buildDesktopHandoffUrl(origin, nextPath)` | cùng file | Absolute Clerk return URL + `?next=` |
| `buildBendoProtocolCallbackUrl(targetHttpUrl)` | cùng file | Deep link cho OS |
| `resolveDesktopAppOrigin()` | cùng file | `bendoDesktop.getAppUrl()` → origin |
| `DesktopHandoffPage` | `auth/desktop-handoff/page.tsx` | Client: build target + `bendo://` + navigate |
| `DesktopAwareSignIn` / `DesktopAwareSignUp` | `desktop-aware-clerk.tsx` | Force redirect handoff trên Electron |
| `useDesktopHandoffRedirect` | cùng file | Resolve absolute handoff URL |
| Discord `clerkReturnUrl` | `discord-connect-controls.tsx` | `buildDesktopHandoffUrl(…, "/settings")` khi Electron |

---

## 5. Shape URL

**Clerk → browser (local):**

```text
http://127.0.0.1:3000/auth/desktop-handoff?next=%2Fsettings
```

(Sign-in thường `next=/`; Discord `next=/settings`. Thêm query/hash Clerk nếu provider gắn vào redirect.)

**Browser → OS / Electron:**

```text
bendo://auth/callback?target=http%3A%2F%2F127.0.0.1%3A3000%2Fsettings%3F...
```

**Electron `loadURL`:** decode `target` → chỉ chấp nhận http(s) tới `127.0.0.1` / `localhost` (cùng port app) hoặc đúng origin `getBendoAppUrl()`.

---

## 6. Manual test (tóm tắt)

1. Clerk Dashboard đã allow handoff local.  
2. Chạy Electron (`npm start` / packaged).  
3. Sign-in Google hoặc Settings → Connect Discord → OAuth trên browser.  
4. Browser tới `/auth/desktop-handoff` → OS hỏi Open Bendo (nếu lần đầu) → Electron focus + đúng route.  
5. Không còn kết thúc trên domain Vercel sau OAuth desktop.

---

## 7. Một câu

**OAuth ở browser → http local `/auth/desktop-handoff` → `bendo://auth/callback?target=…` → Electron load local URL** — Clerk vẫn dùng redirect http; protocol chỉ để OS trả user về cửa sổ app.
