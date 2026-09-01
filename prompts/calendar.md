# Calendar page UI

## Goal

Replace the title-only stub at `/calendar` with a **monthly calendar view** matching `prompts-img/Calendar-1275.png`: a white card with month header + prev/next navigation, a 7-column Sun–Sat grid, date numbers in the top-right of each cell, pastel task pills grouped by scheduled date, a black circle for **today**, and a **selected-day task detail** section below the grid.

Wire the calendar to **real user tasks** from Supabase via existing `loadUserTasks`. Follow AGENTS.md calendar rules: show only **incomplete** (`status = 'pending'`) tasks, grouped by `scheduled_date` (derived from `scheduledAt` using `toLocalDateKey`), and reveal full task details when a day is selected.

Do **not** add new API routes, schema changes, or Agent/Settings features.

## Skills read

- `AGENTS.md` (calendar rules §13, task status rules, architecture, checks)
- `.agents/skills/clerk/SKILL.md` → existing `requireUser()` pattern (no new auth work)
- `.agents/skills/supabase/SKILL.md` (read-only via existing `loadUserTasks`; no schema change)
- `.claude/skills/shadcn/SKILL.md` (Card, Button, Empty, semantic tokens, `cn()`, lucide icons)
- `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`
- `prompts/design-system.md` (tokens in `app/globals.css`)

## Existing code inspected

- `app/(app)/calendar/page.tsx` — `StubPage` titled “Calendar” (replace)
- `app/(app)/page.tsx`, `app/(app)/my-task/page.tsx`, `app/(app)/vital-task/page.tsx` — server pages load tasks with `loadUserTasks`, pass `nowIso` to client views
- `lib/tasks/load-tasks.ts` — `loadUserTasks(userId)` → `DashboardTask[]`
- `lib/tasks/task-input.ts` — `toLocalDateKey`, `parseLocalDateInput` for local-date grouping
- `lib/dashboard/task-types.ts` — `DashboardTask`, `toTaskView`, priority/status helpers
- `lib/dashboard/use-now.ts` — live `now` for today highlight and display status
- `components/my-task/my-task-view.tsx` — selection + edit/delete dialog patterns to reuse
- `components/dashboard/task-card.tsx` — full task card for day-detail list
- `components/tasks/edit-task-dialog.tsx`, `confirm-delete-task-dialog.tsx` — reuse for mutations
- `components/ui/card.tsx`, `button.tsx`, `empty.tsx` — layout primitives
- `components/app-shell/app-shell.tsx` — existing authenticated shell; do not rebuild
- `prompts-img/Calendar-1275.png` — visual source of truth

## Decisions or assumptions

1. **Route stays `/calendar`.** Keep `metadata.title` as `Calendar · bendo`.
2. **Real data.** Use `loadUserTasks` on the server page. No mock fixtures, no new API routes.
3. **Calendar filter.** Include only tasks where `status !== 'completed'`. Completed tasks never appear on the grid or in day detail.
4. **Date grouping.** Group tasks by `toLocalDateKey(new Date(task.scheduledAt))`. This matches existing task-input duplicate/cap logic and aligns with `scheduled_date` in Supabase.
5. **Default month.** Client view opens on the month containing **today** (`now`). Prev/next chevrons change visible month only (client state).
6. **Default selected day.** On load, select **today** if it falls in the visible month; otherwise select the 1st of the visible month. Clicking any day cell selects it and updates the detail section.
7. **Today vs selected.** Today gets a **solid black circle** with white date number (per PNG). Selected day (when not today) gets a subtle `ring-2 ring-foreground/20` on the date badge. Both can apply if today is selected.
8. **Outside-month dates.** Leading/trailing days from adjacent months render in the grid with **muted** date numbers and **no task pills** (tasks only attach to their actual scheduled date).
9. **Task pill colors.** Map priority to three pastel pill backgrounds matching the reference:
   - `low` → light blue (`bg-sky-100 text-sky-950`)
   - `moderate` → light peach (`bg-orange-100 text-orange-950`)
   - `extreme` → light pink (`bg-pink-100 text-pink-950`)
10. **Overflow.** Show at most **3** task pills per cell. If more exist, render a small blue **“view more”** text button that selects that day (same as clicking the cell).
11. **Pill interaction.** Clicking a pill selects its day and highlights the corresponding task in the detail list (scroll into view optional; selection state required).
12. **Day detail panel.** Below the calendar card, show a second card titled with the selected date (e.g. `Monday, 15 March 2026`) listing that day’s open tasks using existing `TaskCard` (with edit/delete). Empty state uses shadcn `Empty`.
13. **Mutations.** Reuse `EditTaskDialog` + `ConfirmDeleteTaskDialog` + task API client patterns from `MyTaskView`. Updating/deleting a task updates local state; completing a task removes it from the calendar.
14. **Week starts Sunday.** Column headers: Sun, Mon, Tue, Wed, Thu, Fri, Sat (matches PNG).
15. **No shadcn Calendar primitive.** Build a custom month grid; do not install `date-fns` or `@/components/ui/calendar`.
16. **Responsive.** Grid stays 7 columns; on narrow screens reduce cell min-height and pill text size. Calendar card is full-width within page padding.

## Visual interpretation

Reference: `prompts-img/Calendar-1275.png` (March 2021 month view).

### Page layout

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER + SIDEBAR (existing shell)                           │
├─────────────────────────────────────────────────────────────┤
│ px-4 py-6 sm:px-6 lg:px-8 lg:py-8                          │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ March 2021                                    <    >    │ │
│ │ Sun  Mon  Tue  Wed  Thu  Fri  Sat                       │ │
│ │ ┌──┬──┬──┬──┬──┬──┬──┐                                 │ │
│ │ │  │  │  │  │  │  │  │  5–6 rows                       │ │
│ │ └──┴──┴──┴──┴──┴──┴──┘                                 │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Monday, 15 March 2026                                   │ │
│ │ [TaskCard] [TaskCard] …                                 │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Calendar card

- Container: `Card` with `rounded-card shadow-panel bg-card ring-0`, generous padding (`py-6` / `px-4 sm:px-6`).
- Header row: month + year left (`text-xl sm:text-2xl font-semibold text-foreground`), chevron `Button variant="ghost" size="icon-sm"` pair right (`ChevronLeftIcon`, `ChevronRightIcon`).
- Weekday row: `grid grid-cols-7`, labels `text-xs text-muted-foreground font-medium`, centered or left-aligned per column.
- Grid: `grid grid-cols-7`, **no visible cell borders**, `min-h-[100px] sm:min-h-[120px]` per cell, internal padding.
- Date number: top-right (`flex justify-end`), `text-sm`; in-month `text-foreground`; outside-month `text-muted-foreground/50`.
- Today badge: `size-7 rounded-full bg-foreground text-background flex items-center justify-center text-sm font-medium`.
- Task pills: full-width within cell, `rounded-md px-1.5 py-0.5 text-[11px] sm:text-xs truncate`, stacked with `gap-1`, below the date number.
- “view more”: `text-primary text-[11px] font-medium hover:underline`, bottom of cell.

### Typography & spacing

- Month title: semibold sans, ~20–24px.
- Weekday headers: 12px muted.
- Date numbers: 14px.
- Pills: 11–12px, single-line truncate.
- Page vertical gap between calendar card and detail card: `gap-6`.

### Colors

- Page background: existing `--background`.
- Card: `--card` white.
- Today circle: `--foreground` fill, `--background` text.
- Pill pastels as listed in decisions (priority mapping).
- “view more”: `--primary` (coral link tone acceptable) or `text-blue-600` to match PNG — prefer `text-primary` for design-system consistency unless it clashes; use `text-blue-600` only if coral reads wrong on pastel cells.

## Files likely to change

| File | Action |
|------|--------|
| `app/(app)/calendar/page.tsx` | Replace stub; load tasks + pass to client view |
| `components/calendar/calendar-view.tsx` | **New** — month state, selection, dialogs, detail section |
| `components/calendar/calendar-month-grid.tsx` | **New** — header, weekday labels, day cells, pills |
| `lib/calendar/calendar-dates.ts` | **New** — month matrix, formatters, today/same-day helpers |
| `lib/calendar/calendar-tasks.ts` | **New** — filter open tasks, group by date key, sort by title |
| `lib/calendar/calendar-dates.test.ts` | **New** — unit tests for month grid edge cases |
| `lib/calendar/calendar-tasks.test.ts` | **New** — unit tests for grouping/filter |

Do **not** change Supabase schema, API routes, shell, or unrelated pages.

## Implementation requirements

### `lib/calendar/calendar-dates.ts`

- `formatCalendarMonthYear(date: Date): string` — e.g. `March 2021` (`en-GB`, long month).
- `formatCalendarDayHeading(date: Date): string` — e.g. `Monday, 15 March 2026`.
- `getCalendarWeekdayLabels(): readonly string[]` — `["Sun", …, "Sat"]`.
- `buildMonthGrid(year: number, month: number): CalendarDay[]` where each entry has `{ date: Date, dateKey: string, inCurrentMonth: boolean }`.
- Grid always covers full weeks: include leading/trailing days so row count is 5 or 6.
- `isSameLocalDay(a: Date, b: Date): boolean` using date parts (not UTC midnight bugs).
- Export types used by components.

### `lib/calendar/calendar-tasks.ts`

- `getCalendarTasks(tasks: DashboardTask[]): DashboardTask[]` — filter `status !== 'completed'`.
- `groupTasksByDateKey(tasks: DashboardTask[]): Map<string, DashboardTask[]>` — key = `toLocalDateKey(new Date(task.scheduledAt))`, values sorted alphabetically by `title`.
- `getTasksForDateKey(map, dateKey): DashboardTask[]`.

### `components/calendar/calendar-month-grid.tsx`

- Props: `monthDate`, `now`, `tasksByDate`, `selectedDateKey`, `onSelectDate`, `onSelectTask?`.
- Render header with prev/next calling parent handlers.
- Each day cell is a `<button type="button">` (accessible) covering the cell; pills inside stop propagation or the cell click selects the day.
- Render up to 3 pills + optional “view more”.
- `aria-label` on cells: full date + task count.

### `components/calendar/calendar-view.tsx`

- Client component; props: `initialTasks`, `nowIso`.
- State: `visibleMonth` (Date, 1st of month), `selectedDateKey`, `tasks`, edit/delete dialog state (mirror `MyTaskView`).
- Derive `tasksByDate` from filtered tasks.
- Day detail: map tasks through `toTaskView(task, now)` for `TaskCard`.
- When a task is completed via edit dialog, remove from list or refresh from returned task.

### `app/(app)/calendar/page.tsx`

```tsx
const user = await requireUser();
const now = new Date();
const tasks = await loadUserTasks(user.id);
return (
  <div className="flex flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
    <CalendarView initialTasks={tasks} nowIso={now.toISOString()} />
  </div>
);
```

No page-level `<h1>` duplicate — the calendar card header serves as the primary heading (`<h1>` month title inside the card).

## Security requirements

- Page remains behind `requireUser()`.
- No new client-side Supabase access.
- Task mutations only through existing authenticated API client routes.
- Render task titles as plain text (existing `TaskCard` behavior).

## Acceptance criteria

- [ ] `/calendar` renders a month grid matching the reference layout (header, chevrons, weekday row, date top-right, pills, today circle).
- [ ] Only incomplete tasks appear on the calendar.
- [ ] Tasks appear on the day matching their scheduled local date.
- [ ] Prev/next month navigation works without full page reload.
- [ ] Today is highlighted with a black circle.
- [ ] Clicking a day shows that day’s tasks in the detail section below.
- [ ] Cells with >3 tasks show “view more”; activating it selects the day.
- [ ] Edit and delete work from day-detail task cards and stay in sync with the grid.
- [ ] Completing a task removes it from the calendar view.
- [ ] Completed tasks never appear.
- [ ] Responsive at mobile and desktop widths.
- [ ] `npm run typecheck` and `npm run lint` pass.

## Checks to run

```bash
npm run typecheck
npm run lint
npm run build   # route/page changed
```

Run unit tests if added:

```bash
npm test -- lib/calendar
```

## Manual test steps

1. Sign in and open `/calendar`.
2. Confirm the current month displays and today has a black circle.
3. Create 1–2 incomplete tasks on different dates (via Dashboard Add Task); confirm they appear as pills on the correct days.
4. Create 4+ incomplete tasks on the same date; confirm only 3 pills + “view more” in the cell; click “view more” and confirm all tasks appear in the detail section.
5. Click various days; confirm the detail section heading and task list update.
6. Complete a task from the detail section (edit dialog or status if available); confirm it disappears from grid and detail.
7. Navigate to previous/next month; confirm leading/trailing dates are muted and tasks only appear on correct dates.
8. Delete a task from the calendar detail section; confirm it is removed from the grid.
9. Resize to mobile width; confirm grid remains usable (no horizontal overflow).
