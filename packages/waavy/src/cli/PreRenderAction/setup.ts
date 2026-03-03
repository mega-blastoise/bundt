import { type Command } from "commander";
import Features from "@/utils/models/Features";
import prerenderAction from "./Action";

export function setupPrerenderAction(program: Command) {
  const enabled = Features.isEnabled("COMMAND_LINE_ACTIONS_PRERENDER");
  if (!enabled) return;
  program
    .command("prerender")
    .description("TODO")
    .action(async (options) => {
      try {
        await prerenderAction({});
      } catch (e) {}
    });
}
