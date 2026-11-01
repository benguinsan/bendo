# Bendo-app — task / category / status / calendar / activity

On-demand domain rules for the Next.js app. **Always-on summary:** [`bendo-app/AGENTS.md`](../bendo-app/AGENTS.md) §5.

---

## 1. Task storage

- Each task belongs to one authenticated Clerk user.
- A user may have a maximum of **5** non-deleted incomplete tasks scheduled for the same calendar date. Completed tasks do not count.
- A task must not be duplicated for the same user when normalized content and scheduled time are identical.
- Past schedule check applies only when the scheduled date is set (INSERT) or changed (UPDATE to a different date). Editing other fields, completing, reopening, or deleting never trips it; a reopened overdue task is simply overdue.
- Completed tasks may retain a past scheduled time.
- A task is overdue when scheduled time has passed and status is not completed.
- Overdue is **derived**; do not store it as the primary source of truth.
- Marking completed records completion time and a task activity.
- Reopening clears completion time.
- Server/database enforces these rules; frontend checks are feedback only.

### Task input

- Content required; not empty after trim; defined max lengths for content and optional description.
- Normalize content consistently before duplicate detection.
- Validate with Zod at the server boundary.
- Category IDs must belong to the authenticated user before assignment.
- Persist date/time with timezone information consistently.
- Render user-provided content as escaped plain text unless an approved sanitizer is used.

---

## 2. Category storage

- Each category belongs to exactly one Clerk user.
- Name unique per user, **case-insensitive**; trim before validate/persist; whitespace-only invalid.
- Creating/renaming must not create a duplicate normalized name; DB enforces with user-scoped unique constraint/index.
- Frontend duplicate checks are feedback only.
- Reasonable max length via validation schema.
- Delete **detaches** tasks (`tasks.category_id` → `ON DELETE SET NULL`). Do not block delete solely because tasks still reference the category.
- Mutations create category activity via matching `*_with_activity` RPC.
- All reads/mutations scoped to the authenticated Clerk user.

---

## 3. Task status

### Persisted values

Only:

- `pending` — default for new tasks
- `completed` — finished by the user

Do **not** store `expired` in Supabase or send it as a persisted status.

### Derived display

UI may show `expired` at read/render time:

- `pending` + `scheduled_at < NOW()` → display **expired**
- `pending` + `scheduled_at >= NOW()` → display **pending**
- `completed` → display **completed**

Derive in app/view code (e.g. `getTaskDisplayStatus`). No `expired` column; no auto-update of `tasks.status` when schedule passes.

### Transitions

- New → `pending`
- Complete: `pending` → `completed` (including tasks displayed as expired; stored status was still `pending`)
- Reopen: `completed` → `pending`
- Completed stays `completed` regardless of `scheduled_at`
- No stored `pending` → `expired` transition

### Completion semantics

- `completed` → set `completed_at`
- Reopen → `completed_at = null`
- `completed_at` is source of truth for completion time

---

## 4. Calendar

- Show tasks by calendar day of schedule (day view). Prefer local date of `scheduled_at` (or persisted `scheduled_date` when used consistently).
- Only incomplete (`pending`) tasks; do not show completed.
- Selecting a day shows details for that date.

---

## 5. Task activity

- Append-only write path shipped; **no** history UI or GET activity routes yet.
- Services use matching `*_with_activity` RPC (mutation + activity in one transaction). Do not insert activity in a second PostgREST call.
- No general-purpose PATCH/DELETE for activities.
- Add read routes/UI only when a feature requires them.
- Every activity query scoped to the authenticated Clerk user.
- Records include actor, action, operation result, timestamp.
- Shared transaction pattern: see the `*_with_activity` functions in `bendo-app/supabase/schema.sql`.
