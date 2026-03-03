import { mkdir } from "fs/promises";

import log from "./log";

export async function ensureOutDir(outdir: string) {
  try {
    await mkdir(outdir, { recursive: true });
    log.extend("debug")(`Created output directory: ${outdir}`);
  } catch (error) {
    log.extend("warn")(`Output directory already exists or couldn't be created: ${error}`);
  }
}
