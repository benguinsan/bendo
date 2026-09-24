import { ensureHarnessServer } from "./spawn-harness";
import {
  ensureBendoServer,
  type EnsureBendoResult,
} from "./spawn-next";

export type EnsureRuntimesResult = {
  bendo: EnsureBendoResult;
};

/**
 * Soft-fail harness ensure: log failures; never throw to the UI path.
 */
async function ensureHarnessInBackground(bendoUrl: string): Promise<void> {
  const harness = await ensureHarnessServer(bendoUrl);
  if (!harness.ok) {
    console.warn(
      `[harness] Not available (${harness.reason}). Bendo will load; Agent chat stays offline until the bridge is up.`
    );
  }
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
