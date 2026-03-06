import type { FragmentInstance, LayoutDefinition, LayoutPosition, LayoutType } from '../types';

function autoSelectLayout(count: number): LayoutType {
  if (count <= 1) return 'single';
  if (count === 2) return 'split-horizontal';
  if (count === 3) return 'primary-detail';
  return 'dashboard';
}

function solveSingle(fragments: FragmentInstance[]): LayoutDefinition {
  const positions = new Map<string, LayoutPosition>();
  const instance = fragments[0];
  if (instance) {
    positions.set(instance.instanceId, { row: 1, col: 1, rowSpan: 1, colSpan: 1 });
  }
  return { type: 'single', gap: '0', padding: '0', columns: 1, rows: 1, positions };
}

function solveSplitHorizontal(fragments: FragmentInstance[]): LayoutDefinition {
  const positions = new Map<string, LayoutPosition>();
  for (let i = 0; i < fragments.length; i++) {
    const f = fragments[i]!;
    positions.set(f.instanceId, { row: 1, col: i + 1, rowSpan: 1, colSpan: 1 });
  }
  return { type: 'split-horizontal', gap: '8px', padding: '8px', columns: fragments.length, rows: 1, positions };
}

function solveSplitVertical(fragments: FragmentInstance[]): LayoutDefinition {
  const positions = new Map<string, LayoutPosition>();
  for (let i = 0; i < fragments.length; i++) {
    const f = fragments[i]!;
    positions.set(f.instanceId, { row: i + 1, col: 1, rowSpan: 1, colSpan: 1 });
  }
  return { type: 'split-vertical', gap: '8px', padding: '8px', columns: 1, rows: fragments.length, positions };
}

function solveGrid(fragments: FragmentInstance[]): LayoutDefinition {
  const cols = Math.ceil(Math.sqrt(fragments.length));
  const rows = Math.ceil(fragments.length / cols);
  const positions = new Map<string, LayoutPosition>();

  for (let i = 0; i < fragments.length; i++) {
    const f = fragments[i]!;
    const row = Math.floor(i / cols) + 1;
    const col = (i % cols) + 1;
    positions.set(f.instanceId, { row, col, rowSpan: 1, colSpan: 1 });
  }

  return { type: 'grid', gap: '8px', padding: '8px', columns: cols, rows, positions };
}

function solvePrimaryDetail(fragments: FragmentInstance[]): LayoutDefinition {
  const positions = new Map<string, LayoutPosition>();
  const detailCount = fragments.length - 1;

  if (fragments[0]) {
    positions.set(fragments[0].instanceId, { row: 1, col: 1, rowSpan: Math.max(detailCount, 1), colSpan: 2 });
  }

  for (let i = 1; i < fragments.length; i++) {
    const f = fragments[i]!;
    positions.set(f.instanceId, { row: i, col: 3, rowSpan: 1, colSpan: 1 });
  }

  return {
    type: 'primary-detail',
    gap: '8px',
    padding: '8px',
    columns: 3,
    rows: Math.max(detailCount, 1),
    positions
  };
}

function solveDashboard(fragments: FragmentInstance[]): LayoutDefinition {
  const cols = 3;
  const rows = Math.ceil(fragments.length / cols);
  const positions = new Map<string, LayoutPosition>();

  for (let i = 0; i < fragments.length; i++) {
    const f = fragments[i]!;
    const row = Math.floor(i / cols) + 1;
    const col = (i % cols) + 1;
    positions.set(f.instanceId, { row, col, rowSpan: 1, colSpan: 1 });
  }

  return { type: 'dashboard', gap: '8px', padding: '8px', columns: cols, rows, positions };
}

const solvers: Record<LayoutType, (fragments: FragmentInstance[]) => LayoutDefinition> = {
  single: solveSingle,
  'split-horizontal': solveSplitHorizontal,
  'split-vertical': solveSplitVertical,
  grid: solveGrid,
  'primary-detail': solvePrimaryDetail,
  dashboard: solveDashboard,
  custom: solveGrid
};

export function solveLayout(fragments: FragmentInstance[], preferredLayout?: LayoutType): LayoutDefinition {
  const layoutType = preferredLayout ?? autoSelectLayout(fragments.length);
  const solver = solvers[layoutType];
  return solver(fragments);
}
