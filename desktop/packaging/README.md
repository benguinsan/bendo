# Desktop packaging overlays

## `bendo-agent(doro)/`

Ship snapshot of the Doro cordis overlay. Local Agent still uses
`deepseek-harness/bendo-agent(doro)/` (often untracked next to the harness
checkout). CI copies this folder into the harness tree before `build:harness`
so `npm run dist:win` does not need a private harness fork that already
contains Doro.

Keep this tree in sync with the overlay you dogfood locally (this snapshot is
the only copy with git history):

- `npm run doro:check` — fails if the two copies differ (also runs inside
  `ops:pack-ready`; skips when the harness overlay is absent, e.g. CI before inject).
- `npm run doro:sync` — after testing a change in the harness copy, copy it over
  this snapshot, then commit.

`tsconfig.json` stays only in the harness copy: its paths (`../tsconfig.base.json`,
`../vendor/cordis`, …) resolve from the harness root, so here it would only make
the editor report missing files. Runtime does not need it.
