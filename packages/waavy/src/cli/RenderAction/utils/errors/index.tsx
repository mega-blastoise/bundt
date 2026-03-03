import React from "react";
import { renderToString } from "react-dom/server";

import path from "path";

import type { RenderActionOptions } from "@/types";
import { load, logger } from "@/utils";

type RenderToString = typeof renderToString;

type ErrorPageConfiguration = {
  errorPagePath: string;
  errorPageComponentName?: "default" | string;
};

export function getErrorPageMarkup(
  renderToString: RenderToString,
  ErrorComponent: React.ComponentType<{ error: unknown; errorInfo?: unknown }>,
  error: unknown,
  errorInfo?: unknown,
) {
  const page = renderToString(<ErrorComponent error={error} errorInfo={errorInfo} />);
  return page;
}

export async function loadErrorComponent(config: ErrorPageConfiguration) {
  const { errorPagePath, errorPageComponentName } = config;
  const npath = path.isAbsolute(errorPagePath) ? errorPagePath : path.resolve(process.cwd(), errorPagePath);
  const ErrorComponent = await load(npath, errorPageComponentName);
  return ErrorComponent;
}

export async function getErrorComponentOrNull(
  errorComponentPath?: string,
  errorComponentName?: string,
  options?: RenderActionOptions,
): Promise<React.ComponentType<{ error: unknown; errorInfo?: unknown }> | null> {
  let ErrorComponent = null;
  if (errorComponentPath) {
    try {
      ErrorComponent = await loadErrorComponent({
        errorPagePath: errorComponentPath,
        errorPageComponentName: errorComponentName,
      });
    } catch (e) {
      options?.verbose &&
        logger.extend("error")("An error was thrown trying to load the supplied error Component: %e", e);
      /** Swallow error page loading exceptions */
      ErrorComponent = null;
    }
  }

  return ErrorComponent;
}
