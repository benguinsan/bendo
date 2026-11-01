/** Turn stream chunks into whole lines; `flush` emits the trailing partial line. */
export function createLineBuffer(onLine: (line: string) => void) {
  let pending = "";
  return {
    push(chunk: string): void {
      const lines = (pending + chunk).split(/\r?\n/);
      pending = lines.pop() ?? "";
      for (const line of lines) {
        if (line) onLine(line);
      }
    },
    flush(): void {
      const line = pending.replace(/\r$/, "");
      pending = "";
      if (line) onLine(line);
    },
  };
}
