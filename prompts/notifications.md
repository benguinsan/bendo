# Notifications panel UI

## Goal

Wire the header **bell** to a **notifications popover** matching `prompts-img/Notifications.png`: white header with “Notifications” + coral undo/close, a date-group label (“Today”), and a light-gray list of incomplete-task reminders (title + compact relative time, priority line, square thumbnail).

Use **real incomplete tasks** as the feed (title, priority, thumbnail, timestamps). Do **not** add a `/notifications` route, schema changes, or auto-insert into `notifications` on task mutations.

## Skills read

- `AGENTS.md` (architecture, task status/priority, security, checks; notifications table already exists)
- `.agents/skills/clerk/SKILL.md` → existing `requireUser()` / `requireApiUser()` (no new auth work)
- `.agents/skills/supabase/SKILL.md` (read-only via existing `GET /api/tasks`; no schema change)
- `.claude/skills/shadcn/SKILL.md` (Popover, Button, Empty, semantic tokens, `cn()`, lucide; Base UI `render` not `asChild`)
- `node_modules/next/dist/docs/` server vs client components (if present for this Next version)
- `prompts/design-system.md` (tokens in `app/globals.css`)
- `prompts/supabase-database.md` (bell UI was out of scope there; `notifications` POST was left unused on purpose)

## Existing code inspected

- `prompts-img/Notifications.png` — visual source of truth
- `components/app-shell/app-header.tsx` — bell `Button` with `aria-label="Notifications"` and no handler
- `components/app-shell/app-shell.tsx` — authenticated chrome; do not rebuild
- `app/(app)/layout.tsx` — `requireUser()` + `AppShell`; do not load all tasks in the layout
- `app/api/tasks/route.ts` — `GET` lists the current user’s tasks
- `lib/tasks/task-api-client.ts` — create/update/delete clients; **no list helper yet**
- `lib/tasks/persisted-task.ts` — `persistedTaskToDashboard`
- `lib/tasks/task-input.ts` — `toLocalDateKey`
- `lib/dashboard/task-types.ts` — `priorityLabels`, `priorityTextClass` (`low` / `moderate` / `extreme`)
- `lib/dashboard/dates.ts` — existing formatters (no compact `2h` helper yet)
- `lib/dashboard/use-now.ts` — live `now` for relative times
- `components/tasks/task-thumbnail.tsx` — reuse for 64×64 thumbs
- `components/ui/dropdown-menu.tsx` — Base UI menu; `w-(--anchor-width)` is too narrow for this panel
- `components/ui/empty.tsx` — empty state
- `lib/notifications/notification-service.ts` + `app/api/notifications/*` — persist/list/mark-read already exist; **do not use them in this pass**
- `components/ui/popover.tsx` — **not installed**

## Decisions or assumptions

1. **Surface is a header popover, not a page.** The PNG is a compact rounded panel. Calendar already owns `/calendar`. The red curved arrow **closes** the popover (`Undo2Icon`, `text-primary`).
2. **Feed = incomplete tasks.** Rows are `status !== 'completed'` tasks, newest `createdAt` first. This matches the mock (title + priority + thumbnail) without empty `notifications` rows and without spamming inserts on every task write.
3. **Do not** create, list, or mark-read `notifications` table rows. Leave existing notification APIs unchanged.
4. **Do not** parse mock-style bold keywords (“UI design”, project names). Render `task.title` as escaped plain text (`font-medium`).
5. **Priority copy** uses existing labels: `Low` / `Moderate` / `Extreme` (not the mock’s “High” / “Extremely High”). Priority value uses `priorityTextClass` (extreme reads coral/red like the PNG).
6. **Date groups** use **scheduled local date** (`toLocalDateKey(new Date(scheduledAt))`):
   - today → `Today`
   - yesterday → `Yesterday`
   - else → `en-GB` day + short month, e.g. `1 Sep`
   Groups render newest date first. A group with no tasks is omitted. If every visible task is today, the panel matches the PNG (single “Today”).
7. **Compact relative time** sits after the title in `text-muted-foreground`, from `createdAt` vs `now`:
   - `< 1 min` → `now`
   - `< 60 min` → `Nm` (e.g. `5m`)
   - `< 24 h` → `Nh` (e.g. `2h`)
   - else → `Nd` (e.g. `3d`)
8. **Click a row** navigates to `/my-task/[taskId]` and closes the popover.
9. **Data loading.** Fetch `GET /api/tasks` when the popover **opens** (not in the app layout). Map through `persistedTaskToDashboard`. Show a short loading state; on failure, a quiet error line in the list area.
10. **Install shadcn Popover** (`npx shadcn@latest add popover`). Do not force this layout into `DropdownMenu` (anchor-width + menuitem semantics).
11. **No unread badge** on the bell. No “mark all read”. No Settings / Agent work.
12. **Thumbnails** reuse `TaskThumbnail` with placeholder fallback already in `persistedTaskToDashboard`.

## Visual interpretation

Reference: `prompts-img/Notifications.png`.

### Layout

```
text
Header bell button
        ▼
┌──────────────────────────────────────────┐
│ Notifications                      ↩     │  white header
│ Today                                    │  muted group label
├──────────────────────────────────────────┤
│ title text…                    2h   [■]  │  muted list bg
│ Priority: Extreme                        │
│                                          │
│ title text…                    2h   [■]  │
│ Priority: Moderate                       │
└──────────────────────────────────────────┘
```

### Panel

- Width: `w-[min(26.25rem,calc(100vw-2rem))]` (~420px). Align `end` under the bell, `sideOffset` ~8.
- Shape: `rounded-2xl` (or `rounded-card` if 2xl is too round), `shadow-lg`, `overflow-hidden`, `p-0`, **no** default popover padding.
- Header: `bg-card` / `bg-popover`, `px-5 pt-4 pb-2`.
- Title: `text-lg font-semibold text-foreground` (`<h2>`). Close control: `Button variant="ghost" size="icon-sm"` with `Undo2Icon` and `text-primary`.
- Group label: `text-sm text-muted-foreground` in the header block under the title (`Today` sits with the header in the PNG). Additional older groups may repeat a label at the top of their section in the list.
- List region: `bg-secondary` (light gray like the PNG), `px-5 py-4`, `flex flex-col gap-5`, `max-h-[min(28rem,70vh)] overflow-y-auto`.
- Row: horizontal `flex items-start gap-3`; text `min-w-0 flex-1`; thumbnail `size-16 shrink-0 rounded-md overflow-hidden relative`.
- Title line: `text-sm text-foreground font-medium` + trailing `text-xs text-muted-foreground` time (same line, time does not wrap away from the end — use `flex` with title `min-w-0` + `truncate` optional; prefer wrap on title, time `shrink-0` aligned to first line).
- Priority line: `text-xs sm:text-sm`; `Priority:` in `text-foreground`; value in `priorityTextClass[task.priority]`.
- Empty: shadcn `Empty` in the list region, title like “No notifications”, description “Incomplete tasks show up here.”
- Semantic colors only (no raw hex). Do not invent purple/glow/pill clusters.

### Typography & spacing

- Panel title ~18px semibold.
- Group label ~14px muted.
- Body ~14px; priority ~12–14px.
- Vertical gap between rows ~20px (`gap-5`).
- Thumbnail 64×64, `rounded-md`.

### Motion

- Rely on default Popover open/close animation.
- No extra decorative motion.

### Responsiveness

- Desktop: anchored to the bell, ~420px.
- Narrow viewports: panel still `min(26.25rem, 100vw - 2rem)` so it does not overflow; list scrolls.

## Files likely to change

| File | Action |
|------|--------|
| `components/ui/popover.tsx` | **New** via shadcn CLI |
| `components/app-shell/notifications-popover.tsx` | **New** — trigger + panel + fetch + list |
| `components/app-shell/app-header.tsx` | Replace inert bell with `NotificationsPopover` |
| `lib/notifications/notification-feed.ts` | **New** — filter, group, compact relative time (client-safe) |
| `lib/notifications/notification-feed.test.ts` | **New** — grouping + relative time |
| `lib/tasks/task-api-client.ts` | Add `listTasksViaApi()` |

Do **not** change Supabase schema, notification REST routes, sidebar, or unrelated pages.

## Implementation requirements

### `lib/notifications/notification-feed.ts`

- `getNotificationTasks(tasks: DashboardTask[]): DashboardTask[]` — `status !== 'completed'`, sort by `createdAt` descending.
- `formatCompactRelativeTime(iso: string, now: Date): string` — `now` / `Nm` / `Nh` / `Nd` as above.
- `formatNotificationGroupLabel(dateKey: string, todayKey: string): string` — Today / Yesterday / `d MMM`.
- `groupNotificationTasks(tasks: DashboardTask[], now: Date): { dateKey: string; label: string; tasks: DashboardTask[] }[]` — group by scheduled local date, groups sorted by `dateKey` descending; tasks inside a group keep createdAt desc.

### `listTasksViaApi`

- `GET /api/tasks`, parse `{ data: PersistedTask[] }`, map `persistedTaskToDashboard`.
- Return `{ ok: true, tasks } | { ok: false, error: string }`. Do not use `any`.

### `components/app-shell/notifications-popover.tsx`

- Client component.
- `Popover` + existing coral `Button size="icon-lg"` bell as trigger (`BellIcon`). Keep `aria-label="Notifications"`; `aria-expanded` comes from the primitive.
- Fetch on **open** (not on every header mount). Cache in component state for the session of that mount; refetch each time it opens so newly created tasks appear.
- Use `useNow()` (or a `now` from `Date` at render) for relative labels.
- Each row is a `Link` to `/my-task/${id}` (plain-text title). Close the popover on navigate (controlled `open` state).
- Close button sets `open` to false.
- Accessible name on the close button: “Close notifications”.
- `PopoverTitle` / required title: visible “Notifications” heading is enough if the primitive needs a Title — follow shadcn popover docs for this Base UI version (add `sr-only` title only if a separate Title is required and would duplicate).

### `app-header.tsx`

- Swap the standalone bell button for `<NotificationsPopover />`. Leave search, calendar link, and date block unchanged.

## Security requirements

- Fetch only authenticated `/api/tasks` (cookies). No client Supabase.
- Render titles as plain text. Do not `dangerouslySetInnerHTML`.
- Do not expose `SUPABASE_SERVICE_ROLE_KEY`.
- User A must never see user B’s tasks (existing GET scoping).

## Acceptance criteria

- [ ] Clicking the header bell opens a panel matching the PNG structure (title, close arrow, group label, gray list, thumbnail rows).
- [ ] Only incomplete tasks appear.
- [ ] Completed tasks never appear.
- [ ] Each row shows title, compact relative time, `Priority: {label}` with design-system priority color, and thumbnail.
- [ ] Clicking a row goes to `/my-task/[taskId]` and closes the panel.
- [ ] Close arrow closes the panel.
- [ ] Empty incomplete-task list shows the Empty state.
- [ ] Opening the panel after creating a task includes the new task.
- [ ] No `/notifications` route. No schema or notification-API changes.
- [ ] Responsive: panel does not overflow the viewport.
- [ ] `npm run typecheck` and `npm run lint` pass.

## Checks to run

```bash
npm run typecheck
npm run lint
npm run build   # header/shell + new client module
```

```bash
npm test -- lib/notifications
```

(If the repo has no `npm test` script, run the existing test command used for `lib/calendar` tests, or skip with a note.)

## Manual test steps

1. Sign in. Confirm the bell still sits in the header next to calendar.
2. Click the bell with **no incomplete tasks** — empty state; close via the coral arrow and by clicking outside.
3. Create 2–3 incomplete tasks (different priorities, with and without images) from Dashboard. Open the bell — they appear with title, relative time, priority color, thumbnail/placeholder.
4. Confirm grouping: a task scheduled today under **Today**; a task scheduled yesterday under **Yesterday** if one exists.
5. Click a row — land on `/my-task/{id}`; popover is closed.
6. Complete that task (edit/status). Reopen the bell — it is gone.
7. Resize to mobile width; open the panel; confirm it stays on-screen and the list scrolls if needed.
8. Confirm calendar, search, and sidebar still work.
