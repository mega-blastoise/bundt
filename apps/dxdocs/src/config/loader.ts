import { resolve } from 'path';
import { voidConfigSchema, type VoidConfig } from './schema.ts';

export async function loadConfig(rootDir: string): Promise<VoidConfig> {
  const configPath = resolve(rootDir, 'dxdocs.config.ts');
  const file = Bun.file(configPath);

  if (!(await file.exists())) {
    return voidConfigSchema.parse({});
  }

  const mod = await import(configPath);
  const raw = mod.default ?? mod;
  return voidConfigSchema.parse(raw);
}
