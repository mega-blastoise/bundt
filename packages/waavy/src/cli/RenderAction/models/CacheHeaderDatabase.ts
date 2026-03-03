import { Database } from "bun:sqlite";
import fs from "fs";
import path from "path";
import { DEFAULT_WAAVY_RENDER_HEADER_CACHE } from "@/constants";
import type { SerializableObject } from "@/types";
import { createDeterministicStructure } from "@/utils";
import CacheEncryption from "./CacheEncryption";
import CacheSerializer from "./CacheSerializer";

export type CacheEntryHeader = {
  id: string;
  cname: string;
  cpath: string;
  props: unknown;
  createdAt?: Date | string;
};

export default class RenderCacheHeaderDatabase {
  db: Database;

  private getWriteSql() {
    return this.db.prepare(`
      INSERT OR REPLACE INTO header_cache (
        id, cname, cpath, props
      ) VALUES (
        ?, ?, ?, ?
      );
    `);
  }

  private getReadSql() {
    return this.db.prepare(`
      SELECT id, cname, cpath, props, createdAt
      FROM header_cache
      WHERE cname = ? 
      AND cpath = ? 
      AND props = ? 
      LIMIT 1;
    `);
  }

  constructor() {
    const dbpath = path.isAbsolute(DEFAULT_WAAVY_RENDER_HEADER_CACHE)
      ? DEFAULT_WAAVY_RENDER_HEADER_CACHE
      : path.resolve(process.cwd(), DEFAULT_WAAVY_RENDER_HEADER_CACHE);

    if (!fs.existsSync(path.dirname(dbpath))) {
      fs.mkdirSync(path.dirname(dbpath), { recursive: true });
    }

    this.db = new Database(dbpath, {
      create: true,
      readonly: false,
      strict: true,
    });
    this.enableWALMode();
    this.setupTable();
  }

  add(cacheable: CacheEntryHeader): boolean {
    try {
      if (!CacheSerializer.serializable(cacheable.props)) return false;
      const sql = this.getWriteSql();
      const id = cacheable.id;
      const strprops = JSON.stringify(createDeterministicStructure(cacheable.props as SerializableObject));
      const sprops = CacheEncryption.sha256Hash(strprops);
      sql.run(id, cacheable.cname, cacheable.cpath, sprops);
      return true;
    } catch (e) {
      return false;
    }
  }

  find(cacheable: Partial<CacheEntryHeader>): CacheEntryHeader | null {
    try {
      if (!cacheable.cname || !cacheable.cpath || !cacheable.props) {
        return null;
      }
      if (!CacheSerializer.serializable(cacheable.props)) return null;
      const sql = this.getReadSql();
      const strprops = JSON.stringify(createDeterministicStructure(cacheable.props as SerializableObject));
      const sprops = CacheEncryption.sha256Hash(strprops);
      const result = sql.get(cacheable.cname, cacheable.cpath, sprops);
      return result as CacheEntryHeader | null;
    } catch (e) {
      return null;
    }
  }

  private enableWALMode() {
    this.db.exec("PRAGMA journal_mode = WAL;");
  }

  private setupTable() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS header_cache (
        id TEXT PRIMARY KEY,
        cname TEXT NOT NULL,
        cpath TEXT NOT NULL,
        props TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }
}
