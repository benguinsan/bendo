import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, it } from "node:test";

import { restoreHarnessLinks } from "./harness-links";

const temps: string[] = [];

afterEach(() => {
  while (temps.length > 0) {
    const dir = temps.pop();
    if (dir) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

function makeTemp(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bendo-harness-links-"));
  temps.push(dir);
  return dir;
}

function writeManifest(
  root: string,
  links: { path: string; target: string }[]
): void {
  fs.writeFileSync(
    path.join(root, "harness-links.json"),
    `${JSON.stringify({ version: 1, links }, null, 2)}\n`
  );
}

describe("restoreHarnessLinks", () => {
  it("creates links from a manifest, then a second run creates 0", () => {
    const root = makeTemp();
    const target = path.join(root, "pkg");
    fs.mkdirSync(target);
    writeManifest(root, [{ path: "node_modules/pkg", target: "../pkg" }]);

    const first = restoreHarnessLinks(root);
    assert.equal(first.ok, true);
    if (!first.ok) {
      return;
    }
    assert.equal(first.created, 1);
    assert.equal(
      fs.realpathSync(path.join(root, "node_modules", "pkg")),
      fs.realpathSync(target)
    );

    const second = restoreHarnessLinks(root);
    assert.equal(second.ok, true);
    if (!second.ok) {
      return;
    }
    assert.equal(second.created, 0);
  });

  it("skips an existing correct link", () => {
    const root = makeTemp();
    const target = path.join(root, "pkg");
    fs.mkdirSync(target);
    fs.mkdirSync(path.join(root, "node_modules"));
    fs.symlinkSync(target, path.join(root, "node_modules", "pkg"), "junction");
    writeManifest(root, [{ path: "node_modules/pkg", target: "../pkg" }]);

    const result = restoreHarnessLinks(root);
    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }
    assert.equal(result.created, 0);
  });

  it("replaces a wrong link", () => {
    const root = makeTemp();
    const right = path.join(root, "right");
    const wrong = path.join(root, "wrong");
    fs.mkdirSync(right);
    fs.mkdirSync(wrong);
    fs.mkdirSync(path.join(root, "node_modules"));
    fs.symlinkSync(wrong, path.join(root, "node_modules", "pkg"), "junction");
    writeManifest(root, [{ path: "node_modules/pkg", target: "../right" }]);

    const result = restoreHarnessLinks(root);
    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }
    assert.equal(result.created, 1);
    assert.equal(
      fs.realpathSync(path.join(root, "node_modules", "pkg")),
      fs.realpathSync(right)
    );
  });

  it("returns ok:false and leaves a real folder at the link path untouched", () => {
    const root = makeTemp();
    const target = path.join(root, "pkg");
    const linkPath = path.join(root, "node_modules", "pkg");
    fs.mkdirSync(target);
    fs.mkdirSync(linkPath, { recursive: true });
    fs.writeFileSync(path.join(linkPath, "marker.txt"), "keep");
    writeManifest(root, [{ path: "node_modules/pkg", target: "../pkg" }]);

    const result = restoreHarnessLinks(root);
    assert.equal(result.ok, false);
    if (result.ok) {
      return;
    }
    assert.match(result.reason, /Refusing to replace real path/u);
    assert.equal(fs.readFileSync(path.join(linkPath, "marker.txt"), "utf8"), "keep");
  });

  it("rejects an escaping path", () => {
    const root = makeTemp();
    fs.mkdirSync(path.join(root, "pkg"));
    writeManifest(root, [{ path: "../outside", target: "pkg" }]);

    const result = restoreHarnessLinks(root);
    assert.equal(result.ok, false);
    if (result.ok) {
      return;
    }
    assert.match(result.reason, /escapes harnessDir/u);
  });

  it("rejects an escaping target", () => {
    const root = makeTemp();
    writeManifest(root, [
      { path: "node_modules/pkg", target: "../../outside" },
    ]);

    const result = restoreHarnessLinks(root);
    assert.equal(result.ok, false);
    if (result.ok) {
      return;
    }
    assert.match(result.reason, /escapes harnessDir/u);
  });

  it("returns ok:true with 0 created when no manifest", () => {
    const root = makeTemp();
    const result = restoreHarnessLinks(root);
    assert.deepEqual(result, { ok: true, created: 0 });
  });
});
