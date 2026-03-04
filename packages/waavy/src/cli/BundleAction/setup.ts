import type { CAC } from "cac";
import colors from "picocolors";

import Features from "@/utils/models/Features";
import type WaavyConfiguration from "@/types/IWaavyConfiguration";
import type { BundleOptions, BundleCommandLineOptions } from "@/types/cli/bundle";

import { getWaavyConfig } from "../common";
import bundleAction from "./Action";
import { formatError } from "@/utils";

const WAAVY_BUNDLE_EXIT_CODE = 1 as const;

export function setupBundleAction(cli: CAC) {
  const enabled = Features.isEnabled("COMMAND_LINE_ACTIONS_BUNDLE");
  if (!enabled) return;

  cli
    .command("bundle", "Bundle client side javascript into production assets.")
    .option("-d, --dir <dir>", "The input directory to bundle")
    .option("-o, --out <dir>", 'Where to put the built output files. Default: "waavy-out"')
    .option("--clean", "Clean the output directory before building.", { default: false })
    .option("--verbose", "Verbose output.", { default: false })
    .option("--dry-run", "Only show what would be built, don't actually build anything.", { default: false })
    .action(async (options: BundleCommandLineOptions) => {
      try {
        const waavyBundleConfiguration: WaavyConfiguration["bundle"] =
          ((await getWaavyConfig("bundle")) as WaavyConfiguration["bundle"]) || {};

        const { bundler = { bundler: "default", configOverrides: {} }, options: waavyBundleOptions = {} } =
          waavyBundleConfiguration;

        const bundleOptions: BundleOptions = {
          bundler: {
            bundler: typeof bundler === "string" ? bundler : bundler.bundler,
            configOverrides: typeof bundler === "string" ? {} : bundler.configOverrides,
          },
          clean: options?.clean || waavyBundleOptions?.clean,
          dir: options?.dir || waavyBundleOptions?.dir || "./www/src/browser",
          dryRun: options?.dryRun || waavyBundleOptions?.dryRun,
          out: options?.out || waavyBundleOptions?.out || "./waavy-out",
          verbose: options?.verbose || waavyBundleOptions?.verbose,
        };

        await bundleAction(bundleOptions);
      } catch (e) {
        console.error(
          colors.bold(
            colors.red(
              `Waavy "bundle" encountered an error while trying to prepare your production assets.\n\nSee the log output below.`,
            ),
          ),
        );
        console.error(e instanceof Error ? formatError(e) : e);
        process.exit(WAAVY_BUNDLE_EXIT_CODE);
      }
    });
}
