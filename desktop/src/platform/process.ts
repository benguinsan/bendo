import { spawn, type ChildProcess } from "node:child_process";

type ProcessTarget = {
  getNpmCommand: () => string;
  shouldDetachChild: () => boolean;
  killProcessTree: (child: ChildProcess) => void;
};

function killUnixProcessTree(child: ChildProcess): void {
  const pid = child.pid;
  if (pid == null) {
    return;
  }

  try {
    process.kill(-pid, "SIGTERM");
  } catch {
    try {
      child.kill("SIGTERM");
    } catch {
      // already exited
    }
  }
}

const win32: ProcessTarget = {
  getNpmCommand: () => "npm.cmd",
  shouldDetachChild: () => false,
  killProcessTree(child) {
    const pid = child.pid;
    if (pid == null) {
      return;
    }
    spawn("taskkill", ["/pid", String(pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
  },
};

const darwin: ProcessTarget = {
  getNpmCommand: () => "npm",
  shouldDetachChild: () => true,
  killProcessTree: killUnixProcessTree,
};

const linux: ProcessTarget = {
  getNpmCommand: () => "npm",
  shouldDetachChild: () => true,
  killProcessTree: killUnixProcessTree,
};

const targets = {
  win32,
  darwin,
  linux,
} as const satisfies Record<string, ProcessTarget>;

function selectTarget(): ProcessTarget {
  switch (process.platform) {
    case "win32":
      return targets.win32;
    case "darwin":
      return targets.darwin;
    default:
      return targets.linux;
  }
}

const target = selectTarget();

export const getNpmCommand = target.getNpmCommand;
export const shouldDetachChild = target.shouldDetachChild;
export const killProcessTree = target.killProcessTree;
