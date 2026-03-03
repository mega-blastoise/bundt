import debug from "debug";

export function handleBunBuildOutput(
  output: Awaited<ReturnType<typeof Bun.build>>,
  startTime?: number,
  verbose = false,
  log: debug.Debugger = debug("waavy:build"),
) {
  if (output.success) {
    const duration = Math.round(performance.now() - (startTime || 0));
    log(`JavaScript bundle built in ${duration}ms`);
    if (verbose) {
      output.outputs.forEach((output) => {
        log.extend("debug")(`Generated: ${output.path} (${Math.round(output.size / 1024)}KB)`);
      });
    }
  } else {
    log.extend("error")("JavaScript build failed:");
    output.logs.forEach((buildLog) => console.error(buildLog));
    throw new Error("JavaScript build failed");
  }
}
