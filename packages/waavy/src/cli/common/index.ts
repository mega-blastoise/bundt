import fs from "fs/promises";
import path from "path";

import { load } from "@/utils";
import type WaavyConfiguration from "@/types/IWaavyConfiguration";

export async function getWaavyConfig(
  spec?: keyof WaavyConfiguration,
): Promise<WaavyConfiguration | WaavyConfiguration[keyof WaavyConfiguration]> {
  const pathToWaavyConfig =
    (await getOptionalExtendedWaavyConfigurationFromEnv()) ||
    (await getOptionalExtendedWaavyConfigFromDefaultWorkingDirLocations());
  if (!pathToWaavyConfig) return {};
  try {
    const waavyConfig = (await load(pathToWaavyConfig)) as WaavyConfiguration;
    const {
      bundle = undefined,
      prefers = undefined,
      prerender = undefined,
      render = undefined,
      ssg = undefined,
    } = waavyConfig;
    const cleanConfig = {
      bundle,
      prefers,
      prerender,
      render,
      ssg,
    };

    return spec ? cleanConfig[spec] : cleanConfig;
  } catch (e) {
    return {};
  }
}

async function getOptionalExtendedWaavyConfigFromDefaultWorkingDirLocations() {
  const defaultLocations = [
    path.join(process.cwd(), "waavy.config.js"),
    path.join(process.cwd(), "waavy.config.ts"),
  ];

  for (const location of defaultLocations) {
    try {
      await fs.access(location, fs.constants.R_OK);
      return location;
    } catch (e) {
      continue;
    }
  }

  return null;
}

/**
 * Uses the environment variables [WAAVY_CONFIG_PATH, WAAVY_CONFIG_FILE]
 * to find a waavy configuration file, if one is set.
 *
 * @returns The path to the waavy configuration file, or null if not found.
 */
async function getOptionalExtendedWaavyConfigurationFromEnv() {
  for (const envVar of ["WAAVY_CONFIG_PATH", "WAAVY_CONFIG_FILE"]) {
    const value = process.env[envVar];
    if (value) {
      const exists = await checkForFile(value);
      if (exists) {
        return value;
      }
    }
  }

  return null;
}

async function checkForFile(file: string, mode: number = fs.constants.R_OK) {
  try {
    await fs.access(file, mode);
    return true;
  } catch (e) {
    return false;
  }
}
