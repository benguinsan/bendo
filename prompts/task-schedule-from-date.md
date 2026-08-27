# Derive scheduledAt from calendar date (option A)

## Goal

Stop accepting client `scheduledAt` on task create/update. Persist `scheduled_at` only by deriving it from the validated calendar `date` (same local-noon / today-already-past-noon rules as the mock helper). Reject non-existent calendar dates (not just `YYYY-MM-DD` shape). Keep `scheduled_date` and `scheduled_at` aligned so the 5-per-date cap and overdue/past-schedule rules cannot diverge.

## Skills read

- `AGENTS.md` — task storage rules: persist date/time with timezone; 5 non-deleted tasks per calendar date; incomplete tasks must not use a past scheduled time; Zod at the server boundary
- `.claude/skills/supabase/SKILL.md` — not changing SQL; `scheduled_date` remains the user-intended local day, `scheduled_at` remains timestamptz
- No Clerk / AI SDK changes

## Existing code inspected

- `lib/tasks/task-input.ts` — `createTaskApiSchema` / `updateTaskApiSchema` / `taskFormSchema` accept `date` via regex only; both API schemas allow optional `scheduledAt: z.string()`
- `lib/tasks/task-service.ts` — `createTask` uses `body.scheduledAt ?? scheduledAtFromDateInput(body.date)`; `buildTaskUpdateFields` prefers `patch.scheduledAt` and can write a new timestamp while leaving `scheduled_date` unchanged
- `lib/tasks/create-mock-task.ts` — `scheduledAtFromDateInput` (local noon, or later-today if noon is past); mock update only re-derives when the local date key changes
- `app/api/tasks/route.ts` / `app/api/tasks/[task_id]/route.ts` — pass JSON body through; no extra schedule logic
- `supabase/schema.sql` — `scheduled_at timestamptz` and `scheduled_date date` are separate columns; cap uses `scheduled_date`; past-schedule trigger uses `scheduled_at`

## Decisions or assumptions

1. **Option A.** Remove `scheduledAt` from create and update API schemas. Extra JSON keys are stripped by Zod (do not add `.strict()`).
2. **Create** always sets `scheduled_at` via `scheduledAtFromDateInput(date, now)` and `scheduled_date` to that same `date`.
3. **Update** writes schedule columns when `patch.date` is present: always set `scheduled_date` to that date and `scheduled_at` via `scheduledAtFromDateInput`. Same calendar day still re-derives the instant. Omitted `date` leaves both columns untouched (title-only PATCH without `date`).
4. **Strict calendar date.** Shared schema: `YYYY-MM-DD` **and** the civil date must exist in local time (reject `2026-02-31`). Reuse it on create, update (optional), and `taskFormSchema`.
5. Do not move `scheduledAtFromDateInput` in this pass. Do not change DB schema, mock DTO `scheduledAt`, or add a time picker.
6. Responses may still include `scheduledAt` (persisted instant). That is output, not input.

## Files likely to change

- `lib/tasks/task-input.ts`
- `lib/tasks/task-service.ts`

## Implementation requirements

- Add `isValidCalendarDate` + a reusable `calendarDateSchema` (or equivalent) used by create, update, and the client form schema.
- Delete `scheduledAt` from `createTaskApiSchema` and `updateTaskApiSchema`.
- `createTask`: derive only; never read `body.scheduledAt`.
- `buildTaskUpdateFields`: never read `patch.scheduledAt`; never update `scheduled_at` without updating `scheduled_date` to the matching local day.

## Security requirements

- Validate `date` at the Zod server boundary. Do not trust client timestamps.
- Keep all writes scoped to the authenticated Clerk user (unchanged).
- Do not expose the service role key.

## Acceptance criteria

- `POST /api/tasks` with only `date` (plus required fields) stores `scheduled_date = date` and `scheduled_at` from `scheduledAtFromDateInput`.
- `POST`/`PATCH` with `scheduledAt` in the body does not persist that timestamp; create ignores it; a PATCH that is only `{ scheduledAt }` fails “at least one field is required”.
- `2026-02-31` (and similar impossible dates) is a validation error on form and API.
- `PATCH` with a new `date` updates both columns together.
- `PATCH` with the same `date` still re-derives `scheduled_at` via `scheduledAtFromDateInput`.
- Title-only PATCH (no `date`) does not rewrite schedule columns.

## Checks to run

- `npm run typecheck`
- `npm run lint`

## Exact manual test steps expected after implementation

1. `POST /api/tasks` with a valid future `date`, no `scheduledAt` — 201; `scheduledDate` matches `date`; `scheduledAt` is local noon (or later today if noon is past).
2. Same create with extra `scheduledAt` pointing at another day — still 201; stored day/time follow `date`, not the extra field.
3. `POST` with `date: "2026-02-31"` — 400 validation.
4. `PATCH` only `{ "scheduledAt": "<iso>" }` — 400 at least one field required.
5. `PATCH` `{ "date": "<different valid day>" }` — both `scheduledDate` and `scheduledAt` move to that day.
6. `PATCH` `{ "title": "x" }` — schedule fields unchanged.
