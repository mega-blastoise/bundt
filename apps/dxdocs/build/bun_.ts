import base_config from './base';

export const bun_lib_config: typeof base_config = {
  ...base_config,
  entrypoints: ['src/index.ts'],
  target: 'bun',
  naming: { entry: 'index.bun.js' }
};

export const bun_cli_config: typeof base_config = {
  ...base_config,
  entrypoints: ['src/cli.ts'],
  target: 'bun',
  naming: { entry: 'cli.bun.js' }
};
