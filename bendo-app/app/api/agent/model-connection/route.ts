import "server-only";
import { z } from "zod";

import {
  isAbsoluteHttpUrl,
  MODEL_API_PROVIDERS,
} from "@/lib/agent/model-api-key";
import { probeModelConnection } from "@/lib/agent/model-connection";
import { requireApiUser } from "@/lib/api/require-api-user";
import {
  fromServiceResult,
  jsonError,
  readJsonBody,
  unauthorized,
} from "@/lib/api/respond";
import { fromZodError, ok } from "@/lib/supabase/errors";

const bodySchema = z.object({
  provider: z.enum(MODEL_API_PROVIDERS),
  endpoint: z
    .string()
    .trim()
    .min(1, "API endpoint is required.")
    .refine(isAbsoluteHttpUrl, "API endpoint must be an http(s) URL."),
  apiKey: z.string().trim().min(1, "API key is required."),
  model: z.string().trim().min(1, "Model name is required."),
});

export async function POST(request: Request) {
  const authResult = await requireApiUser(request);
  if (!authResult.ok) {
    return unauthorized();
  }

  const body = await readJsonBody(request);
  if (!body.ok) {
    return jsonError(400, "Invalid JSON body", "VALIDATION");
  }

  const parsed = bodySchema.safeParse(body.body);
  if (!parsed.success) {
    return fromServiceResult(fromZodError(parsed.error));
  }

  const result = await probeModelConnection(parsed.data);
  return fromServiceResult(ok(result));
}
