import debug from "debug";
import util from "util";
import config from "@pkg/config";

import type { WaavyBuildOptions } from "./types";
import { buildBunRuntimeExecutable } from "./utils/bun";
import { ensureOutDir } from "./utils/dir";
import { buildWaavyPlatformExecutables } from "./utils/executable";
import { buildExports } from "./utils/exports";

import log from "./utils/log";

export async function build(options: WaavyBuildOptions) {
  const verbose = options.verbose;
  const specificTarget = options.target;

  const targets = config.build.targets;
  const outdir = config.build.output.directory;

  if (verbose) {
    debug.enable("waavy:*");
    log(`Verbose logging enabled!`);
    log(util.inspect({ options, targets }, true, 4, true));
  }

  const buildStartTime = performance.now();
  log("🚀 Starting Waavy build process...");

  await ensureOutDir(outdir);

  /**
   * Build Library Exports => ./lib/exports => ./out/browser.js & ./out/server.js
   */
  const buildExportsPassed = await buildExports(verbose);

  /**
   * Build Executables => ./out/executables/*
   */
  const buildRenderCommandPlatformExecutablesPassed = await buildWaavyPlatformExecutables(
    specificTarget,
    verbose,
  );

  /**
   * Build Bun Runtime Commands => ./out/bun/*.js
   */
  const buildBunRuntimeCommandsPassed = await buildBunRuntimeExecutable(verbose);

  const passed =
    buildExportsPassed && buildRenderCommandPlatformExecutablesPassed && buildBunRuntimeCommandsPassed;

  const totalDuration = Math.round(performance.now() - buildStartTime);

  if (passed) {
    log(`🎉 Build completed successfully in ${totalDuration}ms`);
    process.exit(0);
  } else {
    log.extend("error")(`💥 Build failed after ${totalDuration}ms`);
    process.exit(1);
  }
}
