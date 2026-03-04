import cac from "cac";
import { setupBundleAction } from "./cli/BundleAction";
import { setupPrerenderAction } from "./cli/PreRenderAction";
import { setupRenderAction } from "./cli/RenderAction";
import { setupStaticSiteGenAction } from "./cli/SSGAction";
import ProcessManager from "./utils/models/ProcessManager";
import { getVersion } from "./utils";

ProcessManager.setupHandlers();

const cli = cac("waavy");
cli.version(getVersion() as string);

setupBundleAction(cli);
setupPrerenderAction(cli);
setupStaticSiteGenAction(cli);
setupRenderAction(cli);

cli.help();
cli.parse();
