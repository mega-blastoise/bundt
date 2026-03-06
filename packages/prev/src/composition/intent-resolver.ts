import type { DataSourceRegistry } from '../registry/data-source-registry';
import type { FragmentRegistry } from '../registry/fragment-registry';
import type {
  DataSourceBinding,
  IntentComposition,
  LayoutType,
  StructuredComposition,
  StructuredCompositionFragment
} from '../types';

interface ScoredFragment {
  id: string;
  score: number;
}

function hasRequiredSchemaFields(schema: unknown): boolean {
  if (!schema || typeof schema !== 'object') return false;
  const s = schema as Record<string, unknown>;
  if (typeof s['_def'] !== 'object' || s['_def'] === null) return false;
  const def = s['_def'] as Record<string, unknown>;
  const shape = def['shape'] as Record<string, unknown> | undefined;
  if (!shape) return false;
  // If the object has any non-optional fields, it has required params
  for (const value of Object.values(shape)) {
    if (!value || typeof value !== 'object') continue;
    const fieldDef = (value as Record<string, unknown>)['_def'] as Record<string, unknown> | undefined;
    if (!fieldDef) continue;
    const typeName = fieldDef['typeName'] as string | undefined;
    if (typeName !== 'ZodOptional' && typeName !== 'ZodDefault') return true;
  }
  return false;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function scoreFragment(
  fragmentId: string,
  name: string,
  description: string | undefined,
  tags: string[] | undefined,
  tokens: string[]
): number {
  let score = 0;
  const targets = [
    fragmentId.toLowerCase(),
    name.toLowerCase(),
    (description ?? '').toLowerCase(),
    ...(tags ?? []).map((t) => t.toLowerCase())
  ].join(' ');

  for (const token of tokens) {
    if (targets.includes(token)) score += 10;
    for (const tag of tags ?? []) {
      if (tag.toLowerCase().includes(token)) score += 5;
    }
  }

  return score;
}

function autoSelectLayout(count: number, interactivity?: 'low' | 'medium' | 'high'): LayoutType {
  if (count <= 1) return 'single';
  if (count === 2) {
    return interactivity === 'high' ? 'primary-detail' : 'split-horizontal';
  }
  if (count === 3) return 'primary-detail';
  return 'dashboard';
}

export function resolveIntent(
  intent: IntentComposition,
  fragmentRegistry: FragmentRegistry,
  dataSourceRegistry: DataSourceRegistry
): StructuredComposition {
  const tokens = tokenize(intent.description);
  const allFragments = fragmentRegistry.list();
  const allDataSources = dataSourceRegistry.list();

  const scored: ScoredFragment[] = allFragments.map((f) => ({
    id: f.id,
    score: scoreFragment(f.id, f.name, f.description, f.tags, tokens)
  }));

  // Boost preferred fragments
  if (intent.constraints?.preferredFragments) {
    for (const pref of intent.constraints.preferredFragments) {
      const entry = scored.find((s) => s.id === pref);
      if (entry) entry.score += 50;
    }
  }

  // Boost fragments compatible with specified data sources
  if (intent.constraints?.dataSources) {
    for (const frag of allFragments) {
      const dataKeys = Object.values(frag.data);
      for (const dk of dataKeys) {
        if (intent.constraints.dataSources.includes(dk.source)) {
          const entry = scored.find((s) => s.id === frag.id);
          if (entry) entry.score += 20;
        }
      }
    }
  }

  scored.sort((a, b) => b.score - a.score);

  // Select fragments: those with score > 0, or all if none matched
  let selected = scored.filter((s) => s.score > 0);
  if (selected.length === 0) {
    selected = scored.slice(0, Math.min(3, scored.length));
  }

  const fragments: StructuredCompositionFragment[] = selected.map((s) => {
    const def = fragmentRegistry.get(s.id);
    const dataBindings: Record<string, DataSourceBinding> = {};

    for (const [key, field] of Object.entries(def.data)) {
      const matchingSource = allDataSources.find((ds) => ds.id === field.source);
      if (matchingSource) {
        // Check if the data source has required params we can't fill
        // by inspecting the Zod schema — skip if it has required fields
        const hasRequiredParams = hasRequiredSchemaFields(matchingSource.params);
        if (!hasRequiredParams) {
          dataBindings[key] = { source: matchingSource.id, params: {} };
        }
      } else {
        // Try to find a compatible source by tag matching (only param-free ones)
        const candidate = allDataSources.find((ds) =>
          ds.tags?.some((t) => def.tags?.includes(t)) && !hasRequiredSchemaFields(ds.params)
        );
        if (candidate) {
          dataBindings[key] = { source: candidate.id, params: {} };
        }
      }
    }

    return {
      fragmentId: s.id,
      props: {},
      data: Object.keys(dataBindings).length > 0 ? dataBindings : undefined
    };
  });

  const layout = intent.constraints?.layout ??
    autoSelectLayout(fragments.length, intent.constraints?.interactivity);

  return {
    fragments,
    layout,
    intent: intent.description
  };
}
