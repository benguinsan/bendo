import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  computeDesktopSessionProof,
  isValidDesktopNonce,
} from "./session-proof";

const TEST_SECRET = "test-secret";
const TEST_NONCE = "00112233445566778899aabbccddeeff";
const TEST_PROOF =
  "1331841ac19b5df349c1757a16193ed053a811dc38c9f176665bbdc82e4d2c5c";

describe("isValidDesktopNonce", () => {
  it("accepts a valid 32-char lowercase hex nonce", () => {
    assert.equal(isValidDesktopNonce(TEST_NONCE), true);
  });

  it("rejects null", () => {
    assert.equal(isValidDesktopNonce(null), false);
  });

  it("rejects empty string", () => {
    assert.equal(isValidDesktopNonce(""), false);
  });

  it("rejects 31 chars", () => {
    assert.equal(isValidDesktopNonce(TEST_NONCE.slice(0, 31)), false);
  });

  it("rejects 33 chars", () => {
    assert.equal(isValidDesktopNonce(`${TEST_NONCE}a`), false);
  });

  it("rejects uppercase hex", () => {
    assert.equal(isValidDesktopNonce(TEST_NONCE.toUpperCase()), false);
  });

  it("rejects non-hex chars", () => {
    assert.equal(
      isValidDesktopNonce("00112233445566778899aabbccddeeGG"),
      false
    );
  });
});

describe("computeDesktopSessionProof", () => {
  it("matches the test vector", async () => {
    assert.equal(
      await computeDesktopSessionProof(TEST_SECRET, TEST_NONCE),
      TEST_PROOF
    );
  });

  it("changes when the secret changes", async () => {
    const other = await computeDesktopSessionProof("other-secret", TEST_NONCE);
    assert.notEqual(other, TEST_PROOF);
  });

  it("changes when the nonce changes", async () => {
    const other = await computeDesktopSessionProof(
      TEST_SECRET,
      "ffeeddccbbaa99887766554433221100"
    );
    assert.notEqual(other, TEST_PROOF);
  });

  it("returns 64 lowercase hex chars", async () => {
    const proof = await computeDesktopSessionProof(TEST_SECRET, TEST_NONCE);
    assert.match(proof, /^[0-9a-f]{64}$/u);
  });
});
