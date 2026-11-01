import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { redactSecrets } from "./redact-log";

describe("redactSecrets", () => {
  it("redacts dsh web token query", () => {
    assert.equal(
      redactSecrets(
        "dsh web: http://127.0.0.1:3080/?token=QVkd-8fb0_PllE4eSU"
      ),
      "dsh web: http://127.0.0.1:3080/?token=[REDACTED]"
    );
  });

  it("redacts access_token and preserves fragment", () => {
    assert.equal(
      redactSecrets("?a=1&access_token=abc#frag"),
      "?a=1&access_token=[REDACTED]#frag"
    );
  });

  it("redacts two tokens on one line", () => {
    assert.equal(
      redactSecrets(
        "http://x/?token=one http://y/?access_token=two"
      ),
      "http://x/?token=[REDACTED] http://y/?access_token=[REDACTED]"
    );
  });

  it("is case-insensitive for TOKEN", () => {
    assert.equal(redactSecrets("?TOKEN=x"), "?TOKEN=[REDACTED]");
  });

  it("leaves lines without a token query unchanged", () => {
    assert.equal(
      redactSecrets("[harness] Ready at http://127.0.0.1:3080/"),
      "[harness] Ready at http://127.0.0.1:3080/"
    );
    assert.equal(redactSecrets("max_tokens=1"), "max_tokens=1");
    assert.equal(redactSecrets("?tokenizer=abc"), "?tokenizer=abc");
  });
});
