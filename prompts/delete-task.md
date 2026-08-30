# Delete Task UI wiring

## Goal

Wire **Delete task** end-to-end in the product UI. Backend already exists (`deleteTask` + `DELETE /api/tasks/:task_id` + soft-delete RPC). This pass adds the client API helper and connects every inert Delete control so a successful delete removes the task from local state (and navigates away from View Task).

Do **not** add AlertDialog, toast libraries, Storage, Calendar, Settings, Agent, Mark Vital, or schema changes.

## Skills read

- `AGENTS.md` (architecture layers, API conventions, Ultracite checks, no overbuild)
- Existing category delete pattern: `deleteCategoryViaApi` + `handleDeleteCategory` in `task-categories-view.tsx`
- Existing task error-handling pattern: try/catch on client fetch; no React Compiler `finally` in client components (reset state after try/catch instead)

## Existing code inspected

- `lib/tasks/task-service.ts` — `deleteTask` calls `delete_task_with_activity` (soft delete via `deleted_at`)
- `app/api/tasks/[task_id]/route.ts` — `DELETE` already wired
- `lib/tasks/task-api-client.ts` — create/update only; **no** `deleteTaskViaApi`
- `lib/task-categories/category-api-client.ts` — `deleteCategoryViaApi` is the reference shape: `{ ok: true } | { ok: false; error: string }` + outer try/catch on `fetch`
- `components/dashboard/task-card.tsx` — `⋯` Delete menu item has no `onClick`
- `components/dashboard/todo-column.tsx` — passes `onEditTask` only; no delete prop
- `components/dashboard/dashboard-view.tsx` — task list state; no delete handler
- `components/my-task/my-task-view.tsx` / `vital-task-view.tsx` — list + detail; Delete buttons inert
- `components/my-task/task-detail-panel.tsx` / `vital-task-detail-panel.tsx` — trash icon, no `onDelete`
- `components/my-task/view-task-view.tsx` — trash icon inert; after delete should `router.push("/my-task")`
- `supabase/schema.sql` — soft delete; list queries already filter `deleted_at is null`

## Decisions or assumptions

1. **No confirm dialog.** Match category delete: click Delete → call API immediately. Do not install AlertDialog.
2. **Client helper** `deleteTaskViaApi(taskId)` mirrors `deleteCategoryViaApi` (catch rejected fetch; return `{ ok: true } | { ok: false; error: string }`).
3. **Optimistic UI is not required.** Wait for API success, then remove from React state (same as categories).
4. **Error feedback:** show a short `role="alert"` message near the page/view (same style as category `deleteError`). Do not use Sonner.
5. **Deleting state:** track `deletingTaskId` to disable concurrent deletes; always clear after the request (no `finally` — React Compiler).
6. **Selection after delete (My Task / Vital):** if the deleted task was selected, select the next remaining task (first remaining) or `null` if empty.
7. **View Task page:** on success, `router.push("/my-task")`. On failure, show error text; stay on page.
8. **Dashboard completed list:** deleting from To-Do card removes open tasks; completed panel has no Delete control in this pass (leave as-is unless TaskCard is also used there — it is not).
9. **Do not change** `deleteTask` service, schema, or route handler unless a bug blocks wiring.
10. **Mark Vital** remains inert.

## Files likely to change

- `lib/tasks/task-api-client.ts` — add `deleteTaskViaApi`
- `components/dashboard/task-card.tsx` — `onDelete?: () => void`; wire Delete menu item
- `components/dashboard/todo-column.tsx` — pass `onDeleteTask`
- `components/dashboard/dashboard-view.tsx` — delete handler + error UI
- `components/my-task/task-detail-panel.tsx` — `onDelete?: () => void`
- `components/my-task/my-task-view.tsx` — delete from card + detail panel
- `components/vital-task/vital-task-detail-panel.tsx` — `onDelete?: () => void`
- `components/vital-task/vital-task-view.tsx` — same as My Task
- `components/my-task/view-task-view.tsx` — delete + redirect

## Implementation requirements

1. Add `deleteTaskViaApi` to `task-api-client.ts`:
   - `DELETE /api/tasks/${taskId}`
   - Outer try/catch for network failure
   - Parse JSON error body when `!response.ok`
2. Extend `TaskCard` with optional `onDelete`; call it from the destructive Delete item. Guard so Delete is disabled while that task is deleting if parent passes a busy flag **or** parent simply ignores concurrent clicks via `deletingTaskId`.
3. Wire parents:
   - Dashboard To-Do → remove task from `tasks`
   - My Task / Vital → remove from `tasks`, fix `selectedId` / `editingTaskId` if needed
   - Detail panel trash buttons → same handler as card Delete
   - View Task trash → delete then navigate to `/my-task`
4. Surface delete errors with a small alert text; clear error on next successful attempt or new delete start.
5. Preserve existing Edit / View / Add flows unchanged.

## Security requirements

- Delete only via authenticated API (Clerk cookie session already used by `fetch`).
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client.
- Soft-deleted tasks must not reappear on refresh (already enforced by server `deleted_at is null`).

## Acceptance criteria

- [ ] Clicking Delete on a Dashboard To-Do card soft-deletes the task; it disappears from To-Do (and Completed if it was completed — N/A for To-Do-only control) and does not return after refresh.
- [ ] My Task: Delete from card `⋯` or detail trash removes the task; selection updates sensibly; error message on failure.
- [ ] Vital Task: same behavior for extreme-priority list.
- [ ] View Task: Delete removes task and navigates to `/my-task`.
- [ ] Failed delete does not remove local state; shows an error string.
- [ ] Concurrent delete while one is in flight is ignored or blocked.
- [ ] No schema/migration changes; no AlertDialog package.

## Checks to run

- `npm run typecheck`
- `npm run lint`
- `npm run build` (routes/client modules touched)

## Exact manual test steps expected after implementation

1. `npm run dev`, sign in, ensure at least 2 tasks exist (create via Add Task if needed).
2. **Dashboard:** open `⋯` → Delete on an open task → card disappears; refresh → still gone.
3. **My Task:** select a task → click trash on detail → task leaves list; another task auto-selected if any remain.
4. **My Task:** Delete via card `⋯` → same result.
5. **Vital Task:** Delete an extreme task from list or detail → list updates.
6. **View Task** (`/my-task/[id]`): Delete → land on `/my-task`; task no longer listed.
7. Simulate failure (optional: temporary API offline) → Delete shows error, list unchanged, UI not stuck deleting.
