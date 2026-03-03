import type { Command } from "commander";
import Features from "@/utils/models/Features";
import renderAction from "./Action";
import { args, command, description, options } from "./index.metadata";

export function setupRenderAction(program: Command) {
  const enabled = Features.isEnabled("COMMAND_LINE_ACTIONS_RENDER");
  if (!enabled) return;

  const cmd = program.command(command).description(description);
  args.forEach((arg) => cmd.argument(arg.name, arg.description));
  options.forEach((opt) => cmd.option(opt.flags, opt.description, opt?.default));
  cmd.action(async (componentPath, options) => await renderAction(componentPath, options));

  return program;
}
