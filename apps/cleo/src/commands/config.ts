import { join } from 'node:path';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { ensureDir, resolveTargetBase } from '../helpers';
import { success, error, pc } from '../ui';

const CONFIG_FILE = 'cleo.config.json';

function getConfigPath(isGlobal: boolean): string {
  return join(resolveTargetBase(isGlobal), CONFIG_FILE);
}

export function getConfig(isGlobal: boolean): Record<string, unknown> {
  const path = getConfigPath(isGlobal);
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function getConfigValue(isGlobal: boolean, key: string): unknown {
  const config = getConfig(isGlobal);
  return key.split('.').reduce<unknown>((obj, k) => {
    if (obj && typeof obj === 'object' && k in obj) return (obj as Record<string, unknown>)[k];
    return undefined;
  }, config);
}

export function setConfigValue(isGlobal: boolean, key: string, value: unknown) {
  const path = getConfigPath(isGlobal);
  ensureDir(resolveTargetBase(isGlobal));
  const config = getConfig(isGlobal);
  const keys = key.split('.');
  let current: Record<string, unknown> = config;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i]!;
    if (typeof current[k] !== 'object' || current[k] === null) current[k] = {};
    current = current[k] as Record<string, unknown>;
  }
  current[keys[keys.length - 1]!] = value;
  writeFileSync(path, JSON.stringify(config, null, 2) + '\n');
}

export function configCommand(args: string[], opts: { global?: boolean }) {
  const [sub, key, ...rest] = args;
  const isGlobal = opts.global ?? false;

  if (sub === 'get' && key) {
    const val = getConfigValue(isGlobal, key);
    console.log(val !== undefined ? String(val) : pc.dim('(not set)'));
    return;
  }

  if (sub === 'set' && key) {
    const raw = rest.join(' ');
    if (!raw) {
      error('Missing value. Usage: cleo config set <key> <value>');
      process.exitCode = 1;
      return;
    }
    let value: unknown = raw;
    if (raw === 'true') value = true;
    else if (raw === 'false') value = false;
    else if (/^\d+(\.\d+)?$/.test(raw)) value = Number(raw);

    setConfigValue(isGlobal, key, value);
    success(`${key} = ${JSON.stringify(value)}`);
    return;
  }

  error('Usage: cleo config <get|set> <key> [value]');
  process.exitCode = 1;
}
