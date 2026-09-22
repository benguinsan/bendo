/**
 * Returns true if something answers at the URL (any HTTP status counts as up).
 */
export async function isBendoReachable(
  url: string,
  timeoutMs = 5000
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
    });
    // 2xx–5xx / 3xx all mean the server process is listening
    void response.status;
    return { ok: true };
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AbortError") {
      return { ok: false, reason: `Timed out after ${timeoutMs}ms` };
    }
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, reason: message };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Poll until Bendo answers or the overall timeout elapses.
 */
export async function waitForBendo(
  url: string,
  options: { timeoutMs: number; intervalMs?: number } = { timeoutMs: 60_000 }
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const intervalMs = options.intervalMs ?? 500;
  const deadline = Date.now() + options.timeoutMs;
  let lastReason = "not reachable";

  while (Date.now() < deadline) {
    const remaining = deadline - Date.now();
    const check = await isBendoReachable(
      url,
      Math.min(5000, Math.max(200, remaining))
    );
    if (check.ok) {
      return { ok: true };
    }
    lastReason = check.reason;
    const sleep = Math.min(intervalMs, Math.max(0, deadline - Date.now()));
    if (sleep <= 0) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, sleep));
  }

  return {
    ok: false,
    reason: `Timed out after ${options.timeoutMs}ms waiting for ${url} (${lastReason})`,
  };
}
