import { resolve } from "path";
import { concurrent_build } from "./utils";
import { createNodeShimConfig } from "@bundt/internal-build-utils";
import { bun_config } from "./bun_";
import { node_config } from "./node_";

const distDir = resolve(import.meta.dir, "../dist");

await Bun.$`rm -rf ${distDir}`;
await Bun.$`mkdir -p ${distDir}`;

await concurrent_build(
  bun_config as Bun.BuildConfig,
  node_config as Bun.BuildConfig,
  createNodeShimConfig('ollama') as Bun.BuildConfig,
);
