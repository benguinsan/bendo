; Force per-user install (no "all users" page, no elevation). The app recreates
; harness junctions inside the install dir at runtime, which needs write access.
!macro customInstallMode
  StrCpy $isForceCurrentInstall "1"
!macroend
