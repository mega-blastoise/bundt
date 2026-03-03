type BuildOverrides = Partial<Bun.BuildConfig>;

export type WaavyBuildOptions = {
  js?: boolean;
  bun?: boolean;
  executables?: boolean;
  all?: boolean;
  target?: string;
  verbose?: boolean;
  help?: boolean;
};

export type PlatformExecutableBunTarget = {
  readonly name: string;
  readonly target: string;
  readonly platform: string;
  readonly arch: string;
};

export type BuildBunRuntimeOutputOptions = {
  entrypoint: string;
  external: string[];
  root?: string;
  verbose?: boolean;
  overrides?: BuildOverrides;
};

export type BuildESMRuntimeOutputOptions = {
  entrypoint: string;
  target: Bun.Target;
  root?: string;
  verbose?: boolean;
  overrides?: BuildOverrides;
};
