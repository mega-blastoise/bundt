import type React from "react";
import { prerender } from "react-dom/static.edge";
import type WaavyReactPageRoute from "@/types/IWaavyReactPageRoute";
import type { WaavyReactPageOptions } from "../../IWaavyConfiguration";

type PrerenderOptions = Exclude<Parameters<typeof prerender>[1], undefined>;

type BootstrapModuleConfig = {
  bootstrapModule: string;
  filter?: (filename: string) => boolean;
  pages?: string[];
  prefix?: string;
};

export type StaticSiteGenerationActionConfiguration = {
  /**
   * An array of paths to files that are valid Waavy React Pages
   *
   * Each `React Page` file must export a valid top level React Component as it's default export.
   *
   * A `React Page` may export either `getStaticProps` or `getServerSideProps` but not both.
   *
   * If a React Page exports `getStaticProps` or does not export neither `getStaticProps` or `getServerSideProps`
   * then it can be considered a candidate for `static` site preparation.
   */
  pages?: string[];
  /**
   * A path to a directory where you want to put the static assets that were built.
   * By default if that directory does not exist then Waavy will create it for you
   */
  outdir?: string;
  /**
   * An array of strings or objects representing client side hydration scripts that you wish to bootstrap to your React Page.
   * If you provide an array of strings, then Waavy will assume that each string is the path to a client side hydration script
   * and will bootstrap each of those scripts to each React Page.
   *
   * If you provide an array of objects, then each object must have a `bootstrapModule` property that is a string
   * representing the path to a client side hydration script.
   *
   * You may also provide a `filter` function that will be used to determine which pages the client side hydration script
   * should be bootstrapped to.
   *
   * You may also provide a `pages` array that will be used to determine which pages the client side hydration script
   * should be bootstrapped to.
   *
   * You may also provide a `prefix` string that will be used to prefix the path to the client side hydration script.
   * This is useful if you want to bootstrap multiple client side hydration scripts with the same prefix to the same React Page.
   */
  bootstrapModules?: string[] | BootstrapModuleConfig[];
  /**
   * By default, during Waavy Static Site Generation, Waavy will create a hydration bundle for each Static Waavy React Page,
   * this is **fundamentally different to our approach to Server Side Rendering** where Waavy **does not** create a hydration bundle for SSR'd Waavy React Pages -
   *
   * Why?
   *
   * Well, Waavy React Pages that are considered static are rendered at build time,
   * whereas Waavy React Pages that are SSR'd at Runtime are typically rendered during the course of a normal request/response cycle,
   * even in events where we can cache the render output of SSR operations,
   * and use the cached result on subsequent requests where props would be considered equal,
   * we would not want to attempt to bundle hydration scripts in the course of the request/response cycle,
   * as for production applications this is likely going to prove to be too timely.
   *
   * At build time, we can spare the additional time/expense to scaffold hydration scripts and bundle them, that's fine.
   *
   * Similarly, if you want to create hydration scripts for SSR'd pages with Waavy, we can accommodate that functionality,
   * but we don't want to support it at runtime, instead we probably want to enable hydration bundling for a valid Waavy React Page
   * arbitrarily with the `waavy` command line tool.
   *
   * If you provide `true` for this field, waavy will disable hydration bundling for **all** static pages.
   *
   * If you provide an array of strings, then waavy will disable hydration bundling for those pages that match the provided strings.
   *
   * @default false
   */
  disableHydrationBundling?: boolean | string[];
};

export interface PageConfiguration<Props> {
  filename: string;
  Component: React.ComponentType<Props>;
  getStaticProps?: (context: StaticReactPageContext) => Promise<{ props: Props }>;
  context?: StaticReactPageContext;
  options?: WaavyReactPageOptions;
  route?: WaavyReactPageRoute;
  routes?: WaavyReactPageRoute[];
  renderOptions?: PrerenderOptions;
}

export interface StaticReactPageContext {
  params: Record<string, string>;
  path: string;
  env?: Record<string, unknown>;
}

export type SSGActionOptions = {
  outdir: string;
  pages: PageConfiguration<any>[];
} & Pick<StaticSiteGenerationActionConfiguration, "bootstrapModules" | "disableHydrationBundling">;

export type SSGAction = (options: SSGActionOptions) => Promise<void>;
