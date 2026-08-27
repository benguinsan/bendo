import "server-only";
import type { Json } from "@/lib/supabase/database.types";
import { fail, ok, type ServiceResult } from "@/lib/supabase/errors";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export type ActivityAction =
  | "task_created"
  | "task_updated"
  | "task_completed"
  | "task_reopened"
  | "task_deleted"
  | "category_created"
  | "category_updated"
  | "category_deleted";

export type ActivityEntityType = "task" | "category";

export async function recordActivity(input: {
  userId: string;
  actorUserId: string;
  action: ActivityAction;
  entityType: ActivityEntityType;
  entityId: string;
  metadata?: Json;
}): Promise<ServiceResult<{ id: string }>> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("task_activities")
    .insert({
      clerk_user_id: input.userId,
      actor_clerk_user_id: input.actorUserId,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId,
      result: "success",
      metadata: input.metadata ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    return fail("INTERNAL", "Could not record activity.");
  }

  return ok(data);
}
