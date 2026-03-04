import fs from "fs/promises";
import path from "path";

import HydrationError, { HydrationErrorEnum } from "@/errors/Hydration";

interface TempFileOptions {
  extension: "js" | "jsx" | "ts" | "tsx";
}

export async function bundleInlineCodeToDir(
  code: string,
  tempFile: string,
  outdir: string,
  buildOptionOverrides: Partial<Bun.BuildConfig> = {},
): Promise<Bun.BuildOutput> {
  try {
    await Bun.write(tempFile, code, { createPath: true });

    const format = "esm";
    const target = "browser";
    const minify = true;

    const result = await Bun.build({
      entrypoints: [tempFile],
      outdir,
      target,
      format,
      packages: "bundle",
      external: [],
      minify,
      splitting: false,
      sourcemap: "none",
      root: ".",
      ...buildOptionOverrides,
    });

    return result;
  } catch (e) {
    console.error("[bundleInlineCode]: An Exception was thrown during an attempt to build. %s", e);
    throw e;
  } finally {
    await fs
      .unlink(tempFile)
      .then(() => console.log("[bundleInlineCode::unlink]: Temp file deleted:", tempFile))
      .catch((err) => {
        console.error("[bundleInlineCode::unlink]: Error deleting temp file:", err);
      });
  }
}

export function getNodeModulesWaavyCache() {
  return path.join(process.cwd(), "node_modules", ".cache", "waavy");
}

export async function getTempFileInNodeModulesCache({ extension }: TempFileOptions) {
  const cacheDir = path.join(getNodeModulesWaavyCache(), ".browser", ".hydration-bundles");
  try {
    await fs.access(cacheDir, fs.constants.O_DIRECTORY);
  } catch (e: unknown) {
    try {
      await fs.mkdir(cacheDir, { recursive: true });
    } catch (e) {
      if ((e as any)?.code === "EEXIST") {
        // Do nothing
      } else {
        throw e;
      }
    }
  }
  const tempFile = path.join(cacheDir, `hydration-${Bun.randomUUIDv7()}.${extension}`);
  return tempFile;
}

export function handleHydrationBundleOutput(filename: string, output: Bun.BuildOutput) {
  console.log(`Build completed for ${filename}`);
  const { logs, outputs, success } = output;
  if (!success) {
    console.error("Build failed, printing log output...");
    logs.forEach((log) => console.error(log));
    throw new HydrationError(HydrationErrorEnum.BundleFailed);
  }

  outputs.forEach((output) => printBuildArtifactSummary(filename, output));
}

function printBuildArtifactSummary(input: string, artifact: Bun.BuildArtifact) {
  console.log(`Artifact Report for ${input}`);
  console.log("-----------------------------");
  console.log(`Output File: ${artifact.path}`);
  console.log(`Size: ${artifact.size} bytes`);
  console.log(`Type: ${artifact.type}`);
  console.log(`Artifact Kind: ${artifact.kind}`);
  console.log(`Integrity Hash: ${artifact.hash}`);
  console.log("-----------------------------");
}
