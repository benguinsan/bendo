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
