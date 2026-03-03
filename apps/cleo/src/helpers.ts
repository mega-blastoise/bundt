import { mkdirSync, readdirSync, readFileSync, existsSync, cpSync, rmSync } from 'node:fs';
import { join, basename, dirname } from 'node:path';
import fm from 'front-matter';
import type { AgentFrontmatter, SkillFrontmatter } from './types';

export function ensureDir(dir: string) {
  mkdirSync(dir, { recursive: true });
}

export function copyIfExists(src: string, dest: string, opts?: { recursive?: boolean }): boolean {
  if (!existsSync(src)) return false;
  cpSync(src, dest, { recursive: opts?.recursive ?? false });
  return true;
}

export function removeIfExists(path: string, opts?: { recursive?: boolean }) {
  if (existsSync(path)) rmSync(path, { recursive: opts?.recursive ?? false, force: true });
}

export function getAvailableAgents(agentsDir: string): string[] {
  if (!existsSync(agentsDir)) return [];
  return readdirSync(agentsDir)
    .filter(f => f.endsWith('.md'))
    .map(f => f.replace(/\.md$/, ''));
}

export function loadAgentMarkdown(agentsDir: string, name: string): { frontmatter: AgentFrontmatter; body: string } | null {
  const filePath = join(agentsDir, `${name}.md`);
  if (!existsSync(filePath)) return null;
  try {
    const raw = readFileSync(filePath, 'utf8');
    const parsed = fm<AgentFrontmatter>(raw);
    return { frontmatter: parsed.attributes, body: parsed.body };
  } catch {
    return null;
  }
}

export function loadSkillMarkdown(skillPath: string): { frontmatter: SkillFrontmatter; body: string } | null {
  if (!existsSync(skillPath)) return null;
  try {
    const raw = readFileSync(skillPath, 'utf8');
    const parsed = fm<SkillFrontmatter>(raw);
    return { frontmatter: parsed.attributes, body: parsed.body };
  } catch {
    return null;
  }
}

export function getCliRoot(): string {
  return process.env.CLEO_ROOT ?? dirname(dirname(new URL(import.meta.url).pathname));
}

export function resolveTargetBase(isGlobal: boolean): string {
  return isGlobal
    ? join(process.env.HOME ?? '~', '.claude')
    : join(process.cwd(), '.claude');
}
