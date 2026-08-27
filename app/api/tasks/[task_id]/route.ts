import { requireApiUser } from "@/lib/api/require-api-user";
import {
  fromServiceResult,
  jsonError,
  readJsonBody,
  unauthorized,
} from "@/lib/api/respond";
import { deleteTask, getTask, updateTask } from "@/lib/tasks/task-service";

type TaskRouteContext = {
  params: Promise<{ task_id: string }>;
};

export async function GET(_request: Request, context: TaskRouteContext) {
  const authResult = await requireApiUser();
  if (!authResult.ok) {
    return unauthorized();
  }

  const { task_id: taskId } = await context.params;
  return fromServiceResult(await getTask(authResult.userId, taskId));
}

export async function PATCH(request: Request, context: TaskRouteContext) {
  const authResult = await requireApiUser();
  if (!authResult.ok) {
    return unauthorized();
  }

  const body = await readJsonBody(request);
  if (!body.ok) {
    return jsonError(400, "Invalid JSON body", "VALIDATION");
  }

  const { task_id: taskId } = await context.params;
  return fromServiceResult(
    await updateTask(authResult.userId, taskId, body.body)
  );
}

export async function DELETE(_request: Request, context: TaskRouteContext) {
  const authResult = await requireApiUser();
  if (!authResult.ok) {
    return unauthorized();
  }

  const { task_id: taskId } = await context.params;
  return fromServiceResult(await deleteTask(authResult.userId, taskId));
}
