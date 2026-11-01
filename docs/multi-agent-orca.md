# Multi-agent trên Orca: Claude điều phối, Cursor thực hiện

Doc này mô tả luồng đa agent trên Orca (dựng 2026-10-30/31). Quy tắc ngắn gọn nằm ở [`AGENTS.md`](../AGENTS.md) mục **Multi-agent**; file này giữ phần lý do và cách chạy.

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

## 4. Đã kiểm chứng / chưa kiểm chứng

**Đã chạy được** (Orca 1.4.245, agent id `cursor`): giao việc trên worktree riêng và worktree chung, Cursor tự gửi `worker_done`, chạy `typecheck`/`lint` và báo đúng (Claude chạy lại khớp), và trọn vòng giao việc → review → release cho task thật.

**Chưa kiểm chứng:** Cursor hỏi lại giữa chừng (`ask`) hoặc làm sai để Claude yêu cầu sửa; hai phiên cùng ghi vào `development`; task lớn cần `build`; nội dung script setup của Orca (CLI không có lệnh sửa, phải đặt trong giao diện Orca); `npm run test:smoke` của desktop (cần Bendo đang chạy ở `127.0.0.1:3000`).

Trạng thái việc (audit, việc tiếp theo): [`../STATUS.md`](../STATUS.md).
