/**
 * Desktop → Vercel cloud cutover helpers (server-only).
 */
export {
  getCloudApiOrigin,
  hasClerkSecret,
  hasSupabaseServiceRole,
  isCloudClerkMode,
  isCloudSupabaseMode,
} from "@/lib/api/cloud/mode";
export {
  fetchCloudMe,
  resolveAuthedUserId,
  resolveCurrentUserForApp,
  resolveSessionTokenForCloud,
} from "@/lib/api/cloud/auth";
export {
  type MeUser,
  parseMeSuccessBody,
  toMeUser,
} from "@/lib/api/cloud/me-user";
export { getForwardableSessionToken } from "@/lib/api/cloud/session-token";
export {
  fetchCloudApi,
  maybeProxyPrivilegedRequest,
} from "@/lib/api/cloud/privilege";
export {
  cloudDeleteDiscordIdentity,
  cloudGetDiscordIdentity,
  cloudGetTask,
  cloudListCategories,
  cloudListTasks,
  cloudUpsertDiscordIdentity,
} from "@/lib/api/cloud/privilege-loaders";
