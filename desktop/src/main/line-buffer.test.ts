import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createLineBuffer } from "./line-buffer";
import { redactSecrets } from "./redact-log";

describe("createLineBuffer", () => {
  it("reassembles a token split across chunks and redacts it", () => {
    const lines: string[] = [];
    const buf = createLineBuffer((line) => lines.push(line));
    buf.push("dsh web: http://h/?to");
    buf.push("ken=abc\n");
    assert.deepEqual(lines, ["dsh web: http://h/?token=abc"]);
    assert.equal(redactSecrets(lines[0]!), "dsh web: http://h/?token=[REDACTED]");
  });

  it("splits CRLF across chunks", () => {
    const lines: string[] = [];
    const buf = createLineBuffer((line) => lines.push(line));
    buf.push("a\r");
    buf.push("\nb\n");
    assert.deepEqual(lines, ["a", "b"]);
  });

  it("emits several lines in one chunk and skips empty lines", () => {
    const lines: string[] = [];
    const buf = createLineBuffer((line) => lines.push(line));
    buf.push("a\n\nb\n");
    assert.deepEqual(lines, ["a", "b"]);
  });

  it("emits a trailing partial line only on flush", () => {
    const lines: string[] = [];
    const buf = createLineBuffer((line) => lines.push(line));
    buf.push("tail");
    assert.deepEqual(lines, []);
    buf.flush();
    assert.deepEqual(lines, ["tail"]);
    buf.flush();
    assert.deepEqual(lines, ["tail"]);
  });
});
