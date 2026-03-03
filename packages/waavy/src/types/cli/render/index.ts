export type GetServerSideProps<Props> = (ctx: {
  props?: Props;
  waavyRenderContext: RenderContext;
}) => Promise<{ data: Props }>;

export type RenderContext = {
  path?: string | null;
  search?: URLSearchParams | null;
  method?: string | null;
  headers?: Headers | null;
};

export type LoaderFn<Props> = (request: Partial<Request>, ctx: RenderContext) => Promise<{ data: Props }>;

export type RenderAction = (pathToComponent: string, options: RenderActionOptions) => void | Promise<void>;

export type RenderActionOptions<Props = Record<string, unknown>> = {
  /**
   * The name of the component, if left blank, it assumes a default export
   * @default "default"
   */
  name?: "default" | string;

  /**
   * The props to pass to the component.
   * @default {}
   */
  props?: string | Props;

  /**
   * If this flag is set to true,
   * Waavy renderer will spawn a secondary non-blocking Worker thread to write the result
   * of the render operation to a local file cache. This is recommended for production when it's
   * very likely your components aren't changing if props are the same,
   * and we can use a cached result of the render operation in such a case.
   */
  cache?: boolean;

  /**
   * Approach to caching
   *
   * TODO fill this in
   */
  cacheType?: "bunfs" | "bunsqlite3";

  /**
   * A string representing a password to be used for encrypting cached files
   */
  cacheKey?: string;

  /**
   * The request object to pass to the loader function.
   */
  request?: Partial<Request>;

  /**
   * Instead of piping the rendered component to stdout, it will pipe the component to a supplied named pipe. Pretty experimental currently.
   */
  pipe?: string;

  /**
   * If true, the result of the render operation will be collected as streamed,
   * and then passed in a final state to stdout, equivocal to an all or none op.
   */
  await?: boolean;

  /**
   * Any files you want to bootstrap on the client.
   * This is typically used for client side hydration of the React app.
   */
  bootstrap?: string[];

  /**
   * Write to stdout in a serialized structured format
   * Currently supports JSON
   */
  serialize?: "json";

  /**
   * A path to a fallback Error component to respond with if an Error is thrown during server side rendering.
   */
  errorComponentPath?: string;

  /**
   * The name of the error component, used in conjunction with `errorComponentPath`.
   * If left blank, will be assumed to be a default export.
   */
  errorComponentName?: string;

  /**
   * The selector that you will mount your React component node to within the browser.
   *
   * If your application uses client side hydration, this is the selector for the element that you pass to ReactDOM.hydrateRoot
   *
   * If you are using the `waavy` client side function, this property is used for client side hydration.
   *
   * If this property is left blank, it is assumed you are following the <Html /> React Page pattern,
   * and we will attempt to use "document" as the selector in this case.
   */
  selector?: string;

  /**
   * A string indicating what field you want Waavy to assign props to on the window object
   *
   * if left default, Waavy will put the props in window._p;
   *
   * @default "_p"
   */
  pcacheKey?: string;

  /**
   * Enables verbose log output
   * @default false
   */
  verbose?: boolean;

  /**
   * Number of seconds to wait before aborting server-rendering,
   * flushing the remaining markup to the client,
   * and defaulting to client side rendering
   *
   * @see https://react.dev/reference/react-dom/server/renderToReadableStream#aborting-server-rendering
   */
  maxTimeout?: number | string;

  /**
   * Progressive chunk size (In bytes)
   *
   * This value is passed directly to ReactDOMServer#renderToReadableStream progressiveChunkSize option
   *
   * @see https://github.com/facebook/react/blob/14c2be8dac2d5482fda8a0906a31d239df8551fc/packages/react-server/src/ReactFizzServer.js#L210-L225
   */
  chunk?: number | string;

  /**
   * Whether or not to render an Error page to the provided OutputStrategy if an Error occurs,
   * or to fail silently
   *
   * @default false
   */
  failSilently?: boolean;
};
