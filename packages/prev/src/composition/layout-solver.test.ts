import { describe, expect, test } from 'bun:test';
import { solveLayout } from './layout-solver';
import type { FragmentInstance } from '../types';

function makeInstance(id: string): FragmentInstance {
  return {
    instanceId: id,
    fragmentId: `frag-${id}`,
    props: {},
    dataBindings: {}
  };
}

describe('solveLayout', () => {
  test('single fragment gets single layout', () => {
    const layout = solveLayout([makeInstance('a')]);
    expect(layout.type).toBe('single');
    expect(layout.columns).toBe(1);
    expect(layout.rows).toBe(1);
    expect(layout.positions.get('a')).toEqual({ row: 1, col: 1, rowSpan: 1, colSpan: 1 });
  });

  test('two fragments auto-select split-horizontal', () => {
    const layout = solveLayout([makeInstance('a'), makeInstance('b')]);
    expect(layout.type).toBe('split-horizontal');
    expect(layout.columns).toBe(2);
    expect(layout.positions.get('a')!.col).toBe(1);
    expect(layout.positions.get('b')!.col).toBe(2);
  });

  test('three fragments auto-select primary-detail', () => {
    const layout = solveLayout([makeInstance('a'), makeInstance('b'), makeInstance('c')]);
    expect(layout.type).toBe('primary-detail');
    expect(layout.positions.get('a')!.colSpan).toBe(2);
  });

  test('four fragments auto-select dashboard', () => {
    const instances = [makeInstance('a'), makeInstance('b'), makeInstance('c'), makeInstance('d')];
    const layout = solveLayout(instances);
    expect(layout.type).toBe('dashboard');
    expect(layout.columns).toBe(3);
  });

  test('explicit grid layout', () => {
    const instances = [makeInstance('a'), makeInstance('b'), makeInstance('c'), makeInstance('d')];
    const layout = solveLayout(instances, 'grid');
    expect(layout.type).toBe('grid');
    expect(layout.columns).toBe(2);
    expect(layout.rows).toBe(2);
  });

  test('split-vertical layout', () => {
    const layout = solveLayout([makeInstance('a'), makeInstance('b')], 'split-vertical');
    expect(layout.type).toBe('split-vertical');
    expect(layout.columns).toBe(1);
    expect(layout.rows).toBe(2);
    expect(layout.positions.get('a')!.row).toBe(1);
    expect(layout.positions.get('b')!.row).toBe(2);
  });

  test('all fragments get positions', () => {
    const instances = Array.from({ length: 6 }, (_, i) => makeInstance(`f${i}`));
    const layout = solveLayout(instances, 'dashboard');
    for (const inst of instances) {
      expect(layout.positions.has(inst.instanceId)).toBe(true);
    }
  });
});
