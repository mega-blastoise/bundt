import base_config from './base';

export const bun_config: typeof base_config = {
  ...base_config,
  target: 'bun',
  naming: { entry: 'cli.bun.js' }
};
