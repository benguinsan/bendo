import { requireApiUser } from "@/lib/api/require-api-user";
import {
  fromServiceResult,
  jsonError,
  readJsonBody,
  unauthorized,
} from "@/lib/api/respond";
import { createTask, listTasks } from "@/lib/tasks/task-service";

export async function GET() {
  const authResult = await requireApiUser();
  if (!authResult.ok) {
    return unauthorized();
  }

  return fromServiceResult(await listTasks(authResult.userId));
}

export async function POST(request: Request) {
  const authResult = await requireApiUser();
  if (!authResult.ok) {
    return unauthorized();
  }

  const body = await readJsonBody(request);
  if (!body.ok) {
    return jsonError(400, "Invalid JSON body", "VALIDATION");
  }

  return fromServiceResult(
    await createTask(authResult.userId, body.body),
    true
  );
}
