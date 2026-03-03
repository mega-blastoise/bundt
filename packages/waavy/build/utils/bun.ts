import fs from "fs/promises";
import path from "path";
import config from "@pkg/config";
import type { BuildBunRuntimeOutputOptions } from "../types";

import { handleBunBuildOutput } from "./handler";
import log from "./log";

const defaultBunOutputPath = path.resolve(config.build.output.directory, "bun");

export async function buildBunRuntimeOutput(options: BuildBunRuntimeOutputOptions) {
  const {
    entrypoint,
    external,
    root = "./lib",
    verbose = false,
    overrides = {
      outdir: defaultBunOutputPath,
    },
  } = options;
  let succeeded = true;
  const startTime = performance.now();
  try {
    const outdir = overrides.outdir || defaultBunOutputPath;

    if (!(await fs.exists(outdir))) {
      await fs.mkdir(outdir, { recursive: true });
    }

    const defaultBuildOptions = config.build.defaultBuildOptions(external, outdir);

    const result = await Bun.build({
      ...defaultBuildOptions,
      ...overrides,
      root,
      target: "bun",
      entrypoints: [entrypoint],
      format: "esm",
    });

    handleBunBuildOutput(result, startTime, verbose);
  } catch (error) {
    log.extend("error")(`Node build failed: ${error}`);
    succeeded = false;
  }

  return succeeded;
}

export async function buildBunRuntimeExecutable(verbose = false) {
  try {
    await buildBunRuntimeOutput({
      entrypoint: config.build.sources.cli.root,
      external: config.build.dependencies.external,
      root: "./lib",
      verbose,
      overrides: {
        outdir: path.resolve(config.build.output.directory, "bun"),
        throw: true,
        minify: true,
      },
    });
    return true;
  } catch (e: unknown) {
    console.error("An error occurred when trying to build bunRuntimeExecutables()");
    console.error(e);
    return false;
  }
}
