import type { RenderActionOptions } from "@/types";

import type { CacheEntry, CacheEntryWithRenderOutput } from "../utils/cache/types";

import CacheSerializer from "./CacheSerializer";
import CacheBunFs from "./CacheBunFs";
import CacheBunSqlite3 from "./CacheSqlite3";
import RenderCacheHeaderDatabase from "./CacheHeaderDatabase";

type CacheType = Exclude<RenderActionOptions["cacheType"], undefined>;

type RenderCacheConstructorOptions = {
  type: CacheType;
  key: string;
  component: {
    name: string;
    path: string;
    props: unknown;
  };
};

export default class RenderCache {
  private static _hcache_db: RenderCacheHeaderDatabase = new RenderCacheHeaderDatabase();

  private type: CacheType;
  private cpath: string;
  private cname: string;
  private cprops: unknown;
  private cacheKey: string;

  public static isInCache(cpath: string, cname: string, props: unknown) {
    /**
     * isInCache should not have to be o(n) because in such a case,
     * we should just call find() and perform a single operation.
     * However, if isInCache can be o(1) then it's a negligible check.
     *
     * Use a Map that cacheManagers have shared access to (Some singleton context)
     * to store a hash of the cname,cpath,cprops
     * convert cprops to deterministic structure
     */
    if (!CacheSerializer.serializable(props)) return false;
    if (typeof props !== "object") return false;

    return Boolean(
      RenderCache._hcache_db.find({
        cname: cname,
        cpath: cpath,
        props: props,
      }),
    );
  }

  private static addToHeaderCache(cpath: string, cname: string, props: unknown): boolean {
    try {
      return RenderCache._hcache_db.add({
        cname,
        cpath,
        props,
        id: Bun.randomUUIDv7("hex", new Date()),
      });
    } catch (e) {
      return false;
    }
  }

  constructor(options: RenderCacheConstructorOptions) {
    this.type = options.type;
    this.cacheKey = options.key;
    this.cname = options.component.name;
    this.cpath = options.component.path;
    this.cprops = options.component.props;
  }

  async cache(renderOutput: string) {
    const cacheEntry = this.createCacheEntryWithRenderOutput(renderOutput);
    if (cacheEntry) {
      using _cache = this.type === "bunfs" ? new CacheBunFs(cacheEntry) : new CacheBunSqlite3(cacheEntry);
      const didCache = await _cache.cache(cacheEntry.cachedRenderOutput);
      if (didCache) {
        RenderCache.addToHeaderCache(cacheEntry.cpath, cacheEntry.cname, this.cprops);
      }
    }
  }

  async find(): Promise<CacheEntryWithRenderOutput | null> {
    const cacheEntry = this.createCacheEntry();
    if (cacheEntry) {
      using _cache = this.type === "bunfs" ? new CacheBunFs(cacheEntry) : new CacheBunSqlite3(cacheEntry);

      const found = await _cache.find();
      if (found) return found;
    }
    return null;
  }

  private createCacheEntryWithRenderOutput(cacheableRenderOutput: string): CacheEntryWithRenderOutput | null {
    if (!CacheSerializer.serializable(this.cprops)) return null;
    const timestamp = new Date();
    const id = Bun.randomUUIDv7("hex", timestamp);
    return {
      id: id,
      cname: this.cname,
      cpath: this.cpath,
      createdAt: timestamp,
      cachedRenderOutput: cacheableRenderOutput,
      props: JSON.stringify(this.cprops),
      cacheKey: this.cacheKey,
    };
  }

  private createCacheEntry(): CacheEntry | null {
    if (!CacheSerializer.serializable(this.cprops)) return null;
    const timestamp = new Date();
    const id = Bun.randomUUIDv7("hex", timestamp);
    return {
      id: id,
      cname: this.cname,
      cpath: this.cpath,
      createdAt: timestamp,
      props: JSON.stringify(this.cprops),
      cacheKey: this.cacheKey,
    };
  }
}
