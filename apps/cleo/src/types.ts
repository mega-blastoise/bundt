import { z } from 'zod';

// --- Qualified Names (ADR-001) ---

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const QUALIFIED_NAME_RE = /^(?:([a-z0-9]+(?:-[a-z0-9]+)*)\/)?([a-z0-9]+(?:-[a-z0-9]+)*)(?::([a-z0-9]+(?:-[a-z0-9]+)*))?(?:@(.+))?$/;

export const RESERVED_NAMESPACES = ['_', 'bundt', 'nix', 'community'] as const;
export type ReservedNamespace = (typeof RESERVED_NAMESPACES)[number];

export interface QualifiedName {
  namespace: string;
  name: string;
  tag: string;
  version: string;
}

export function parseQualifiedName(input: string): QualifiedName | null {
  const match = input.match(QUALIFIED_NAME_RE);
  if (!match) return null;
  return {
    namespace: match[1] ?? '_',
    name: match[2]!,
    tag: match[3] ?? 'latest',
    version: match[4] ?? '*'
  };
}

export function formatQualifiedName(qn: QualifiedName): string {
  const parts: string[] = [];
  if (qn.namespace !== '_') parts.push(`${qn.namespace}/`);
  parts.push(qn.name);
  if (qn.tag !== 'latest') parts.push(`:${qn.tag}`);
  if (qn.version !== '*') parts.push(`@${qn.version}`);
  return parts.join('');
}

export function canonicalName(qn: QualifiedName): string {
  return `${qn.namespace}/${qn.name}:${qn.tag}@${qn.version}`;
}

export const QualifiedNameSchema = z.object({
  namespace: z.string().regex(KEBAB).default('_'),
  name: z.string().regex(KEBAB),
  tag: z.string().regex(KEBAB).default('latest'),
  version: z.string().default('*')
});

// --- Agent Frontmatter ---

export const AgentFrontmatterSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  tools: z.array(z.string()).min(1),
  model: z.string().optional(),
  permissionMode: z.string().optional(),
  skills: z.array(z.string()).optional(),
  memory: z.string().optional(),
  // ADR-001 additive fields
  namespace: z.string().regex(KEBAB).optional(),
  version: z.string().optional(),
  tag: z.string().optional(),
  deprecated: z.union([z.string(), z.boolean()]).optional()
});

export type AgentFrontmatter = z.infer<typeof AgentFrontmatterSchema>;

// --- Skill Frontmatter ---

export const SkillFrontmatterSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  tags: z.array(z.string()).optional(),
  // ADR-001 additive fields
  namespace: z.string().regex(KEBAB).optional(),
  version: z.string().optional(),
  tag: z.string().optional(),
  deprecated: z.union([z.string(), z.boolean()]).optional()
});

export type SkillFrontmatter = z.infer<typeof SkillFrontmatterSchema>;

// --- Validation ---

export interface ValidationResult {
  agent: string;
  errors: string[];
  warnings: string[];
}

// --- Helpers ---

export function toQualifiedName(fm: { name: string; namespace?: string; tag?: string; version?: string }): QualifiedName {
  return {
    namespace: fm.namespace ?? '_',
    name: fm.name,
    tag: fm.tag ?? 'latest',
    version: fm.version ?? '*'
  };
}
