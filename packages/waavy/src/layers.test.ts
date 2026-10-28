/**
 * Enforces the dependency rule from ARCHITECTURE.md §3.2 by scanning the
 * runtime imports of every source file (type-only imports are erased and
 * therefore not checked).
 *
 *   cli → {transport, build, core} · transport → {runtime, core}
 *   runtime → core · build → core · browser → core (DOM contract only)
 *   core → nothing outside core except zod
 *
 * Package entry files at the `src/` root are checked individually.
 */

import { readFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

import { describe, expect, test } from 'bun:test';

const SRC = import.meta.dir;

/** Internal modules a layer (or entry file) may import, by layer name or `layer/file`. */
const INTERNAL_RULES: Readonly<Record<string, readonly string[]>> = {
  core: ['core'],
  build: ['core', 'build'],
  runtime: ['core', 'runtime'],
  transport: ['core', 'runtime', 'transport'],
  cli: ['core', 'build', 'transport', 'cli'],
  browser: ['browser', 'core/constants', 'core/data-island'],
  'index.ts': ['core'],
  'server.ts': ['core', 'runtime'],
  'browser.ts': ['browser'],
  'entry-server.ts': ['core']
};

/**
 * External packages a layer may import. `undefined` means unrestricted.
 * These keep browser bundles small and the core runtime-agnostic.
 */
const EXTERNAL_RULES: Readonly<Record<string, readonly string[] | undefined>> = {
  core: ['zod'],
  browser: ['react', 'react-dom/client'],
  'entry-server.ts': ['react', 'react-dom/server']
};

type Violation = { file: string; specifier: string; reason: string };

/** `core/render.ts` → `"core"`; `server.ts` → `"server.ts"`. */
function layerOf(file: string): string {
  return relative(SRC, file).split(sep)[0] ?? '';
}

/** Module path relative to src without extension, e.g. `core/constants`. */
function moduleIdOf(file: string): string {
  return relative(SRC, file).split(sep).join('/').replace(/\.tsx?$/, '');
}

function isTestFile(file: string): boolean {
  return /\.test\.tsx?$/.test(file);
}

/** Every non-test source file under src/, scanned once. */
const SOURCE_FILES: readonly string[] = [...new Bun.Glob('**/*.{ts,tsx}').scanSync(SRC)]
  .map((path) => join(SRC, path))
  .filter((file) => !isTestFile(file));

function resolveRelative(from: string, specifier: string): string {
  const base = resolve(dirname(from), specifier);
  const candidates = [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts')];
  return candidates.find((candidate) => SOURCE_FILES.includes(candidate)) ?? base;
}

function violationsIn(file: string): Violation[] {
  const loader = file.endsWith('.tsx') ? 'tsx' : 'ts';
  const imports = new Bun.Transpiler({ loader }).scanImports(readFileSync(file, 'utf8'));
  const layer = layerOf(file);
  const violations: Violation[] = [];

  for (const { path: specifier } of imports) {
    if (specifier.startsWith('.')) {
      const target = resolveRelative(file, specifier);
      const targetLayer = layerOf(target);
      const targetId = moduleIdOf(target);
      const allowed = INTERNAL_RULES[layer] ?? [];
      const ok = allowed.some((rule) => rule === targetLayer || rule === targetId);
      if (!ok) violations.push({ file: moduleIdOf(file), specifier, reason: `${layer} may not import ${targetId}` });
    } else {
      const allowed = EXTERNAL_RULES[layer];
      if (allowed !== undefined && !allowed.includes(specifier)) {
        violations.push({ file: moduleIdOf(file), specifier, reason: `${layer} may only import ${allowed.join(', ')}` });
      }
    }
  }
  return violations;
}

describe('layer rules', () => {
  test('every source file belongs to a known layer', () => {
    const unknown = SOURCE_FILES
      .map(layerOf)
      .filter((layer) => INTERNAL_RULES[layer] === undefined);
    expect(unknown).toEqual([]);
  });

  test('no file imports across forbidden boundaries', () => {
    expect(SOURCE_FILES.flatMap(violationsIn)).toEqual([]);
  });

  test('nothing imports the cli layer except cli itself', () => {
    const importers = Object.entries(INTERNAL_RULES)
      .filter(([layer, allowed]) => layer !== 'cli' && allowed.includes('cli'))
      .map(([layer]) => layer);
    expect(importers).toEqual([]);
  });
});
