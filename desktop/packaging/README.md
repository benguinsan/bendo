# Desktop packaging overlays

## `bendo-agent(doro)/`

Ship snapshot of the Doro cordis overlay. Local Agent still uses
`deepseek-harness/bendo-agent(doro)/` (often untracked next to the harness
checkout). CI copies this folder into the harness tree before `build:harness`
so `npm run dist:win` does not need a private harness fork that already
contains Doro.

Keep this tree in sync with the overlay you dogfood locally before a release
build.
