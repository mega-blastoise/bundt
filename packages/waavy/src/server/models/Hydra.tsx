import fs from "fs/promises";
import path from "path";

import { DEFAULT_WAAVY_HYDRATION_SELECTOR, DEFAULT_WAAVY_PROPS_CACHE_KEY } from "@/constants";
import { getVersion } from "@/utils";

interface BundleInlineOptions {
  loader: "js" | "jsx" | "ts" | "tsx";
  target?: "browser" | "node" | "bun";
  format?: "esm" | "cjs" | "iife";
  minify?: boolean;
}

type HydraTemplateOptions = {
  name?: string;
  selector?: string;
};

type HydraWindowAssignmentScriptOptions<Props> = {
  props: Props;
  propsCacheKey?: string;
  selector?: string;
};

export default class Hydra<Props> {
  Component?: any;
  props?: Props;
  pathToComponent?: string;
  selector?: string;
  extension?: "js" | "jsx" | "ts" | "tsx" = "tsx";
  nonDefaultComponentName?: string = undefined;
  buildOptions: Partial<Bun.BuildConfig> = {};

  static create<Props>() {
    return new Hydra<Props>();
  }

  static createWindowAssignmentInlineScript<Props>(options: HydraWindowAssignmentScriptOptions<Props>) {
    return `
      window.waavy = {};
      window.waavy.version = ${getVersion()};
      window.waavy.keys = {};
      window.waavy.keys.pcache = "${options.propsCacheKey || DEFAULT_WAAVY_PROPS_CACHE_KEY}";
      window.waavy.keys.domselector = "${options.selector || DEFAULT_WAAVY_HYDRATION_SELECTOR}";
      window[window.waavy.keys.pcache] = ${JSON.stringify(options.props)};
      window.waavy.__$stash__.props = ${JSON.stringify(options.props)};
    `;
  }

  constructor(Component?: any, props?: Props, pathToComponent?: string) {
    this.Component = Component;
    this.props = props;
    this.pathToComponent = pathToComponent;
    this.selector = "#waavyroot";
  }

  setComponent(Component: any) {
    this.Component = Component;
    return this;
  }

  setProps(props: Props) {
    this.props = props;
    return this;
  }

  setPathToComponent(pathToComponent: string) {
    this.pathToComponent = pathToComponent;
    return this;
  }

  setExtension(extension: "js" | "jsx" | "ts" | "tsx") {
    this.extension = extension;
    return this;
  }

  setSelector(selector?: string) {
    this.selector = selector;
    return this;
  }

  setImportNonDefaultComponent(name?: string) {
    this.nonDefaultComponentName = name;
    return this;
  }

  setBuildOptions(options: Partial<Bun.BuildConfig>) {
    this.buildOptions = options;
    return this;
  }

  async createBundle() {
    try {
      if (!this.verify()) {
        throw new Error("Hydra must have a Component, a pathToComponent, and an extension");
      }

      const template = getHydraTemplate(this.pathToComponent!, getNodeModulesWaavyCache(), {
        name: this.nonDefaultComponentName,
        selector: this.selector,
      });

      const result = await bundleInlineCode(
        template,
        {
          loader: this.extension || "tsx",
        },
        this.buildOptions,
      );

      if (!result) {
        throw new Error("Hydra.createBundle(): Bun.build returned undefined");
      }

      if (!result.success) {
        const { logs, outputs } = result;
        throw new Error(
          `JavaScript build failed: ${logs
            .filter((log) => log.level === "error" || log.level === "warning")
            .map((log) => log.message)
            .join("\n")}\n\nGenerated: ${outputs.map((output) => output.path).join(", ")}`,
        );
      }

      if (result.outputs.length === 0) {
        throw new Error(
          `JavaScript build failed: No outputs generated.
          \nGenerated: ${result.outputs.map((output) => output.path).join(", ")}
          \nLogs: ${result.logs.map((log) => log.message).join("\n")}
          `,
        );
      }

      return result.outputs.at(0)?.text();
    } catch (error) {
      console.error(`
            Hydra build failed: 
                ${error}
        `);
    }
  }

  createBootstrapPropsInlineScript() {
    const waavyBrowserDTO = {
      $react: {
        root: { props: this.props || {} },
      },
    };
    return `
console.log('Page loaded, React will attempt hydration now...');
window.__WAAVY__ = ${JSON.stringify(waavyBrowserDTO)};
`;
  }

  private verify(): boolean {
    if (this.Component == null) return false;
    if (this.extension == null) return false;
    if (this.pathToComponent == null) return false;
    return true;
  }
}

function getHydraTemplate<Props>(pathToComponent: string, baseDir: string, options: HydraTemplateOptions) {
  const componentPath = path.relative(baseDir, pathToComponent);
  const normalizedPath = componentPath.startsWith(".") ? componentPath : `./${componentPath}`;

  return `
import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import ${getImportName(options?.name)} from "${normalizedPath}";

const props = window?.__WAAVY__?.$react?.root?.props || {};
const selector = "${options?.selector || "#waavyroot"}";
const container = document.querySelector(selector);

if (container) {
  hydrateRoot(
    container, 
    React.createElement(${getComponentName(options?.name)}, props)
  );
} else {
  console.error("Container not found:", selector);
}
`;
}

export function getNodeModulesWaavyCache() {
  return path.join(process.cwd(), "node_modules", ".cache", "waavy");
}

export async function getTempFileInNodeModulesCache(extension: string, integrityHash: string) {
  const cacheDir = getNodeModulesWaavyCache();
  if (!(await fs.exists(cacheDir))) {
    await fs.mkdir(cacheDir, { recursive: true });
  }
  const tempFile = path.join(cacheDir, `hydration-${integrityHash}.${extension}`);
  return tempFile;
}

export async function bundleInlineCode(
  code: string,
  options: BundleInlineOptions = { loader: "tsx" },
  buildOptionOverrides: Partial<Bun.BuildConfig> = {},
  cache = true,
  useCache = false,
): Promise<Bun.BuildOutput> {
  const tempFile = await getTempFileInNodeModulesCache(options.loader, Date.now().toString());

  try {
    await fs.writeFile(tempFile, code, "utf8");

    const format = options?.format || "esm";
    const target = options?.target || "browser";
    const minify = options?.minify || true;

    const result = await Bun.build({
      entrypoints: [tempFile],
      target,
      format,
      packages: "bundle",
      external: [],
      minify,
      splitting: false,
      sourcemap: "none",
      root: ".",
      ...buildOptionOverrides,
    });

    return result;
  } catch (e) {
    console.error("[bundleInlineCode]: An Exception was thrown during an attempt to build. %s", e);
    throw e;
  } finally {
    if (!cache) {
      await fs.unlink(tempFile).catch((err) => {
        console.error("[bundleInlineCode::unlink]: Error deleting temp file:", err);
      });
    }
  }
}

function getImportName(name?: string) {
  name ||= "default";
  return name === "default" ? "WaavyApp" : `{ ${name} }`;
}

function getComponentName(name?: string) {
  name ||= "default";
  return name === "default" ? "WaavyApp" : name;
}
