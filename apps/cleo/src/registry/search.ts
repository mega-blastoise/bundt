import { join } from 'node:path';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import Fuse from 'fuse.js';
import { Lexer } from 'marked';
import fm from 'front-matter';
import { getCliRoot, resolveTargetBase } from '../helpers';
import { getConfigValue } from '../commands/config';
import type { QualifiedName, AgentFrontmatter, SkillFrontmatter } from '../types';
import { toQualifiedName, formatQualifiedName } from '../types';
import type { RegistryIndex } from './schemas';
import { RegistryIndexSchema } from './schemas';

export interface SearchResult {
  qualifiedName: QualifiedName;
  type: 'agent' | 'skill';
  description: string;
  author: string;
  source: 'bundled' | 'global' | 'local' | 'registry';
  matchContext?: string;
}

// --- Bundled search ---

function scanAgents(dir: string, source: SearchResult['source']): SearchResult[] {
  if (!existsSync(dir)) return [];
  const results: SearchResult[] = [];
  for (const file of readdirSync(dir).filter(f => f.endsWith('.md'))) {
    try {
      const raw = readFileSync(join(dir, file), 'utf8');
      const parsed = fm<AgentFrontmatter>(raw);
      const a = parsed.attributes;
      results.push({
        qualifiedName: toQualifiedName({ name: a.name, namespace: a.namespace, tag: a.tag, version: a.version }),
        type: 'agent',
        description: a.description,
        author: source === 'bundled' ? 'nix-team' : 'user',
        source
      });
    } catch { /* skip invalid */ }
  }
  return results;
}

function scanSkills(dir: string, source: SearchResult['source']): SearchResult[] {
  if (!existsSync(dir)) return [];
  const results: SearchResult[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const skillPath = join(dir, entry.name, 'SKILL.md');
    if (!existsSync(skillPath)) continue;
    try {
      const raw = readFileSync(skillPath, 'utf8');
      const parsed = fm<SkillFrontmatter>(raw);
      const s = parsed.attributes;
      results.push({
        qualifiedName: toQualifiedName({ name: s.name, namespace: s.namespace, tag: s.tag, version: s.version }),
        type: 'skill',
        description: s.description,
        author: source === 'bundled' ? 'nix-team' : 'user',
        source
      });
    } catch { /* skip invalid */ }
  }
  return results;
}

function collectAll(): SearchResult[] {
  const root = getCliRoot();
  const local = resolveTargetBase(false);
  const global = resolveTargetBase(true);

  return [
    ...scanAgents(join(root, 'resources', 'agents'), 'bundled'),
    ...scanSkills(join(root, 'resources', 'skills'), 'bundled'),
    ...scanAgents(join(global, 'agents'), 'global'),
    ...scanSkills(join(global, 'skills'), 'global'),
    ...scanAgents(join(local, 'agents'), 'local'),
    ...scanSkills(join(local, 'skills'), 'local')
  ];
}

export function searchLocal(query: string): SearchResult[] {
  const q = query.toLowerCase();
  return collectAll().filter(r =>
    r.qualifiedName.name.includes(q) ||
    r.description.toLowerCase().includes(q) ||
    formatQualifiedName(r.qualifiedName).includes(q)
  );
}

// --- Deep search (fuzzy body matching) ---

interface DeepCandidate {
  result: SearchResult;
  text: string;
}

function collectDeepCandidates(shallowKeys: Set<string>): DeepCandidate[] {
  const root = getCliRoot();
  const local = resolveTargetBase(false);
  const global = resolveTargetBase(true);
  const candidates: DeepCandidate[] = [];

  const dirs = [
    { agents: join(root, 'resources', 'agents'), skills: join(root, 'resources', 'skills'), source: 'bundled' as const },
    { agents: join(global, 'agents'), skills: join(global, 'skills'), source: 'global' as const },
    { agents: join(local, 'agents'), skills: join(local, 'skills'), source: 'local' as const }
  ];

  for (const { agents, skills, source } of dirs) {
    if (existsSync(agents)) {
      for (const file of readdirSync(agents).filter(f => f.endsWith('.md'))) {
        try {
          const raw = readFileSync(join(agents, file), 'utf8');
          const parsed = fm<AgentFrontmatter>(raw);
          const a = parsed.attributes;
          const qn = toQualifiedName({ name: a.name, namespace: a.namespace, tag: a.tag, version: a.version });
          const key = `agent:${qn.namespace}/${qn.name}`;
          if (shallowKeys.has(key)) continue;
          candidates.push({
            result: { qualifiedName: qn, type: 'agent', description: a.description, author: source === 'bundled' ? 'nix-team' : 'user', source },
            text: mdToText(parsed.body)
          });
        } catch { /* skip */ }
      }
    }
    if (existsSync(skills)) {
      for (const entry of readdirSync(skills, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const skillPath = join(skills, entry.name, 'SKILL.md');
        if (!existsSync(skillPath)) continue;
        try {
          const raw = readFileSync(skillPath, 'utf8');
          const parsed = fm<SkillFrontmatter>(raw);
          const s = parsed.attributes;
          const qn = toQualifiedName({ name: s.name, namespace: s.namespace, tag: s.tag, version: s.version });
          const key = `skill:${qn.namespace}/${qn.name}`;
          if (shallowKeys.has(key)) continue;
          candidates.push({
            result: { qualifiedName: qn, type: 'skill', description: s.description, author: source === 'bundled' ? 'nix-team' : 'user', source },
            text: mdToText(parsed.body)
          });
        } catch { /* skip */ }
      }
    }
  }

  return candidates;
}

export function deepSearchLocal(query: string): SearchResult[] {
  const shallow = searchLocal(query);
  const shallowKeys = new Set(shallow.map(r => `${r.type}:${r.qualifiedName.namespace}/${r.qualifiedName.name}`));
  const candidates = collectDeepCandidates(shallowKeys);

  if (candidates.length === 0) return [];

  const fuse = new Fuse(candidates, {
    keys: ['text'],
    threshold: 0.4,
    ignoreLocation: true,
    includeMatches: true
  });

  return fuse.search(query).map(r => {
    const match = r.matches?.[0];
    let context: string | undefined;
    if (match?.indices?.[0]) {
      const [start] = match.indices[0];
      const text = match.value ?? '';
      const from = Math.max(0, start - 40);
      const to = Math.min(text.length, start + 40);
      context = (from > 0 ? '...' : '') + text.slice(from, to) + (to < text.length ? '...' : '');
    }
    return { ...r.item.result, matchContext: context };
  });
}

// --- Remote registry search ---

const DEFAULT_REGISTRY_URL = 'https://raw.githubusercontent.com/nix-team/cleo-registry/main/registry.json';

async function fetchRegistryIndex(): Promise<RegistryIndex | null> {
  const url = getConfigValue(false, 'registry.url') as string | undefined
    ?? getConfigValue(true, 'registry.url') as string | undefined
    ?? DEFAULT_REGISTRY_URL;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = await res.json();
    const parsed = RegistryIndexSchema.safeParse(data);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function registryToResults(index: RegistryIndex, query: string): SearchResult[] {
  const q = query.toLowerCase();
  return index.entries
    .filter(e =>
      e.qualifiedName.name.includes(q) ||
      e.description.toLowerCase().includes(q) ||
      e.tags.some(t => t.includes(q))
    )
    .map(e => ({
      qualifiedName: e.qualifiedName,
      type: e.type,
      description: e.description,
      author: e.author,
      source: 'registry' as const
    }));
}

// --- Combined search ---

export async function searchRegistry(query: string, deep?: boolean): Promise<SearchResult[]> {
  const local = searchLocal(query);
  const deepResults = deep ? deepSearchLocal(query) : [];

  let remote: SearchResult[] = [];
  try {
    const index = await fetchRegistryIndex();
    if (index) remote = registryToResults(index, query);
  } catch { /* offline / no registry */ }

  // Deduplicate: local > deep > remote. Key: type:namespace/name
  const seen = new Set<string>();
  const results: SearchResult[] = [];

  for (const batch of [local, deepResults, remote]) {
    for (const r of batch) {
      const key = `${r.type}:${r.qualifiedName.namespace}/${r.qualifiedName.name}`;
      if (!seen.has(key)) {
        seen.add(key);
        results.push(r);
      }
    }
  }

  return results;
}

// --- Markdown to text ---

function mdToText(md: string): string {
  const tokens = new Lexer().lex(md);
  return extractText(tokens).replace(/\s+/g, ' ').trim();
}

function extractText(tokens: unknown[]): string {
  let text = '';
  for (const token of tokens) {
    const t = token as Record<string, unknown>;
    if (typeof t.text === 'string') text += t.text + ' ';
    if (Array.isArray(t.tokens)) text += extractText(t.tokens);
    if (Array.isArray(t.items)) text += extractText(t.items);
  }
  return text;
}
