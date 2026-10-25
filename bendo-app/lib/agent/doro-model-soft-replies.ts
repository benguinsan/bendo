/**
 * Map provider/model chat failures to Doro-voice VN bubbles (not dry alerts).
 * Keep phrasing aligned with soft replies in Doro chat-bridge.
 *
 * App auth failures (UNAUTHORIZED / bare "Unauthorized") must not match here —
 * those are session/sign-in, not provider API keys.
 */

const SOFT_INVALID_KEY =
  "API key hình như chưa đúng hoặc hết hạn rồi. Cậu mở chìa khóa, dán key mới rồi Save lại giúp mình nhé.";
const SOFT_NO_CREDIT =
  "Tài khoản model hết credit hoặc chưa thanh toán rồi. Cậu kiểm tra bên provider, nạp thêm rồi Save lại key giúp mình nhé.";
const SOFT_MODEL_MISSING =
  "Model id hình như không tồn tại hoặc không dùng được với key này. Cậu mở Advanced, sửa tên model (hoặc để mặc định) rồi Save lại nhé.";
const SOFT_RATE_LIMIT =
  "Provider đang giới hạn tốc độ rồi. Cậu đợi một chút rồi gửi lại, hoặc thử sau nhé.";
const SOFT_PROVIDER =
  "Provider model đang lỗi hoặc từ chối request. Cậu thử lại sau, hoặc mở chìa khóa kiểm tra key / Advanced rồi Save lại nhé.";

function isAppAuthFailure(code: string, raw: string): boolean {
  return (
    code === "UNAUTHORIZED" ||
    code === "FORBIDDEN" ||
    /^unauthorized\.?$/iu.test(raw) ||
    /^forbidden\.?$/iu.test(raw)
  );
}

function isInfraHardFailure(code: string, lower: string): boolean {
  return (
    code === "ABORTED" ||
    code === "AGENT_TIMEOUT" ||
    code === "VALIDATION" ||
    /timed out|timeout|cancelled|canceled|unreachable|dsh_chat_bridge/iu.test(
      lower
    )
  );
}

function matchProviderSoftReply(code: string, lower: string): string | null {
  // Prefer explicit codes / phrases — not bare "unauthorized" / "401" / "api key".
  if (
    code === "INVALID_API_KEY" ||
    /invalid.?api.?key|incorrect api key/iu.test(lower) ||
    /api key (?:invalid|expired|incorrect|revoked)/iu.test(lower)
  ) {
    return SOFT_INVALID_KEY;
  }

  if (
    code === "NO_CREDIT" ||
    /credit|quota|billing|insufficient|payment|out of credit|\b402\b/iu.test(
      lower
    )
  ) {
    return SOFT_NO_CREDIT;
  }

  if (
    code === "MODEL_NOT_FOUND" ||
    /model_not_found|model not found|does not exist|invalid model|no such model/iu.test(
      lower
    )
  ) {
    return SOFT_MODEL_MISSING;
  }

  if (
    code === "RATE_LIMITED" ||
    /rate.?limit|too many requests|\b429\b/iu.test(lower)
  ) {
    return SOFT_RATE_LIMIT;
  }

  const providerish =
    /provider|openai|openrouter|gemini|vilao|llm|completion|\b502\b|\b503\b/iu.test(
      lower
    );
  if (
    providerish &&
    (code === "PROVIDER_ERROR" ||
      code === "PROVIDER_REJECTED" ||
      code === "AGENT_UNAVAILABLE")
  ) {
    return SOFT_PROVIDER;
  }

  return null;
}

export function doroSoftReplyForChatFailure(input: {
  error: string;
  code?: string;
}): string | null {
  const code = input.code?.trim() ?? "";
  const raw = input.error.trim();
  const lower = raw.toLowerCase();

  if (isAppAuthFailure(code, raw) || isInfraHardFailure(code, lower)) {
    return null;
  }

  return matchProviderSoftReply(code, lower);
}
