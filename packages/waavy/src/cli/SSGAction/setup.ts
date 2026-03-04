import type { CAC } from "cac";
import fs from "fs/promises";
import colors from "picocolors";
import path from "path";
import Features from "@/utils/models/Features";
import { getWaavyConfig } from "../common";
import ssgAction from "./Action";
import type { StaticSiteGenerationActionConfiguration } from "@/types/cli/ssg";
import { scanForPagesDir, getPageDirEnts, transformPathsToReactModules } from "./utils";
import { formatError } from "@/utils";

const WAAVY_SSG_EXIT_CODE = 1 as const;

export function setupStaticSiteGenAction(cli: CAC) {
  const enabled = Features.isEnabled("COMMAND_LINE_ACTIONS_SSG");
  if (!enabled) return;

  cli
    .command("ssg", "Bundle a static site for production with waavy")
    .option("-v, --verbose", "Enable verbose output", { default: false })
    .action(async () => {
      try {
        const waavySSGConfig = (getWaavyConfig("ssg") || {}) as StaticSiteGenerationActionConfiguration;
        const pathsToWaavyReactPages = waavySSGConfig?.pages || (await scanForPagesDir());
        const pages: string[] = await produceWaavyReactPages(pathsToWaavyReactPages);
        if (pages.length === 0) handleMissingWaavyPagesDirectory();
        const pageConfigurations = await transformPathsToReactModules(pages);
        const outdir = waavySSGConfig?.outdir || path.join(process.cwd(), "./waavy-out");
        await ssgAction({
          outdir,
          pages: pageConfigurations,
          bootstrapModules: waavySSGConfig?.bootstrapModules,
          disableHydrationBundling: waavySSGConfig.disableHydrationBundling,
        });
        console.log(colors.green("Static site generation completed successfully!"));
        console.log(colors.dim(`Output: "${outdir}"`));
      } catch (e) {
        console.error(
          colors.red("An error was thrown while attempting to prepare your static site with 'waavy ssg'"),
        );
        console.error(e instanceof Error ? formatError(e) : e);
        process.exit(WAAVY_SSG_EXIT_CODE);
      }
    });
}

async function produceWaavyReactPages(pathsToWaavyReactPages: string | string[] | null): Promise<string[]> {
  if (pathsToWaavyReactPages == null) handleMissingWaavyPagesDirectory("/ <***INPUT DIR IS NULL***> /");
  else if (typeof pathsToWaavyReactPages === "string") {
    const pageDirEnts = await getPageDirEnts(pathsToWaavyReactPages);
    if (pageDirEnts.length === 0) {
      handleMissingWaavyPagesDirectory(pathsToWaavyReactPages);
    } else {
      return pageDirEnts.map((ent) => path.join(ent.parentPath, ent.name));
    }
  } else if (Array.isArray(pathsToWaavyReactPages)) {
    if (pathsToWaavyReactPages.length === 0) handleMissingWaavyPagesDirectory();

    const pages = [];
    const missingFiles: string[] = [];
    for (const pathToWaavyReactPage of pathsToWaavyReactPages) {
      try {
        await fs.access(
          path.isAbsolute(pathToWaavyReactPage)
            ? pathToWaavyReactPage
            : path.join(process.cwd(), pathToWaavyReactPage),
          fs.constants.R_OK,
        );
        pages.push(pathToWaavyReactPage);
      } catch (e) {
        missingFiles.push(pathToWaavyReactPage);
      }
    }

    for (const missingFile of missingFiles) {
      const idx = pathsToWaavyReactPages.indexOf(missingFile);
      if (idx !== -1) {
        console.warn(colors.yellow(`File not found, removing from pages: ${missingFile}`));
        pathsToWaavyReactPages.splice(idx, 1);
      }
    }

    return pages;
  } else {
    handleMissingWaavyPagesDirectory();
  }
  return [];
}

function handleMissingWaavyPagesDirectory(dir?: string) {
  const msg = `Waavy "static-site-generation" failed: unable to find a valid Waavy React Pages directory.`;
  console.error(colors.bold(colors.red(msg)));
  if (dir) {
    console.error(`The directory "${dir}" does not exist or is not a valid Waavy React Pages directory.`);
  }
  throw new Error(`Unable to find a "Waavy React Pages Input Directory"`);
}
