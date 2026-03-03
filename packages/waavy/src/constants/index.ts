import path from "path";

export const DEFAULT_WAAVY_PROPS_CACHE_KEY = "_p" as const;
export const DEFAULT_WAAVY_HYDRATION_SELECTOR = "document" as const;
export const DEFAULT_WAAVY_RENDER_CACHE = "node_modules/.cache/waavy" as const;
export const DEFAULT_WAAVY_RENDER_DB_CACHE =
  `${DEFAULT_WAAVY_RENDER_CACHE + path.sep + "render.db"}` as const;
export const DEFAULT_WAAVY_RENDER_HEADER_CACHE =
  `${DEFAULT_WAAVY_RENDER_CACHE + path.sep + ".render_hcache.d" + path.sep + "static.db"}` as const;
