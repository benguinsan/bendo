/**
 * Map provider/model chat failures to Doro-voice VN bubbles (not dry alerts).
 * Keep phrasing aligned with soft replies in Doro chat-bridge.
 */

export function doroSoftReplyForChatFailure(input: {
  error: string;
  code?: string;
}): string | null {
  const code = input.code?.trim() ?? "";
  const raw = input.error.trim();
  const lower = raw.toLowerCase();

  // Infrastructure / user-cancel — keep hard UI errors.
  if (
    code === "ABORTED" ||
    code === "AGENT_TIMEOUT" ||
    code === "VALIDATION" ||
    /timed out|timeout|cancelled|canceled|unreachable|dsh_chat_bridge/iu.test(
      lower
    )
  ) {
    return null;
  }

  if (
    /invalid.?api.?key|incorrect api key|authentication|unauthorized|401|api key/iu.test(
      lower
    )
  ) {
    return "API key hình như chưa đúng hoặc hết hạn rồi. Cậu mở chìa khóa, dán key mới rồi Save lại giúp mình nhé.";
  }

  if (
    /credit|quota|billing|insufficient|payment|402|out of credit/iu.test(lower)
  ) {
    return "Tài khoản model hết credit hoặc chưa thanh toán rồi. Cậu kiểm tra bên provider, nạp thêm rồi Save lại key giúp mình nhé.";
  }

  if (
    /model_not_found|model not found|does not exist|invalid model|no such model|404/iu.test(
      lower
    )
  ) {
    return "Model id hình như không tồn tại hoặc không dùng được với key này. Cậu mở Advanced, sửa tên model (hoặc để mặc định) rồi Save lại nhé.";
  }

  if (/rate.?limit|too many requests|429/iu.test(lower)) {
    return "Provider đang giới hạn tốc độ rồi. Cậu đợi một chút rồi gửi lại, hoặc thử sau nhé.";
  }

  if (
    /provider|502|503|openai|openrouter|gemini|vilao|llm|completion/iu.test(
      lower
    ) &&
    code === "AGENT_UNAVAILABLE"
  ) {
    return "Provider model đang lỗi hoặc từ chối request. Cậu thử lại sau, hoặc mở chìa khóa kiểm tra key / Advanced rồi Save lại nhé.";
  }

  return null;
}
