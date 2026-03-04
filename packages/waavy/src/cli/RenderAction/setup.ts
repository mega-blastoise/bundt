import type { CAC } from "cac";
import Features from "@/utils/models/Features";
import renderAction from "./Action";

export function setupRenderAction(cli: CAC) {
  const enabled = Features.isEnabled("COMMAND_LINE_ACTIONS_RENDER");
  if (!enabled) return;

  cli
    .command("render <path-to-component>", "Render a React component into a stdout stream or to a provided pipe")
    .option("-p, --props <props>", "The props to pass to the component", { default: "{}" })
    .option("-n, --name <name>", "The name of the component, if left blank, it assumes a default export", {
      default: "default",
    })
    .option("-b, --bootstrap <files>", "Files to bootstrap on the client for hydration")
    .option("--cache", "Cache render output for repeated calls with same props", { default: false })
    .option("--cache-type <type>", "Cache backend: bunfs or bunsqlite3")
    .option("--cache-key <password>", "Password for encrypting cached files")
    .option("--pipe <path>", "Pipe rendered output to a named pipe instead of stdout")
    .option("--request <request>", "Request object to pass to the loader function", { default: "{}" })
    .option("--await", "Collect full render before writing to stdout", { default: false })
    .option("--serialize <format>", "Write to stdout in a serialized format (e.g. JSON)", { default: false })
    .option("--error-page-path <path>", "Fallback page to render on error")
    .option("--error-page-component-name <name>", "Name of the Error page component to import", {
      default: "default",
    })
    .option("--selector <selector>", "CSS selector for the React mount point")
    .option("--pcache-key <key>", "Window property key for props assignment")
    .option("-v, --verbose", "Enable verbose log output", { default: false })
    .option("--max-timeout <seconds>", "Seconds before aborting server-rendering")
    .option("--chunk <size>", "Progressive chunk size")
    .option("--fail-silently", "Fail silently instead of rendering an error page", { default: false })
    .action(async (componentPath: string, options: Record<string, unknown>) => {
      await renderAction(componentPath, options as any);
    });
}
