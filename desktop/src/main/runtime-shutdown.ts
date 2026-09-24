import { beginHarnessShutdown, stopSpawnedHarness } from "./spawn-harness";
import { beginNextShutdown, stopSpawnedNext } from "./spawn-next";

/**
 * Tear down owned harness then Next for this session.
 * Sets spawn gates first so in-flight ensure cannot spawn after cleanup.
 */
export function stopRuntimes(): void {
  beginHarnessShutdown();
  beginNextShutdown();
  stopSpawnedHarness();
  stopSpawnedNext();
}
