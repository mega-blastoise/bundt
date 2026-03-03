#!/usr/bin/env node

import cac from "cac";
import child_process from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pkg from "../package.json" with { type: "json" };
import {
  warnMissingReactDepsAndExit,
  warnMissingWaavyExecutableAndExit,
  warnUnsupportedPlatformAndExit,
  warnUnsupportedCommandAndExit,
} from "./lib/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const __waavyd = path.dirname(__dirname);

const SUPPORTED_ARCHS = Object.freeze(["x64", "arm64"]);
const SUPPORTED_PLATFORMS = Object.freeze(["linux", "darwin", "win32"]);
const SUPPORTED_COMMAND_LINE_ARGS = Object.freeze(["bundle", "help", "prerender", "render", "ssg"]);

const platform = process.platform;
const arch = process.arch;

if (!SUPPORTED_PLATFORMS.includes(platform) || !SUPPORTED_ARCHS.includes(arch)) {
  warnUnsupportedPlatformAndExit();
}

const programArgs = cac("waavy").parse();
const command = programArgs.args[0] || "help";

if (!SUPPORTED_COMMAND_LINE_ARGS.includes(command)) {
  warnUnsupportedCommandAndExit(command);
}

try {
  await import("react");
  await import("react-dom");
} catch (e) {
  warnMissingReactDepsAndExit();
}

const executable = platform === "win32" ? "waavy.exe" : "waavy";
const execPath = path.join(__dirname, executable);

if (!fs.existsSync(execPath)) {
  warnMissingWaavyExecutableAndExit(execPath);
}

const child = child_process.spawn(execPath, process.argv.slice(2), {
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_ENV: "production",
    WAAVY_BIN: execPath,
    WAAVY_ROOT: __waavyd,
    WAAVY_VERSION: `v${pkg.version}`,
  },
});

child.on("exit", (code) => {
  process.exit(code);
});
