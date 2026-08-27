import "server-only";
import type { ServiceErrorCode, ServiceResult } from "@/lib/supabase/errors";

const statusByCode: Record<ServiceErrorCode, number> = {
  VALIDATION: 400,
  SCHEDULE_IN_PAST: 400,
  TASKS_PER_DATE_MAX: 409,
  DUPLICATE_TASK: 409,
  DUPLICATE_CATEGORY: 409,
  TASK_NOT_FOUND: 404,
  CATEGORY_NOT_FOUND: 404,
  NOTIFICATION_NOT_FOUND: 404,
  INTERNAL: 500,
};

export function jsonError(
  status: number,
  error: string,
  code?: ServiceErrorCode
) {
  return Response.json(code ? { error, code } : { error }, { status });
}

export function unauthorized() {
  return jsonError(401, "Unauthorized");
}

export function fromServiceResult<T>(
  result: ServiceResult<T>,
  created = false
) {
  if (!result.ok) {
    return jsonError(
      statusByCode[result.code] ?? 500,
      result.message,
      result.code
    );
  }

  return Response.json({ data: result.data }, { status: created ? 201 : 200 });
}

export async function readJsonBody(
  request: Request
): Promise<{ ok: true; body: unknown } | { ok: false }> {
  try {
    return { ok: true, body: await request.json() };
  } catch {
    return { ok: false };
  }
}
