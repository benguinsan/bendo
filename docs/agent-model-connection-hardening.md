# Agent model connection — bổ sung bảo mật & sửa đúng chức năng

Tài liệu ghi các điều chỉnh **sau** khi ship modal model config + Test connection (`POST /api/agent/model-connection`). Không thay thế `bendo-app/AGENTS.md` §10 — rule ngắn vẫn nằm ở đó.

**Phạm vi:** UI Agent chat model configuration, probe Next → provider. Không gồm đẩy config vào harness chat-bridge (follow-up riêng).

**Prompt gốc:** `bendo-app/prompts/agent-chat-model-config-fields.md`

---

## 1. Bối cảnh

### Đã ship ban đầu

- Modal: Provider, API endpoint, API key, Model name
- Save → `sessionStorage` (session-only)
- Test connection: Browser → Next (Clerk) → provider (không qua harness)
- Timeout: chat ping **15s**, `/models` **5s**
- Map lỗi tiếng Việt: 401 / 402 / 404|/models / 429 / 5xx

### Review / merge risk sau đó

Probe cho phép authenticated user khiến server `fetch` URL tùy ý (SSRF), follow redirect, và gửi key của provider A sang endpoint provider B khi đổi select. Một số copy/UI và helper URL cũng lệch hành vi mong muốn.

---

## 2. SSRF — allowlist host + HTTPS

**Vấn đề:** Endpoint chỉ cần là `http(s)` URL → có thể trỏ `localhost`, `169.254.169.254`, `host.docker.internal`, mạng nội bộ. Phân loại status trở thành oracle; header `Authorization` mang key tới dịch vụ nội bộ.

**Đã làm:**

| Biện pháp | Chi tiết |
| --- | --- |
| Allowlist hostname theo provider | `MODEL_API_PROVIDER_ALLOWED_HOSTS` trong `lib/agent/model-api-key.ts` |
| Bắt buộc `https:` | Từ chối `http:`, userinfo, port khác 443 |
| Enforce server + client | Zod `superRefine` trên route; `isAllowedModelEndpoint` trước mọi probe URL; validate form |

**Host được phép:**

| Provider | Hostname |
| --- | --- |
| OpenRouter | `openrouter.ai` |
| Vilao | `api.vilao.ai` |
| GPT | `api.openai.com` |
| Gemini | `generativelanguage.googleapis.com` |

Host ngoài list → `Endpoint không được phép` (`ENDPOINT_NOT_ALLOWED`).

**Chưa làm (lựa chọn thay thế trong review):** reject IP loopback/private **sau DNS resolution**. Với allowlist hiện tại, hướng đó không bắt buộc; DNS rebinding tới IP nội bộ từ hostname allowlist vẫn là residual risk nâng cao nếu cần siết thêm sau.

---

## 3. Không follow redirect

**Vấn đề:** `fetch` mặc định follow redirect. Endpoint allowlist có thể `3xx` → `Location` nội bộ → bypass host check trên URL gốc; kèm credential.

**Đã làm:**

- Mọi probe `fetch`: `redirect: "manual"`
- Mọi status `300–399`: fail ngay (`Endpoint không được phép`)
- Áp dụng cho chat ping, `GET …/models`, và Gemini `generateContent`

API provider thường không cần redirect cho ping; chặn follow là đúng cho credentialed probe.

---

## 4. Reset API key khi đổi provider

**Vấn đề:** Đổi Provider mà giữ `savedApiKey` / `savedMask` của provider đã lưu → Test/Save gửi key OpenAI sang Gemini (và ngược lại), rồi ghi đè sessionStorage sai cặp.

**Đã làm** (`handleProviderChange` trong `model-api-key-dialog.tsx`):

- Luôn xóa key đang nhập khi đổi provider
- Nếu stored **cùng** provider → restore endpoint/model/key mask của provider đó
- Nếu stored **khác** provider → endpoint/model = default mới; `savedMask` / `savedApiKey` = `null`

---

## 5. Copy “clear below” vs nút Clear

**Vấn đề:** Help text nói *“or clear below”* nhưng nút Clear đã gỡ; `clearStoredModelApiKey` không còn dùng từ UI.

**Quyết định sản phẩm:** không thêm lại nút Clear.

**Đã làm:** bỏ cụm *“or clear below”* — chỉ còn hướng dẫn nhập key mới để thay thế.

---

## 6. `joinEndpointPath` — ranh giới segment

**Vấn đề:** `base.endsWith(suffix)` không có ranh giới `/` → base `…/mymodels` + suffix `models` bị coi là đã có path → không append `/models`.

**Đã làm:** chỉ skip append khi `base.endsWith(\`/${suffix}\`)`.

---

## 7. Success phải đúng shape body (không chỉ 2xx)

**Vấn đề:** Sau khi chặn redirect, vẫn có thể nhận 2xx từ response không phải chat API (HTML/JSON lạ) và báo “Kết nối thành công”.

**Đã làm** (`lib/agent/model-connection.ts`):

| Provider kiểu | Điều kiện success |
| --- | --- |
| OpenAI-compatible | `response.ok` **và** JSON có `choices` (array) |
| Gemini | `response.ok` **và** JSON có `candidates` (array) |

2xx sai shape → `Yêu cầu bị từ chối bởi provider` (`PROVIDER_REJECTED`).

---

## 8. File liên quan

| File | Vai trò |
| --- | --- |
| `bendo-app/lib/agent/model-api-key.ts` | Defaults, allowlist, `isAllowedModelEndpoint`, `joinEndpointPath`, sessionStorage |
| `bendo-app/lib/agent/model-connection.ts` | Probe, timeouts, redirect manual, map lỗi, body shape |
| `bendo-app/lib/agent/model-connection-api-client.ts` | Client `fetch` tới route |
| `bendo-app/app/api/agent/model-connection/route.ts` | Clerk + Zod + allowlist |
| `bendo-app/components/agent/model-api-key-dialog.tsx` | UI modal, reset key khi đổi provider |
| `bendo-app/AGENTS.md` §10 | Rule ngắn (fields, probe, SSRF guards) |

---

## 9. Out of scope / kế hoạch tiếp (đã chốt hướng)

Quy định product trong `bendo-app/AGENTS.md` §10 (**Plan — save model config before use**):

- Lưu config local trên máy user (JSON / tương đương), Save/apply **trước** khi chat
- Harness dùng config đã apply — **không** đính kèm full model config / API key theo mỗi chat turn
- Không sync key lên Supabase/Vercel

Vẫn mở kỹ thuật:

- Reject private IP sau DNS (defense-in-depth ngoài allowlist)
- Nút Clear / xóa store từ UI
- Thay `sessionStorage` MVP bằng persist `userData` + apply bridge
