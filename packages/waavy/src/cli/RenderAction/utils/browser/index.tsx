import React from "react";
import { renderToString, type RenderToReadableStreamOptions } from "react-dom/server";

import { DEFAULT_WAAVY_HYDRATION_SELECTOR, DEFAULT_WAAVY_PROPS_CACHE_KEY } from "@/constants";
import type { RenderActionOptions } from "@/types";
import { asOptionalNumber, getVersion } from "@/utils";
import { getErrorPageMarkup } from "../errors";

type CreateRenderOptionsConfig = {
  bootstrap?: string[];
  ErrorComponent?: React.ComponentType<
    { error: unknown; errorInfo?: unknown } & Record<string, unknown>
  > | null;
  errorConfiguration?: { page: string };
  raOptions?: RenderActionOptions;
  signal?: AbortController["signal"];
  timeout?: NodeJS.Timeout;
  timeoutFired?: boolean;
  waavyScriptContent?: string;
};

export function createRenderOptions({
  bootstrap,
  ErrorComponent,
  errorConfiguration,
  raOptions,
  signal,
  timeout,
  timeoutFired,
  waavyScriptContent,
}: CreateRenderOptionsConfig) {
  const renderOptions: RenderToReadableStreamOptions = {
    bootstrapModules: bootstrap,
    bootstrapScriptContent: waavyScriptContent,
    onError: (error: unknown, errorInfo: unknown) => {
      if (ErrorComponent && errorConfiguration) {
        try {
          errorConfiguration.page = getErrorPageMarkup(renderToString, ErrorComponent, error, errorInfo);
        } catch (e) {}
      }
    },
    progressiveChunkSize: asOptionalNumber(raOptions?.chunk),
  };

  /**
   * 7. If a user has supplied a render timeout,
   * force client side rendering after the duration has elapsed
   * using the AbortController signal pattern
   */
  const timeoutDuration = asOptionalNumber(raOptions?.maxTimeout);
  if (!!timeoutDuration) {
    const controller = new AbortController();
    const duration = timeoutDuration * 1000;
    timeout = setTimeout(() => {
      controller.abort();
      timeoutFired = true;
    }, duration);

    signal = controller.signal;
    renderOptions.signal = signal;
  }

  return renderOptions;
}

type HydraWindowAssignmentScriptOptions<Props> = {
  props: Props;
  propsCacheKey?: string;
  selector?: string;
};

export function createWindowAssignmentInlineScript<Props>(
  options: HydraWindowAssignmentScriptOptions<Props>,
) {
  return (
    "window.waavy = {};" +
    `window.waavy.version = ${getVersion()};` +
    "window.waavy.keys = {};" +
    `window.waavy.keys.pcache = "${options.propsCacheKey || DEFAULT_WAAVY_PROPS_CACHE_KEY}";` +
    `window.waavy.keys.domselector = "${options.selector || DEFAULT_WAAVY_HYDRATION_SELECTOR}";` +
    `window[window.waavy.keys.pcache] = ${JSON.stringify(options.props)};` +
    `window.waavy.__$stash__.props = ${JSON.stringify(options.props)};`
  );
}
