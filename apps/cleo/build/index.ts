import { resolve } from "path";
import { concurrent_build } from "./utils";
import { bun_cli_config } from "./bun_";

const distDir = resolve(import.meta.dir, "../dist");

await Bun.$`rm -rf ${distDir}`;
await Bun.$`mkdir -p ${distDir}`;

await concurrent_build(
  bun_cli_config as Bun.BuildConfig,
);
