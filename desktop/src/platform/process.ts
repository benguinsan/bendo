import {
  spawn,
  type ChildProcess,
  type SpawnOptions,
} from "node:child_process";

type SpawnFixedOptions = Omit<SpawnOptions, "shell">;

type ProcessTarget = {
  getNpmCommand: () => string;
  getPnpmCommand: () => string;
  shouldDetachChild: () => boolean;
  killProcessTree: (child: ChildProcess) => void;
  /**
   * Spawn a fixed command + argv. On Windows, routes `.cmd` shims through
   * `cmd.exe /d /s /c` so CreateProcess can run them; other platforms spawn directly.
   */
  spawnCommand: (
    command: string,
    args: readonly string[],
    options: SpawnFixedOptions
  ) => ChildProcess;
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

/** Quote one argv token for cmd.exe so spaces / `()` / `&` etc. stay literal. */
function quoteCmdArg(arg: string): string {
  if (arg.length === 0) {
    return '""';
  }
  if (!/[\s"<>|&()^%!]/.test(arg)) {
    return arg;
  }
  return `"${arg.replace(/"/g, '""')}"`;
}

function spawnViaCmd(
  command: string,
  args: readonly string[],
  options: SpawnFixedOptions
): ChildProcess {
  const comspec = process.env.ComSpec?.trim() || "cmd.exe";
  const cmdline = [command, ...args].map(quoteCmdArg);
  return spawn(comspec, ["/d", "/s", "/c", ...cmdline], {
    ...options,
    shell: false,
    windowsHide: true,
  });
}

function spawnDirect(
  command: string,
  args: readonly string[],
  options: SpawnFixedOptions
): ChildProcess {
  return spawn(command, [...args], {
    ...options,
    shell: false,
  });
}

const win32: ProcessTarget = {
  getNpmCommand: () => "npm.cmd",
  getPnpmCommand: () => "pnpm.cmd",
  shouldDetachChild: () => false,
  spawnCommand: spawnViaCmd,
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
  getPnpmCommand: () => "pnpm",
  shouldDetachChild: () => true,
  spawnCommand: spawnDirect,
  killProcessTree: killUnixProcessTree,
};

const linux: ProcessTarget = {
  getNpmCommand: () => "npm",
  getPnpmCommand: () => "pnpm",
  shouldDetachChild: () => true,
  spawnCommand: spawnDirect,
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
export const getPnpmCommand = target.getPnpmCommand;
export const shouldDetachChild = target.shouldDetachChild;
export const killProcessTree = target.killProcessTree;
export const spawnCommand = target.spawnCommand;
