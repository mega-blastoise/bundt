import React from "react";

import path from "path";

import { ComponentNotFoundError, InvalidExtensionError } from "@/errors";
import { load } from "@/utils";
import type { RenderActionOptions, RenderContext } from "@/types";

export function validateComponentExtension(pathToComponent: string) {
  const extension = path.extname(pathToComponent).replace(".", "");
  if (!["js", "ts", "jsx", "tsx"].includes(extension)) {
    throw new InvalidExtensionError(
      "[waavy::renderAction::validateComponentExtension]: An Exception was thrown: Invalid file extension - " +
        extension,
    );
  }
}

export async function loadComponent<Props = {}>(
  pathToComponent: string,
  name?: string,
): Promise<React.ComponentType<Props>> {
  const Component = await load(pathToComponent, name);
  if (Component == null) {
    throw new ComponentNotFoundError(pathToComponent, name || "default");
  }
  return Component as React.ComponentType<Props>;
}

export async function getComponentProps<Props extends {} = {}>(
  pathToComponent: string,
  options: RenderActionOptions,
) {
  let props = getPropsFromOptions(options);
  const copy = structuredClone(props);
  const gssp = await load(pathToComponent, "getServerSideProps");
  if (gssp && typeof gssp === "function") {
    try {
      const gsspProps = await Promise.resolve(
        gssp({ props, waavyRenderContext: getWaavyRenderContext(options?.request) }),
      );
      props = { ...props, ...gsspProps?.data };
    } catch (e) {
      return copy as Props;
    }
  }
  return props as Props;
}

export function getPropsFromOptions(options: RenderActionOptions): Record<string, unknown> {
  options.props ||= {};
  try {
    return typeof options?.props === "string" ? JSON.parse(options?.props) : options.props;
  } catch (e) {
    return {};
  }
}

export function getWaavyRenderContext(request?: Partial<Request>): RenderContext {
  return {
    path: request?.url ? new URL(request.url).pathname : null,
    search: request?.url ? new URL(request.url).searchParams : null,
    method: request?.method ?? null,
    headers: request?.headers ?? null,
  };
}
