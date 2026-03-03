export * from "./cli";

export type RenderOptions = {
  /**
   * If your application uses react-query, you can opt into server side rendering (prefetching) all your react-query queries here
   * This will help with the initial load time of your application
   *
   * This makes a couple assumptions, you should be aware of:
   *
   * 1. This elects to follow the `hydration` pattern of react-query server side rendering/prefetching. It does not use the `initialData` pattern. You can read more about that here https://tanstack.com/query/latest/docs/framework/react/guides/ssr#using-the-hydration-apis
   *
   * 2. As such, it will inject a `dehydratedState` property into the Props made available to your component on the server.
   *
   * 3. It assumes you will make use of that dehydratedState on the client to populate a `HydrationBoundary` with the data from the server
   *
   * 4. It assumes you are instatiating a queryClient on the client as a stateful react value, as seen here:
   *
   * ```tsx
   * // _app.tsx
   * import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
   *
   * export default function MyApp({ Component, pageProps }) {
   * const [queryClient] = React.useState(
   *   () =>
   *   new QueryClient({
   *      defaultOptions: {
   *        queries: {
   *           // With SSR, we usually want to set some default staleTime
   *           // above 0 to avoid refetching immediately on the client
   *           staleTime: 60 * 1000,
   *       },
   *   },
   * }),
   * )
   *
   * return (
   *    <QueryClientProvider client={queryClient}>
   *      <Component {...pageProps} />
   *    </QueryClientProvider>
   *  )
   *
   * ```
   *
   * @example
   *
   * ```json
   * {
   *  tanstackReactQuery: {
   *     prefetch: [
   *      {
   *        queryKey: "user",
   *        queryFn: "./queries/user.ts"
   *      }
   *    ]
   *  }
   * }
   * ```
   */
  tanstackReactQuery?: {
    prefetch: {
      queryKey: string | string[];
      queryFn: string | { path: string; module: string };
    }[];
  };
};

export type SerializableValue = string | number | boolean | null | SerializableObject | SerializableArray;

export interface SerializableObject {
  [key: string]: SerializableValue;
}

export interface SerializableArray extends Array<SerializableValue> {}

export type Serializable<T> = {
  [K in keyof T]: T[K] extends Function
    ? never
    : T[K] extends undefined
      ? never
      : T[K] extends symbol
        ? never
        : T[K] extends object
          ? Serializable<T[K]>
          : T[K];
};
