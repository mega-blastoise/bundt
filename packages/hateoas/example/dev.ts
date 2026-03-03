import { resolve } from 'path';
import { watch } from 'fs';

const projectRoot = resolve(import.meta.dir, '..');
const htmlPath = resolve(import.meta.dir, 'index.html');
const entryPoint = resolve(import.meta.dir, 'entry.tsx');

let bundleCache: { js: string; timestamp: number } | null = null;

async function bundle(): Promise<string> {
  const result = await Bun.build({
    entrypoints: [entryPoint],
    target: 'browser',
    format: 'esm',
    minify: false,
    sourcemap: 'inline',
    define: {
      'process.env.NODE_ENV': '"development"'
    }
  });

  if (!result.success) {
    const errors = result.logs.map((l) => l.message).join('\n');
    console.error('Bundle failed:', errors);
    return `document.body.innerHTML = '<pre style="color:red;padding:2em">' + ${JSON.stringify(errors)} + '</pre>';`;
  }

  const js = await result.outputs[0]!.text();
  bundleCache = { js, timestamp: Date.now() };
  return js;
}

// Initial bundle
await bundle();

// Watch src/ and example/ for changes, rebuild
const watcher = watch(projectRoot, { recursive: true }, (event, filename) => {
  if (!filename) return;
  if (filename.includes('node_modules')) return;
  if (filename.endsWith('.ts') || filename.endsWith('.tsx') || filename.endsWith('.css')) {
    console.log(`  Changed: ${filename}, rebundling...`);
    bundleCache = null;
    bundle();
  }
});

const htmlContent = await Bun.file(htmlPath).text();
const injectedHtml = htmlContent.replace(
  '<script type="module" src="/example/entry.tsx"></script>',
  '<script type="module" src="/bundle.js"></script>'
);

Bun.serve({
  port: 3001,
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === '/' || url.pathname === '/index.html') {
      return new Response(injectedHtml, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    if (url.pathname === '/bundle.js') {
      const js = bundleCache?.js ?? await bundle();
      return new Response(js, {
        headers: {
          'Content-Type': 'application/javascript; charset=utf-8',
          'Cache-Control': 'no-cache'
        }
      });
    }

    return new Response('Not found', { status: 404 });
  }
});

console.log('Client dev server: http://localhost:3001');
