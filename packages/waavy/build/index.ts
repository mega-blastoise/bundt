import { program } from "commander";
import config from "@pkg/config";
import { build } from "./build";
import { addBuildCommandBeforeText } from "./command";

addBuildCommandBeforeText(program, config.build.targets);

program
  .option("--js", "Build JavaScript bundle only")
  .option("--bun", "Build bun executables only")
  .option("--executables", "Build executables only")
  .option("--all", "Build both JavaScript and executables (default)")
  .option("--target <name>", "Build specific target (e.g. --target=linux-x64)")
  .option("--verbose, -v", "Verbose logging")
  .option("--help, -h", "Show this help")
  .action(build);

program.parse(process.argv);
