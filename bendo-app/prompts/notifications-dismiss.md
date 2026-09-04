# Dismiss from notifications panel

## Goal

Add a **remove** control on each row in the header notifications popover so the user can dismiss that item from the box without deleting or completing the task.

## Skills read

- `AGENTS.md` (do not overbuild; no schema unless required)
- `prompts/notifications.md` (existing panel; feed = incomplete tasks)

## Existing code inspected

- `components/app-shell/notifications-popover.tsx` — list rows are `Link`s to `/my-task/[id]`
- `lib/notifications/notification-feed.ts` — filter/group helpers (no dismiss yet)

## Decisions or assumptions

1. **Dismiss ≠ delete/complete.** Clicking remove only hides that task id from the notification feed. The task remains in Dashboard / My Task / Calendar.
2. **In-memory dismiss set** on `NotificationsPopover` (survives open/close and client navigations while the shell stays mounted). Cleared on full page reload. No `localStorage`, no `notifications` table writes, no API changes.
3. **UI:** small ghost `Button` with `XIcon` on each row (`aria-label="Remove notification"`). `stopPropagation` / `preventDefault` so it does not navigate. Place it near the relative time (top-right of the text column) or between text and thumbnail — prefer next to the time, not over the thumbnail.
4. Filter dismissed ids **before** `groupNotificationTasks`. When all visible items are dismissed, show the existing Empty state.
5. Do not change schema, notification REST routes, or task APIs.

## Files likely to change

| File | Action |
|------|--------|
| `components/app-shell/notifications-popover.tsx` | Dismiss state + remove button per row |
| `prompts/notifications.md` | Optional note (this file is the execute prompt) |

## Implementation requirements

- `const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => new Set())` (or `string[]` + filter if Set in state is awkward).
- `visibleTasks = tasks.filter((t) => !dismissedIds.has(t.id))` then `groupNotificationTasks(visibleTasks, now)`.
- Remove button: `onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDismissedIds(...) }}`.
- Keep row `Link` behavior for the rest of the row.

## Security requirements

- No new APIs. No client Supabase. Titles remain plain text.

## Acceptance criteria

- [ ] Each notification row has a remove control.
- [ ] Clicking remove hides that row immediately; does not navigate.
- [ ] Task still exists elsewhere in the app.
- [ ] Dismissing the last item shows the empty state.
- [ ] Reopening the popover keeps dismissals until full reload.
- [ ] `npm run typecheck` and `npm run lint` pass.

## Checks to run

```bash
npm run typecheck
npm run lint
```

## Manual test steps

1. Open the bell with 2+ incomplete tasks.
2. Click remove on one row — it disappears; others remain.
3. Confirm the task still appears on Dashboard / My Task.
4. Close and reopen the popover — dismissed item stays gone.
5. Hard refresh — dismissed item can reappear (expected).
6. Dismiss all — empty state shows.
