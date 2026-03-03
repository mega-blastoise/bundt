/**
 * SECTION : tanstack/react-query
 * What does this extension do?
 *
 * Allows us to server side render a React component with @tanstack/react-query
 *
 * How do we do this?
 *
 *
 * We will need to go the hydration route
 *
 * I am thinking we can do this:
 *
 * Accept a configuration file
 *
 * Look for it at process.cwd() + '.rssrc'
 *
 * Look for a key 'tanstack-react-query'
 *
 * If found, use it to attempt server rendering, if not found, render the app with no special behavior
 *
 * If we have an object, we would like this shape:
 *
 * {
 *  "tanstack-react-query": {
 *    "prefetch": [
 *      {
 *        "queryKey": string | string[],
 *        "queryFn": string | { path: string, module: string }
 *      }
 *    ]
 *  }
 * }
 *
 * What we can do then, is the following
 */

import path from "path";

import { dehydrate, QueryClient, type UseQueryOptions } from "@tanstack/react-query";

import { load } from "@/utils";
import type { RenderOptions } from "@/types";

type PrefetchQueryOptions = {
  queryKey: string | string[];
  queryFn: string | { path: string; module: string };
} & Partial<Omit<UseQueryOptions, "queryKey" | "queryFn">>;

type TanstackReactQueryConfig = {
  prefetch: PrefetchQueryOptions[];
};

export async function dehydrateServerSideQueries(tanstackReactQueryConfig: TanstackReactQueryConfig) {
  const queryClient = new QueryClient();
  for (const query of tanstackReactQueryConfig.prefetch) {
    let queryKey = query.queryKey;
    let queryFn;

    if (typeof query.queryFn === "string") {
      const resolved = path.resolve(
        query.queryFn.startsWith("/") ? query.queryFn : path.join(process.cwd(), query.queryFn),
      );
      queryFn = await load(resolved);
    } else {
      const resolved = path.resolve(
        query.queryFn.path.startsWith("/")
          ? query.queryFn.path
          : path.join(process.cwd(), query.queryFn.path),
      );
      queryFn = await load(resolved, query.queryFn.module);
    }

    if (queryFn) {
      await queryClient.prefetchQuery({
        queryKey: queryKey as any,
        queryFn,
      });
    }
  }

  return {
    dehydratedState: dehydrate(queryClient),
  };
}

export async function extendRenderWithTanstackQueryServerSideDataFetching<Props = {}>(
  trqOptions: RenderOptions & { props: Props },
) {
  const dehydratedState = await dehydrateServerSideQueries({
    prefetch: trqOptions.tanstackReactQuery?.prefetch!,
  });
  Object.defineProperty(trqOptions.props, "dehydratedState", {
    value: dehydratedState.dehydratedState,
    writable: false,
    enumerable: true,
  });
}
