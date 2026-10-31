# Multi-agent trên Orca: Claude điều phối, Cursor thực hiện

Ghi lại phiên làm việc 2026-10-30/31: dựng luồng đa agent, chạy thử, audit mã nguồn bằng ponytail và thực hiện nhóm cải thiện 1. Quy tắc ngắn gọn nằm ở [`AGENTS.md`](../AGENTS.md) mục **Multi-agent**; file này giữ phần lý do và cách chạy.

## 1. Mô hình

- **Claude (coordinator/reviewer):** đọc context, soạn `<package>/prompts/<feature>.md`, xin chủ dự án duyệt, giao việc, review diff và chạy lại kiểm tra.
- **Cursor (implementer):** chỉ làm trong phạm vi prompt đã duyệt, mỗi lần một task, để thay đổi chưa commit.
- **Chủ dự án:** duyệt prompt và kết quả, làm mọi thao tác commit/push/merge. Agent không tự merge.

Đây là multi-agent (nhiều phiên độc lập phối hợp), không phải sub-agent (agent con do agent cha sinh ra trong cùng phiên). Cách gọi không phụ thuộc vào tài khoản hay nhà cung cấp.

## 2. Quyết định chính và lý do

| Quyết định | Lý do |
| --- | --- |
| Dùng chung worktree `development`, **một người ghi tại một thời điểm** | Ít thay đổi nhất, `<package>/prompts/`, `.env`, `node_modules` dùng chung. Đánh đổi: không chạy song song được. |
| Giao việc bằng `worker-start --worktree current --agent cursor` | Cursor chạy trong thư mục hiện tại, `git diff` chính là phần Cursor làm (cần cây sạch hoặc ghi baseline). |
| `<package>/prompts/` **vẫn bị gitignore**; nội dung prompt đưa thẳng vào `--spec` | Tránh phình lịch sử git. Prompt đến tay Cursor ngay khi khởi động, không bị race với việc chép file. |
| Context lâu dài lưu ở thân commit/PR và `docs/`, không lưu prompt | Prompt chỉ là phiếu giao việc dùng một lần. Xong thì chuyển vào `<package>/prompts/done/` (cũng bị ignore). |
| Không chép `.env` sang worktree khác | Không đưa secret cho bên implement. |
| Cursor không có MCP `clerk`/`vercel` | Hai MCP này có quyền ghi (sửa cấu hình, deploy). Chỉ Claude giữ. Cursor dùng chung `~/.cursor/mcp.json` ở mọi worktree. |
| Bỏ ignore `AGENTS.md` | `AGENTS.md` ở root và `desktop/` từng bị `.gitignore`, nên worktree khác và CI không thấy. |
| Thêm `CLAUDE.md` (root, `desktop/`) chứa `@AGENTS.md` | Claude Code đọc `CLAUDE.md`, Cursor đọc `AGENTS.md`; hai bên dùng chung một nguồn. |

## 3. Cách chạy một task

Quy ước đường dẫn: repo có hai thư mục prompt riêng, `bendo-app/prompts/` và `desktop/prompts/` (cả hai bị gitignore, không có `prompts/` ở gốc). `<package>` là `bendo-app` hoặc `desktop`; khi đọc hoặc chuyển prompt luôn dùng đường dẫn từ gốc repo, ví dụ `desktop/prompts/foo.md`.

1. Cây git sạch (hoặc ghi lại baseline các file đang sửa dở).
2. Claude soạn prompt (mục tiêu, file, **do not touch**, yêu cầu, tiêu chí nghiệm thu, định dạng báo cáo) và chủ dự án duyệt.
3. Giao việc (chạy từ thư mục gốc repo):
   ```text
   orca orchestration run-create --objective "<mục tiêu>" --json
   orca orchestration worker-start --spec "$(cat <package>/prompts/<feature>.md)" --task-title "<tên>" --worktree current --agent cursor --json
   orca orchestration check --wait --types "worker_done,escalation,question" --timeout-ms 540000 --json
   ```
4. Trong lúc Cursor chạy, Claude chỉ đọc. Khi nhận `worker_done`: tự xem `git status`, `git diff` và chạy lại `typecheck`/`lint`/`test`; không chỉ tin báo cáo của Cursor.
5. Chốt: `orca orchestration worker-release --dispatch <id>` rồi `orca orchestration check --ack <delivery_id>`.
6. Chủ dự án xem diff rồi commit; prompt xong chuyển vào `<package>/prompts/done/`.

Muốn song song hoặc cô lập: tạo worktree riêng (`--worktree new-top-level --base-branch development`). Worktree mới không có `<package>/prompts/`, `.env`, `node_modules` (đều bị ignore), nên cần script setup và đưa prompt qua `--spec`.

## 4. Đã kiểm chứng

Môi trường: Orca 1.4.245, agent id `cursor` hợp lệ, hook trạng thái đã cài cho Claude và Cursor.

- Task 1 (worktree riêng, thêm một dòng vào docs): Cursor làm đúng, tự gửi `worker_done`. Worktree thử đã xóa.
- Task 2 (worktree chung, thêm một dòng vào docs): đúng phạm vi, đã hoàn tác.
- Task 3 (worktree chung, thêm JSDoc vào `cn`, kèm `typecheck` và `lint`): Cursor chạy hai lệnh và báo đúng; kết quả khớp khi Claude chạy lại.
- Hai task thật của nhóm cải thiện 1 (mục 6) chạy trọn vòng giao việc, review, release.

**Chưa kiểm chứng:** Cursor hỏi lại giữa chừng (`ask`) hoặc làm sai để Claude yêu cầu sửa; hai phiên cùng ghi vào `development`; task lớn cần `build`; nội dung script setup của Orca (CLI không có lệnh sửa, phải đặt trong giao diện Orca); `npm run test:smoke` của desktop (cần Bendo đang chạy ở `127.0.0.1:3000`).

## 5. Audit mã nguồn (ponytail)

Tải giả định: ứng dụng cá nhân, vài trăm người dùng. Chưa chạy ứng dụng hay chạy gì trên cơ sở dữ liệu thật; mục 3, 4, 5 dựa trên đọc mã.

| # | Mức | Phát hiện | Trạng thái |
| --- | --- | --- | --- |
| 1 | Must | Mọi trang trong cửa sổ Electron có thể đọc khóa API qua IPC (`desktop/src/main/main.ts`, `oauth-navigation.ts`) | **Đã sửa** (mục 6) |
| 2 | Should | Test không chạy được và CI không chạy test | **Đã sửa** (mục 6) |
| 3 | Should | Giới hạn 5 task/ngày có thể bị vượt khi hai yêu cầu đến cùng lúc: trigger `tasks_before_write` đếm không khóa (`supabase/schema.sql:163-208`). Sửa: `pg_advisory_xact_lock` theo user và ngày | Chưa làm |
| 4 | Should | Task quá hạn không sửa được tiêu đề/độ ưu tiên: trigger chạy trên mọi `UPDATE` và ném `SCHEDULE_IN_PAST`. Sửa: chỉ kiểm tra khi insert hoặc khi `scheduled_at` đổi | Chưa làm |
| 5 | Should | `scheduledAtFromDateInput` tính theo múi giờ server (Vercel = UTC); người dùng phía tây UTC tạo task "hôm nay" vào buổi tối có thể bị từ chối (`task-input.ts:153-183`) | Chưa làm |
| 6 | Nice | `updateTask` gọi thừa `getLiveTaskRow` và `getOwnedCategory` mà RPC đã kiểm tra (`task-service.ts`) | Chưa làm |
| 7 | Nice | So sánh secret của bridge bằng `!==`, nên dùng `timingSafeEqual` (`chat-bridge.ts:651`) | Chưa làm |
| 8 | Nice | `@clerk/themes` không được import ở đâu | Chưa làm |

**Độ hoàn thiện:** tính năng web và mô hình dữ liệu mạnh (RLS, RPC có activity, chặn SSRF ở bước kiểm tra endpoint model). Điểm yếu là kiểm thử. Desktop Windows còn dở: checklist ship ở [`desktop-ship-mvp-checklist.md`](./desktop-ship-mvp-checklist.md) có 11 mục xong, 38 mục còn mở (chạy `dist:win` trên Windows, allowlist Clerk, E2E máy thứ hai, SHA-256 và release note).

## 6. Nhóm cải thiện 1 (đã thực hiện)

**Bảo mật Electron.** Thêm `desktop/src/main/trusted-sender.ts`.
- Bốn kênh IPC (`model-config:save`, `model-config:load`, `open-external`, `reload`) chỉ phục vụ trang thuộc origin Bendo. Kênh `reload` còn cho phép đúng trang `static/offline.html` vì `offline.js` gọi `reloadBendo`. Trang lạ nhận `Untrusted sender.`, không nhận dữ liệu.
- `will-navigate` và `will-redirect` chặn trang `http(s)` không phải Bendo và không phải host danh tính (Discord, Google, Clerk), rồi mở ra trình duyệt ngoài. Host danh tính vẫn ở trong cửa sổ để các trang Clerk không phải OAuth hoàn tất được.
- **Lưu ý:** nếu chuyển sang Clerk production dùng tên miền riêng (ví dụ `clerk.bendo.app`), phải thêm host đó vào `isIdentityOAuthHost`, nếu không điều hướng sang đó sẽ bị chặn.

**Bật test trong CI.**
- Thêm `tsx` (devDependency) và script `npm test` (`tsx --test "lib/**/*.test.ts"`) ở `bendo-app/`, kèm bước `Test` trong `.github/workflows/ci.yaml` trước `Build`.
- Thêm `lib/agent/model-api-key.test.ts` (allowlist endpoint) và `lib/tasks/task-input.test.ts` (`scheduledAtFromDateInput`).
- Kết quả: `npm test` 33/33 đạt, `typecheck` và `lint` đạt (đã được Claude tự chạy lại).
- **Sửa sau khi review:** `bendo-app/tsconfig.json` từng loại `**/*.test.ts` khỏi `exclude`, nên `npm run typecheck` không kiểm tra file test và editor báo `Cannot find name 'node:test'`. Đã bỏ mục loại trừ này; `tsc --noEmit` vẫn đạt, nên các file test giờ được kiểm kiểu như mã còn lại.

## 7. Việc tiếp theo

1. **Nhóm 2:** mục 3, 4, 5 trong bảng audit, mỗi mục kèm một test.
2. **Hoàn tất đợt ship Windows:** allowlist Clerk, chạy workflow `Desktop Windows`, E2E máy thứ hai, ghi SHA-256 và release note.
3. **Dọn nhẹ:** mục 6, 7, 8.
4. **Thử các kịch bản chưa kiểm chứng** ở mục 4 trước khi giao task lớn.
