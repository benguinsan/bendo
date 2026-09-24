import { ensureHarnessServer } from "./spawn-harness";
import {
  ensureBendoServer,
  type EnsureBendoResult,
} from "./spawn-next";

export type EnsureRuntimesResult = {
  bendo: EnsureBendoResult;
};

let harnessEnsureInFlight: Promise<void> | undefined;

/**
 * Soft-fail harness ensure: log failures; never throw to the UI path.
 * Deduplicate concurrent calls (e.g. repeated load/reload) via one shared in-flight
 * promise so parallel ensures do not conflict.
 */
function ensureHarnessInBackground(bendoUrl: string): Promise<void> {
  if (harnessEnsureInFlight) {
    return harnessEnsureInFlight;
  }
  
  const attempt = (async () => {
      const harness = await ensureHarnessServer(bendoUrl);
      if (!harness.ok) {
        console.warn(
          `[harness] Not available (${harness.reason}). Bendo will load; Agent chat stays offline until the bridge is up.`
        );
      }
    })().finally(() => {
      harnessEnsureInFlight = undefined;
    });
  harnessEnsureInFlight = attempt;
  return attempt;
}

/**
 * Ensure local runtimes for the desktop session.
 * Awaits Next/Bendo; kicks harness in the background (does not block the caller).
 */
export async function ensureRuntimes(
  bendoUrl: string
): Promise<EnsureRuntimesResult> {
  const bendo = await ensureBendoServer(bendoUrl);
  if (!bendo.ok) {
    return { bendo };
  }

  void ensureHarnessInBackground(bendoUrl).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[harness] Unexpected error: ${message}`);
  });

  return { bendo };
}
