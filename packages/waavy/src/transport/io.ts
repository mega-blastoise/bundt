/**
 * The process I/O seam used by transports and CLI commands. Commands write
 * through this interface instead of touching `process` directly, so tests can
 * capture output and so every write honors stdout backpressure.
 */

/** Output channels of a command invocation. */
export type CommandIO = {
  /** Writes to stdout and resolves once the data has been handed to the OS. */
  writeStdout: (chunk: string | Uint8Array) => Promise<void>;
  /** Writes one line to stderr (a trailing newline is added). */
  writeStderrLine: (line: string) => void;
  /** Reads all of stdin as UTF-8. */
  readStdin: () => Promise<string>;
};

/** {@link CommandIO} bound to the current process. */
export function processIO(): CommandIO {
  return {
    writeStdout: (chunk) =>
      new Promise<void>((resolve, reject) => {
        process.stdout.write(chunk, (error) => (error ? reject(error) : resolve()));
      }),
    writeStderrLine: (line) => {
      process.stderr.write(`${line}\n`);
    },
    readStdin: () => Bun.stdin.text()
  };
}
