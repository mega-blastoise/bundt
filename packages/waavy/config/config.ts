import path from "path";
import PackageJson from "@pkg/metadata";

const __externalDeps = Object.keys(PackageJson.peerDependencies);
const __requiredDeps = Object.keys(PackageJson.dependencies);
const __devDeps = Object.keys(PackageJson.devDependencies);
const __outdir = path.resolve(path.join(process.cwd(), "out"));

const name = "waavy";
const description = `A library for rendering React components in non-javascript server runtimes.\n\n\tFor more information, visit: https://github.com/nicholasgalante1997/waavy`;

export default {
  name,
  description,
  build: {
    sources: {
      cli: {
        root: "lib/index.ts",
      },
      exports: {
        server: "lib/exports/server.ts" as const,
        browser: "lib/exports/browser.ts" as const,
      },
    },
    targets: [
      {
        name: "waavy-linux-x64",
        target: "bun-linux-x64-modern",
        platform: "linux",
        arch: "x64",
      },
      {
        name: "waavy-linux-arm64",
        target: "bun-linux-arm64",
        platform: "linux",
        arch: "arm64",
      },
      {
        name: "waavy-macos-x64",
        target: "bun-darwin-x64",
        platform: "darwin",
        arch: "x64",
      },
      {
        name: "waavy-macos-arm64",
        target: "bun-darwin-arm64",
        platform: "darwin",
        arch: "arm64",
      },
      {
        name: "waavy-windows-x64",
        target: "bun-windows-x64",
        platform: "win32",
        arch: "x64",
      },
    ] as const,
    dependencies: {
      development: __devDeps,
      external: __externalDeps,
      required: __requiredDeps,
    },
    output: {
      directory: __outdir,
    },
    defaultBuildOptions: (
      external: string[] = __externalDeps,
      outdir: string = __outdir,
    ): Partial<Bun.BuildConfig> => ({
      external,
      outdir,
      minify: true,
      sourcemap: "linked" as const,
      splitting: false,
      root: "./lib",
      packages: "bundle" as const,
      define: {
        "process.env.NODE_ENV": '"production"',
      },
    }),
  },
  features: {
    COMMAND_LINE_ACTIONS_BUNDLE: true,
    COMMAND_LINE_ACTIONS_PRERENDER: false,
    COMMAND_LINE_ACTIONS_RENDER: true,
    COMMAND_LINE_ACTIONS_SSG: true,
  },
};
