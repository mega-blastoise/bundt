import type { BundleConfiguration, BundleConfigurationKey } from "./cli/bundle";
import type { StaticReactPageContext, StaticSiteGenerationActionConfiguration } from "./cli/ssg";
import type WaavyReactPageRoute from "./IWaavyReactPageRoute";

export default interface IWaavyConfiguration {
  prefers?: Preference[];
  bundle?: BundleConfiguration;
  render?: RenderConfiguration;
  prerender?: PreRenderConfiguration;
  ssg?: StaticSiteGenerationActionConfiguration;
}

type WaavyConfigurationKey = Exclude<keyof IWaavyConfiguration, "prefers">;
type RenderConfiguration = {};
type PreRenderConfiguration = {};
type BundlerPreferences = `bundle.${BundleConfigurationKey}`;

/**
 * Short-hand method of easily specifying waavy configurations value
 * i.e. `bundle.bundler=bun` is the same as `bundle: { bundler: "bun" }`
 * o
 */
export type Preference = string;

export interface WaavyReactPageOptions {
  hydration?: {
    enabled?: boolean;
    mount?: {
      selector?: string;
    };
    output?: {
      filename: string;
      dir?: string;
    };
  };
}

/**
 * This interface represents a valid Waavy React Page
 *
 * This page can be either a server-rendered page that is rendered at *runtime* within the Waavy application Web Server,
 * OR it can be a statically served page that is prepared at build time,
 * but it cannot be both. To be both is bad practice.
 *
 * A Typescript or Javscript File may be considered a **valid Waavy React Page** if it satisfies the following:
 *
 * - The `default` export is a valid top level React Component
 * - The file exports either `getStaticProps` or `getServerSideProps` or neither, but not both
 *
 * In addition to the above criteria, a Waavy React Page may optionally provide the following:
 *
 * - The file **may optionally** export a `route` object consisting of the following fields,
 *   - path [string]: The path to the page, e.g. /about OR /posts/:id
 *   - params [object]: The params to the page, e.g. { id: '1' }
 *   - revalidate [number]: The number of seconds after which the page should be revalidated
 *
 * If a file exports a `route` object, the `path` and `params` values will be passed into `getStaticProps` or `getServerSideProps` for usage in props retrieval.
 *
 * - The file **may optionally** export a `routes` array, consisting of an Array of `route` configuration options
 *
 * Waavy will generate a static html page + a hydration bundle for each route in the array,
 * and will pass each `path` and corresponding `params` into the file's `getStaticProps` or `getServerSideProps` function,
 * in order to determine props to render that Page component with.
 *
 * A file may not export both a `route` and a `routes` configuration.
 *
 * If a file does not export neither `route` nor `routes`,
 * then the localized file system path relative to the root pages directory will be used to determine the output path.
 *
 * Currently, **only static pages may export a `route` or `routes` config**
 *
 * ```
 */
export interface ReactPageExports<Props> {
  default: React.ComponentType<Props>;
  getStaticProps?: (ctx: StaticReactPageContext) => Promise<{ props: Props }>;
  getServerSideProps?: (ctx: StaticReactPageContext) => Promise<{ props: Props }>;
  options?: WaavyReactPageOptions;
  route?: WaavyReactPageRoute;
  routes?: ReactPageExports<Props>["route"][] | (() => Promise<ReactPageExports<Props>["route"][]>);
}
