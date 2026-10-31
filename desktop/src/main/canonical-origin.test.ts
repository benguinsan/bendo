import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import {
  canonicalAppOrigin,
  canonicalizeLoopbackUrl,
} from "./canonical-origin";

const ENV_KEY = "BENDO_APP_URL";
let previousEnv: string | undefined;

function setAppUrl(value: string | undefined): void {
  if (value === undefined) {
    delete process.env[ENV_KEY];
  } else {
    process.env[ENV_KEY] = value;
  }
}

afterEach(() => {
  setAppUrl(previousEnv);
});

describe("canonical-origin", () => {
  previousEnv = process.env[ENV_KEY];

  it("default → http://127.0.0.1:3000", () => {
    setAppUrl(undefined);
    assert.equal(canonicalAppOrigin(), "http://127.0.0.1:3000");
  });

  it("localhost → 127.0.0.1", () => {
    setAppUrl("http://localhost:3000");
    assert.equal(canonicalAppOrigin(), "http://127.0.0.1:3000");
  });

  it("[::1] → 127.0.0.1", () => {
    setAppUrl("http://[::1]:3000");
    assert.equal(canonicalAppOrigin(), "http://127.0.0.1:3000");
  });

  it("remote origin stays remote", () => {
    setAppUrl("https://example.com");
    assert.equal(canonicalAppOrigin(), "https://example.com");
  });

  it("canonicalizeLoopbackUrl rewrites path/query/hash", () => {
    setAppUrl(undefined);
    assert.equal(
      canonicalizeLoopbackUrl("http://localhost:3000/a?b=1#c"),
      "http://127.0.0.1:3000/a?b=1#c"
    );
  });

  it("canonicalizeLoopbackUrl rejects different port, remote, file", () => {
    setAppUrl(undefined);
    assert.equal(canonicalizeLoopbackUrl("http://localhost:3001/a"), null);
    assert.equal(canonicalizeLoopbackUrl("https://evil.example"), null);
    assert.equal(canonicalizeLoopbackUrl("file:///tmp/x"), null);
  });
});
