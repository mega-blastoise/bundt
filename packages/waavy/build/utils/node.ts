import config from "@pkg/config";
import type { BuildESMRuntimeOutputOptions } from "../types";
import { handleBunBuildOutput } from "./handler";
import log from "./log";
import path from "path";

export async function buildESMOutput(options: BuildESMRuntimeOutputOptions) {
  const { entrypoint, root = "./lib", target, verbose = false, overrides = {} } = options;
  let succeeded = true;
  const startTime = performance.now();
  try {
    const defaultBuildOptions = config.build.defaultBuildOptions();
    const result = await Bun.build({
      ...defaultBuildOptions,
      root,
      target,
      entrypoints: [entrypoint],
      format: "esm",
      ...overrides,
    });
    handleBunBuildOutput(result, startTime, verbose);
  } catch (error) {
    log.extend("error")(`Node build failed: ${error}`);
    succeeded = false;
  }

  return succeeded;
}

/**
 * @deprecated
 */
export async function buildJavascriptRuntimeCommands(verbose = false) {
  /**
   * The render command cannot be run with a node runtime,
   * it can only be run with `bun` or as a platform executable
   */
  const commands = Object.entries(config.build.sources.cli)
    .filter(([key]) => key !== "render")
    .map(([, source]) => source);

  const buildPromises = commands.map((command) =>
    buildESMOutput({
      entrypoint: command,
      target: "node",
      root: "./lib/commands",
      verbose,
      overrides: {
        outdir: path.resolve(config.build.output.directory, "commands"),
      },
    }),
  );

  const passed = (await Promise.all(buildPromises)).reduce((prev, next) => prev && next, true);

  return passed;
}
