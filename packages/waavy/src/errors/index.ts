import type { OutputStrategy } from "@/cli/RenderAction/utils";

import ComponentNotFoundError from "./ComponentNotFound";
import InvalidExtensionError from "./InvalidExtension";
import MissingPeerDependencyError from "./MissingPeerDependency";
import PropDataLoaderException from "./PropDataLoader";
import UnserializableObjectError from "./UnserializableObjectError";

export enum ErrorCodes {
  ComponentNotFoundError = 24,
  InvalidComponentFileExtensionError = 25,
  PropDataLoaderThrewAnException = 26,
}

export async function handleError(
  error: unknown,
  outputStrategy: OutputStrategy,
  verbose = false,
  errorConfiguration?: { page: string },
) {
  if (verbose) {
    /**
     * Report error
     */
  }

  if (error instanceof ComponentNotFoundError) {
    /**
     * Treat "ComponentNotFound" errors as unrecoverable,
     * and exit via the global handler, which can be invoked by re-throwing
     *
     * Why re-throw instead of process.exit(...) here?
     * We have cleanup functions we want to run, which live in a finally clause,
     * which will run if we throw, but not if we process.exit from here.
     *
     * In this case, if we do have an error page, we want to report the error page string to stderr
     * if a consumer is listening to stderr, they can stream the fallback response
     */
    if (errorConfiguration?.page) {
      await handleWriteErrorPageToStdErr(errorConfiguration?.page);
    }

    throw error;
  }

  if (error instanceof InvalidExtensionError) {
    /**
     * Treat "InvalidExtensionErrors" errors as unrecoverable,
     * and exit via the global handler, which can be invoked by re-throwing
     *
     * Why re-throw instead of process.exit(...) here?
     * We have cleanup functions we want to run, which live in a finally clause,
     * which will run if we throw, but not if we process.exit from here.
     *
     * In this case, if we do have an error page, we want to report the error page string to stderr
     * if a consumer is listening to stderr, they can stream the fallback response
     */

    if (errorConfiguration?.page) {
      await handleWriteErrorPageToStdErr(errorConfiguration?.page);
    }

    throw error;
  }

  if (error instanceof PropDataLoaderException) {
    if (errorConfiguration?.page) {
      await handleWriteErrorPageToStdErr(errorConfiguration?.page);
    }

    throw error;
  }

  throw error;
}

async function handleWriteErrorPageToStdErr(errorPage: string) {
  await new Promise<void>((resolve, reject) => {
    process.stderr.write(errorPage, (err) => {
      if (err) {
        reject(err);
      }

      resolve();
    });
  });
}

export {
  ComponentNotFoundError,
  InvalidExtensionError,
  MissingPeerDependencyError,
  PropDataLoaderException,
  UnserializableObjectError,
};
