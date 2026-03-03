import { Command } from "commander";
import { setupProgramActions, setupProgramMetadata } from "./cli/index";
import { setupBundleAction } from "./cli/BundleAction";
import { setupPrerenderAction } from "./cli/PreRenderAction";
import { setupRenderAction } from "./cli/RenderAction";
import { setupStaticSiteGenAction } from "./cli/SSGAction";
import ProcessManager from "./utils/models/ProcessManager";
import { getVersion } from "./utils";

ProcessManager.setupHandlers();

const program = new Command();
setupProgramMetadata(program, getVersion() as string);
setupProgramActions(program, [
  setupBundleAction,
  setupPrerenderAction,
  setupStaticSiteGenAction,
  setupRenderAction,
]);

program.parse(process.argv);
