#!/usr/bin/env bun

import cac from 'cac';
import pc from 'picocolors';
import { loadConfig } from './config/loader.ts';
import { build } from './build/builder.ts';
import { startDevServer } from './build/dev.ts';

const VERSION = '0.2.0' as const;

const cli = cac('dxdocs');

cli
  .command('dev [port]', 'Start development server with live reload')
  .action(async (port?: string) => {
    const config = await loadConfig(process.cwd());
    await startDevServer(process.cwd(), config, port ? Number(port) : 3000);
  });

cli
  .command('build', 'Build static site for production')
  .action(async () => {
    const config = await loadConfig(process.cwd());
    await build(process.cwd(), config);
  });

cli.help();
cli.version(VERSION);

cli.parse();

if (!cli.matchedCommand && !cli.options.help && !cli.options.version) {
  console.log(`\n  ${pc.bold(pc.cyan('dxdocs'))} ${pc.dim('v' + VERSION)}`);
  console.log(`  ${pc.dim('Beautiful documentation, zero framework overhead')}\n`);
  console.log(`  ${pc.dim('Run')} ${pc.green('dxdocs --help')} ${pc.dim('for usage info')}\n`);
}
