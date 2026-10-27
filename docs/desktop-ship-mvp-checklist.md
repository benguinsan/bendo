# Desktop ship MVP — việc 1 (ship hygiene)

Checklist xuất MVP nội bộ. **Hướng hiện tại: Windows-first** (máy 2 = Windows để clean E2E).  
**macOS bước 4 (clean-machine) tạm dừng** — vẫn có thể `dist` mac trên máy dev nếu cần; không block đóng việc 1 bằng mac VM.

**Không** gồm (sau): Apple notarize, auto-update, Discord bot, Gmail.

**Liên quan:** [`desktop-cloud-cutover.md`](./desktop-cloud-cutover.md), [`desktop-oauth-bendo-protocol.md`](./desktop-oauth-bendo-protocol.md), [`desktop-doro-minimal-components.md`](./desktop-doro-minimal-components.md), `desktop/README.md`, root `AGENTS.md`.

---

## 0. Định nghĩa “xong việc 1” (điều chỉnh)

| Đạt | Tạm không cần |
| --- | --- |
| Installer / portable **Windows** chạy trên máy sạch (máy 2) | Clean-machine **macOS** (để sau) |
| Login Clerk → CRUD task qua Vercel | Apple signing / notarize |
| Agent: Save model → chat (harness trong bundle) | Linux |
| Không lộ cloud secrets / bridge secret trong artifact | Discord bot / Gmail |
| Version semver rõ + ghi chú build | |

### Pack Windows (đã wire trong repo)

- [x] `prepare-harness-resource.mjs` — Node copy + hoist copy trên win32 (không rsync / không fail sớm win32).
- [x] `electron-builder.yml` — `win` NSIS + dir (x64).
- [x] `npm run pack:win` / `dist:win`.
- [ ] **Chạy** `dist:win` **trên máy Windows** (khuyến nghị) — native rebuild `fs-ext` đúng ABI win32.
- [ ] E2E máy 2 (mục C).

**Lưu ý:** Cross-pack từ Mac (`electron-builder --win`) có thể tạo installer nhưng **natives** trong harness nên rebuild trên Windows (`build:harness` trên Win) trước khi tin Agent chat.

---

## A. Trước clean E2E Win (ops + build trên máy Win)

### A.1–A.3 Pack (code)

Đã triển khai trong desktop/. Việc còn lại = **chạy trên máy Windows có checkout** (hoặc sync `resources/` sau `build:harness` trên Win):

- [ ] Trên Win: `cd desktop && npm install && npm run build:bendo && npm run build:harness && npm run dist:win`
- [ ] Xác nhận `release/` có `.exe` NSIS và/hoặc `win-unpacked/Bendo.exe`
- [ ] Spawn / kill-tree / log: `%APPDATA%\\bendo-desktop\\logs\\` (hoặc path log thực tế khi chạy) — verify trên máy 2

### A.4 Cloud & Clerk (ops pack — bước 1)

Gate tự động (version + cloud URL + `/api/health`):

```bash
cd desktop && npm run ops:pack-ready
```

- [x] `desktop/.env`: `BENDO_CLOUD_API_URL=https://bendo-psi.vercel.app` (public; bake lúc `build:bendo`).
- [x] Vercel deploy sống — `GET /api/health` → 200; `GET /api/me` reachable (401 khi chưa login = OK).
- [ ] **Clerk Dashboard (owner):** allow `http://127.0.0.1:3000` + `http://127.0.0.1:3000/auth/desktop-handoff` (+ `localhost` variants nếu dùng). Không đăng ký `bendo://`. Chi tiết: [`desktop-oauth-bendo-protocol.md`](./desktop-oauth-bendo-protocol.md) §2.
- [ ] Smoke CRUD có session trên cloud (sign-in browser / packaged) — sau khi Clerk allowlist xong.

### A.5 Version

- [x] Bump `desktop/package.json` → **`0.1.0-beta.1`**.
- [x] Stub release note: [`desktop/release-notes/0.1.0-beta.1.md`](../desktop/release-notes/0.1.0-beta.1.md) (điền SHA + MANIFEST lúc pack).

---

## B. Build artifact Windows

```bash
# Mục tiêu sau khi A xong — chính xác lệnh sẽ cập nhật khi script sẵn sàng
cd desktop
npm install
npm run build:bendo
npm run build:harness
npm run dist:win   # hoặc electron-builder --win (khi đã wire)
```

### B.1 Kiểm tra artifact

- [ ] `resources/bendo-app` không còn `.env*` / cloud secrets.
- [ ] Public config có `BENDO_CLOUD_API_URL`.
- [ ] `resources/harness` + MANIFEST; natives win hợp lệ.
- [ ] Có `.exe` installer (NSIS) hoặc unpacked `win-unpacked/Bendo.exe`.

---

## C. Clean-machine E2E trên máy 2 (Windows) — thay bước 4 mac

Máy Windows **không** cần checkout monorepo.

1. Copy installer / `win-unpacked` sang máy 2.
2. Cài hoặc chạy (SmartScreen → More info → Run anyway nếu unsigned).
3. Chờ spawn Next + harness; xem log nếu fail (path userData logs — ghi khi wire xong).
4. **Auth:** Sign-in → browser → `bendo://` / handoff về Electron.
5. **CRUD:** tạo / sửa / xóa task.
6. **Agent:** Save provider+key → một tin chat.
7. Quit — không orphan process nặng; mở lại ổn.

### Pass / fail (Win)

| Pass | Fail điển hình |
| --- | --- |
| CRUD qua cloud | Clerk allowlist / handoff |
| Agent chat | Harness native ABI sai / bridge |
| App lên sau SmartScreen | Pack thiếu resources |
| Không lộ secret trong install dir | `.env` lọt resources |

---

## D. macOS (tạm pause)

- [ ] Không yêu cầu clean-machine mac để đóng việc 1.
- [ ] Giữ `dist` mac trên máy dev khi tiện (không block).
- [ ] Quay lại mac E2E sau khi Win dogfood ổn hoặc có Mac thứ hai / VM.

---

## E. Tải qua link (người dùng không chạy lệnh)

**Mục tiêu:** người nhận chỉ mở HTTPS → tải `.exe` → cài.  
**Không** yêu cầu họ `npm` / checkout. Build vẫn làm **một lần** (máy Win của bạn hoặc CI).

Thứ tự: **E.0 → E.1 → E.2 → E.3 → E.4**. C (E2E máy 2) nên pass trước khi gửi link rộng.

### E.0 Điều kiện trước

- [x] A.4 cloud URL + version gate (`npm run ops:pack-ready`) — **trừ** Clerk Dashboard (owner).
- [x] A.5 Version `0.1.0-beta.1` + stub release note.
- [ ] Clerk allowlist (A.4 còn lại) trước login E2E.
- [ ] Harness sẵn trên máy build (`deepseek-harness` + `pnpm` deps) — hoặc CI có quyền clone harness.
- [ ] (Khuyến nghị) C pass trên máy 2 với cùng artifact sẽ upload.

### E.1 Build artifact (một lần — bạn / CI, không phải người tải)

**Cách A — máy Windows (đơn giản nhất lúc này)**

- [ ] Checkout monorepo + harness cạnh repo (hoặc `BENDO_HARNESS_DIR=…`).
- [ ] `cd desktop && npm install`
- [ ] `npm run dist:win`
- [ ] Lấy file trong `desktop/release/` — tên kiểu `Bendo-<version>-win-x64.exe` (NSIS).

**Cách B — GitHub Actions (sau, khi muốn lặp lại không cần máy Win)**

- [ ] Workflow `windows-latest`: checkout app + harness → `npm run dist:win`.
- [ ] Upload asset lên **GitHub Release** (không chỉ Actions artifact — artifact thường cần login GH).
- [ ] Secrets/env: public bake only; không nhét cloud secrets vào installer.

### E.2 Host + tạo link tải

Chọn **một** kênh:

| Kênh | Khi nào | Việc cần làm |
| --- | --- | --- |
| **Google Drive / Dropbox** | Beta nội bộ nhanh | Upload `.exe` → Anyone with link → copy URL |
| **GitHub Releases** | Link ổn định, có version | Tạo release tag `v<version>` → đính kèm `.exe` → copy asset URL |
| **R2 / S3 / Blob** | Tự host domain | Upload object public (hoặc signed URL) |

Checklist chung:

- [ ] Upload đúng file đã E2E (cùng SHA với máy 2 nếu đã test).
- [ ] Ghi **SHA-256** của `.exe` (PowerShell: `Get-FileHash … -Algorithm SHA256`).
- [ ] Ghi **Release note** ngắn: version, win32-x64, Vercel URL (public), harness MANIFEST/commit, “unsigned”.
- [ ] Có **URL HTTPS** copy được (vd. `…/Bendo-0.1.0-beta.1-win-x64.exe`).

### E.3 Gói gửi cho người tải (copy-paste)

- [ ] Link tải.
- [ ] SHA-256 (để họ đối chiếu nếu muốn).
- [ ] Hướng dẫn ngắn:
  1. Tải → mở installer.
  2. SmartScreen (unsigned): **More info → Run anyway**.
  3. Cần mạng (Clerk/Vercel + API model).
  4. Sign-in → Save model key → chat Agent.
- [ ] Không gửi: repo clone, `npm`, bridge secret, cloud secret keys.

### E.4 Xác minh “đúng là download through link”

Trên máy **không** có monorepo (máy 2 hoặc máy khác):

- [ ] Chỉ dùng link ở E.2 — không copy USB/`release/` thủ công lần này.
- [ ] Tải xong → hash khớp SHA (optional nhưng tốt).
- [ ] Lặp lại smoke C: login → CRUD → Save model → 1 tin chat → quit sạch.
- [ ] Pass → coi như **đã ship link tải** cho beta nội bộ.

### E.5 Sau này (không block E)

- [ ] Trang / nút “Download for Windows” trên marketing hoặc README trỏ tới Release URL mới nhất.
- [ ] Tag + CI publish mỗi bản.
- [ ] Code signing (giảm SmartScreen) — backlog.

---

## F. Backlog sau việc 1

1. In-app notification.
2. Quay lại mac clean E2E + (sau) signing.
3. Gmail reminders.
4. Discord bot.
5. CI Windows → GitHub Release (E.1 cách B) nếu chưa làm.

---

## G. Ai làm gì

| Việc | Owner |
| --- | --- |
| Win-safe harness prepare + builder `win` | Dev (đã wire trong repo) |
| Vercel secrets / Clerk allowlist | Người có dashboard (A.4 còn lại) |
| `ops:pack-ready` + version bump | Dev (bước 1 — đã wire) |
| `dist:win` + upload link (E.1–E.2) | Bạn (máy Win) hoặc Dev+CI |
| E2E máy 2 / verify link (C + E.4) | Bạn |
| mac clean E2E | Pause |
