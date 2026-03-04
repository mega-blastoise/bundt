import cac from "cac";
import config from "@pkg/config";
import { build } from "./build";

const cli = cac("waavy-build");

cli
  .command("", "Build waavy artifacts")
  .option("--js", "Build JavaScript bundle only")
  .option("--bun", "Build bun executables only")
  .option("--executables", "Build executables only")
  .option("--all", "Build both JavaScript and executables (default)")
  .option("--target <name>", "Build specific target (e.g. --target=linux-x64)")
  .option("--verbose", "Verbose logging")
  .action(build);

cli.help();
cli.parse();
