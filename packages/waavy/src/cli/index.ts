import type { Command } from "commander";
import colors from "picocolors";
import _ from "@pkg/config";

export function setupProgramMetadata(program: Command, version: string): Command {
  return program
    .name(colors.bold(colors.cyan(_.name)))
    .version(version)
    .description(colors.dim(_.description));
}

export function setupProgramActions(program: Command, setupCommands: Array<(program: Command) => void>) {
  setupCommands.forEach((setupCmd) => setupCmd(program));
  return program;
}
