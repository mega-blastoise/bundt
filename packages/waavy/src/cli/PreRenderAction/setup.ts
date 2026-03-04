import type { CAC } from "cac";
import Features from "@/utils/models/Features";
import prerenderAction from "./Action";

export function setupPrerenderAction(cli: CAC) {
  const enabled = Features.isEnabled("COMMAND_LINE_ACTIONS_PRERENDER");
  if (!enabled) return;

  cli.command("prerender", "Pre-render React components").action(async () => {
    try {
      await prerenderAction({});
    } catch (e) {
      console.warn("[waavy:prerender] Action failed:", e);
    }
  });
}
