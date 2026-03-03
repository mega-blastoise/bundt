import type { PageConfiguration } from "@/types/cli/ssg";
import { load } from "@/utils";
import { access, constants } from "fs/promises";

export async function loadReactWaavyModulesFromPath<Props>(path: string): Promise<PageConfiguration<Props>> {
  try {
    await access(path, constants.R_OK);
    const Component = await load(path, "default");
    const getStaticProps = await load(path, "getStaticProps");
    const routes = await load(path, "routes");
    const route = await load(path, "route");
    const options = await load(path, "options");
    return {
      filename: path,
      Component,
      getStaticProps,
      options,
      routes,
      route,
    };
  } catch (error) {
    console.error(`Error reading directory ${path}:`, error);
    console.error("Cannot recover or assume integrity without all pages being loaded.");
    throw error;
  }
}

export async function transformPathsToReactModules(paths: string[]) {
  return Promise.all(paths.map((path) => loadReactWaavyModulesFromPath(path)));
}
