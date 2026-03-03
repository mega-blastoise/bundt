import React from "react";
import type { RenderToReadableStreamOptions } from "react-dom/server";

import { handleError } from "@/errors";
import { pipeComponentToCollectedString, pipeComponentToStdout } from "@/server";
import defaultErrorPage from "@/templates/waavy-error-page";
import type { RenderAction, RenderActionOptions } from "@/types";

import { useCached, writeToCache } from "./cache";
import {
  createRenderOptions,
  createWindowAssignmentInlineScript,
  getComponentProps,
  getErrorComponentOrNull,
  getOutputStrategy,
  loadComponent,
  pipeComponentToNamedPipe,
  OutputStrategy,
  validateComponentExtension,
} from "./utils";

const renderAction: RenderAction = async (componentPath, options) => {
  const strategy = getOutputStrategy(options);

  const {
    await: _await = false,
    bootstrap = [],
    cache,
    cacheKey,
    cacheType,
    errorComponentName,
    errorComponentPath,
    pcacheKey,
    selector,
    name = "default",
    verbose = false,
  } = options;

  let cacheableRenderOutput: { value: string; done: false } = {
    value: "",
    done: false,
  };

  let errorConfiguration = {
    page: defaultErrorPage,
  };

  let signal,
    timeout,
    timeoutFired = false;

  try {
    validateComponentExtension(componentPath);

    const cacheIsActive = cache && cacheKey && cacheType;
    const props = await getComponentProps(componentPath, options);

    if (cacheIsActive) {
      const useCachedOptions = {
        cache: {
          key: cacheKey,
          type: cacheType,
        },
        component: {
          name,
          props,
          path: componentPath,
        },
        output: strategy,
      };
      const didUseCached = await useCached(useCachedOptions);
      if (didUseCached) return;
    }

    const Component = await loadComponent(componentPath, name);
    const ErrorComponent = await getErrorComponentOrNull(errorComponentPath, errorComponentName, options);

    const waavyScriptContent = createWindowAssignmentInlineScript({
      props,
      propsCacheKey: pcacheKey,
      selector,
    });

    const renderOptions = createRenderOptions({
      bootstrap,
      ErrorComponent,
      errorConfiguration,
      raOptions: options,
      signal,
      timeout,
      timeoutFired,
      waavyScriptContent,
    });

    await handleRenderAndOutput(
      {
        Component,
        props,
        commandOptions: options,
        renderOptions,
        strategy,
      },
      cacheableRenderOutput,
    );

    if (cacheIsActive && cacheableRenderOutput.value && cacheableRenderOutput.done) {
      try {
        await writeToCache({
          cacheKey,
          cacheType,
          component: {
            cacheableRenderOutput: cacheableRenderOutput.value,
            name,
            path: componentPath,
            props,
          },
        });
      } catch (e) {}
    }
  } catch (error) {
    handleError(error, strategy, verbose, errorConfiguration);
  } finally {
    if (signal && !timeoutFired && typeof timeout !== "undefined") {
      try {
        clearTimeout(timeout);
      } catch (_) {}
    }

    if (strategy !== OutputStrategy.NamedPipe) {
      /**
       * Flush stdout
       */
      if (process.stdout.writableNeedDrain) {
        process.stdout.emit("drain");
      }
    }
  }
};

type HandleRenderAndOutputOptions<Props> = {
  Component: React.ComponentType<Props>;
  props: Props;
  commandOptions: RenderActionOptions;
  renderOptions: RenderToReadableStreamOptions;
  strategy: OutputStrategy;
};

/**
 * From this point on,
 * we commit to an OutputStrategy,
 *
 * If that render for that given OutputStrategy fails during AppShell Render,
 * and an error is thrown,
 * both the renderOptions#onError callback will fire,
 * AND the catch block will fire.
 * @see https://react.dev/reference/react-dom/server/renderToReadableStream#recovering-from-errors-inside-the-shell
 *
 * However, if the render of the AppShell succeeds,
 * and an error is thrown in a subsequent part of the render cycle, (Streaming more content as it loads)
 * React will fail almost silently and default to client side rendering
 * In this case the server onError will fire,
 * but the catch block will not fire and rendering will attempt to continue.
 * @see https://react.dev/reference/react-dom/server/renderToReadableStream#recovering-from-errors-outside-the-shell
 *
 * */

async function handleRenderAndOutput<Props extends Record<string, unknown> = {}>(
  options: HandleRenderAndOutputOptions<Props>,
  cacheableRenderOutput: { value: string; done: boolean },
) {
  const Component = options.Component;
  const props = options.props;

  switch (options.strategy) {
    case OutputStrategy.SerializedJson:
      return await renderToSerializedJson(Component, props, options, cacheableRenderOutput);
    case OutputStrategy.StdoutString:
      return await renderToMarkup(Component, props, options, cacheableRenderOutput);
    case OutputStrategy.StdoutStream:
      return await renderToStdoutStream(Component, props, options, cacheableRenderOutput);
    case OutputStrategy.NamedPipe: {
      await pipeComponentToNamedPipe(options, Component, props, options.renderOptions);
      break;
    }
  }
}

async function renderToSerializedJson<Props extends Record<string, unknown> = {}>(
  Component: React.ComponentType<Props>,
  props: Props,
  options: HandleRenderAndOutputOptions<Props>,
  cacheableRenderOutput: { value: string; done: boolean },
) {
  const html = await pipeComponentToCollectedString(<Component {...props} />, options.renderOptions);
  if (options.commandOptions.cache) {
    cacheableRenderOutput.value = html;
    cacheableRenderOutput.done = true;
  }
  process.stdout.write(JSON.stringify({ html, exitCode: 0, props }));
}

async function renderToMarkup<Props extends Record<string, unknown> = {}>(
  Component: React.ComponentType<Props>,
  props: Props,
  options: HandleRenderAndOutputOptions<Props>,
  cacheableRenderOutput: { value: string; done: boolean },
) {
  const html = await pipeComponentToCollectedString(<Component {...props} />, options.renderOptions);
  if (options.commandOptions.cache) {
    cacheableRenderOutput.value = html;
    cacheableRenderOutput.done = true;
  }
  process.stdout.write(html);
}

async function renderToStdoutStream<Props extends Record<string, unknown> = {}>(
  Component: React.ComponentType<Props>,
  props: Props,
  options: HandleRenderAndOutputOptions<Props>,
  cacheableRenderOutput: { value: string; done: boolean },
) {
  const listeners: ((chunk: string) => void | Promise<void>)[] = [];
  if (options.commandOptions.cache) {
    const updateCacheableRenderOutput = (chunk: string) => {
      cacheableRenderOutput.value += chunk;
    };
    listeners.push(updateCacheableRenderOutput);
  }
  await pipeComponentToStdout(<Component {...props} />, options.renderOptions, listeners);
  if (options.commandOptions.cache) {
    cacheableRenderOutput.done = true;
  }
}

export default renderAction;
