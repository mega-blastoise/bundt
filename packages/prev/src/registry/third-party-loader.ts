import type { FragmentDefinition, DataSourceDefinition, ThirdPartyConfig, FragmentPackageConfig } from '../types';
import type { FragmentRegistry } from './fragment-registry';
import type { DataSourceRegistry } from './data-source-registry';

interface LoadResult {
  fragments: number;
  dataSources: number;
  errors: Array<{ package: string; error: string }>;
}

function validatePermissions(
  declared: FragmentPackageConfig['permissions'],
  policy: ThirdPartyConfig['policy']
): string | undefined {
  if (!policy || !declared) return undefined;

  if (declared.network?.length) {
    const allowed = policy.allowNetwork ?? [];
    for (const host of declared.network) {
      const permitted = allowed.some((pattern) => {
        if (pattern.startsWith('*.')) {
          return host.endsWith(pattern.slice(1));
        }
        return host === pattern;
      });
      if (!permitted) return `Network access to "${host}" not permitted by policy`;
    }
  }

  if (declared.env?.length) {
    const allowed = policy.allowEnv ?? [];
    for (const envVar of declared.env) {
      if (!allowed.includes(envVar)) {
        return `Environment variable "${envVar}" not permitted by policy`;
      }
    }
  }

  if (declared.storage && policy.denyStorage) {
    return 'Storage access denied by policy';
  }

  return undefined;
}

export async function loadThirdPartyPackages(
  config: ThirdPartyConfig,
  fragmentRegistry: FragmentRegistry,
  dataSourceRegistry: DataSourceRegistry
): Promise<LoadResult> {
  const result: LoadResult = { fragments: 0, dataSources: 0, errors: [] };
  const packages = config.packages ?? [];

  if (config.autoDiscover) {
    // Scan node_modules for packages with prev field
    try {
      const { readdir } = await import('node:fs/promises');
      const { join } = await import('node:path');

      const nodeModulesPath = join(process.cwd(), 'node_modules');
      const entries = await readdir(nodeModulesPath, { withFileTypes: true }).catch(() => []);

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        if (entry.name.startsWith('@')) {
          // Scoped package — scan subdirectories
          const scopedPath = join(nodeModulesPath, entry.name);
          const scopedEntries = await readdir(scopedPath, { withFileTypes: true }).catch(() => []);
          for (const sub of scopedEntries) {
            if (!sub.isDirectory()) continue;
            const pkgName = `${entry.name}/${sub.name}`;
            if (!packages.includes(pkgName)) {
              const pkgJsonPath = join(scopedPath, sub.name, 'package.json');
              try {
                const pkgJson = await Bun.file(pkgJsonPath).json();
                if (pkgJson.prev) packages.push(pkgName);
              } catch {
                // Not a prev package
              }
            }
          }
        } else {
          const pkgJsonPath = join(nodeModulesPath, entry.name, 'package.json');
          try {
            const pkgJson = await Bun.file(pkgJsonPath).json();
            if (pkgJson.prev && !packages.includes(entry.name)) {
              packages.push(entry.name);
            }
          } catch {
            // Not a prev package
          }
        }
      }
    } catch {
      // Auto-discovery failed, continue with explicit packages
    }
  }

  for (const pkgName of packages) {
    try {
      await loadPackage(pkgName, config, fragmentRegistry, dataSourceRegistry, result);
    } catch (error) {
      result.errors.push({
        package: pkgName,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return result;
}

async function loadPackage(
  pkgName: string,
  config: ThirdPartyConfig,
  fragmentRegistry: FragmentRegistry,
  dataSourceRegistry: DataSourceRegistry,
  result: LoadResult
): Promise<void> {
  const { join } = await import('node:path');
  const nodeModulesPath = join(process.cwd(), 'node_modules');
  const pkgJsonPath = join(nodeModulesPath, pkgName, 'package.json');

  let pkgJson: Record<string, unknown>;
  try {
    pkgJson = await Bun.file(pkgJsonPath).json();
  } catch {
    throw new Error(`Could not read package.json for "${pkgName}"`);
  }

  const prevConfig = pkgJson['prev'] as FragmentPackageConfig | undefined;
  if (!prevConfig) {
    throw new Error(`Package "${pkgName}" does not have a prev configuration`);
  }

  // Validate permissions
  const permError = validatePermissions(prevConfig.permissions, config.policy);
  if (permError) {
    throw new Error(`Permission denied for "${pkgName}": ${permError}`);
  }

  // Load fragments
  for (const fragmentPath of prevConfig.fragments ?? []) {
    try {
      const fullPath = join(nodeModulesPath, pkgName, fragmentPath);
      const mod = await import(fullPath);
      const fragmentDefs = Object.values(mod).filter(
        (v): v is FragmentDefinition => typeof v === 'object' && v !== null && 'id' in v && 'render' in v
      );

      for (const def of fragmentDefs) {
        const enhanced = { ...def, source: 'third-party' as const, packageName: pkgName };
        fragmentRegistry.register(enhanced);
        result.fragments++;
      }
    } catch (error) {
      result.errors.push({
        package: pkgName,
        error: `Failed to load fragment "${fragmentPath}": ${error instanceof Error ? error.message : String(error)}`
      });
    }
  }

  // Load data sources
  for (const dsPath of prevConfig.dataSources ?? []) {
    try {
      const fullPath = join(nodeModulesPath, pkgName, dsPath);
      const mod = await import(fullPath);
      const dsDefs = Object.values(mod).filter(
        (v): v is DataSourceDefinition => typeof v === 'object' && v !== null && 'id' in v && 'fetch' in v
      );

      for (const def of dsDefs) {
        dataSourceRegistry.register(def);
        result.dataSources++;
      }
    } catch (error) {
      result.errors.push({
        package: pkgName,
        error: `Failed to load data source "${dsPath}": ${error instanceof Error ? error.message : String(error)}`
      });
    }
  }
}
