#!/usr/bin/env bun

import { input, select } from '@inquirer/prompts';
import { mkdir } from 'fs/promises';
import { join, resolve } from 'path';
import pc from 'picocolors';

const root = resolve(import.meta.dir, '..');

const name = await input({
  message: 'Package name (without @bundt/ prefix):',
  validate: (v) => /^[a-z][a-z0-9-]*$/.test(v) || 'Lowercase alphanumeric with hyphens only'
});

const kind = await select({
  message: 'Package type:',
  choices: [
    { name: 'app (CLI / deployable)', value: 'app' },
    { name: 'package (npm library)', value: 'package' },
    { name: 'internal (private, not published)', value: 'internal' }
  ]
});

const description = await input({
  message: 'Description:',
  default: `@bundt/${name}`
});

const baseDir = kind === 'app' ? 'apps' : kind === 'internal' ? 'internal' : 'packages';
const pkgDir = join(root, baseDir, name);

console.log(`\n${pc.cyan('Creating')} ${pc.bold(`@bundt/${name}`)} in ${pc.dim(`${baseDir}/${name}/`)}\n`);

await mkdir(join(pkgDir, 'src'), { recursive: true });

// package.json
const pkg: Record<string, unknown> = {
  name: kind === 'internal' ? `@bundt/internal-${name}` : `@bundt/${name}`,
  version: '0.1.0',
  type: 'module',
  private: kind === 'internal' ? true : undefined,
  description,
  license: 'MIT',
  exports: {
    '.': {
      bun: './src/index.ts',
      import: './dist/index.js',
      types: './dist/index.d.ts',
      default: './dist/index.js'
    }
  },
  engines: { bun: '>=1.3' },
  scripts: {
    build: 'echo "TODO: configure build"',
    typecheck: 'tsc --noEmit',
    test: 'bun test',
    clean: 'rm -rf dist'
  },
  devDependencies: {
    '@types/bun': 'latest',
    typescript: '^5.9.0'
  }
};

// Remove undefined values
Object.keys(pkg).forEach((k) => pkg[k] === undefined && delete pkg[k]);

await Bun.write(join(pkgDir, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');

// tsconfig.json
const tsconfig = {
  extends: '../../tsconfig.json',
  compilerOptions: {
    types: ['bun']
  },
  include: ['src'],
  exclude: ['node_modules', 'dist']
};
await Bun.write(join(pkgDir, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2) + '\n');

// src/index.ts
await Bun.write(join(pkgDir, 'src', 'index.ts'), `export {};\n`);

console.log(pc.green('Created:'));
console.log(`  ${pc.dim(baseDir + '/' + name + '/')}package.json`);
console.log(`  ${pc.dim(baseDir + '/' + name + '/')}tsconfig.json`);
console.log(`  ${pc.dim(baseDir + '/' + name + '/')}src/index.ts`);
console.log(`\nRun ${pc.cyan('bun install')} to link the new workspace.\n`);
