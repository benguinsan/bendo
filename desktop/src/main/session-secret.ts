import crypto from "node:crypto";

const PROOF_PREFIX = "bendo-desktop-proof:v1:";
const HEX64_RE = /^[0-9a-f]{64}$/u;

let cachedSecret: string | undefined;

/**
 * Ephemeral per-process session secret. Never log or persist.
 * Unpackaged + `BENDO_DESKTOP_SESSION_SECRET` in Electron's env → use that
 * (Docker/attached Next can share it). Packaged builds always get a random secret.
 */
export function getSessionSecret(isPackaged: boolean): string {
  if (cachedSecret !== undefined) {
    return cachedSecret;
  }
  if (!isPackaged) {
    const fromEnv = process.env.BENDO_DESKTOP_SESSION_SECRET?.trim();
    if (fromEnv) {
      cachedSecret = fromEnv;
      return cachedSecret;
    }
  }
  cachedSecret = crypto.randomBytes(32).toString("hex");
  return cachedSecret;
}

/** 32 lowercase hex chars — matches B1 `x-bendo-desktop-nonce`. */
export function newNonce(): string {
  return crypto.randomBytes(16).toString("hex");
}

export function computeProof(secret: string, nonce: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(`${PROOF_PREFIX}${nonce}`, "utf8")
    .digest("hex");
}

export function verifyProof(
  secret: string,
  nonce: string,
  proofHex: string
): boolean {
  if (typeof proofHex !== "string" || !HEX64_RE.test(proofHex)) {
    return false;
  }
  const expected = Buffer.from(computeProof(secret, nonce), "hex");
  const actual = Buffer.from(proofHex, "hex");
  if (expected.length !== actual.length) {
    return false;
  }
  return crypto.timingSafeEqual(expected, actual);
}

/** Test-only: reset the process-wide cache between cases. */
export function resetSessionSecretForTests(): void {
  cachedSecret = undefined;
}
