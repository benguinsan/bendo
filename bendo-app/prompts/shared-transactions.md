# Shared Postgres transactions

supabase-js talks to PostgREST over HTTP. Each `.from().insert()` / `.update()` is its **own** transaction. There is no `db.transaction()` on that client.

Bendo therefore wraps **mutation + activity log** in one Postgres function (RPC). One `.rpc()` call = one transaction: both writes commit, or both roll back.

Validation (Zod), Clerk `userId`, and owned-category checks stay in TypeScript **before** the RPC. They are not inside the transaction.

## Same transaction (each row is one RPC)

| Service | RPC | Writes in the same transaction |
| --- | --- | --- |
| `createTask` | `create_task_with_activity` | `INSERT tasks` + `INSERT task_activities` (`task_created`) |
| `updateTask` | `update_task_with_activity` | `UPDATE tasks` + `INSERT task_activities` (`task_updated` / `task_completed` / `task_reopened`) |
| `deleteTask` | `delete_task_with_activity` | `UPDATE tasks.deleted_at` + `INSERT task_activities` (`task_deleted`) |
| `createCategory` | `create_category_with_activity` | `INSERT categories` + `INSERT task_activities` (`category_created`) |
| `updateCategory` | `update_category_with_activity` | `UPDATE categories` + `INSERT task_activities` (`category_updated`) |
| `deleteCategory` | `delete_category_with_activity` | `DELETE categories` + `INSERT task_activities` (`category_deleted`) |

Helper `insert_success_activity` only runs **inside** those functions (`PERFORM`). It is not a second HTTP call.

Triggers that fire on the table write (`tasks_before_write`, `categories_set_updated_at`, unique indexes, checks) also run **in that same transaction**. If the 5-per-date cap or `SCHEDULE_IN_PAST` raises, the activity insert never commits.

## Not the same transaction

- `listTasks` / `getTask` / `listCategories` — reads only.
- `getOwnedCategory` before create/update task — separate SELECT.
- `getLiveTaskRow` before `updateTask` — separate SELECT (used to build the patch).
- Notifications (`createNotification`, mark read) — their own REST writes; not bundled with tasks.
- Two different RPCs (e.g. create task then create category) — two transactions.

## How to apply

RPCs live in `supabase/schema.sql`. Paste/run that file in the SQL Editor (idempotent; does not `DROP TABLE`). `EXECUTE` is granted to `service_role` only.
