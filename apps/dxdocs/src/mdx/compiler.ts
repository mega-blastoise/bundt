import { compile } from '@mdx-js/mdx';
import matter from 'gray-matter';
import remarkGfm from 'remark-gfm';
import type { Node } from 'unist';
import { createHighlighter, type Highlighter } from 'shiki';
import type { VoidConfig } from '../config/schema.ts';

export type MdxMetadata = {
  title?: string;
  description?: string;
  [key: string]: unknown;
};

export type CompiledMdx = {
  code: string;
  metadata: MdxMetadata;
};

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ['github-dark-default'],
      langs: [
        'typescript',
        'javascript',
        'tsx',
        'jsx',
        'bash',
        'json',
        'html',
        'css',
        'yaml',
        'markdown',
        'rust'
      ]
    });
  }
  return highlighterPromise;
}

function rehypeShiki() {
  return async (tree: Node) => {
    const { visit } = await import('unist-util-visit');
    const highlighter = await getHighlighter();

    const replacements: Array<{ parent: Record<string, unknown>; index: number; hast: { children: unknown[] } }> = [];

    visit(tree, 'element', (node: Record<string, unknown>, index: number | undefined, parent: Record<string, unknown> | undefined) => {
      if (
        node.tagName !== 'pre' ||
        !Array.isArray(node.children) ||
        node.children.length !== 1 ||
        index === undefined ||
        !parent
      ) {
        return;
      }

      const codeNode = node.children[0] as Record<string, unknown>;
      if (codeNode.tagName !== 'code') return;

      const codeProps = codeNode.properties as Record<string, unknown> | undefined;
      const classNames = (codeProps?.className as string[]) ?? [];
      const langClass = classNames.find((c: string) => c.startsWith('language-'));
      const lang = langClass?.replace('language-', '') ?? 'text';

      const text = extractText(codeNode);

      let hast: { children: unknown[] };
      try {
        hast = highlighter.codeToHast(text, { lang, theme: 'github-dark-default' });
      } catch {
        hast = highlighter.codeToHast(text, { lang: 'text', theme: 'github-dark-default' });
      }

      replacements.push({ parent, index, hast });
    });

    for (const { parent, index, hast } of replacements) {
      const children = parent.children as unknown[];
      children.splice(index, 1, ...hast.children);
    }
  };
}

function extractText(node: Record<string, unknown>): string {
  if (node.type === 'text') return node.value as string;
  if (Array.isArray(node.children)) {
    return (node.children as Record<string, unknown>[]).map(extractText).join('');
  }
  return '';
}

export async function compileMdxFile(
  source: string,
  config: VoidConfig
): Promise<CompiledMdx> {
  const { data: metadata, content } = matter(source);

  const remarkPlugins = [];
  if (config.mdx.gfm) {
    remarkPlugins.push(remarkGfm);
  }

  const result = await compile(content, {
    outputFormat: 'function-body',
    remarkPlugins,
    rehypePlugins: [rehypeShiki],
    jsx: false
  });

  return {
    code: String(result),
    metadata: metadata as MdxMetadata
  };
}
