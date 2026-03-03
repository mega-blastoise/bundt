import { program } from "commander";
import type { PlatformExecutableBunTarget } from "../types";

export function addBuildCommandBeforeText(
  $program: typeof program,
  targets: readonly PlatformExecutableBunTarget[],
) {
  $program.addHelpText(
    "before",
    `
Usage: bun run build.ts [options]

Options:
  --js              Build JavaScript bundle only
  --executables     Build executables only  
  --all             Build both JavaScript and executables (default)
  --target=<name>   Build specific target (e.g. --target=linux-x64)
  --verbose, -v     Verbose logging
  --help, -h        Show this help

Available targets:
${targets.map((t) => `  ${t.name.padEnd(30)} ${t.platform}`).join("\n")}

Examples:
  bun run build.ts                    # Build everything
  bun run build.ts --js               # JS bundle only
  bun run build.ts --executables      # Executables only
  bun run build.ts --target=linux     # Linux targets only
  bun run build.ts --target=macos-arm64 --verbose  # Specific target with verbose logging
`,
  );
}
