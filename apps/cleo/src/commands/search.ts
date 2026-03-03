import { searchRegistry } from '../registry/search';
import { formatQualifiedName } from '../types';
import { heading, table, pc } from '../ui';

const SOURCE_COLORS: Record<string, (s: string) => string> = {
  bundled: pc.cyan,
  global: pc.green,
  local: pc.blue,
  registry: pc.magenta
};

export async function searchCommand(query: string, opts: { deep?: boolean; type?: string }) {
  const results = await searchRegistry(query, opts.deep);

  const filtered = opts.type
    ? results.filter(r => r.type === opts.type)
    : results;

  if (filtered.length === 0) {
    console.log(pc.dim(`No results for "${query}".`));
    if (!opts.deep) console.log(pc.dim('Try --deep for fuzzy body search.'));
    return;
  }

  console.log();
  console.log(heading(`Results for "${query}"`));
  console.log();

  table(
    ['Name', 'Type', 'Source', 'Description'],
    filtered.map(r => [
      pc.bold(formatQualifiedName(r.qualifiedName)),
      r.type,
      (SOURCE_COLORS[r.source] ?? pc.white)(r.source),
      r.description.length > 50 ? r.description.slice(0, 47) + '...' : r.description
    ]),
    [30, 8, 12, 52]
  );

  const deepHits = filtered.filter(r => r.matchContext);
  if (deepHits.length > 0) {
    console.log();
    console.log(pc.dim('Deep matches:'));
    for (const r of deepHits) {
      console.log(`  ${pc.bold(formatQualifiedName(r.qualifiedName))} ${pc.dim(r.matchContext ?? '')}`);
    }
  }

  console.log();
  console.log(pc.dim(`${filtered.length} result(s)`));
}
