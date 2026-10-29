/**
 * Fixture config: one page per behavior the test suites exercise.
 */

import { defineConfig } from '@bundt/waavy';

export default defineConfig({
  pages: {
    counter: './pages/counter.tsx',
    styled: './pages/styled.tsx',
    boundary: './pages/boundary.tsx',
    broken: './pages/broken.tsx',
    slow: './pages/slow.tsx'
  },
  publicPath: '/assets/',
  outDir: './dist/waavy'
});
