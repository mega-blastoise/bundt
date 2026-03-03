import { submitAgent, submitSkill } from '../registry/submit';
import { formatQualifiedName } from '../types';
import { success, error, pc } from '../ui';

export async function submitCommand(type: string, qualifiedName: string) {
  if (type !== 'agent' && type !== 'skill') {
    error(`Invalid type "${type}". Must be "agent" or "skill".`);
    process.exitCode = 1;
    return;
  }

  try {
    const result = type === 'agent'
      ? await submitAgent(qualifiedName)
      : await submitSkill(qualifiedName);

    success(`Submitted ${pc.bold(formatQualifiedName(result.qualifiedName))}`);
    console.log(`  ${pc.cyan(result.prUrl)}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    error(message);
    process.exitCode = 1;
  }
}
