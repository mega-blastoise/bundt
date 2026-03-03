import type { RenderActionOptions } from "@/types";

export enum OutputStrategy {
  NamedPipe,
  SerializedJson,
  StdoutString,
  StdoutStream,
}

/**
 * What is considered an "Output Strategy"?
 *
 * Waavy cannot take advantage (yet) of being directly invoked in arbitrary runtimes.
 *
 * We are working on the ffi, but right now, our means of invocation is limited to spawning
 * processes and listening for output from those processes, or agreeing on a predetermined pipe
 * to use for streaming output to.
 *
 * Primarily, we support:
 *
 * - Rendering a Component as a stream of data to stdout, and listening to the stdout stream
 * to collect the component and then once it's been collected as a string in the calling environment,
 * returned as a response.
 * - Rendering a Component as a stream of data to a named pipe (Pipe file)
 * -
 *
 * In the future, we want to support:
 * - Static Server Side Generation (Static SSG for Static React Pages)
 */
export function getOutputStrategy(options: RenderActionOptions): OutputStrategy {
  if (options.serialize) return OutputStrategy.SerializedJson;
  if (options.await) return OutputStrategy.StdoutString;
  if (options.pipe) return OutputStrategy.NamedPipe;
  return OutputStrategy.StdoutStream;
}

export * from "./browser";
export * from "./components";
export * from "./errors";
export * from "./pipe";
