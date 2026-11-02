import assert from "node:assert/strict";
import net from "node:net";
import { afterEach, describe, it } from "node:test";

import {
  getActiveProbeServerCount,
  pickFreePort,
} from "./pick-port";

const held: net.Server[] = [];

async function listen(port: number, host: string): Promise<net.Server> {
  const server = net.createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => resolve());
  });
  held.push(server);
  return server;
}

async function closeAll(): Promise<void> {
  while (held.length > 0) {
    const server = held.pop();
    if (!server) {
      break;
    }
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  }
}

afterEach(async () => {
  await closeAll();
  assert.equal(getActiveProbeServerCount(), 0);
});

describe("pickFreePort", () => {
  it("returns the first free port in range", async () => {
    // Below every OS ephemeral range (Linux 32768+, macOS/Windows 49152+) so outgoing connections never hold these ports.
    const base = 27_140;
    const candidates = [base, base + 1, base + 2];
    await listen(base, "127.0.0.1");
    const port = await pickFreePort(candidates);
    assert.equal(port, base + 1);
  });

  it("skips when 127.0.0.1 is held even if 0.0.0.0 looks free", async () => {
    const base = 27_150;
    const candidates = [base, base + 1];
    await listen(base, "127.0.0.1");
    const port = await pickFreePort(candidates);
    assert.equal(port, base + 1);
  });

  it("skips when 0.0.0.0 is held even if 127.0.0.1 looks free", async () => {
    const base = 27_160;
    const candidates = [base, base + 1];
    await listen(base, "0.0.0.0");
    const port = await pickFreePort(candidates);
    assert.equal(port, base + 1);
  });

  it("returns null when every candidate is busy", async () => {
    const base = 27_170;
    const candidates = [base, base + 1];
    await listen(base, "127.0.0.1");
    await listen(base + 1, "127.0.0.1");
    const port = await pickFreePort(candidates);
    assert.equal(port, null);
  });

  it("never keeps more than one probe server open", async () => {
    const base = 27_180;
    const candidates = [base, base + 1, base + 2];
    let maxActive = 0;
    const original = net.createServer;
    const patched = function patchedCreateServer(
      ...args: Parameters<typeof net.createServer>
    ) {
      const server = original(...args);
      const bump = () => {
        maxActive = Math.max(maxActive, getActiveProbeServerCount());
      };
      server.on("listening", bump);
      return server;
    } as typeof net.createServer;
    net.createServer = patched;
    try {
      await pickFreePort(candidates);
      assert.ok(maxActive <= 1, `expected ≤1 probe server, got ${maxActive}`);
    } finally {
      net.createServer = original;
    }
  });

  it("releases the port after a probe so a normal bind succeeds", async () => {
    const base = 27_190;
    const picked = await pickFreePort([base]);
    assert.equal(picked, base);
    assert.equal(getActiveProbeServerCount(), 0);
    const server = await listen(base, "127.0.0.1");
    assert.ok(server.listening);
  });
});
