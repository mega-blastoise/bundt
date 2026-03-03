import type { CacheRenderOutputOptions } from "@/types/worker";
import RenderCache from "./models/Cache";
import { OutputStrategy } from "./utils";
import type { SerializableObject } from "@/types";

export type UseCachedOptions = {
  cache: {
    key: string;
    type: string;
  };
  component: {
    path: string;
    name: string;
    props: unknown;
  };
  output: OutputStrategy;
};

export async function useCached(options: UseCachedOptions): Promise<boolean> {
  const hasCached = RenderCache.isInCache(
    options.component.path,
    options.component.name,
    options.component.props,
  );
  if (hasCached) {
    const cm = new RenderCache({
      key: options.cache.key,
      type: options.cache.type as any,
      component: options.component,
    });
    const ce = await cm.find();
    if (ce) {
      const { cachedRenderOutput } = ce;
      switch (options.output) {
        case OutputStrategy.StdoutStream:
        case OutputStrategy.StdoutString: {
          flushCachedRenderOutputToStdout(cachedRenderOutput);
          break;
        }
        case OutputStrategy.SerializedJson: {
          flushCachedRenderOutputToStdout(cachedRenderOutput, options.component.props, "json");
          break;
        }
      }

      return true;
    }
  }

  return false;
}

function flushCachedRenderOutputToStdout(
  cached: string,
  props?: unknown,
  formatting: "json" | "default" = "default",
) {
  if (formatting === "default") {
    process.stdout.write(cached);
  } else if (formatting === "json") {
    process.stdout.write(JSON.stringify({ html: cached, exitCode: 0, props }));
  }

  if (process.stdout.writableNeedDrain) {
    process.stdout.emit("drain");
  }
}

async function cacheRenderOutput<Props extends SerializableObject = SerializableObject>(
  options: CacheRenderOutputOptions<Props>,
) {
  const cm = new RenderCache({
    key: options.cacheKey,
    type: options.cacheType,
    component: {
      name: options.component.name,
      path: options.component.path,
      props: options.component.props,
    },
  });
  try {
    await cm.cache(options.component.cacheableRenderOutput);
  } catch (e) {
    /** Swallow error */
  }
}

export async function writeToCache<Props extends SerializableObject = SerializableObject>(
  data: CacheRenderOutputOptions<Props>,
) {
  await cacheRenderOutput(data);
}
