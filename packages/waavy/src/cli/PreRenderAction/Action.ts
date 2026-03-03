import { type PrerenderAction } from "@/types/cli/prerender";
import { noop } from "@/utils";

const prerenderAction: PrerenderAction = async (options) => noop();

export default prerenderAction;
