import "server-only";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";

import { getAgentRuntime } from "@/lib/agent/agent-runtime";
import { AGENT_CHAT_MESSAGE_MAX } from "@/lib/agent/types";
import { requireApiUser } from "@/lib/api/require-api-user";
import {
  fromServiceResult,
  jsonError,
  readJsonBody,
  unauthorized,
} from "@/lib/api/respond";
import { fromZodError } from "@/lib/supabase/errors";

const chatTurnBodySchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Message is required.")
    .max(
      AGENT_CHAT_MESSAGE_MAX,
      `Message must be at most ${AGENT_CHAT_MESSAGE_MAX} characters.`
    ),
  sessionId: z.string().trim().min(1).max(200).optional(),
});

export async function POST(request: Request) {
  const authResult = await requireApiUser();
  if (!authResult.ok) {
    return unauthorized();
  }

  const body = await readJsonBody(request);
  if (!body.ok) {
    return jsonError(400, "Invalid JSON body", "VALIDATION");
  }

  const parsed = chatTurnBodySchema.safeParse(body.body);
  if (!parsed.success) {
    const result = fromZodError(parsed.error);
    return fromServiceResult(result);
  }

  const { getToken } = await auth();
  const clerkToken = (await getToken()) ?? "";

  const runtime = getAgentRuntime();
  const result = await runtime.sendTurn({
    userId: authResult.userId,
    message: parsed.data.message,
    sessionId: parsed.data.sessionId,
    clerkToken,
  });

  return fromServiceResult(result);
}
