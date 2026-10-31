import net from "node:net";

/** Packaged Next listen candidates (finite Clerk allowlist). */
export const NEXT_PORT_CANDIDATES: readonly number[] = [
  3000, 3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009,
];

/** Packaged harness / chat-bridge listen candidates. */
export const HARNESS_PORT_CANDIDATES: readonly number[] = [
  3080, 3081, 3082, 3083, 3084, 3085, 3086, 3087, 3088, 3089,
];

/** Both must succeed: Next binds 0.0.0.0; Electron loads 127.0.0.1. */
const DEFAULT_PROBE_HOSTS: readonly string[] = ["127.0.0.1", "0.0.0.0"];

/** Test hook: live probe servers (must never exceed 1). */
let activeProbeServers = 0;

export function getActiveProbeServerCount(): number {
  return activeProbeServers;
}

function closeServer(server: net.Server): Promise<void> {
  return new Promise((resolve) => {
    server.close(() => resolve());
  });
}

/**
 * Bind-test one host. Always closes (and awaits close) before returning —
 * success or error — so the next probe never overlaps.
 */
async function probeBind(port: number, host: string): Promise<boolean> {
  const server = net.createServer();
  activeProbeServers += 1;
  try {
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(port, host, () => resolve());
    });
    return true;
  } catch {
    return false;
  } finally {
    try {
      await closeServer(server);
    } finally {
      activeProbeServers -= 1;
    }
  }
}

/**
 * First candidate free on every probe host, tried strictly in order.
 * Each bind is fully closed before the next listen (one probe socket at a time).
 *
 * @param candidates - ports to try (e.g. 3000..3009)
 * @param host - unused; both `127.0.0.1` and `0.0.0.0` are always probed
 */
export async function pickFreePort(
  candidates: readonly number[],
  host?: string
): Promise<number | null> {
  void host;
  for (const port of candidates) {
    let free = true;
    for (const probeHost of DEFAULT_PROBE_HOSTS) {
      if (!(await probeBind(port, probeHost))) {
        free = false;
        break;
      }
    }
    if (free) {
      return port;
    }
  }
  return null;
}

export function nextPortsBusyReason(): string {
  const lo = NEXT_PORT_CANDIDATES[0];
  const hi = NEXT_PORT_CANDIDATES[NEXT_PORT_CANDIDATES.length - 1];
  return `No free port in ${lo}–${hi}. Quit whatever is using those ports and relaunch Bendo.`;
}
