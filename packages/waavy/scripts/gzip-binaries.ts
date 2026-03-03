import debug from "debug";
import { createReadStream, createWriteStream } from "fs";
import fs, { access, stat } from "fs/promises";
import path from "path";
import { performance } from "perf_hooks";
import { createGzip } from "zlib";
import { pipeline } from "stream/promises";
import config from "@pkg/config";

const MAX_FAILURES = 81;
const WINDOWS_DELAY_IN_CI_ENV = 1000; /** 1s */
const log = debug("waavy:compress:gzip");
const outdir = path.join(process.cwd(), "out", "executables");
const executables = config.build.targets.map((t) => path.resolve(outdir, t.name));
const start = performance.now();

await delayForWindowFileLockRelease()
  .then(fixWindowsFilePermissions)
  .then(waitForFiles)
  .then(compressRenderCommandExecutables)
  .then(() => log("Compression completed successfully in %d ms", Math.round(performance.now() - start)))
  .catch((error) => {
    const err = log.extend("error");
    err("Compression failed:", error);
    err("Failed in %d ms", Math.round(performance.now() - start));
    process.exit(1);
  });

async function compressRenderCommandExecutables() {
  await Promise.all(
    executables.map(async function (executable) {
      const gzip = createGzip({ level: 9, memLevel: 9 });
      const filepath = executable.includes("windows") ? executable + ".exe" : executable;
      const gzipPath = `${filepath}.gz`;
      const input = createReadStream(filepath);
      const output = createWriteStream(gzipPath);
      return await pipeline(input, gzip, output);
    }),
  );
}

async function waitForFiles() {
  let failures = 0;
  const files = [...executables];
  while (files.length > 0 && failures < MAX_FAILURES) {
    log(`Waiting for ${files.length} files to be ready...`);

    const file = files.shift()!;
    const filename = file.includes("windows") ? `${file}.exe` : file;

    log(`Waiting for ${file} to be ready...`);

    let errors = [];
    let failed = {
      access: false,
      stat: false,
    };

    try {
      await access(filename, fs.constants.R_OK);
      log(`Found ${filename}!`);
    } catch (error) {
      console.warn(`Unable to access file: ${filename}`);
      console.error(`Encountered error: ${error}`);
      errors.push({
        filename,
        fn: "fs.access",
        message: `Unable to access file: ${filename}`,
        error: error,
      });
      failed.access = true;
    }

    try {
      const stats = await stat(filename);
      log(`File size: ${stats.size} bytes`);
      if (stats.size === 0) {
        console.warn(`${filename} is empty, continuing`);
        throw new Error(`Missing ${filename}`);
      }
    } catch (error) {
      console.warn(`Unable to stat file: ${file}`);
      console.error("Encountering error: " + error);
      failed.stat = true;
      errors.push({
        filename,
        fn: "fs.stat",
        message: `Unable to stat file: ${filename}`,
        error: error,
      });
    }

    if (failed.access) {
      console.warn(`failed (fs.access): ${filename}`);
      log(`Failed to access file: ${filename}`);
    }

    if (failed.stat) {
      console.warn(`failed (fs.stat): ${filename}`);
      log(`Failed to stat file: ${filename}`);
    }

    if (failed.access && failed.stat) {
      console.warn(`Failed to access and stat file: ${filename}`);
      console.error(`${filename} is unreachable`);
      failures += 1;
      await Bun.sleep(100);
      files.push(file);
    }
  }

  if (failures >= MAX_FAILURES) {
    throw new Error("HIT MAX FAILURE THRESHOLD");
  }
}

async function delayForWindowFileLockRelease() {
  const shouldDelay = process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true";
  if (shouldDelay) {
    await Bun.sleep(WINDOWS_DELAY_IN_CI_ENV);
  }
}

async function fixWindowsFilePermissions() {
  const windowsExecutables = executables.filter((exe) => exe.includes("windows")).map((exe) => exe + ".exe");

  for (const filepath of windowsExecutables) {
    try {
      log(`Fixing permissions for ${filepath}...`);
      const statsBefore = await stat(filepath);
      log(`Before: mode ${statsBefore.mode.toString(8)}`);
      await fs.chmod(filepath, 0o644); // rw-r--r--
      const statsAfter = await stat(filepath);
      log(`After: mode ${statsAfter.mode.toString(8)}`);
      await access(filepath, fs.constants.R_OK);
      log(`✅ Successfully fixed permissions for ${filepath}`);
    } catch (error: unknown) {
      log(`❌ Failed to fix permissions for ${filepath}: ${error}`);
    }
  }
}
