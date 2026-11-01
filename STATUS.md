# Status: cập nhật 2026-11-01

Nơi duy nhất ghi "đang làm / còn lại". Mỗi task kết thúc bằng việc cập nhật file này trong cùng commit. Luật chơi: [`AGENTS.md`](AGENTS.md). Tổng quan hệ thống: [`docs/architecture.md`](docs/architecture.md).

## Mục tiêu hiện tại

1. **Ship Windows MVP:** installer NSIS chạy được trên máy Windows sạch (login, CRUD, Agent chat). Chi tiết: [`docs/desktop-ship-mvp-checklist.md`](docs/desktop-ship-mvp-checklist.md).

## Đang làm

- (trống)

## Kế tiếp (đã sắp thứ tự)

1. Clerk Dashboard: allow origin + `/auth/desktop-handoff` cho cả dải `127.0.0.1:3000–3009` (`npm run ops:pack-ready` trong `desktop/` in ra đủ danh sách).
2. Chạy workflow **Desktop Windows** (`dist:win`), tải artifact.
3. E2E trên máy Windows thứ hai: cài, login, CRUD, Agent chat.
4. Ghi SHA-256 + release note, bump `desktop/package.json` version.
5. Duyệt các prompt còn mở (giữ / chuyển `done/` / xoá): `bendo-app/prompts/agent-model-config-simple-ui.md`, `agent-nontech-first-run.md`, `agent-soft-model-errors.md`, `orca-trial-code-comment.md`; `desktop/prompts/pack-windows.md`.
6. So sánh bridge secret bằng `timingSafeEqual` thay vì `!==` (`bendo-agent(doro)/chat-bridge.ts:651`, sửa cả bản dev và `desktop/packaging/`).

## Bị chặn / chờ quyết định

- (trống)

## Để sau

- Thử các kịch bản Orca chưa kiểm chứng trước khi giao task lớn: [`docs/multi-agent-orca.md`](docs/multi-agent-orca.md) §4.
- Chặn private IP sau DNS cho model probe; nút Clear model config ([`docs/agent-model-config.md`](docs/agent-model-config.md) §7).
- Slim harness: `pnpm deploy` production thật, first-run download, Linux pack ([`docs/desktop-doro-minimal-components.md`](docs/desktop-doro-minimal-components.md) §7).
- macOS clean-machine E2E, notarize, auto-update, Discord public bot.

## Audit 2026-10-31 (ponytail)

| # | Mức | Phát hiện | Trạng thái |
| --- | --- | --- | --- |
| 1 | Must | Trang lạ trong cửa sổ Electron đọc được khoá API qua IPC | Xong (`trusted-sender.ts`, `8baeb91`, `5ae0071`) |
| 2 | Should | Test không chạy, CI không chạy test | Xong (`npm test` cả hai package, CI) |
| 3 | Should | Giới hạn 5 task/ngày vượt được khi hai request đồng thời | Xong (`pg_advisory_xact_lock`, `d36920a`) |
| 4 | Should | Task quá hạn không sửa được tiêu đề/priority | Xong (`d36920a`) |
| 5 | Should | "Hôm nay" tính theo múi giờ server | Xong (`c156073`) |
| 6 | Nice | `updateTask` đọc thừa trước khi ghi | Xong (`82dbc7b`) |
| 7 | Nice | So sánh bridge secret bằng `!==` | Kế tiếp #6 |
| 8 | Nice | `@clerk/themes` không dùng | Xong (đợt dọn docs) |
