/**
 * Detect harness soft chat reply when applyModelConfig has not run.
 * Keep in sync with MISSING_MODEL_CONFIG_REPLY in Doro chat-bridge.
 */
export const MISSING_MODEL_CONFIG_SOFT_REPLY =
  "Cậu chưa cấu hình model cho Doro rồi. Mở nút cấu hình model trên Agent, điền rồi Save nhé.";

/** True when a 200 chat reply is the soft “save model first” gate (not a real turn). */
export function isMissingModelConfigSoftReply(body: string): boolean {
  const text = body.trim();
  if (!text) {
    return false;
  }
  if (text === MISSING_MODEL_CONFIG_SOFT_REPLY) {
    return true;
  }
  // Loose match if harness copy drifts slightly.
  return /chưa cấu hình model/iu.test(text);
}
