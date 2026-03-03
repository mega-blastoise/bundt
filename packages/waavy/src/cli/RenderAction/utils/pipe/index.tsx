import React from "react";
import type { RenderToReadableStreamOptions } from "react-dom/server";
import fs from "fs";
import path from "path";

import { pipeComponentToNodeStream } from "@/server";
import type { RenderActionOptions } from "@/types";

/**
 * Opens up a filehandle to a named pipe file
 * Creates a writable stream to the pipe file,
 * Streams the rendering of the component to the writer (file handle)
 */
export async function pipeComponentToNamedPipe<Props extends Record<string, unknown> = {}>(
  options: RenderActionOptions,
  Component: React.ComponentType<Props>,
  props: Props = {} as Props,
  renderToReadableStreamOptions: RenderToReadableStreamOptions = {},
) {
  const pipePath = path.relative(options.pipe!, import.meta.url);
  const writable = fs.createWriteStream(pipePath);
  try {
    await pipeComponentToNodeStream(<Component {...props} />, writable, renderToReadableStreamOptions);
  } catch (error) {
    /** Think about constructing a specific subclass of Error for this */
    throw error;
  } finally {
    writable.end();
  }
}
