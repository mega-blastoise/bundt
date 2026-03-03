import { Database } from "bun:sqlite";
import fs from "fs";

import { DEFAULT_WAAVY_RENDER_DB_CACHE } from "@/constants";
import { createDeterministicStructure } from "@/utils";

import type { CacheEntry, CacheEntryWithRenderOutput } from "../utils/cache/types";
import { sabtou8ab } from "../utils/cache/utils/buffers";

import CacheEncryption from "./CacheEncryption";
import CacheSerializer from "./CacheSerializer";
import type IRenderCache from "./types";

export default class CacheBunSqlite3 implements IRenderCache {
  private db;
  private ce: CacheEntry;

  private getInsertSql = () =>
    this.db.prepare(`
        INSERT OR REPLACE INTO render_cache (id, props, render_output, component_path, component_name)
        VALUES (?, ?, ?, ?, ?)
    `);

  private getSelectSql = () =>
    this.db.prepare(
      `
        SELECT id, props, render_output, created_at 
        FROM render_cache 
        WHERE props = ?
        AND component_path = ?
        AND component_name = ?
        LIMIT 1
    `,
    );

  /**
   * @see https://github.com/tc39/proposal-explicit-resource-management
   */
  [Symbol.dispose](): void {
    this.db.close(false);
  }

  /**
   * TODO determine if we need to serialize the db
   * on every db close
   * or if we can just create once and use across processes
   */
  private serializeDB() {
    try {
      /**
       * Serialize the db to a cache file so
       * it can be used across spawned waavy processes
       * */
      const sdb = this.db.serialize();
      fs.rmSync(DEFAULT_WAAVY_RENDER_DB_CACHE, { force: true });
      fs.writeFileSync(DEFAULT_WAAVY_RENDER_DB_CACHE, sdb);
    } catch (e) {}
  }

  constructor(ce: CacheEntry) {
    this.ce = ce;
    this.db = new Database(DEFAULT_WAAVY_RENDER_DB_CACHE, {
      create: true,
      strict: true,
      readonly: false,
    });

    this.enableWALMode();
    this.setupTables();
    this.setupSqlite3RenderCacheIndex();
  }

  private enableWALMode() {
    this.db.exec("PRAGMA journal_mode = WAL;");
  }

  private setupTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS render_cache (
        id TEXT PRIMARY KEY,
        props BLOB NOT NULL,
        render_output BLOB NOT NULL,
        component_name TEXT NOT NULL,
        component_path TEXT NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `);
  }

  private setupSqlite3RenderCacheIndex() {
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_created_at ON render_cache(created_at)`);
  }

  async find(): Promise<CacheEntryWithRenderOutput | null> {
    try {
      const sql = this.getSelectSql();
      const _props = await this.encryptAndSerializeProps();
      const match = sql.get(sabtou8ab(_props), this.ce.cpath, this.ce.cname);
      if (match) {
        const deserializedRenderOutput = await CacheEncryption.decrypt(
          CacheSerializer.deserialize((match as any).render_output) as any,
          this.ce.cacheKey,
        );
        return {
          cachedRenderOutput: deserializedRenderOutput,
          cacheKey: this.ce.cacheKey,
          cname: this.ce.cname,
          cpath: this.ce.cpath,
          createdAt: (match as any).created_at,
          id: (match as any).id,
          props: this.ce.props,
        };
      }
    } catch (e) {}
    return null;
  }

  async cache(cacheableRenderOutput: string): Promise<boolean> {
    try {
      const sql = this.getInsertSql();
      const _renderOutput = CacheSerializer.serialize(
        await CacheEncryption.encrypt(cacheableRenderOutput, this.ce.cacheKey),
      );
      const _props = await this.encryptAndSerializeProps();
      sql.run(this.ce.id, sabtou8ab(_props), sabtou8ab(_renderOutput), this.ce.cpath, this.ce.cname);
      return true;
    } catch (e) {}
    return false;
  }

  async delete(ce: CacheEntry): Promise<boolean> {
    return false;
  }

  private async encryptAndSerializeProps(props: string = this.ce.props) {
    return CacheSerializer.serialize(
      await CacheEncryption.encrypt(
        JSON.stringify(createDeterministicStructure(JSON.parse(props))),
        this.ce.cacheKey,
      ),
    );
  }
}
