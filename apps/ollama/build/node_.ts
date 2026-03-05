import base_config from './base';

export const node_config: typeof base_config = {
  ...base_config,
  target: 'node',
  naming: { entry: 'cli.js' }
};
