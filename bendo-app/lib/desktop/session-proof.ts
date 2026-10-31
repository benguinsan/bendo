const DESKTOP_NONCE_RE = /^[0-9a-f]{32}$/u;
const PROOF_PREFIX = "bendo-desktop-proof:v1:";

export function isValidDesktopNonce(value: string | null): value is string {
  return typeof value === "string" && DESKTOP_NONCE_RE.test(value);
}

function bytesToLowerHex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function computeDesktopSessionProof(
  secret: string,
  nonce: string
): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    enc.encode(`${PROOF_PREFIX}${nonce}`)
  );
  return bytesToLowerHex(signature);
}
