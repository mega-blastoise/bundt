import { resolve } from "path";
import { concurrent_build } from "./utils";
import { createNodeShimConfig } from "@bundt/internal-build-utils";
import { bun_lib_config, bun_cli_config } from "./bun_";

const distDir = resolve(import.meta.dir, "../dist");

await Bun.$`rm -rf ${distDir}`;
await Bun.$`mkdir -p ${distDir}`;

await concurrent_build(
  bun_lib_config as Bun.BuildConfig,
  bun_cli_config as Bun.BuildConfig,
  createNodeShimConfig('dxdocs') as Bun.BuildConfig,
);

const srcCss = resolve(import.meta.dir, "../src/theme/styles.css");
const destCss = resolve(distDir, "theme/styles.css");
await Bun.$`mkdir -p ${resolve(distDir, "theme")}`;
await Bun.$`cp ${srcCss} ${destCss}`;

console.log("Copied theme/styles.css to dist/");
