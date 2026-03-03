export type WaavyBundler = "default" | "bun";

export type WaavyBundlerOptionsBun = {
  bundler: "bun";
  configOverrides?: Partial<Bun.BuildConfig>;
};

export type WaavyBundlerOptionsDefault = {
  bundler: "default";
  configOverrides?: Partial<Bun.BuildConfig>;
};

export type WaavyBundlerOptionsEsbuild = {
  bundler: "esbuild";
  configOverrides?: unknown;
};

export type WaavyBundlerOptionsRollup = {
  bundler: "rollup";
  configOverrides?: unknown;
};

export type WaavyBundlerOptionsWebpack = {
  bundler: "webpack";
  configOverrides?: unknown;
};

export type WaavyBundlerOptionsVite = {
  bundler: "vite";
  configOverrides?: unknown;
};

export type WaavyBundlerOptions = WaavyBundlerOptionsDefault | WaavyBundlerOptionsBun;

export type BundleConfiguration = {
  /**
   * The bundler that you would like the `waavy` engine to use to bundle your code.
   *
   * Available options: "default" | "bun"
   *
   * Currently, "default" _is_ equal to "bun", meaning we will only support Bun bundling for now,
   * but I think the LOE to support the other bundlers is pretty low,
   * so we can tackle is as a fast follow to MVP before alpha
   */
  bundler?: WaavyBundler | WaavyBundlerOptions;
  options?: Partial<BundleOptions>;
};

export type BundleConfigurationKey = keyof BundleConfiguration;
export type BundleConfigurationBundlerKey = keyof BundleConfiguration["bundler"];

export type BundleOptions = {
  bundler?: WaavyBundlerOptions;
  dir?: string;
  out?: string;
  clean?: boolean;
  verbose?: boolean;
  dryRun?: boolean;
};

export type BundleCommandLineOptions = Partial<{
  dir: string;
  out: string;
  clean: boolean;
  verbose: boolean;
  dryRun: boolean;
}>;

export type BundleAction = (options: BundleOptions) => Promise<void>;
