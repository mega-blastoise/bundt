import { createBaseConfig } from '@bundt/internal-build-utils';

export const base_config = createBaseConfig({
  external: ['react', 'react-dom'],
  outdir: './dist'
});

export default base_config;
