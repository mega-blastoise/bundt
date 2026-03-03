import React from "react";
import { renderToString, renderToReadableStream } from "react-dom/server";
import { prerender } from "react-dom/static.edge";

import type { WriteStream } from "fs";
import path from "path";
import { Readable } from "stream";

interface WriteStaticComponentToFileOptions {
  prerenderOptions?: Parameters<typeof prerender>[1];
  outdir: string;
  filename: string;
}

export async function writeStaticComponentToFile(
  component: React.ReactNode,
  options: WriteStaticComponentToFileOptions,
) {
  const { filename, outdir, prerenderOptions } = options;

  try {
    const { prelude } = await prerender(component, prerenderOptions);
    const html = new Response(prelude, { headers: { "Content-Type": "text/html" } });
    const outfile = path.join(outdir, filename);

    if (await Bun.file(outfile).exists()) {
      throw new Error(`File already exists: ${outfile}`);
    }

    await Bun.write(outfile, html, { createPath: true });
  } catch (error) {}
}

export function transformComponentToString(
  component: React.ReactNode,
  options: Parameters<typeof renderToString>[1] = {},
) {
  return renderToString(component, options);
}

export async function transformComponentToReadableStream(
  component: React.ReactNode,
  options: Parameters<typeof renderToReadableStream>[1] = {},
) {
  return renderToReadableStream(component, options);
}

export async function pipeComponent<W extends WritableStream<T>, T = any>(
  component: React.ReactNode,
  writable: W,
  options: Parameters<typeof renderToReadableStream>[1] = {},
) {
  const stream = await transformComponentToReadableStream(component, options);
  await stream.pipeTo(writable);
}

export async function pipeComponentToWritableCallbacks(
  component: React.ReactNode,
  cbs: ((chunk: string) => void | Promise<void>)[],
  options: Parameters<typeof renderToReadableStream>[1] = {},
) {
  const stream = await transformComponentToReadableStream(component, options);
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let result: Bun.ReadableStreamDefaultReadResult<any> = {
    value: undefined,
    done: false,
  };
  while (!result.done) {
    result = await reader.read();
    const chunk = decoder.decode(result.value);
    for (const cb of cbs) {
      await Promise.resolve(cb(chunk));
    }
  }
}

/**
 * @deprecated
 */
export async function pipeComponentToWritableCallback(
  component: React.ReactNode,
  cb: (chunk: string) => void,
  options: Parameters<typeof renderToReadableStream>[1] = {},
) {
  const stream = await transformComponentToReadableStream(component, options);
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let result: Bun.ReadableStreamDefaultReadResult<any> = {
    value: undefined,
    done: false,
  };
  while (!result.done) {
    result = await reader.read();
    const chunk = decoder.decode(result.value);
    cb(chunk);
  }
}

export async function pipeComponentToCollectedString(
  component: React.ReactNode,
  options: Parameters<typeof renderToReadableStream>[1] = {},
  listeners: ((chunk: string) => void | Promise<void>)[] = [],
  init?: string,
) {
  let stream = init || "";
  await pipeComponentToWritableCallbacks(
    component,
    [
      (chunk) => {
        stream += chunk;
      },
      ...listeners,
    ],
    options,
  );
  return stream;
}

export async function pipeComponentToStdout(
  component: React.ReactNode,
  options: Parameters<typeof renderToReadableStream>[1] = {},
  listeners: ((chunk: string) => void | Promise<void>)[] = [],
) {
  await pipeComponentToWritableCallbacks(
    component,
    [
      (chunk) => {
        process.stdout.write(chunk);
      },
      ...listeners,
    ],
    options,
  );
}

// Convert Web ReadableStream to Node.js Readable stream
function webStreamToNodeStream(webStream: ReadableStream): Readable {
  const reader = webStream.getReader();

  return new Readable({
    async read() {
      try {
        const { done, value } = await reader.read();
        if (done) {
          this.push(null); // End the stream
        } else {
          this.push(Buffer.from(value)); // Convert Uint8Array to Buffer
        }
      } catch (error) {
        this.destroy(error as Error);
      }
    },
  });
}

export async function pipeComponentToNodeStream(
  component: React.ReactNode,
  nodeWriteStream: WriteStream,
  options: Parameters<typeof renderToReadableStream>[1] = {},
) {
  const webStream = await transformComponentToReadableStream(component, options);
  const nodeReadableStream = webStreamToNodeStream(webStream);

  return new Promise<void>((resolve, reject) => {
    nodeReadableStream.pipe(nodeWriteStream);

    nodeReadableStream.on("end", () => {
      resolve();
    });

    nodeReadableStream.on("error", (error) => {
      reject(error);
    });

    nodeWriteStream.on("error", (error) => {
      reject(error);
    });
  });
}
