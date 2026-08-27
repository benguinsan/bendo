import { requireApiUser } from "@/lib/api/require-api-user";
import {
  fromServiceResult,
  jsonError,
  readJsonBody,
  unauthorized,
} from "@/lib/api/respond";
import {
  createCategory,
  listCategories,
} from "@/lib/task-categories/category-service";

export async function GET() {
  const authResult = await requireApiUser();
  if (!authResult.ok) {
    return unauthorized();
  }

  return fromServiceResult(await listCategories(authResult.userId));
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
    await createCategory(authResult.userId, body.body),
    true
  );
}
