import path from "path";
import config from "@pkg/config";
import type { PlatformExecutableBunTarget } from "../types";
import log from "./log";

export async function buildExecutable(
  entrypoint: string,
  targetConfig: PlatformExecutableBunTarget,
  verbose = false,
) {
  const startTime = performance.now();
  const outdir = path.resolve(config.build.output.directory, "executables");
  const external = config.build.dependencies.external;
  const outfile = path.join(outdir, targetConfig.name);

  try {
    /**
     * Currently, there is no Javascript API for Bun's "Single File Executable"
     * And so in order to build the executable, we have to use the CLI based build api
     * @see https://bun.sh/docs/bundler/executables
     */
    const buildCommand: string[] = [
      "bun",
      "build",
      "--compile",
      "--minify",
      `--target=${targetConfig.target}`,
      ...external.map((pkg) => `--external=${pkg}`),
      entrypoint,
      `--outfile=${outfile}`,
    ];

    log.extend("debug")(`Running: ${buildCommand.join(" ")}`);

    const proc = Bun.spawn(buildCommand, {
      stdout: verbose ? "inherit" : "pipe",
      stderr: "pipe",
    });

    const exitCode = await proc.exited;

    if (exitCode === 0) {
      const duration = Math.round(performance.now() - startTime);

      try {
        const stat = Bun.file(outfile).size;
        const sizeInMB = (stat / (1024 * 1024)).toFixed(1);
        log(`${targetConfig.platform} executable built in ${duration}ms (${sizeInMB}MB)`);
      } catch {
        log(`${targetConfig.platform} executable built in ${duration}ms`);
      }
    } else {
      log.extend("error")(`Failed to build ${targetConfig.platform} executable (exit code: ${exitCode})`);
      const stderr = await new Response(proc.stderr).text();
      if (stderr) console.error(stderr);
      return false;
    }
  } catch (error) {
    log.extend("error")(`Failed to build ${targetConfig.platform} executable: ${error}`);
    return false;
  }

  return true;
}

export async function buildWaavyPlatformExecutables(specificTarget?: string, verbose = false) {
  const targets = config.build.targets;
  const matches = specificTarget
    ? targets.filter((t) => t.name.includes(specificTarget) || t.target.includes(specificTarget))
    : targets;

  if (matches.length === 0) {
    log.extend("error")(`No targets found matching: ${specificTarget}`);
    return false;
  }

  if (specificTarget) {
    log(`Building specific target(s): ${targets.map((t) => t.platform).join(", ")}`);
  }

  let successCount = 0;

  for (const match of matches) {
    const success = await buildExecutable(config.build.sources.cli.root, match, verbose);
    if (success) successCount++;
  }

  if (successCount === matches.length) {
    log(`All ${matches.length} executables built successfully!`);
    return true;
  } else {
    log.extend("error")(`${matches.length - successCount}/${matches.length} executable builds failed`);
    return false;
  }
}
