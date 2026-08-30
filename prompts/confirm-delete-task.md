# Confirm Delete Task

## Goal

Add a **confirm dialog** before soft-deleting a task. Every Delete entry point (Dashboard card `⋯`, My Task / Vital card `⋯` + detail trash, View Task trash) must open a confirmation overlay; only **Confirm/Delete** calls `deleteTaskViaApi`. Cancel / Escape / Go Back close without deleting.

Do **not** change the soft-delete API, schema, Mark Vital, category delete, or add toast libraries.

## Skills read

- `AGENTS.md` (no overbuild, Ultracite checks)
- `.claude/skills/shadcn/SKILL.md` — install `alert-dialog` from project registry (`base-nova`)
- Existing delete wiring in `prompts/delete-task.md` (already implemented)

## Existing code inspected

- Delete is live via `deleteTaskViaApi`; parents call API immediately on click
- No `AlertDialog` installed; no `window.confirm` usage
- Dialog patterns already exist (`TaskFormDialog`, `TaxonomyLabelDialog`) with coral primary buttons
- Category delete remains **without** confirm (out of scope unless asked)

## Decisions or assumptions

1. Install shadcn **`alert-dialog`** (`npx shadcn@latest add alert-dialog`). Do not hand-roll a modal or use `window.confirm`.
2. Prefer one shared helper/component, e.g. `ConfirmDeleteTaskDialog`, controlled by `open` + `taskTitle` (optional display) + `onConfirm` + `onOpenChange` + `isDeleting`.
3. Flow: user clicks Delete → set `pendingDeleteTaskId` (or open dialog with task id) → dialog shows → Confirm runs existing `handleDeleteTask` → on success close dialog; on failure keep dialog open **or** close and show existing page `deleteError` (prefer: close dialog and keep page-level error alert to avoid double UI).
4. Copy (English, match product tone):
   - Title: **Delete task?**
   - Description: brief warning that the task will be removed (soft-delete; no need to mention `deleted_at`).
   - Actions: **Cancel** (outline/secondary or default coral pair matching other dialogs) + **Delete** (destructive if AlertDialog supports it; otherwise coral default labeled Delete).
5. Disable Confirm while `deletingTaskId` matches the pending id; disable Cancel or keep Cancel available during delete — prefer Cancel still closes only if not deleting; Confirm disabled while deleting.
6. Wire all parents that currently call delete on click to open confirm instead: Dashboard, My Task, Vital Task, View Task.
7. Do **not** add confirm to category delete in this pass.

## Files likely to change

- `components/ui/alert-dialog.tsx` — new via shadcn
- `components/tasks/confirm-delete-task-dialog.tsx` — new shared dialog
- `components/dashboard/dashboard-view.tsx`
- `components/my-task/my-task-view.tsx`
- `components/vital-task/vital-task-view.tsx`
- `components/my-task/view-task-view.tsx`
- Possibly `task-card` / detail panels stay as `onDelete` openers (no API call inside card)

## Implementation requirements

1. Add AlertDialog via shadcn CLI into this project.
2. Shared confirm dialog component using semantic tokens only.
3. Parents: click Delete → open dialog with that task id; Confirm → existing delete handler; success closes dialog; failure shows existing `deleteError`.
4. Preserve concurrent-delete guard (`deletingTaskId`).
5. View Task: after successful confirm+delete, still `router.push("/my-task")`.

## Security requirements

- Confirm is client UX only; authorization remains on `DELETE /api/tasks/:id`.
- No new secrets or client Supabase service role.

## Acceptance criteria

- [ ] Delete never calls the API until the user confirms in the dialog.
- [ ] Cancel / Escape / overlay dismiss closes without deleting.
- [ ] All prior delete entry points use the confirm dialog.
- [ ] Successful delete behavior unchanged after confirm (list update / redirect).
- [ ] Failed delete still surfaces an error; UI not stuck deleting.
- [ ] Category delete unchanged (still immediate).

## Checks to run

- `npm run typecheck`
- `npm run lint`
- `npm run build`

## Exact manual test steps expected after implementation

1. Dashboard: `⋯` → Delete → dialog appears → Cancel → task remains.
2. Same → Confirm → task soft-deleted and gone after refresh.
3. My Task / Vital: card and detail trash both require confirm.
4. View Task: Confirm → redirects to `/my-task`; Cancel stays on page.
5. While deleting, Confirm is disabled / shows busy state; no double submit.
