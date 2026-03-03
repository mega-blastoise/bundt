import { access, constants, readdir } from "fs/promises";
import { join, extname } from "path";

export const defaultWaavyPagesRootDirectoryOptions = ["www", "web", "client", "browser"];
export const defaultWaavyPagesSubDirectoryOptions = ["pages", "lib/pages", "src/pages"];

export async function scanForPagesDir() {
  const rootPagesDir = join(process.cwd(), "pages");
  try {
    await access(rootPagesDir, constants.R_OK);
    const files = await readdir(rootPagesDir);
    if (files.length > 0) {
      return rootPagesDir;
    }
  } catch (error) {
    /**
     * Scan for Pages in subdirectories below
     **/
  }

  for (const dir of defaultWaavyPagesRootDirectoryOptions) {
    for (const subdir of defaultWaavyPagesSubDirectoryOptions) {
      const path = join(process.cwd(), dir, subdir);
      try {
        await access(path, constants.R_OK);
        const files = await readdir(path);
        if (files.length > 0) {
          return path;
        }
      } catch (error) {
        continue;
      }
    }
  }

  return null;
}

export async function getPageDirEnts(dir: string) {
  try {
    const files = await readdir(dir, { withFileTypes: true, encoding: "utf8", recursive: true });
    return files.filter(
      (file) => file.isFile() && [".js", ".jsx", ".ts", ".tsx"].includes(extname(file.name)),
    );
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error);
    return [];
  }
}
