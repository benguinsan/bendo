# Desktop — thành phần tối thiểu để chạy Doro

Inventory cho hướng **slim harness**: chỉ những gì Bendo Desktop cần để Agent chat chạy local qua Doro + chat-bridge. Không thay thế root / `desktop` / `bendo-app` `AGENTS.md`.

**Liên quan:** [`desktop-electron-startup-flow.md`](./desktop-electron-startup-flow.md), [`desktop-credentials-and-dsh-bridge.md`](./desktop-credentials-and-dsh-bridge.md), [`agent-model-config-save-workflow.md`](./agent-model-config-save-workflow.md).

Checklist “cần / không cần”. **Packaging v1 (denylist prune + embed):** `desktop/scripts/prepare-harness-resource.mjs` → `resources/harness` → electron-builder `extraResources`. Perfect production-graph closure vẫn là bước sau.

---

## 1. Mục tiêu runtime

Electron spawn (hoặc attach) một process:

```bash
pnpm dsh web --patch './bendo-agent(doro)/cordis.yml' --no-open
```

trong thư mục harness, với:

| Mục | Giá trị điển hình |
| --- | --- |
| Bridge health | `GET http://127.0.0.1:3080/bendo-chat` |
| Chat | `POST …/bendo-chat` + header `x-bendo-chat-secret` |
| `$DSH_HOME` (khi Electron spawn) | `{userData}/dsh` (không share `~/.dsh`) |

Bendo UI chat: Browser → Next `/api/agent/chat` → localhost bridge → Doro (model đã `applyModelConfig`).

---

## 2. Quy mô hiện tại (dev checkout)

Đo trên máy dev (tham khảo, thay đổi theo install):

| Path | ~Size | Ghi chú |
| --- | --- | --- |
| `deepseek-harness/` (cả cây) | ~1.8 GB | **Không** ship nguyên xi vào `.dmg` |
| `…/node_modules` | ~1.4 GB | Phần lớn bulk |
| `…/packages` (source) | ~123 MB | Monorepo packages |
| `…/apps` | ~16 MB | CLI + web frontend |
| `…/bendo-agent(doro)/` | ~76 KB | Overlay Bendo — luôn giữ |
| `desktop/resources/bendo-app` (Next standalone) | ~46 MB | Đã bundle riêng |

Kết luận: tối thiểu hóa = cắt **harness runtime**, không cắt Doro overlay.

---

## 3. Lớp bắt buộc (must-have)

### 3.1 Overlay Doro — `bendo-agent(doro)/`

Electron `resolveHarnessDir` **đòi** có `bendo-agent(doro)/cordis.yml`. Toàn bộ overlay nhỏ; ship nguyên folder:

| File | Vai trò |
| --- | --- |
| `cordis.yml` | Patch profile: persona, tools, bridge, web search defaults |
| `chat-bridge.ts` | HTTP `/bendo-chat` — chat + `applyModelConfig` |
| `tools.ts` | Tool Doro → Bendo API (`/api/tasks`, …) |
| `bendo-api.ts` | Client gọi Bendo API |
| `persona.ts` | Load persona / ops / safety |
| `personality.md` | Persona text |
| `operations.md` | Operations text |
| `safety.md` | Safety text |
| `tsconfig.json` | Typecheck overlay (dev); runtime load theo harness |

### 3.2 Plugin / config mà `cordis.yml` bật

Từ overlay (không optional cho Bendo Agent hiện tại):

| Id / name | Mục đích |
| --- | --- |
| `agent-default-model` | Placeholder composition; chat thật sau `applyModelConfig` |
| `system-prompt` | Persona Doro trong prompt |
| `@deepseek-ai/dsh-time-context` | Timezone / clock (`Asia/Ho_Chi_Minh`) |
| `./persona.ts` (`doro-persona`) | Persona plugin |
| `./tools.ts` (`doro-tools`) | Task tools → local/cloud Bendo API |
| `./chat-bridge.ts` (`bendo-chat-bridge`) | Bridge localhost |

Web research (đang bật trong overlay):

| Id | Mục đích |
| --- | --- |
| `web` | `searchProvider` / `fetchProvider` |
| `web-search-deepseek` | Backend search mặc định (`DEEPSEEK_API_KEY` nếu dùng) |

Có thể **tắt / bỏ** sau nếu product không cần `web_search` / `web_fetch` — khi đó bỏ luôn package search tương ứng khỏi slim tree. Hiện tại coi là **in-scope** vì cordis đang bật.

Optional trong comment overlay (mặc định **không** ship / không bật):

- `web-search-exa`, `web-search-perplexity`
- `@deepseek-ai/dsh-mcp-client` / MCP servers

### 3.3 Host runtime — `dsh web`

Không chỉ overlay: cần binary/`pnpm` entry **`dsh`** và profile **`web`** đủ để:

1. Boot Cordis host
2. Serve (hoặc gắn) HTTP server lắng nghe port bridge (default **3080**)
3. Load patch `--patch './bendo-agent(doro)/cordis.yml'`
4. Resolve workspace packages mà profile + patch import

Thực tế hôm nay (dev): cả monorepo `deepseek-harness` + `pnpm install` + `apps/cli` (`bin: dsh`).

**Hướng slim:** chỉ giữ runtime đủ cho `dsh web` + Doro patch — không giữ docs/tests/snapshots/website/python gates. **v1:** denylist. **Phase 2:** hoist + prune SDK/tooling. **Phase 3:** stub dsh web UI (`apps/web/dist` chỉ `index.html`), bỏ `packages/client/**/src`, prune UI/build `.pnpm` (vite/shiki/react/esbuild/…); **giữ MCP trên đĩa** (cordis off). Perfect `pnpm deploy` = bước sau nếu còn cần.

Checklist nhóm package (tên theo monorepo; prune cụ thể = bước sau):

| Nhóm | Ví dụ package / path | Vì sao |
| --- | --- | --- |
| CLI entry | `apps/cli` (`dsh`) | Lệnh spawn |
| Web app host | `dsh-web-app`, host webserver / static (nếu profile web cần) | `dsh web` |
| Cordis core | `cordis`, loader, include, timer, … | Boot + patch |
| LLM + settings | `dsh-llm-pi-ai`, credentials, settings/file | `applyModelConfig` ghi `settings.yaml` + provider routes |
| Agent / session / tools base | agent, tools, system-prompt, session, … | Turn agent thật |
| Time + web tool stack | `dsh-time-context`, `dsh-tool-web`, `web-search-deepseek`, `web-fetch-http`, … | Theo cordis hiện tại |
| Node toolchain | Node `^22.19 \|\| >=24`, **pnpm** trên PATH (hoặc binary nhúng) | Spawn hiện tại dùng `pnpm` |

> Ghi chú: `apps/cli` phụ thuộc nhiều package workspace (bash/pwsh tools, MCP, webhook, …). Một số **không** dùng bởi Bendo chat nhưng vẫn nằm trong dependency tree CLI — slim thật sự cần **closure analysis / production install**, không chỉ xóa folder bằng mắt.

### 3.4 Env / secret (không bake vào installer)

| Biến | Ai set | Ghi chú |
| --- | --- | --- |
| `DSH_CHAT_BRIDGE_SECRET` | Electron inject (hoặc `.env` local) | Bắt buộc; cordis `secret: ""` |
| `DSH_CHAT_BRIDGE_URL` | Electron → Next | Trỏ localhost bridge |
| `DSH_HOME` | Electron spawn → `{userData}/dsh` | Settings + credentials apply |
| User model key | `applyModelConfig` / persist `model-config.json` | Không hardcode trong cordis |
| `DEEPSEEK_API_KEY` (optional) | User/env | Chỉ nếu giữ DeepSeek web search |
| `BENDO_API_BASE_URL` / token | Overlay tools | Chat bridge ưu tiên `clerkToken` per-request |

**Không** đưa vào slim bundle: `CLERK_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, model API keys, bridge secret cố định trong repo.

### 3.5 Runtime state (tạo lúc chạy, không copy từ git)

Dưới `$DSH_HOME` (Electron: `userData/dsh`):

- `settings.yaml` (llm-pi-ai providers sau apply)
- credentials / selection agent-default-model

Không migrate từ `~/.dsh`.

---

## 4. Có thể loại khỏi slim bundle

An toàn loại khỏi artifact desktop (không ảnh hưởng Doro chat nếu prune đúng):

| Thành phần | Lý do |
| --- | --- |
| `docs/`, `website/`, brand / CONTRIBUTING markdown | Tài liệu upstream |
| `snapshots/`, vitest e2e / expected / web stress configs | Test-only |
| `python/`, pytest | Không phục vụ `dsh web` Bendo |
| Lefthook / CI scripts không cần runtime | Dev gates |
| Exa / Perplexity plugins (nếu không bật) | Optional trong cordis |
| MCP packages | **Phase 2 giữ trên đĩa** (cordis mặc định off; bật sau khi product sẵn sàng) |
| Experimental agent-team / webworker preview | Không dùng Bendo path |
| Full git history / `.git` | Không cần trong resources |

Cần đo sau khi có production graph (có thể vẫn lớn hơn mong đợi vì CLI kéo nhiều tool):

| Thành phần | Ghi chú |
| --- | --- |
| Toàn bộ `node_modules` production | Mục tiêu chính để giảm GB |
| Source maps / test fixtures trong packages | Cắt khi pack |
| Frontend web UI dist nếu Bendo không mở UI dsh | Có thể bỏ nếu host chỉ cần bridge HTTP — **xác nhận** với profile `web` trước khi cắt |

---

## 5. Điều kiện “Doro sẵn sàng” (smoke)

Tối thiểu coi runtime đủ khi:

1. Process harness sống; `GET /bendo-chat` health OK (cùng probe Electron dùng).
2. `POST /bendo-chat` với secret đúng không trả 503 “secret missing”.
3. `action: applyModelConfig` ghi được provider dưới `$DSH_HOME` (không `UNKNOWN_MODEL` sau apply).
4. Chat turn trả reply agent (không chỉ soft “configure model”).
5. (Nếu giữ web search) tool web không crash boot — key thiếu có thể fail lúc gọi tool, không fail boot.

Bendo Next local (hoặc cloud-forward cho data) vẫn cần cho UI + `/api/agent/chat`; doc này chỉ inventory **phía harness/Doro**.

---

## 6. Validation Electron

`desktop/src/main/spawn-harness.ts` check:

1. Thư mục harness tồn tại  
2. Có `package.json`  
3. Có `bendo-agent(doro)/cordis.yml`  
4. Packaged: có thêm `apps/cli/lib/bin.js`  
5. Spawn thành công + health bridge  

| Mode | Resolve | Spawn |
| --- | --- | --- |
| Dev / unpackaged | `BENDO_HARNESS_DIR` hoặc sibling `../deepseek-harness` | `pnpm dsh web --patch './bendo-agent(doro)/cordis.yml' --no-open` |
| Packaged | `BENDO_HARNESS_DIR` hoặc `Resources/harness` | Electron-as-Node → `apps/cli/lib/bin.js web --patch … --no-open` |

---

## 7. Đóng gói (v1 done; phase 2 còn lại)

**Đã làm (v1):**

1. Giữ nguyên overlay Doro (mục 3.1).  
2. `desktop/scripts/prepare-harness-resource.mjs` — rsync denylist prune → `desktop/resources/harness` + `MANIFEST.json` (size / rev).  
3. Embed qua electron-builder `extraResources` → `Contents/Resources/harness`.  
4. Packaged resolve + Electron-as-Node spawn (không system `pnpm`).  
5. `pack` / `dist` chạy `build:harness` cùng `build:bendo`.

**Đã làm (phase 2 + 3):**

- Hoist `@deepseek-ai` cho Electron-as-Node; prune SDK/tooling + UI/build `.pnpm`.  
- Stub web UI: giữ `@deepseek-ai/dsh-web-frontend` + `dist/index.html`, bỏ `dist/assets`.  
- Exclude `packages/client/**/src`; giữ MCP trên đĩa (`mcpCordisEnabled: false`).  
- Smoke port `13080` (skip: `BENDO_HARNESS_SKIP_SMOKE=1`). Artifact ~**377 MB** sau Phase 3.

**Chưa làm (sau):**

- Perfect production `pnpm deploy` / rewrite CLI deps.  
- First-run download vào `userData`.  
- Smoke mục 5 trên máy sạch chỉ có installer (manual).

Không copy nguyên checkout (`.git` / docs / python / website / snapshots) vào installer.

---

## 8. Tóm tắt một dòng

**Must ship:** overlay `bendo-agent(doro)/` + runtime đủ chạy `dsh web` (CLI/host + Cordis + LLM/settings + agent/tools + time/web theo cordis) + Node/pnpm (hoặc binary tương đương) + secret/env inject lúc chạy.  
**Must not ship:** full monorepo dev tree, docs/tests/python, secrets cloud, và (mục tiêu) phần lớn bulk `node_modules` không nằm trong closure runtime.
`)