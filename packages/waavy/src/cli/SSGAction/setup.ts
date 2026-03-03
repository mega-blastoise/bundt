import { type Command } from "commander";
import debug from "debug";
import fs from "fs/promises";
import colors from "picocolors";
import path from "path";
import Features from "@/utils/models/Features";
import { getWaavyConfig } from "../common";
import { description, command, options } from "./index.metadata";
import ssgAction from "./Action";
import type { StaticSiteGenerationActionConfiguration } from "@/types/cli/ssg";
import { scanForPagesDir, getPageDirEnts, transformPathsToReactModules } from "./utils";
import { formatError } from "@/utils";

const log = debug("waavy:static-site-generator");
const err = log.extend("error");

// https://tldp.org/LDP/abs/html/exitcodes.html
const WAAVY_SSG_EXIT_CODE = 1 as const;

export function setupStaticSiteGenAction(program: Command) {
  const enabled = Features.isEnabled("COMMAND_LINE_ACTIONS_SSG");
  if (!enabled) return;
  const cmd = program.command(command).description(description);
  options.forEach((option) => cmd.option(option.flags, option.description, option.default));
  cmd.action(async () => {
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
      log(`Static site generation completed successfully!`);
      log(`Your static site has been generated in "${outdir}"`);
    } catch (e) {
      err("An error was thrown while attempting to prepare your static site with 'waavy ssg'");
      err(e instanceof Error ? formatError(e) : e);
      process.exit(WAAVY_SSG_EXIT_CODE);
    }
  });
}

async function produceWaavyReactPages(pathsToWaavyReactPages: string | string[] | null): Promise<string[]> {
  if (pathsToWaavyReactPages == null) handleMissingWaavyPagesDirectory("/ <***INPUT DIR IS NULL***> /");
  else if (typeof pathsToWaavyReactPages === "string") {
    log(`Found a single Waavy React Pages directory at "${pathsToWaavyReactPages}"`);
    const pageDirEnts = await getPageDirEnts(pathsToWaavyReactPages);
    if (pageDirEnts.length === 0) {
      handleMissingWaavyPagesDirectory(pathsToWaavyReactPages);
    } else {
      const pages = pageDirEnts.map((ent) => path.join(ent.parentPath, ent.name));
      log(`Found ${pages.length} Waavy React Page(s) in "${pathsToWaavyReactPages}"`);
      return pages;
    }
  } else if (Array.isArray(pathsToWaavyReactPages)) {
    if (pathsToWaavyReactPages.length === 0) handleMissingWaavyPagesDirectory();

    const pages = [];
    /**
     * It's assumed that if we're supplied an array of strings,
     * that the strings represent the paths to valid Waavy React Page files,
     * and not entire directories.
     */

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

    while (missingFiles.length > 0) {
      const missingFile = missingFiles.pop();
      if (missingFile && pathsToWaavyReactPages.indexOf(missingFile) !== -1) {
        err(`The file "${missingFile}" does not exist or is not a valid Waavy React Page file.`);
        err.extend("warn")(`Removing ${missingFile} from the list of Waavy React Pages to process`);
        pathsToWaavyReactPages.splice(pathsToWaavyReactPages.indexOf(missingFile), 1);
      }
    }

    log(`Found ${pages.length} Waavy React Page(s) in "${pathsToWaavyReactPages}"`);

    return pages;
  } else {
    handleMissingWaavyPagesDirectory();
  }
  /** Typescript is not smart enough to realize we won't hit this */
  return [];
}

function handleMissingWaavyPagesDirectory(dir?: string) {
  err(
    colors.bold(
      colors.red(
        `Waavy "static-site-generation" failed due to being unable to find a valid Waavy React Pages directory.`,
      ),
    ),
  );
  if (dir) {
    err(`The directory "${dir}" does not exist or is not a valid Waavy React Pages directory.`);
  }
  err(`Waavy will by default look for the following directories, and assume them to be valid Waavy React Pages:
    
    - ./pages
    - ./www/pages
    - ./www/src/pages
    - ./www/lib/pages
    - ./web/pages
    - ./web/src/pages
    - ./web/lib/pages
    - ./client/pages
    - ./client/src/pages
    - ./client/lib/pages
    - ./browser/pages
    - ./browser/src/pages
    - ./browser/lib/pages

    It's likely that if you are seeing this error, that none of those directories exist.

    If you're seeing this error and the supplied directory exists, it is likely empty.

    You can resolve this issue in a number of ways, including the following:

    - Moving your React Page Components to one of the above directories
    - Setting up a "waavy.config.ts" file, and specifying ssg input pages.

    For more information about Waavy React Pages, see <https://waavy.dev/docs/react/waavy-react-pages>
  `);

  throw new Error(`Unable to find a "Waavy React Pages Input Directory"`);
}
