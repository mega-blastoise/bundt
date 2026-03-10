import { resolve, relative, basename, extname, dirname } from 'path';
import { renderToString } from 'react-dom/server';
import { prerender } from 'react-dom/static';
import React from 'react';
import { Callout, Card, CardGrid, Steps, Step, Icon } from '../mdx/components.tsx';
import { DocLayout } from '../theme/layout.tsx';
import type { VoidConfig, CoverpageConfig } from '../config/schema.ts';

const mdxComponents = { Callout, Card, CardGrid, Steps, Step, Icon };

export async function resolveThemeStylesPath(): Promise<string> {
  const candidates = [
    resolve(import.meta.dir, '../theme/styles.css'),
    resolve(import.meta.dir, 'theme/styles.css'),
    resolve(import.meta.dir, '../../src/theme/styles.css')
  ];

  for (const candidate of candidates) {
    if (await Bun.file(candidate).exists()) {
      return candidate;
    }
  }

  throw new Error(
    `Could not find theme/styles.css. Searched:\n${candidates.map((c) => `  - ${c}`).join('\n')}`
  );
}

type Heading = { id: string; text: string; depth: number };

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function processHeadings(html: string): { html: string; headings: Heading[] } {
  const headings: Heading[] = [];

  const processed = html.replace(
    /<h([23])([^>]*)>([\s\S]*?)<\/h[23]>/g,
    (_match, level: string, attrs: string, content: string) => {
      const text = content.replace(/<[^>]*>/g, '').trim();
      const id = slugify(text);
      headings.push({ id, text, depth: Number(level) });

      if (/\bid=/.test(attrs)) return _match;
      return `<h${level}${attrs} id="${id}">${content}</h${level}>`;
    }
  );

  return { html: processed, headings };
}

function buildTocHtml(headings: Heading[]): string {
  if (headings.length === 0) return '';

  let html = '<div class="void-toc__title">On this page</div>';
  for (const h of headings) {
    const depthClass = h.depth === 3 ? ' void-toc__link--depth-3' : '';
    html += `<a href="#${h.id}" class="void-toc__link${depthClass}">${escapeHtml(h.text)}</a>`;
  }
  return html;
}

const tocScript = `<script>
(function(){
  var hs=document.querySelectorAll('.void-article h2[id],.void-article h3[id]');
  var ls=document.querySelectorAll('.void-toc__link');
  if(!hs.length||!ls.length)return;
  var o=new IntersectionObserver(function(es){
    for(var i=0;i<es.length;i++){
      if(es[i].isIntersecting){
        ls.forEach(function(l){l.classList.remove('active')});
        var a=document.querySelector('.void-toc__link[href="#'+es[i].target.id+'"]');
        if(a)a.classList.add('active');
        break;
      }
    }
  },{rootMargin:'-80px 0px -60% 0px'});
  hs.forEach(function(h){o.observe(h)});
})();
</script>`;

export function filePathToUrlPath(filePath: string, docsDir: string): string {
  const rel = relative(docsDir, filePath);
  const name = basename(rel, extname(rel));
  const dir = dirname(rel);

  if (name === 'index') {
    return dir === '.' ? '/' : `/${dir}`;
  }

  return dir === '.' ? `/${name}` : `/${dir}/${name}`;
}

export async function renderMdxToHtml(code: string): Promise<string> {
  const { run } = await import('@mdx-js/mdx');
  const { default: runtime } = await import('react/jsx-runtime');

  const mod = await run(code, {
    ...runtime,
    baseUrl: import.meta.url
  });

  const Content = mod.default;

  return renderToString(
    React.createElement(Content, { components: mdxComponents })
  );
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function htmlHead(title: string, description: string, cssContent: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
  <style>${cssContent}</style>
</head>
<body>
  `;
}

export type PrerenderResult = {
  head: string;
  prelude: ReadableStream;
  tail: string;
};

export async function prerenderPage(opts: {
  contentHtml: string;
  config: VoidConfig;
  currentPath: string;
  pageTitle: string;
  cssContent: string;
  coverpage?: CoverpageConfig;
  tail?: string;
}): Promise<PrerenderResult> {
  const title = opts.pageTitle
    ? `${opts.pageTitle} - ${opts.config.title}`
    : opts.config.title;

  const { html: processedHtml, headings } = processHeadings(opts.contentHtml);
  const tocHtml = buildTocHtml(headings);

  const layoutElement = React.createElement(DocLayout, {
    config: opts.config,
    currentPath: opts.currentPath,
    tocHtml,
    coverpage: opts.coverpage,
    children: React.createElement('div', {
      dangerouslySetInnerHTML: { __html: processedHtml }
    })
  });

  const { prelude } = await prerender(layoutElement);

  const tailScripts = [tocScript, opts.tail ?? ''].filter(Boolean).join('\n');

  return {
    head: htmlHead(title, opts.config.description, opts.cssContent),
    prelude,
    tail: `\n  ${tailScripts}\n</body>\n</html>`
  };
}
