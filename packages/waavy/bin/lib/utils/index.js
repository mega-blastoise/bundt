import { ErrorCodes } from "./errors.js";
import colors from "picocolors";

export function warnUnsupportedPlatformAndExit() {
  console.error(`Unsupported platform: ${platform} ${arch}
    
    Waavy only supports the following platforms:
    - Linux (x64, arm64)
    - macOS (x64, arm64)
    - Windows (x64)

    If you are on a different platform and you want to use waavy, please come drop a note in the GitHub repository:

      https://github.com/nicholasgalante1997/waavy/issues/new/
    
    If you are on a supported platform and still see this message, please check your Node.js version and ensure it is up to date.
    Supported Node.js versions: 20.x, 22.x, 24.x
    Supported Bun versions: 1.x
  `);
  process.exit(ErrorCodes.UnsupportedPlatformRuntimeError);
}

/**
 * @name warnUnsupportedCommandAndExit
 * @param {string} command
 */
export function warnUnsupportedCommandAndExit(command) {
  console.error(`Unsupported command: ${command}
    
    Waavy only supports the following commands:

    - bundle
    - prerender
    - render
    - ssg

    If you are trying to run experimental or pre-release commands, please check your version to ensure they are available and supported.
  `);

  process.exit(ErrorCodes.UnsupportedCommandRuntimeError);
}

export function warnMissingReactDepsAndExit() {
  console.error(`
    ${colors.red(`Missing Peer React Dependencies.`)}

    ${colors.red(`Please run the following command to install them:`)}

    ${colors.green(chalk.bold(`bun install react react-dom`))}

    `);

  process.exit(ErrorCodes.MissingReactDeps);
}

export function warnMissingWaavyExecutableAndExit(execPath) {
  console.error(
    colors.bold(colors.red("Binary not found. Try reinstalling the package. \nSearched for " + execPath)),
  );
  process.exit(ErrorCodes.MissingWaavyExecutable);
}
