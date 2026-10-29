/**
 * Small web-stream utilities used by the renderer. Only standard Web APIs are
 * used, so this module runs in any modern JS runtime.
 */

/**
 * Reads a byte stream to completion and decodes it as UTF-8. Multi-byte
 * characters split across chunks are decoded correctly.
 *
 * @throws whatever the stream errors with.
 */
export async function readStreamToString(stream: ReadableStream<Uint8Array>): Promise<string> {
  return new Response(stream).text();
}

/**
 * Returns a stream that emits `prefix`, then every chunk of `body`, then
 * `suffix`.
 *
 * - If `body` errors, the returned stream errors with the same reason and the
 *   suffix is never written, so consumers can tell a truncated document from
 *   a complete one.
 * - Cancelling the returned stream cancels `body`, which lets React abort the
 *   underlying render.
 */
export function wrapStream(
  prefix: string,
  body: ReadableStream<Uint8Array>,
  suffix: string
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const reader = body.getReader();

  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(prefix));
    },
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          controller.enqueue(encoder.encode(suffix));
          controller.close();
          return;
        }
        controller.enqueue(value);
      } catch (error) {
        controller.error(error);
      }
    },
    async cancel(reason) {
      await reader.cancel(reason);
    }
  });
}
