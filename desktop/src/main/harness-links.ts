import fs from "node:fs";
import path from "node:path";

export type RestoreHarnessLinksResult =
  | { ok: true; created: number }
  | { ok: false; reason: string };

/** True when `candidate` resolves inside `root` (inclusive). */
function isInsideRoot(root: string, candidate: string): boolean {
  const rel = path.relative(path.resolve(root), path.resolve(candidate));
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

/** Compare paths after realpath when both exist (macOS /var → /private/var). */
function sameResolvedPath(a: string, b: string): boolean {
  try {
    return fs.realpathSync(a) === fs.realpathSync(b);
  } catch {
    return path.resolve(a) === path.resolve(b);
  }
}

/**
 * Recreate directory links from packaged `harness-links.json` as NTFS
 * junctions (symlink type `"junction"`; on non-Windows Node creates a
 * normal symlink, which is fine for tests).
 *
 * Missing manifest → no-op success (macOS / unpackaged trees).
 * Idempotent: a second run creates 0 links when targets already match.
 */
export function restoreHarnessLinks(
  harnessDir: string
): RestoreHarnessLinksResult {
  const manifestPath = path.join(harnessDir, "harness-links.json");
  if (!fs.existsSync(manifestPath)) {
    return { ok: true, created: 0 };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, reason: `Invalid harness-links.json: ${message}` };
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    (parsed as { version?: unknown }).version !== 1 ||
    !Array.isArray((parsed as { links?: unknown }).links)
  ) {
    return {
      ok: false,
      reason: "Invalid harness-links.json: expected version 1 with links array",
    };
  }

  const root = path.resolve(harnessDir);
  const links = (parsed as { links: unknown[] }).links;
  let created = 0;

  for (const entry of links) {
    if (
      typeof entry !== "object" ||
      entry === null ||
      typeof (entry as { path?: unknown }).path !== "string" ||
      typeof (entry as { target?: unknown }).target !== "string"
    ) {
      return {
        ok: false,
        reason: "Invalid harness-links.json entry: path/target must be strings",
      };
    }

    const relPath = (entry as { path: string }).path;
    const relTarget = (entry as { target: string }).target;
    const absLink = path.resolve(root, relPath);
    if (!isInsideRoot(root, absLink)) {
      return { ok: false, reason: `Link path escapes harnessDir: ${relPath}` };
    }

    const absTarget = path.resolve(path.dirname(absLink), relTarget);
    if (!isInsideRoot(root, absTarget)) {
      return {
        ok: false,
        reason: `Link target escapes harnessDir: ${relPath} → ${relTarget}`,
      };
    }

    let targetStat: fs.Stats;
    try {
      targetStat = fs.statSync(absTarget);
    } catch {
      return {
        ok: false,
        reason: `Link target missing: ${relPath} → ${relTarget}`,
      };
    }
    if (!targetStat.isDirectory()) {
      return {
        ok: false,
        reason: `Link target is not a directory: ${relPath} → ${relTarget}`,
      };
    }

    let linkLstat: fs.Stats | null = null;
    try {
      linkLstat = fs.lstatSync(absLink);
    } catch {
      linkLstat = null;
    }

    if (linkLstat && !linkLstat.isSymbolicLink()) {
      return {
        ok: false,
        reason: `Refusing to replace real path at link location: ${relPath}`,
      };
    }
    if (linkLstat && sameResolvedPath(absLink, absTarget)) {
      continue;
    }

    // Install dir may be read-only (perMachine / AV lock): report, don't throw.
    try {
      if (linkLstat) {
        fs.unlinkSync(absLink);
      }
      fs.mkdirSync(path.dirname(absLink), { recursive: true });
      fs.symlinkSync(absTarget, absLink, "junction");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        ok: false,
        reason: `Cannot create harness junction ${relPath}: ${message}`,
      };
    }
    created += 1;
  }

  return { ok: true, created };
}
