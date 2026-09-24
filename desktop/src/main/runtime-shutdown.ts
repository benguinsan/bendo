import { stopSpawnedHarness } from "./spawn-harness";
import { stopSpawnedNext } from "./spawn-next";

/** Tear down owned harness then Next children for this session. */
export function stopRuntimes(): void {
  stopSpawnedHarness();
  stopSpawnedNext();
}
