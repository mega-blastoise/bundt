import { join } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import fm from 'front-matter';
import { getConfigValue } from '../commands/config';
import { resolveTargetBase } from '../helpers';
import { SubmissionMetadataSchema } from './schemas';
import type { QualifiedName, AgentFrontmatter, SkillFrontmatter } from '../types';
import { parseQualifiedName, formatQualifiedName, RESERVED_NAMESPACES } from '../types';

// --- Token ---

function getRegistryToken(): string {
  const token = getConfigValue(false, 'registry.token') as string | undefined
    ?? getConfigValue(true, 'registry.token') as string | undefined;

  if (!token) {
    throw new Error(
      'Registry token not configured.\n' +
      'Set a GitHub PAT with public_repo scope:\n' +
      '  cleo config set registry.token <your-github-pat> --global'
    );
  }
  return token;
}

function getRegistryRepo(): string {
  return (
    getConfigValue(false, 'registry.repo') as string | undefined ??
    getConfigValue(true, 'registry.repo') as string | undefined ??
    'nix-team/cleo-registry'
  );
}

// --- GitHub API ---

async function githubApi<T>(path: string, opts?: { method?: string; body?: unknown; token: string }): Promise<T> {
  const token = opts?.token ?? getRegistryToken();
  const res = await fetch(`https://api.github.com${path}`, {
    method: opts?.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: opts?.body ? JSON.stringify(opts.body) : undefined
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

// --- File content helpers ---

function resolveAgentPath(name: string): string | null {
  const local = join(resolveTargetBase(false), 'agents', `${name}.md`);
  if (existsSync(local)) return local;
  const global = join(resolveTargetBase(true), 'agents', `${name}.md`);
  if (existsSync(global)) return global;
  return null;
}

function resolveSkillPath(name: string): string | null {
  const local = join(resolveTargetBase(false), 'skills', name, 'SKILL.md');
  if (existsSync(local)) return local;
  const global = join(resolveTargetBase(true), 'skills', name, 'SKILL.md');
  if (existsSync(global)) return global;
  return null;
}

// --- Submit ---

interface SubmitResult {
  prUrl: string;
  qualifiedName: QualifiedName;
}

export async function submitAgent(qualifiedInput: string): Promise<SubmitResult> {
  const qn = parseQualifiedName(qualifiedInput);
  if (!qn) throw new Error(`Invalid qualified name: "${qualifiedInput}"`);
  if (qn.namespace === '_') throw new Error('Namespace is required for submissions. Use: namespace/name@version');
  if (RESERVED_NAMESPACES.includes(qn.namespace as any) && qn.namespace !== '_') {
    // Allow nix/community if user has token — enforcement is on the registry side
  }
  if (qn.version === '*') throw new Error('Version is required for submissions. Use: namespace/name@1.0.0');

  const agentPath = resolveAgentPath(qn.name);
  if (!agentPath) throw new Error(`Agent "${qn.name}" not found locally.`);

  const raw = readFileSync(agentPath, 'utf8');
  const parsed = fm<AgentFrontmatter>(raw);
  const a = parsed.attributes;

  const metadata = SubmissionMetadataSchema.parse({
    namespace: qn.namespace,
    name: qn.name,
    description: a.description,
    version: qn.version,
    author: (getConfigValue(true, 'author') as string | undefined) ?? 'unknown',
    tags: a.skills ?? ['agent']
  });

  // Collect agent + linked skills
  const files: Record<string, string> = {};
  files[`agents/${qn.name}/agent.md`] = raw;

  for (const skill of a.skills ?? []) {
    const skillPath = resolveSkillPath(skill);
    if (skillPath) {
      files[`skills/${skill}/SKILL.md`] = readFileSync(skillPath, 'utf8');
    }
  }

  return createSubmissionPR(qn, 'agent', metadata, files);
}

export async function submitSkill(qualifiedInput: string): Promise<SubmitResult> {
  const qn = parseQualifiedName(qualifiedInput);
  if (!qn) throw new Error(`Invalid qualified name: "${qualifiedInput}"`);
  if (qn.namespace === '_') throw new Error('Namespace is required for submissions. Use: namespace/name@version');
  if (qn.version === '*') throw new Error('Version is required for submissions. Use: namespace/name@1.0.0');

  const skillPath = resolveSkillPath(qn.name);
  if (!skillPath) throw new Error(`Skill "${qn.name}" not found locally.`);

  const raw = readFileSync(skillPath, 'utf8');
  const parsed = fm<SkillFrontmatter>(raw);
  const s = parsed.attributes;

  const metadata = SubmissionMetadataSchema.parse({
    namespace: qn.namespace,
    name: qn.name,
    description: s.description,
    version: qn.version,
    author: (getConfigValue(true, 'author') as string | undefined) ?? 'unknown',
    tags: s.tags ?? ['skill']
  });

  const files: Record<string, string> = {};
  files[`skills/${qn.name}/SKILL.md`] = raw;

  return createSubmissionPR(qn, 'skill', metadata, files);
}

// --- PR Creation ---

interface GithubRef { object: { sha: string } }
interface GithubBlob { sha: string }
interface GithubTree { sha: string }
interface GithubCommit { sha: string }
interface GithubPR { html_url: string; number: number }

async function createSubmissionPR(
  qn: QualifiedName,
  type: 'agent' | 'skill',
  metadata: { namespace: string; name: string; version: string; description: string; author: string; tags: string[] },
  files: Record<string, string>
): Promise<SubmitResult> {
  const token = getRegistryToken();
  const repo = getRegistryRepo();
  const display = formatQualifiedName(qn);
  const branch = `submit/${type}/${qn.namespace}/${qn.name}-${qn.version}`;

  // 1. Get main branch SHA
  const mainRef = await githubApi<GithubRef>(`/repos/${repo}/git/ref/heads/main`, { token });
  const baseSha = mainRef.object.sha;

  // 2. Create blobs for each file
  const treeItems: { path: string; mode: string; type: string; sha: string }[] = [];
  for (const [path, content] of Object.entries(files)) {
    const blob = await githubApi<GithubBlob>(`/repos/${repo}/git/blobs`, {
      method: 'POST',
      token,
      body: { content: Buffer.from(content).toString('base64'), encoding: 'base64' }
    });
    treeItems.push({ path, mode: '100644', type: 'blob', sha: blob.sha });
  }

  // 3. Create tree
  const tree = await githubApi<GithubTree>(`/repos/${repo}/git/trees`, {
    method: 'POST',
    token,
    body: { base_tree: baseSha, tree: treeItems }
  });

  // 4. Create commit
  const commit = await githubApi<GithubCommit>(`/repos/${repo}/git/commits`, {
    method: 'POST',
    token,
    body: {
      message: `submit: ${type} ${display}`,
      tree: tree.sha,
      parents: [baseSha]
    }
  });

  // 5. Create branch
  await githubApi(`/repos/${repo}/git/refs`, {
    method: 'POST',
    token,
    body: { ref: `refs/heads/${branch}`, sha: commit.sha }
  });

  // 6. Create PR
  const pr = await githubApi<GithubPR>(`/repos/${repo}/pulls`, {
    method: 'POST',
    token,
    body: {
      title: `[SUBMISSION] ${type}: ${display}`,
      body: formatPRBody(type, metadata, Object.keys(files)),
      head: branch,
      base: 'main'
    }
  });

  return { prUrl: pr.html_url, qualifiedName: qn };
}

function formatPRBody(
  type: string,
  metadata: { namespace: string; name: string; version: string; description: string; author: string; tags: string[] },
  files: string[]
): string {
  return [
    '## Submission',
    '',
    `| Field | Value |`,
    `|-------|-------|`,
    `| **Type** | ${type} |`,
    `| **Namespace** | ${metadata.namespace} |`,
    `| **Name** | ${metadata.name} |`,
    `| **Version** | ${metadata.version} |`,
    `| **Author** | ${metadata.author} |`,
    `| **Tags** | ${metadata.tags.join(', ')} |`,
    '',
    `> ${metadata.description}`,
    '',
    '## Files',
    '',
    ...files.map(f => `- \`${f}\``),
    '',
    '---',
    '*Submitted via `cleo submit`*'
  ].join('\n');
}
