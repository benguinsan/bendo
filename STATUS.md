# Status: cập nhật 2026-11-01

Nơi duy nhất ghi "đang làm / còn lại". Mỗi task kết thúc bằng việc cập nhật file này trong cùng commit. Luật chơi: [`AGENTS.md`](AGENTS.md). Tổng quan hệ thống: [`docs/architecture.md`](docs/architecture.md).

## Mục tiêu hiện tại

1. **Ship Windows MVP:** installer NSIS chạy được trên máy Windows sạch (login, CRUD, Agent chat). Chi tiết: [`docs/desktop-ship-mvp-checklist.md`](docs/desktop-ship-mvp-checklist.md).

## Đang làm

- (trống)

## Kế tiếp (đã sắp thứ tự)

1. Clerk Dashboard: allow origin + `/auth/desktop-handoff` cho cả dải `127.0.0.1:3000–3009` (`npm run ops:pack-ready` trong `desktop/` in ra đủ danh sách).
2. Đặt biến cho GitHub Actions (repo hiện chưa có): Variable `BENDO_CLOUD_API_URL`; Secrets `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — lấy từ env của project Vercel `bendo-psi` (cùng instance Clerk/Supabase). Không đặt secret server nào.
3. Chạy workflow **Desktop Windows** (`dist:win`) với `harness_ref` = `d347e70390` (bản đã test), tải artifact.
4. E2E trên máy Windows thứ hai: cài, login, CRUD, Agent chat.
5. Ghi SHA-256 + release note (`desktop/release-notes/`).
6. Agent chat UI: render markdown trong tin nhắn Doro (hiện hiện nguyên `**…**`).
7. Doro nhầm "hôm nay" / "ngày mai" trong cùng câu trả lời (thấy khi test 2026-11-01) — kiểm tra time-context / prompt.
8. Duyệt các prompt còn mở (giữ / chuyển `done/` / xoá): `bendo-app/prompts/agent-model-config-simple-ui.md`, `agent-nontech-first-run.md`, `agent-soft-model-errors.md`; `desktop/prompts/pack-windows.md`.

## Bị chặn / chờ quyết định

- Xoá 9 ảnh `bendo-app/public/dashboard/thumb-*.svg` (code không dùng)? Cần chạy trước: `select thumbnail_src, count(*) from public.tasks where thumbnail_src like '/dashboard/%' group by 1;` — chỉ xoá nếu không task nào trỏ tới.
- Gỡ skill không khớp dự án: `desktop/.agents/skills/electron-egg`, `bendo-app/.agents/skills/clerk-billing|clerk-orgs|clerk-webhooks` (giữ `upgradelink` cho auto-update).

## Để sau

- Thử các kịch bản Orca chưa kiểm chứng trước khi giao task lớn: [`docs/multi-agent-orca.md`](docs/multi-agent-orca.md) §4.
- Chặn private IP sau DNS cho model probe; nút Clear model config ([`docs/agent-model-config.md`](docs/agent-model-config.md) §7).
- Slim harness: `pnpm deploy` production thật, first-run download, Linux pack ([`docs/desktop-doro-minimal-components.md`](docs/desktop-doro-minimal-components.md) §7).
- Clerk cảnh báo `createRouteMatcher` deprecated (log `next dev`): chuyển sang kiểm tra auth theo từng route trước khi lên Clerk major tiếp theo.
- Danh sách host model allowlist nằm ở ba nơi (`MODEL_API_PROVIDER_ALLOWED_HOSTS` trong `bendo-app/lib/agent/model-api-key.ts`, `BENDO_PROVIDER_ALLOWED_HOSTS` trong `bendo-agent(doro)/chat-bridge.ts`, `PROVIDER_ALLOWED_HOSTS` trong `desktop/src/main/model-config-store.ts`), chưa có check tự động.
- macOS clean-machine E2E, notarize, auto-update, Discord public bot.

## Bản build gần nhất

- `0.1.0-beta.3` macOS arm64 (local `npm run dist`, 2026-11-01): harness `0.1.3-alpha.1` rev `d347e70390`, 455.6 MB; đã test trên app đóng gói (Doro tạo task đúng giờ local, log che token, bridge 401). Chi tiết: [`desktop/release-notes/0.1.0-beta.3.md`](desktop/release-notes/0.1.0-beta.3.md).

## Audit 2026-10-31 (ponytail) + bổ sung 2026-11-01

| # | Mức | Phát hiện | Trạng thái |
| --- | --- | --- | --- |
| 1 | Must | Trang lạ trong cửa sổ Electron đọc được khoá API qua IPC | Xong (`trusted-sender.ts`, `8baeb91`, `5ae0071`) |
| 2 | Should | Test không chạy, CI không chạy test | Xong (`npm test` cả hai package, CI) |
| 3 | Should | Giới hạn 5 task/ngày vượt được khi hai request đồng thời | Xong (`pg_advisory_xact_lock`, `d36920a`) |
| 4 | Should | Task quá hạn không sửa được tiêu đề/priority | Xong (`d36920a`) |
| 5 | Should | "Hôm nay" tính theo múi giờ server | Xong (`c156073`) |
| 6 | Nice | `updateTask` đọc thừa trước khi ghi | Xong (`82dbc7b`) |
| 7 | Nice | So sánh bridge secret bằng `!==` | Xong (`secretMatches` trong `chat-bridge.ts`, cả hai bản Doro) |
| 8 | Nice | `@clerk/themes` không dùng | Xong (đợt dọn docs) |
| 9 | Should | Bridge `applyModelConfig` không tự kiểm allowlist endpoint (có secret là bỏ qua được Next) | Xong (`isAllowedModelEndpoint` trong `chat-bridge.ts`) |
| 10 | Must | `POST /api/discord-identity` ghi Discord ID bất kỳ, không kiểm OAuth | Xong (xoá POST + code cloud không dùng; có hiệu lực sau deploy Vercel) |
| 11 | Must | Tool task của Doro không gửi `tzOffsetMinutes` → tính theo UTC | Xong (beta.3; test chat: `scheduledAt` 12:00 giờ VN) |
| 12 | Nice | Runtime log ghi nguyên `?token=` của dsh web UI | Xong (`redact-log.ts`, chỉ che trong file log; beta.3) |
