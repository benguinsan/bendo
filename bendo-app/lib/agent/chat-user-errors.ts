/**
 * Map Agent chat failures to short English, actionable copy for non-tech users.
 */

export type ChatUserErrorContext = {
  bridgeConfigured: boolean;
  bridgeReachable: boolean | null;
  modelConfigured: boolean;
  /** Status API/request failed — not a confirmed offline bridge. */
  statusCheckError?: string | null;
};

const FALLBACK =
  "Couldn’t send the message. Check the Agent connection and try again.";

export function mapChatErrorForUser(
  input: {
    error: string;
    code?: string;
  },
  context: ChatUserErrorContext
): string {
  const code = input.code?.trim();
  const raw = input.error.trim();

  if (code === "ABORTED") {
    return "Message send cancelled.";
  }

  if (code === "AGENT_TIMEOUT") {
    return "Agent took too long to reply. Try sending again in a few seconds.";
  }

  if (code === "VALIDATION") {
    return "That message isn’t valid. Check the text and send again.";
  }

  if (context.statusCheckError) {
    return "Couldn’t check Agent status. Tap Check again, or restart Bendo.";
  }

  if (!context.modelConfigured) {
    return "Model config isn’t saved yet. Open the key icon → Test (optional) → Save, then chat.";
  }

  if (!context.bridgeConfigured) {
    return "Agent isn’t set up on this machine. Reopen Bendo Desktop or ask whoever installed it for help.";
  }

  if (context.bridgeReachable === false) {
    return "Agent is offline. Wait a few seconds and tap “Check again”, or restart Bendo.";
  }

  if (code === "AGENT_UNAVAILABLE") {
    if (/offline|DSH_CHAT_BRIDGE/iu.test(raw)) {
      return "Agent is offline. Wait until it’s ready or restart Bendo.";
    }
    if (/unreachable|timed out|timeout/iu.test(raw)) {
      return "Couldn’t reach the Agent. Tap “Check again” or restart the app.";
    }
    if (/cancelled/iu.test(raw)) {
      return "Message send cancelled.";
    }
    return "Agent isn’t responding right now. Try again later or check model config (key icon).";
  }

  if (/timed out|timeout/iu.test(raw)) {
    return "Agent took too long to reply. Try sending again in a few seconds.";
  }

  if (/cancelled|canceled/iu.test(raw)) {
    return "Message send cancelled.";
  }

  if (/incomplete|failed \(\d+\)|failed:/iu.test(raw)) {
    return FALLBACK;
  }

  // Prefer not to surface raw English bridge strings when they look technical.
  if (
    /[A-Za-z]{4,}/u.test(raw) &&
    !/[àáạảãâăèéẹẻẽêìíịỉĩòóọỏõôơùúụủũưỳýỵỷỹđ]/iu.test(raw)
  ) {
    return FALLBACK;
  }

  return raw || FALLBACK;
}

export function readinessBlockReason(
  context: ChatUserErrorContext
): string | null {
  if (context.statusCheckError) {
    return "Couldn’t check Agent status. Tap Check again.";
  }
  if (!context.modelConfigured) {
    return "Save model configuration before chatting.";
  }
  if (!context.bridgeConfigured) {
    return "Agent isn’t ready on this machine.";
  }
  if (context.bridgeReachable === false) {
    return "Agent is offline.";
  }
  return null;
}
