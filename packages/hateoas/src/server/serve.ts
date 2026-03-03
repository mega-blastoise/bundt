/**
 * Bun.serve() integration for the HATEOAS router.
 * Provides a thin wrapper that connects the router to Bun's HTTP server.
 */

import type { Router } from './router.ts';

type ServeConfig = {
  router: Router;
  port?: number;
  hostname?: string;
  onStarted?: (url: string) => void;
};

export function serve(config: ServeConfig): ReturnType<typeof Bun.serve> {
  const { router, port = 3000, hostname = '0.0.0.0', onStarted } = config;

  const server = Bun.serve({
    port,
    hostname,
    fetch: (request) => router.handle(request)
  });

  const url = `http://${hostname === '0.0.0.0' ? 'localhost' : hostname}:${server.port}`;
  if (onStarted) {
    onStarted(url);
  } else {
    console.log(`HATEOAS server listening on ${url}`);
  }

  return server;
}
