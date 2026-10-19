/**
 * Browser → local Next API fetch for desktop cloud cutover.
 *
 * Attach Clerk `getToken({ skipCache: true })` as Bearer. Local Next forwards
 * that JWT to Vercel (no Clerk secret on device). On 401 after Bearer was
 * sent, refresh once via Clerk client (`getToken` + skipCache) and retry with
 * the new Bearer. Still 401 → stop and return that response to the UI.
 */

export type BrowserApiGetToken = (options?: {
  skipCache?: boolean;
}) => Promise<string | null>;

export type BrowserApiFetchInit = RequestInit & {
  /** From `useAuth().getToken` (or equivalent). */
  getToken?: BrowserApiGetToken;
};

/** Ask Clerk for a fresh session JWT (`skipCache`), or null on failure. */
async function resolveBearerToken(
  getToken: BrowserApiGetToken
): Promise<string | null> {
  try {
    return await getToken({ skipCache: true });
  } catch {
    return null;
  }
}

/**
 * Same-origin fetch to local Next APIs with optional Clerk Bearer.
 * On 401 after Bearer was sent, refresh once via `getToken` and retry.
 */
export async function browserApiFetch(
  input: RequestInfo | URL,
  init: BrowserApiFetchInit = {}
): Promise<Response> {
  const { getToken, headers: initHeaders, ...rest } = init;
  const headers = new Headers(initHeaders);
  const credentials = rest.credentials ?? "include";
  const cache = rest.cache ?? "no-store";

  let usedBearer = false;
  if (getToken && !headers.has("Authorization")) {
    const token = await resolveBearerToken(getToken);
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
      usedBearer = true;
    }
  }

  const response = await fetch(input, {
    ...rest,
    headers,
    credentials,
    cache,
  });

  if (response.status !== 401 || !usedBearer || !getToken) {
    return response;
  }

  // Clerk client refresh (publishable key only) → one Bearer retry.
  const refreshed = await resolveBearerToken(getToken);
  if (!refreshed) {
    return response;
  }

  headers.set("Authorization", `Bearer ${refreshed}`);
  return fetch(input, {
    ...rest,
    headers,
    credentials,
    cache,
  });
}
