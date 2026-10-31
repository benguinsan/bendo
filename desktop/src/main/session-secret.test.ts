import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import {
  computeProof,
  getSessionSecret,
  newNonce,
  resetSessionSecretForTests,
  verifyProof,
} from "./session-secret";

const VECTOR_SECRET = "test-secret";
const VECTOR_NONCE = "00112233445566778899aabbccddeeff";
const VECTOR_PROOF =
  "1331841ac19b5df349c1757a16193ed053a811dc38c9f176665bbdc82e4d2c5c";

afterEach(() => {
  resetSessionSecretForTests();
  delete process.env.BENDO_DESKTOP_SESSION_SECRET;
});

describe("session-secret", () => {
  it("matches the B1 test vector", () => {
    assert.equal(computeProof(VECTOR_SECRET, VECTOR_NONCE), VECTOR_PROOF);
    assert.equal(verifyProof(VECTOR_SECRET, VECTOR_NONCE, VECTOR_PROOF), true);
  });

  it("rejects wrong secret, nonce, or proof", () => {
    assert.equal(
      verifyProof("other-secret", VECTOR_NONCE, VECTOR_PROOF),
      false
    );
    assert.equal(
      verifyProof(VECTOR_SECRET, "ffeeddccbbaa99887766554433221100", VECTOR_PROOF),
      false
    );
    assert.equal(
      verifyProof(
        VECTOR_SECRET,
        VECTOR_NONCE,
        "0000000000000000000000000000000000000000000000000000000000000000"
      ),
      false
    );
  });

  it("rejects different-length proof without throwing", () => {
    assert.equal(verifyProof(VECTOR_SECRET, VECTOR_NONCE, "abcd"), false);
    assert.equal(verifyProof(VECTOR_SECRET, VECTOR_NONCE, ""), false);
  });

  it("uses env override only when not packaged", () => {
    process.env.BENDO_DESKTOP_SESSION_SECRET = "shared-dev-secret";
    assert.equal(getSessionSecret(false), "shared-dev-secret");
    resetSessionSecretForTests();
    const packaged = getSessionSecret(true);
    assert.notEqual(packaged, "shared-dev-secret");
    assert.match(packaged, /^[0-9a-f]{64}$/u);
  });

  it("returns a stable 64-hex random secret within a process", () => {
    const first = getSessionSecret(true);
    const second = getSessionSecret(true);
    assert.match(first, /^[0-9a-f]{64}$/u);
    assert.equal(first, second);
  });

  it("newNonce is 32 lowercase hex chars", () => {
    assert.match(newNonce(), /^[0-9a-f]{32}$/u);
  });
});
