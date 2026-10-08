import "server-only";
import { z } from "zod";

import { getAgentRuntime } from "@/lib/agent/agent-runtime";
import {
  isAllowedModelEndpoint,
  MODEL_API_PROVIDERS,
} from "@/lib/agent/model-api-key";
import { requireApiUser } from "@/lib/api/require-api-user";
import {
  fromServiceResult,
  jsonError,
  readJsonBody,
  unauthorized,
} from "@/lib/api/respond";
import { fromZodError } from "@/lib/supabase/errors";

const bodySchema = z
  .object({
    provider: z.enum(MODEL_API_PROVIDERS),
    endpoint: z.string().trim().min(1, "API endpoint is required."),
    apiKey: z.string().trim().min(1, "API key is required."),
    model: z.string().trim().min(1, "Model name is required."),
  })
  .superRefine((data, ctx) => {
    if (!isAllowedModelEndpoint(data.provider, data.endpoint)) {
      ctx.addIssue({
        code: "custom",
        path: ["endpoint"],
        message: "Endpoint không được phép.",
      });
    }
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

  const runtime = getAgentRuntime();
  const result = await runtime.applyModelConfig({
    ...parsed.data,
    signal: request.signal,
  });

  return fromServiceResult(result);
}
