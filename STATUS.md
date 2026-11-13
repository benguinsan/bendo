# Status: cập nhật 2026-11-13

Nơi duy nhất ghi "đang làm / còn lại". Mỗi task kết thúc bằng việc cập nhật file này trong cùng commit. Luật chơi: [`AGENTS.md`](AGENTS.md). Tổng quan hệ thống: [`docs/architecture.md`](docs/architecture.md).

## Mục tiêu hiện tại

1. **Web local qua Docker:** README gốc và `bendo-app/README.md` lấy Docker Compose làm luồng chạy chính; Clerk/Supabase vẫn là dịch vụ bên ngoài, Doro cần harness chạy riêng. Lượt này chỉ cập nhật tài liệu, không đổi runtime.

## Đang làm

- (trống)

## Kế tiếp (đã sắp thứ tự)

Danh sách dưới đây là backlog desktop/cloud trước khi chuyển trọng tâm sang web local; chưa sắp lại ưu tiên. Hướng dẫn và mã Electron hiện có vẫn được giữ lại.

1. Deploy `bendo-app` lên Vercel (owner duyệt): bỏ `POST /api/discord-identity` (`be4e48e`, audit #10) và offset múi giờ theo ngày cho web (`376cdc4`, audit #13) chỉ có hiệu lực sau deploy; desktop cũng proxy lên Vercel.
2. **E2E trên máy Windows thật** (owner; chưa có kết quả xác nhận): cài `.exe` từ CI run 41508035268 (artifact `bendo-desktop-win-x64`, hết hạn 2026-11-16), chạy §C.1 trong [`docs/desktop-ship-mvp-checklist.md`](docs/desktop-ship-mvp-checklist.md): installer chỉ per-user + chọn thư mục, lần mở đầu tạo junction (ghi thời gian), login Clerk, CRUD, Agent chat, cài đè, gỡ cài.
3. Ghi release note Windows (`desktop/release-notes/`) + SHA-256 `.exe` (đã có trong mục Bản build gần nhất).
4. Doro nhầm "hôm nay" / "ngày mai" trong cùng câu trả lời (thấy khi test 2026-11-01) — kiểm tra time-context / prompt.
5. Duyệt các prompt còn mở (giữ / chuyển `done/` / xoá): `bendo-app/prompts/agent-model-config-simple-ui.md`, `agent-nontech-first-run.md`, `agent-soft-model-errors.md`; `desktop/prompts/pack-windows.md`, `win-harness-hoist.md`, `win-harness-hoisted-linker.md` (bỏ hướng hoisted), `win-harness-link-manifest.md`, `win-harness-cleanup.md`.

## Bị chặn / chờ quyết định

- (trống)

## Để sau

- Kiểm thử chat 2026-11-09: một yêu cầu nhiều định dạng bị timeout; các yêu cầu ngắn, bảng/code và code dài sau đó trả lời bình thường. Nguyên nhân chưa xác định; chưa sửa timeout.
- Audit 2026-11-01, chưa sửa (mỗi mục đã có case cụ thể khi audit):
  - Client lấy ngày local của `scheduledAt` ở một số chỗ, server dùng `scheduled_date` → có thể lệch ngày sau khi đổi múi giờ.
  - `bodySchema` trùng giữa `app/api/agent/model-config` và `model-connection`.
  - Logic fetch bridge lặp trong `bendo-app/lib/agent/dsh-chat-adapter.ts`.
  - `liveBySession` trong `bendo-agent(doro)/chat-bridge.ts` không bao giờ dọn → bộ nhớ harness tăng theo số phiên chat.
  - Các hàm `cloud*` gần giống nhau trong `bendo-app/lib/api/cloud/privilege-loaders.ts`.
- Next packaged lắng nghe `0.0.0.0:<port>` (`desktop/src/main/spawn-next.ts`, cố ý vì `127.0.0.1` làm `/api/health` lỗi) → máy khác trong LAN gọi được. Cần tìm cách bind loopback mà health vẫn chạy.
- Thử các kịch bản Orca chưa kiểm chứng trước khi giao task lớn: [`docs/multi-agent-orca.md`](docs/multi-agent-orca.md) §4.
- Chặn private IP sau DNS cho model probe; nút Clear model config ([`docs/agent-model-config.md`](docs/agent-model-config.md) §7).
- Slim harness: `pnpm deploy` production thật, first-run download, Linux pack ([`docs/desktop-doro-minimal-components.md`](docs/desktop-doro-minimal-components.md) §7). Windows đóng gói harness bằng manifest + junction (cùng file §7); thử `node-linker=hoisted` đã bỏ (vẫn ~6.4k symlink, 1.8 GB).
- Clerk chỉ có instance **development** (`pk_test_…`); allowlist `127.0.0.1:3000–3009` + `/auth/desktop-handoff` mới đặt trên dev (2026-11-02). Trước khi phát hành rộng: tạo production instance, đặt lại allowlist, cập nhật key trong environment `dist-win` + Vercel.
- `harness_ref` CI ghim `dsh-v0.1.3-alpha.1`; lên 0.2.x (`master`) cần Node ≥ 24 và test lại toàn bộ đóng gói.
- Clerk cảnh báo `createRouteMatcher` deprecated (log `next dev`): chuyển sang kiểm tra auth theo từng route trước khi lên Clerk major tiếp theo.
- Danh sách host model allowlist nằm ở ba nơi (`MODEL_API_PROVIDER_ALLOWED_HOSTS` trong `bendo-app/lib/agent/model-api-key.ts`, `BENDO_PROVIDER_ALLOWED_HOSTS` trong `bendo-agent(doro)/chat-bridge.ts`, `PROVIDER_ALLOWED_HOSTS` trong `desktop/src/main/model-config-store.ts`), chưa có check tự động.
- macOS clean-machine E2E, notarize, auto-update, Discord public bot.

## Bản build gần nhất

- **macOS arm64 `0.1.0-beta.8` local (2026-11-09):** sửa ViewTaskView nhận dữ liệu sau `router.refresh()` và chọn snapshot theo `DashboardTask.updatedAt` từ server (mới hơn thắng, bằng nhau giữ local). Edit/status/vital dùng chung helper; page dùng `key={task.id}`. Trước lượt đóng gói, reviewer đã chạy typecheck/lint/**71 tests** và production build đạt; test bao gồm refresh mới/cũ, mutation lệch thứ tự, timestamp bằng nhau và converter giữ `updatedAt`. `cd desktop && npm run pack` exit 0; artifact `desktop/release/mac-arm64/Bendo.app` xác nhận version beta.8. Không chạy lại bộ test riêng hoặc GUI theo yêu cầu owner; chưa build/test Windows, deploy hoặc publish. Release note: [`desktop/release-notes/0.1.0-beta.8.md`](desktop/release-notes/0.1.0-beta.8.md).
- **macOS arm64 `0.1.0-beta.7` local (2026-11-09, commit `f38b778`):** đã sửa 3 lỗi UI: Doro render Markdown an toàn (bold/list/table/code, user text literal; code dài cuộn ngang trong bubble), Dashboard status/completed dùng chung state task, Mark vital lưu priority Extreme. Reviewer chạy lại typecheck/lint/**64 tests** đạt; production `build:bendo` → desktop `build` → `run-electron-builder.mjs --dir` exit 0; `ops:pack-ready` đạt. UI đã xác nhận Dashboard đổi % ngay sau tạo/xoá, sửa title đồng bộ, Mark vital giữ sau reload và xuất hiện ở Vital Tasks; task QA đã xoá. Beta.7 xác nhận code 220 ký tự cuộn tới `END`; không tràn khung. Reuse harness không đổi từ beta.6 (`0.1.3-alpha.1`, rev `d347e70390`, smoke đạt; MANIFEST giữ version chuẩn bị beta.6). Báo cáo + ảnh local: `desktop/release/ui-regression-beta7-2026-11-09/REPORT.md`. Chưa build/test Windows hoặc deploy/publish bản này.
- macOS arm64 rebuild local `0.1.0-beta.4` (2026-11-09, commit `5411d51`, `cd desktop && npm run pack` exit 0): đã mở `desktop/release/mac-arm64/Bendo.app` và test qua UI: Google login/handoff, tạo/tìm/sửa/calendar/complete/reopen/delete task, Test connection + Save cấu hình model hiện có, thoát/mở lại giữ login + task + chat hoạt động không nhập lại key. Doro trả lời đúng 09/11 và 10/11. Đã xoá task QA; 3 vấn đề UI phát hiện trong lượt này đã được sửa ở beta.7. Báo cáo + ảnh local (gitignored): `desktop/release/user-test-2026-11-09.md`. Không thay thế Windows hoặc macOS clean-machine E2E.
- `0.1.0-beta.4` Windows x64 (CI run 41508035268, commit `01fd15d`, 2026-11-02): harness `dsh-v0.1.3-alpha.1`, 413 MB, 5759 junction tạo lại lúc chạy; NSIS 4m38s; `.exe` 187 MB, SHA-256 `4e1274507d642e2bdf02084306e2004c6b9725c27e275ca8571e4b907ac21a12`. CI đã verify `win-unpacked` (restore junction + smoke `/bendo-chat`); **chưa** cài thử trên máy thật.
- `0.1.0-beta.4` macOS arm64 (local `npm run dist`, 2026-11-02): harness `0.1.3-alpha.1` rev `d347e70390`, 455.6 MB; đã test trên app đóng gói (boot OK, log che token, bridge 401). Thêm so với beta.3: offset múi giờ theo ngày của task (DST), buffer log harness theo dòng. Chi tiết: [`desktop/release-notes/0.1.0-beta.4.md`](desktop/release-notes/0.1.0-beta.4.md).

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
| 13 | Must | `tzOffsetMinutes` lấy theo hôm nay, áp vào ngày khác → lệch 1 giờ ở vùng DST | Xong (offset theo ngày của task, web + Doro; beta.4; web hosted sau deploy Vercel) |
| 14 | Major | Token bị cắt giữa 2 chunk output harness → không che được | Xong (`line-buffer.ts`; beta.4) |
