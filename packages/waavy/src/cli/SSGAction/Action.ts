import fs from "fs/promises";
import { type SSGAction } from "@/types/cli/ssg";
import DuplicateRouteDefinitionsError from "@/errors/DuplicateRouteDefinitions";
import { handleStaticRoute } from "./utils";

/**
 * Goals for the static-site-gen action
 *
 * Zero command line arguments or parameters (maybe verbose)
 *
 * Either we lean on the sane defaults,
 *
 * OR
 *
 * If you want a very granular control over your static site generation, create a waavy.config.js or waavy.config.ts file
 */
const ssgAction: SSGAction = async (options) => {
  const { outdir, pages, bootstrapModules = [], disableHydrationBundling = false } = options;

  try {
    await fs.access(outdir, fs.constants.O_DIRECTORY);
  } catch (e) {
    await fs.mkdir(outdir, { recursive: true });
  }

  /**
   * For each Waavy React Page we'd like to do the following -
   *
   * Load Phase (First),
   * We've already loaded the following by this point:
   *
   * - The React Page as a React.ComponentType<Props>
   * - The `getStaticProps<Props>` function from the Waavy React Page file, if one exists,
   * - A `route` object from the Waavy React Page file, if one exists,
   * - A `routes` array from the Waavy React Page file, if one exists,
   *
   * If we have a `getStaticProps<Props>` function, call it and load static props.
   * If we have a `routes` config, iterate for each route, create a StaticContext,
   * and call `getStaticProps<Props>` for each route and produce each static page.
   *
   * Now we have:
   *
   * - Component,
   * - Props
   *
   *
   */
  for (const page of pages) {
    if (page.route && page.routes && page.routes.length > 0)
      throw new DuplicateRouteDefinitionsError(page.filename);

    const { route, routes = [], ...rest } = page;
    if (route) {
      handleStaticRoute(rest, route, outdir);
    } else {
      await Promise.all(routes.map((route) => handleStaticRoute(page, route, outdir)));
    }
  }
};

export default ssgAction;
