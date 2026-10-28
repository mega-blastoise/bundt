/**
 * A real `waavy serve` HTTP transport with a renderer whose *streaming*
 * output fails after the shell. Used by crates/waavy's integration tests to
 * verify end to end that hyper reports such responses as incomplete.
 *
 *   bun test/support/late-fail-server.ts <socket-path>
 *
 * Prints the `listening` event (JSON) on stderr, then serves until SIGTERM.
 */

import { WaavyError } from '../../src/core/errors';
import type { Renderer } from '../../src/runtime/renderer';
import { createLogger } from '../../src/transport/access-log';
import { startHttpServer } from '../../src/transport/http-server';

const socket = process.argv[2];
if (socket === undefined) throw new Error('usage: late-fail-server.ts <socket-path>');

const encoder = new TextEncoder();

const renderer: Renderer = {
  buildId: 'late-fail',
  pages: ['late-fail'],
  render: () => Promise.reject(new WaavyError('RENDER_FAILED', 'buffered renders are not scripted')),
  renderStream: async () => {
    let sent = false;
    const stream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        if (!sent) {
          sent = true;
          controller.enqueue(encoder.encode('<!doctype html><html><body><div id="waavy-root"><p>partial'));
          await Bun.sleep(20);
          return;
        }
        controller.error(new WaavyError('RENDER_FAILED', 'scripted late failure'));
      }
    });
    return { stream, buildId: 'late-fail', recoverableErrors: () => [] };
  },
  close: async () => undefined
};

const server = await startHttpServer({
  listen: { kind: 'socket', path: socket },
  current: () => ({ renderer }),
  logger: createLogger('info', (line) => process.stderr.write(`${line}\n`))
});
process.once('SIGTERM', () => void server.close());
