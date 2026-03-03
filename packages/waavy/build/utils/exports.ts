import config from "@pkg/config";
import log from "./log";
import { buildESMOutput } from "./node";

export async function buildExports(verbose = false) {
  const javascriptExports = [config.build.sources.exports.browser, config.build.sources.exports.server];
  let succeeded = true;
  log("Starting javascript library module export generation...");
  for (const jsExport of javascriptExports) {
    try {
      await buildESMOutput({
        entrypoint: jsExport,
        target: jsExport.includes("browser") ? "browser" : "node",
        verbose,
        root: "./lib/exports",
      });
    } catch (error) {
      log.extend("error")(`Node build failed: ${error}`);
      succeeded = false;
    }
  }

  return succeeded;
}
