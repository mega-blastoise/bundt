import { resolve, relative, basename, extname, dirname } from 'path';
import { mkdir } from 'fs/promises';
import pc from 'picocolors';
import { compileMdxFile } from '../mdx/compiler.ts';
import { generateCssVariables } from '../theme/tokens.ts';
import { filePathToUrlPath, renderMdxToHtml, prerenderPage, resolveThemeStylesPath } from './shared.ts';
import type { VoidConfig } from '../config/schema.ts';
import { Glob } from 'bun';

type PageEntry = {
  path: string;
  filePath: string;
  title: string;
  description: string;
  code: string;
};

async function discoverMdxFiles(rootDir: string): Promise<string[]> {
  const docsDir = resolve(rootDir, 'docs');
  const glob = new Glob('**/*.{md,mdx}');
  const files: string[] = [];

  for await (const path of glob.scan({ cwd: docsDir, absolute: true })) {
    files.push(path);
  }

  return files.sort();
}

async function streamToFile(
  outputPath: string,
  head: string,
  prelude: ReadableStream,
  tail: string
): Promise<void> {
  const file = Bun.file(outputPath);
  const writer = file.writer();

  writer.write(head);

  const reader = prelude.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    writer.write(value);
  }

  writer.write(tail);
  await writer.end();
}

export async function build(rootDir: string, config: VoidConfig): Promise<void> {
  const outDir = resolve(rootDir, config.output.outDir);
  const docsDir = resolve(rootDir, 'docs');

  console.log(`\n  ${pc.bold(pc.cyan('dxdocs'))} ${pc.dim('v0.1.0-alpha.1')}\n`);
  console.log(`  ${pc.dim('Building static site...')}\n`);

  const startTime = performance.now();

  const mdxFiles = await discoverMdxFiles(rootDir);
  console.log(`  ${pc.green('Found')} ${mdxFiles.length} pages`);

  const themeVars = generateCssVariables(
    config.theme.darkMode,
    config.theme.accentColor
  );

  const baseStylesPath = await resolveThemeStylesPath();
  const baseStyles = await Bun.file(baseStylesPath).text();
  const cssContent = `${themeVars}\n${baseStyles}`;

  const pages: PageEntry[] = [];

  for (const filePath of mdxFiles) {
    const source = await Bun.file(filePath).text();
    const { code, metadata } = await compileMdxFile(source, config);
    const urlPath = filePathToUrlPath(filePath, docsDir);

    pages.push({
      path: urlPath,
      filePath,
      title: (metadata.title as string) ?? basename(filePath, extname(filePath)),
      description: (metadata.description as string) ?? '',
      code
    });
  }

  if (config.navigation.length === 0) {
    config = {
      ...config,
      navigation: pages.map((p) => ({
        type: 'page' as const,
        path: p.path,
        title: p.title
      }))
    };
  }

  await Bun.write(resolve(outDir, '.gitkeep'), '');

  for (const page of pages) {
    const contentHtml = await renderMdxToHtml(page.code);
    const { head, prelude, tail } = await prerenderPage({
      contentHtml,
      config,
      currentPath: page.path,
      pageTitle: page.title,
      cssContent
    });

    const outputPath =
      page.path === '/'
        ? resolve(outDir, 'index.html')
        : resolve(outDir, page.path.slice(1), 'index.html');

    await mkdir(dirname(outputPath), { recursive: true });

    await streamToFile(outputPath, head, prelude, tail);
    console.log(`  ${pc.dim(page.path)} ${pc.dim('->')} ${pc.green(relative(rootDir, outputPath))}`);
  }

  const manifest = {
    version: '0.1.0-alpha.1',
    buildTime: new Date().toISOString(),
    routes: pages.map((p) => ({
      path: p.path,
      title: p.title,
      description: p.description
    }))
  };

  await Bun.write(
    resolve(outDir, '_manifest.json'),
    JSON.stringify(manifest, null, 2)
  );

  const elapsed = (performance.now() - startTime).toFixed(0);
  console.log(`\n  ${pc.green('Built')} ${pages.length} pages in ${pc.bold(`${elapsed}ms`)}`);
  console.log(`  ${pc.dim('Output:')} ${relative(rootDir, outDir)}/\n`);
}
