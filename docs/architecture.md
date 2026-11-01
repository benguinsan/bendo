# Bendo: kiến trúc tổng quan

Trang đọc đầu tiên cho người mới (người hoặc agent): Bendo chạy theo những cách nào, request đi đâu, rồi đọc tiếp doc nào. Luật chơi ở [`../AGENTS.md`](../AGENTS.md); việc đang làm ở [`../STATUS.md`](../STATUS.md).

Một bộ code Next (`bendo-app/`) chạy theo ba cách. Electron (`desktop/`) chỉ là vỏ: spawn Next + harness local và load URL Bendo.

## 1. Web (Vercel)

```text
Browser ──► Next trên Vercel (đủ secret) ──► Clerk + Supabase (service role)
```

Agent chat không chạy ở đây: bridge DSH chỉ tồn tại trên máy user.

## 2. Desktop packaged

```text
Electron main
 ├─ spawn Next standalone local (không có Clerk/Supabase secret, có BENDO_CLOUD_API_URL)
 │    ├─ /api/tasks|categories|notifications|discord-identity|me ──proxy + session JWT──► Vercel ──► Supabase
 │    └─ /api/agent/*, /api/health ──local──► bridge localhost (x-bendo-chat-secret)
 └─ spawn harness/Doro local (DSH_HOME = {userData}/dsh) ──► LLM do user cấu hình
```

- Port: Next chọn port trống trong `3000–3009`, harness trong `3080–3089` (`desktop/src/main/pick-port.ts`).
- Đăng nhập OAuth mở browser hệ thống, quay về app qua `bendo://`.
- Model config user: Save = apply vào harness ∧ persist `userData` (`safeStorage`); chat turn không gửi key.

## 3. Dev

```text
next dev / docker compose (bendo-app/.env đủ secret) ──► Clerk + Supabase trực tiếp
   └─ (tuỳ chọn) bridge ──► deepseek-harness/ checkout local + overlay bendo-agent(doro)/
Electron dev (npm start trong desktop/) attach hoặc spawn Next :3000 và harness :3080
```

Có đủ secret thì cloud mode tự tắt (không proxy).

## 4. Route chạy ở đâu

| Route | Web | Desktop packaged |
| --- | --- | --- |
| `/api/tasks`, `/api/categories`, `/api/notifications` (+ `/:id`), `/api/discord-identity`, `/api/me` | Vercel | Proxy lên Vercel (`lib/api/cloud/privilege.ts`) |
| `/api/agent/chat`, `/api/agent/status`, `/api/agent/model-config` | Bridge offline | Local → bridge localhost |
| `/api/agent/model-connection` | Next probe provider | Local Next probe provider |
| `/api/health` | Vercel | Local |

Credential tiers (cái gì được ship, cái gì chỉ ở Vercel, cái gì chỉ ở máy user): root [`AGENTS.md`](../AGENTS.md) → Product credentials.

## 5. Dữ liệu

Supabase là nguồn chuẩn, RLS bật, chỉ service_role truy cập, mọi row gắn Clerk user id. Ghi kèm activity qua RPC `*_with_activity`. Rule nghiệp vụ (5 task/ngày, không đặt lịch quá khứ, …) nằm trong trigger `tasks_before_write` (`bendo-app/supabase/schema.sql`).

## 6. Đọc tiếp

| Doc | Nội dung |
| --- | --- |
| [`bendo-app-task-domain.md`](./bendo-app-task-domain.md) | Rule task / category / status / calendar / activity |
| [`bendo-app-agent-chat.md`](./bendo-app-agent-chat.md) | Rule Agent chat + model config (ngắn) |
| [`agent-model-config.md`](./agent-model-config.md) | Chi tiết Test / Save / apply / persist / re-apply |
| [`bendo-app-discord-identity.md`](./bendo-app-discord-identity.md) | Mapping Clerk ↔ Discord (chưa có bot) |
| [`desktop-cloud-cutover.md`](./desktop-cloud-cutover.md) | Desktop không giữ secret, proxy lên Vercel, bẫy đã gặp |
| [`desktop-credentials-and-dsh-bridge.md`](./desktop-credentials-and-dsh-bridge.md) | Strip `.env` khi đóng gói, public key inline, bridge secret |
| [`desktop-electron-startup-flow.md`](./desktop-electron-startup-flow.md) | Thứ tự khởi động Electron, Next, harness |
| [`desktop-oauth-bendo-protocol.md`](./desktop-oauth-bendo-protocol.md) | OAuth qua browser hệ thống + `bendo://`, allowlist Clerk |
| [`desktop-doro-minimal-components.md`](./desktop-doro-minimal-components.md) | Thành phần tối thiểu của harness/Doro khi đóng gói |
| [`desktop-ship-mvp-checklist.md`](./desktop-ship-mvp-checklist.md) | Checklist ship Windows MVP |
| [`multi-agent-orca.md`](./multi-agent-orca.md) | Quy trình Claude điều phối + Cursor thực hiện |
