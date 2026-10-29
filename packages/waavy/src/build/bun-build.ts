/**
 * A thin wrapper around `Bun.build` that converts every failure mode into a
 * `BUILD_FAILED` error with Bun's diagnostics in the message.
 */

import { describeError, WaavyError } from '../core/errors';

/** CSS is collected by the client build; the server bundle ignores it. */
export const cssStubPlugin: Bun.BunPlugin = {
  name: 'waavy-css-stub',
  setup(build) {
    build.onLoad({ filter: /\.css$/ }, () => ({ contents: '', loader: 'js' }));
  }
};

/**
 * Runs `Bun.build` and returns its output.
 *
 * Bun reports failures either by rejecting (with an `AggregateError` whose
 * `errors` are build messages) or by resolving with `success: false`; both
 * become a {@link WaavyError}.
 *
 * @param label - names the bundle in error messages, e.g. `"client bundle"`.
 * @throws {WaavyError} `BUILD_FAILED`.
 */
export async function runBunBuild(config: Bun.BuildConfig, label: string): Promise<Bun.BuildOutput> {
  let output: Bun.BuildOutput;
  try {
    output = await Bun.build(config);
  } catch (error) {
    throw new WaavyError('BUILD_FAILED', `${label} failed:\n${formatBuildError(error)}`, { cause: error });
  }
  if (!output.success) {
    throw new WaavyError('BUILD_FAILED', `${label} failed:\n${output.logs.map(String).join('\n')}`);
  }
  return output;
}

function formatBuildError(error: unknown): string {
  if (error instanceof AggregateError) return error.errors.map(String).join('\n');
  return describeError(error);
}
