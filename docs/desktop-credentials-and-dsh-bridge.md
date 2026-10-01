# Desktop credentials & DSH bridge

Tài liệu ghi lại vấn đề lộ key khi đóng gói Electron, cách xử lý, cơ chế **build inline** cho public key, và cải tiến inject **DSH chat bridge** (Next ↔ harness).

**Phạm vi:** packaging / desktop / local Agent. Không thay thế `AGENTS.md` — rule ngắn vẫn ở root / `bendo-app` / `desktop`.

**Cutover desktop → Vercel (Clerk + Supabase):** [`desktop-cloud-cutover.md`](./desktop-cloud-cutover.md).

---

## 1. Vấn đề lộ key

### Trước đây xảy ra gì?

Khi `build:bendo` / `next build` với `output: "standalone"`, Next có thể **copy cả file `.env*`** vào `.next/standalone`. Script sync sau đó đưa cây standalone vào `desktop/resources/bendo-app` → vào `.dmg` / `Bendo.app`.

Trên Vercel (`VERCEL=1`), `next.config` **không** bật standalone — Next 16.3 + adapter Vercel sẽ ENOENT `next-server.js.nft.json` nếu cả hai cùng bật. Docker / desktop build vẫn giữ standalone.

Hệ quả: artifact cài đặt chứa **đầy đủ** biến môi trường local, gồm:

| Loại | Ví dụ | Mức độ |
| --- | --- | --- |
| Cloud god-mode | `CLERK_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Nghiêm trọng — ai unpack app là có quyền server |
| Bridge local | `DSH_CHAT_BRIDGE_SECRET` | Trung bình — mở POST agent trên máy user |
| Public | `NEXT_PUBLIC_*` | Chấp nhận được (vốn dành cho client) |

Ngoài ra, `packagedNextEnv` từng **đọc lại `.env` từ thư mục resources** lúc spawn — càng củng cố việc secret nằm trong bundle.

### Đã giải quyết như thế nào?

```text
Trước:
  bendo-app/.env (full)
       │
       ▼ next build (standalone)
  .next/standalone/.env     ← secret trên đĩa
       │
       ▼ prepare-bendo-resource
  desktop/resources/bendo-app/.env
       │
       ▼ electron-builder
  .dmg / Bendo.app          ← lộ key

Sau:
  bendo-app/.env (full, chỉ máy build / dev)
       │
       ▼ next build
  .next/**/*.js             ← chỉ NEXT_PUBLIC_* được inline
  .next/standalone/         ← có thể còn .env tạm
       │
       ▼ strip-standalone-env.mjs
       ▼ prepare strip lần nữa
  resources/               ← không còn .env*
       │
       ▼ pack
  installer                ← không bake Clerk/Supabase/bridge secret
```

**Cơ chế kỹ thuật:**

1. **`bendo-app` `npm run build`** = `next build && node scripts/strip-standalone-env.mjs`  
   Xóa `.env*` dưới `.next/standalone` (và thư mục con).
2. **`desktop/scripts/prepare-bendo-resource.mjs`** strip lại trước/sau copy vào `resources/`.
3. **`packagedNextEnv()`** không còn `loadEnvFile` từ resources; chỉ inherit process env + **inject DSH** + **`BENDO_CLOUD_API_URL`** từ Electron; khi có cloud URL thì **xóa** `CLERK_SECRET_KEY` / `SUPABASE_SERVICE_ROLE_KEY` khỏi env child (cloud Clerk/Supabase mode).
4. **Rule AGENTS:** local `.env` full vẫn OK cho dev; phân bố public/secret chỉ bắt buộc khi dựng Electron resources / installer. Cloud secret thuộc host deploy (Vercel hoặc tương đương) — trả **kết quả**, không cho mượn key.

**`BENDO_CLOUD_API_URL`:** set trong `desktop/.env`, bake `bendo-public-config.json` lúc `build:bendo`, Electron inject vào Next child và **strip** Clerk/Supabase secrets khỏi env child → cloud Clerk (`/api/me`) + cloud Supabase (proxy allowlist). Strip `.env*` khỏi standalone vẫn như trên.

**Chưa xong:** cutover packaged Next sang gọi API cloud cho tasks/DB (packaged vẫn cần chiến lược runtime riêng cho `CLERK_SECRET` / service role). Strip + inject chỉ **chặn bake secret vào installer** và **làm Agent bridge local hoạt động không cần `.env` trong resources**.

---

## 2. Build inline — public key vào artifact nhờ đâu?

### Quy ước Next.js

Next phân biệt bằng **prefix tên biến**, không bằng “file `.env` có mặt sau build”:

| Tên | Lúc `next build` |
| --- | --- |
| `NEXT_PUBLIC_*` | Thay `process.env.NEXT_PUBLIC_…` bằng **chuỗi literal** trong JS (client + nhiều server chunk) |
| Không có prefix | **Không** inline vào client; chỉ đọc `process.env` lúc **server runtime** |

`bendo-app/env.ts` khai báo block `client:` / `server:` (T3 Env) để validate và chặn nhầm secret vào Client Component — **không** thay thế quy tắc inline của Next.

### Luồng trong repo

```text
Máy chạy build:bendo
  └─ có bendo-app/.env (hoặc CI env)
        │
        ▼
  next build  (next.config import "./env")
        │
        ├─ NEXT_PUBLIC_* ──inline──► .next/static/chunks/*.js
        │                            .next/server/chunks/*.js
        │
        └─ secret ──không inline──► chỉ có nếu còn file .env
                                   (đã bị strip)

  prepare-bendo-resource
        │
        └─ copy standalone + .next/static → desktop/resources/bendo-app
           (JS đã chứa pk_… / publishable; không cần .env để có public key)
```

**Không phải inject:** Electron `packagedNextEnv` **không** set `NEXT_PUBLIC_*`. Public key có trong product vì đã nằm trong bundle lúc build.

**Cảnh báo:** đặt nhầm `NEXT_PUBLIC_` trước tên secret → Next có thể nhúng secret vào JS. Không bao giờ làm vậy với `CLERK_SECRET_KEY` / service role / `DSH_CHAT_BRIDGE_SECRET`.

---

## 3. DSH bridge — cải thiện gì và vì sao?

### Vai trò secret bridge

Shared secret **localhost** giữa Next server và harness chat-bridge:

- `POST /bendo-chat` + header `x-bendo-chat-secret`
- GET liveness **không** cần secret
- **Không** thay `CLERK_SECRET` / Supabase service role; chỉ mở quyền gọi agent turn trên máy user

Trước đây: secret cố định trong `cordis.yml` + copy qua `.env` vào installer → yếu và dễ bake nhầm.

### Cải thiện (Desktop Electron)

| Trước | Sau |
| --- | --- |
| Hardcode URL `http://127.0.0.1:3080/bendo-chat` trong `spawn-next.ts` | `getBridgeChatUrl()` = `{BENDO_HARNESS_URL origin}/bendo-chat` |
| Packaged đọc `.env` từ resources | Strip `.env*`; inject từ Electron |
| Secret cố định / bake | Generate hoặc env session; persist `userData/bridge-credentials.json` |
| Cordis `secret: "abcdef…"` trong overlay | `secret: ""` — ưu tiên `DSH_CHAT_BRIDGE_SECRET` env |

**Vì sao như vậy?**

1. **Không ship secret trong installer** — đúng rule product credentials.
2. **URL theo port harness** — đổi `BENDO_HARNESS_URL` không lệch Next.
3. **TTL ~30 ngày** — secret trên disk không sống mãi nếu lộ file userData.
4. **Env session không ghi đè JSON** — test/override tạm không phá credential đã lưu.
5. **Cordis rỗng** — tránh default yếu trong repo; Electron hoặc `.env` harness cung cấp secret.

### Resolve thứ tự (Electron)

```text
getBridgeCredentials()  [cache memory 1 lần / session]

  1. Env DSH_CHAT_BRIDGE_SECRET / DSH_CHAT_BRIDGE_URL?
       → dùng cho session, KHÔNG ghi bridge-credentials.json

  2. userData/bridge-credentials.json còn hạn (rotatedAt + TTL)?
       → reuse secret (+ url hợp lệ)

  3. Else generate secret (crypto), url = derive harness,
       ghi JSON { url, secret, rotatedAt }, inject
```

### Inject vào process con

```text
                    ┌──────────────────────────┐
                    │   Electron main          │
                    │   getBridgeCredentials() │
                    └────────────┬─────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              ▼                                     ▼
     spawn Next (packaged force /          spawn harness (force)
     nextDev nếu unset)
              │                                     │
   DSH_CHAT_BRIDGE_URL                     DSH_CHAT_BRIDGE_SECRET
   DSH_CHAT_BRIDGE_SECRET                  (env thắng cordis "")
              │                                     │
              │  POST + x-bendo-chat-secret         │
              └─────────────────────────────────────► chat-bridge
```

### Hai đường chạy Agent (Electron vs local tay)

```text
[A] Desktop Electron
  Electron resolve ──inject──► Next + harness
  cordis secret: ""
  bendo-app/.env bridge: không bắt buộc

[B] Local không Electron (test tay)
  bendo-app/.env            ──► Next
  deepseek-harness/.env     ──► harness (dsh load cwd .env)
  Cùng một DSH_CHAT_BRIDGE_SECRET
  cordis secret: ""
```

File JSON mẫu (`~/Library/Application Support/.../bridge-credentials.json` trên macOS):

```json
{
  "url": "http://127.0.0.1:3080/bendo-chat",
  "secret": "<hex 64 chars>",
  "rotatedAt": "2026-09-29T12:00:00.000Z"
}
```

---

## 4. Workflow tổng quan (packaging + runtime)

### Build resources (không lộ secret cloud / bridge)

```text
npm run build:bendo  (desktop/)
        │
        ├─ npm run build (bendo-app)
        │     next build  → inline NEXT_PUBLIC_*
        │     strip-standalone-env.mjs
        │
        └─ prepare-bendo-resource.mjs
              strip .env* lại
              copy → desktop/resources/bendo-app
              (+ .next/static)

npm run pack / dist
        │
        └─ electron-builder extraResources
              artifact không chứa .env secret
```

### Runtime packaged (Agent local)

```text
User mở Bendo.app
        │
        ├─ Electron resolve DSH (env | JSON | gen)
        ├─ spawn Next standalone (public đã inline; DSH inject)
        ├─ spawn harness (DSH secret inject)
        │
        ├─ UI / (tương lai) API privileged → cloud host
        │     session → kết quả; không lend key
        │
        └─ Agent chat
              Browser → local Next → localhost bridge → Doro
```

### Dev hàng ngày (không đổi)

- `bendo-app/.env` full secrets cho `next dev` / Docker.
- Không commit `.env`.
- Không copy `.env` vào resources khi pack.

---

## 5. File code liên quan

| File | Vai trò |
| --- | --- |
| `bendo-app/env.ts` | Khai báo client vs server env |
| `bendo-app/scripts/strip-standalone-env.mjs` | Xóa `.env*` sau `next build` |
| `bendo-app/package.json` → `build` | `next build && strip…` |
| `desktop/scripts/prepare-bendo-resource.mjs` | Build + sync + strip defense-in-depth |
| `desktop/src/main/bridge-credentials.ts` | Resolve / persist / TTL DSH |
| `desktop/src/main/harness-url.ts` | `getBridgeChatUrl()` |
| `desktop/src/main/spawn-next.ts` | Inject vào Next child |
| `desktop/src/main/spawn-harness.ts` | Inject secret vào harness |
| `deepseek-harness/.../cordis.yml` | `secret: ""`; path `/bendo-chat` |
| `deepseek-harness/.../chat-bridge.ts` | Env secret ưu tiên hơn cordis |

---

## 6. Bước tiếp theo (ngoài phạm vi doc này)

Chi tiết cutover đã làm: [`desktop-cloud-cutover.md`](./desktop-cloud-cutover.md).

1. Rebuild resources / installer và smoke packaged CRUD qua Vercel.
2. Bundle harness runtime vào Electron (sau); model API key do user cung cấp.

---

## 7. Kiểm tra nhanh

- Sau `build:bendo`: không còn `.env*` dưới `desktop/resources/bendo-app`.
- Trong `resources/.../.next/static/chunks`: có thể thấy `pk_…` (public inline) — bình thường.
- Không thấy `sk_…` / `sb_secret_…` / `CLERK_SECRET_KEY=` trong resources.
- Electron log: `Credentials ready` / `Bridge secret rotated` — **không** in giá trị secret.
- Đổi `BENDO_HARNESS_URL=http://127.0.0.1:3090` → injected URL phải là `…:3090/bendo-chat`.
