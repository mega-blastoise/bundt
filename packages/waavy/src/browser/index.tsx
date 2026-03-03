import React from "react";
import { hydrateRoot } from "react-dom/client";

import { DEFAULT_WAAVY_PROPS_CACHE_KEY, DEFAULT_WAAVY_HYDRATION_SELECTOR } from "@/constants";

function getWindowCacheKey(): string {
  const w = window as any;
  return w?.waavy?.keys?.pcache || DEFAULT_WAAVY_PROPS_CACHE_KEY;
}

export function wprops<Props>(cacheKey?: string): Props {
  const key = cacheKey || getWindowCacheKey();
  const w = window as any;
  const props = w[key] || w?.waavy?.__$stash__?.props;
  return props;
}

export function wselector(selector?: string) {
  return selector || DEFAULT_WAAVY_HYDRATION_SELECTOR;
}

interface WaavyHydrationOverrides {
  selector?: string;
  pcacheKey?: string;
}

function waavy<Props extends {} = {}>(
  App: React.FunctionComponent<Props>,
  overrides?: WaavyHydrationOverrides,
) {
  const props: Props = wprops(overrides?.pcacheKey);
  const selector = wselector(overrides?.selector);
  const container = selector === "document" ? document : document.querySelector(selector);

  if (container) {
    hydrateRoot(container, React.createElement(App, props), {
      onCaughtError(error, errorInfo) {
        /**
         * If telemetry is enabled, report exceptions
         */
      },
      onRecoverableError(error, errorInfo) {
        /**
         * If telemetry is enabled, report exceptions
         */
      },
      onUncaughtError(error, errorInfo) {
        /**
         * If telemetry is enabled, report exceptions
         */
      },
    });
  } else {
    console.error("[Waavy::HydrationIssue] Container not found:", selector);
  }
}

waavy.getWaavyProps = wprops;

export default waavy;
export { waavy };
