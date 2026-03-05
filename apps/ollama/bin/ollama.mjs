#!/usr/bin/env node

import { runWithBun } from '@bundt/internal-node-shim';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const distDir = dirname(fileURLToPath(import.meta.url));

runWithBun({
  name: 'ollama-bundt',
  tsEntry: resolve(distDir, '../bin/ollama.ts')
});
