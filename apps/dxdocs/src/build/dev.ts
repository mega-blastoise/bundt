import { resolve, relative, basename, extname } from 'path';
import pc from 'picocolors';
import { compileMdxFile } from '../mdx/compiler.ts';
import { generateCssVariables } from '../theme/tokens.ts';
import { filePathToUrlPath, renderMdxToHtml, escapeHtml, prerenderPage, resolveThemeStylesPath } from './shared.ts';
import type { VoidConfig } from '../config/schema.ts';
import { Glob } from 'bun';

function generate404Html(config: VoidConfig, cssContent: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>404 - ${escapeHtml(config.title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Fira+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
  <style>${cssContent}</style>
</head>
<body>
  <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;flex-direction:column;gap:12px">
    <h1 style="font-size:4rem;font-weight:700;color:var(--void-text-muted);margin:0;letter-spacing:-0.04em">404</h1>
    <p style="color:var(--void-text-secondary);margin:0">Page not found</p>
    <a href="/" style="color:var(--void-accent);text-decoration:none;margin-top:8px">Back to home</a>
  </div>
</body>
</html>`;
}

function concatStreams(head: string, prelude: ReadableStream, tail: string): ReadableStream {
  const encoder = new TextEncoder();
  const headBytes = encoder.encode(head);
  const tailBytes = encoder.encode(tail);

  return new ReadableStream({
    async start(controller) {
      controller.enqueue(headBytes);

      const reader = prelude.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        controller.enqueue(value);
      }

      controller.enqueue(tailBytes);
      controller.close();
    }
  });
}

export async function startDevServer(
  rootDir: string,
  config: VoidConfig,
  port = 3000
): Promise<void> {
  const docsDir = resolve(rootDir, 'docs');

  const themeVars = generateCssVariables(
    config.theme.darkMode,
    config.theme.accentColor
  );

  const baseStylesPath = await resolveThemeStylesPath();
  const baseStyles = await Bun.file(baseStylesPath).text();
  const cssContent = `${themeVars}\n${baseStyles}`;

  const notFoundHtml = generate404Html(config, cssContent);

  async function buildPageIndex() {
    const glob = new Glob('**/*.{md,mdx}');
    const pages: Map<string, string> = new Map();

    for await (const path of glob.scan({ cwd: docsDir, absolute: true })) {
      const urlPath = filePathToUrlPath(path, docsDir);
      pages.set(urlPath, path);
    }

    return pages;
  }

  async function getNavConfig(pages: Map<string, string>) {
    if (config.navigation.length > 0) return config;

    const entries = [...pages.entries()].map(([urlPath, filePath]) => ({
      type: 'page' as const,
      path: urlPath,
      title: basename(filePath, extname(filePath)).replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    }));

    return { ...config, navigation: entries };
  }

  let pageIndex = await buildPageIndex();

  const liveReloadScript = `<script>
  (function() {
    let last = Date.now();
    setInterval(async function() {
      try {
        const res = await fetch('/__void_reload?t=' + last);
        const data = await res.json();
        if (data.changed) {
          last = Date.now();
          location.reload();
        }
      } catch {}
    }, 1000);
  })();
</script>`;

  let lastModified = Date.now();

  const { watch } = await import('chokidar');
  const watcher = watch(docsDir, {
    ignoreInitial: true,
    ignored: /(^|[/\\])\../
  });

  watcher.on('all', async () => {
    lastModified = Date.now();
    pageIndex = await buildPageIndex();
  });

  Bun.serve({
    port,
    async fetch(req) {
      const url = new URL(req.url);
      let pathname = url.pathname;

      if (pathname === '/__void_reload') {
        const t = Number(url.searchParams.get('t') ?? 0);
        return Response.json({ changed: lastModified > t });
      }

      if (pathname.endsWith('/') && pathname !== '/') {
        pathname = pathname.slice(0, -1);
      }

      const filePath = pageIndex.get(pathname) ?? pageIndex.get('/');
      if (!filePath) {
        return new Response(notFoundHtml, {
          status: 404,
          headers: { 'Content-Type': 'text/html' }
        });
      }

      const effectivePath = pageIndex.has(pathname) ? pathname : '/';
      return await renderPage(filePath, effectivePath, cssContent);
    }
  });

  async function renderPage(
    filePath: string,
    currentPath: string,
    css: string
  ): Promise<Response> {
    try {
      const source = await Bun.file(filePath).text();
      const { code, metadata } = await compileMdxFile(source, config);
      const contentHtml = await renderMdxToHtml(code);

      const navConfig = await getNavConfig(pageIndex);
      const pageTitle = (metadata.title as string) ?? '';

      const { head, prelude, tail } = await prerenderPage({
        contentHtml,
        config: navConfig,
        currentPath,
        pageTitle,
        cssContent: css,
        tail: liveReloadScript
      });

      const stream = concatStreams(head, prelude, tail);

      return new Response(stream, {
        headers: { 'Content-Type': 'text/html' }
      });
    } catch (err) {
      console.error(`  ${pc.red('Error')} rendering ${filePath}:`, err);
      return new Response(`<pre>${String(err)}</pre>`, {
        status: 500,
        headers: { 'Content-Type': 'text/html' }
      });
    }
  }

  console.log(`\n  ${pc.bold(pc.cyan('dxdocs'))} ${pc.dim('dev server')}`);
  console.log(`  ${pc.green('Local:')} http://localhost:${port}\n`);
  console.log(`  ${pc.dim(`Watching ${relative(process.cwd(), docsDir)} for changes...`)}\n`);
}
