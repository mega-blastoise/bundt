import fs from "fs/promises";
import path from "path";
import { DEFAULT_WAAVY_RENDER_CACHE } from "@/constants";
import CacheEncryption from "./CacheEncryption";
import type { CacheEntry, CacheEntryWithRenderOutput } from "../utils/cache/types";
import type IRenderCache from "./types";
import { createDeterministicStructure, noop } from "@/utils";
import type { SerializableValue } from "@/types";
import CacheUtils from "./CacheUtils";

type CacheEntryMetadata = {
  id: string;
  createdAt: string | Date;
  cname: string;
  cpath: string;
  cachedRenderOutputFile: string;
  propsOutputFile: string;
  integrity: string;
};

export default class CacheBunFs implements IRenderCache {
  constructor(private ce: CacheEntry) {}

  [Symbol.dispose] = () => noop();

  async find(): Promise<CacheEntryWithRenderOutput | null> {
    try {
      const cacheDirPath = this.createCacheDirPath();

      const dirents = await fs.readdir(cacheDirPath, {
        recursive: true,
        withFileTypes: true,
      });

      const files = dirents
        .filter((de) => de.isFile() && de.name.endsWith(".json"))
        .map((de) => Bun.file(path.resolve(de.parentPath, de.name)));

      for (const file of files) {
        const metadata: CacheEntryMetadata = await file.json();
        const propsEncrypted = await Bun.file(metadata?.propsOutputFile).text();
        const propsDecrypted = JSON.parse(await CacheEncryption.decrypt(propsEncrypted, this.ce.cacheKey));
        const match = CacheUtils.compare(propsDecrypted, JSON.parse(this.ce.props));
        if (match) {
          const cachedRenderOutput = await CacheEncryption.decrypt(
            await Bun.file(metadata?.cachedRenderOutputFile)?.text(),
            this.ce.cacheKey,
          );
          return {
            id: metadata.id,
            cacheKey: this.ce.cacheKey,
            cname: metadata.cname,
            cpath: metadata.cpath,
            createdAt: metadata.createdAt,
            props: this.ce.props,
            cachedRenderOutput,
          };
        }
      }
    } catch (e) {}
    return null;
  }

  async cache(cacheableRenderOutput: string): Promise<boolean> {
    try {
      /**
       * Create a path to the fs cache
       * node_modules/.cache/waavy/$hash-of-path-and-component-name
       */
      const cacheDirpath = this.createCacheDirPath();
      if (!(await fs.exists(cacheDirpath))) {
        await fs.mkdir(cacheDirpath, { recursive: true });
      }

      /**
       * TODO
       *
       * We can randomize file names if we can use metadata.json to link to each
       *
       */

      const metadataFilePath = path.resolve(cacheDirpath, this.ce.id + ".metadata.json");
      const renderOutputFilePath = path.resolve(cacheDirpath, this.ce.id + ".cro");
      const propsOutputFilePath = path.resolve(cacheDirpath, this.ce.id + ".pro");

      const metadata: CacheEntryMetadata = {
        id: this.ce.id,
        createdAt: this.ce.createdAt || new Date(),
        cname: this.ce.cname,
        cpath: this.ce.cpath,
        cachedRenderOutputFile: renderOutputFilePath,
        propsOutputFile: propsOutputFilePath,
        integrity: CacheEncryption.sha256Hash(cacheableRenderOutput),
      };
      await Bun.write(metadataFilePath, JSON.stringify(metadata));

      const encyrptedHtmlOutput = await CacheEncryption.encrypt(cacheableRenderOutput, this.ce.cacheKey);
      await Bun.write(renderOutputFilePath, encyrptedHtmlOutput);

      const encryptedPropsOutput = await CacheEncryption.encrypt(this.ce.props, this.ce.cacheKey);
      await Bun.write(propsOutputFilePath, encryptedPropsOutput);

      return true;
    } catch (e) {
      /**
       * If telemetry is enabled, report the error
       */
    }
    return false;
  }

  async delete(ce: CacheEntry): Promise<boolean> {
    return false;
  }

  private createCacheDirPath() {
    return path.resolve(process.cwd(), DEFAULT_WAAVY_RENDER_CACHE, this.hashDirName());
  }

  private hashDirName() {
    const text = this.ce.cpath + "::" + this.ce.cname;
    return CacheEncryption.sha256Hash(text);
  }

  private standardizeProps(props = this.ce.props): SerializableValue {
    return createDeterministicStructure(JSON.parse(props));
  }
}
