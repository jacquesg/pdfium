import { describe, expect, it } from 'vitest';
import {
  collectVisibleIds,
  findNode,
  findParent,
  type TreeNode,
  toggleExpandedState,
} from '../../../../src/react/internal/tree-view-model.js';

const tree: TreeNode[] = [
  {
    id: 'root-1',
    label: 'Root 1',
    children: [
      { id: 'child-1', label: 'Child 1' },
      {
        id: 'child-2',
        label: 'Child 2',
        children: [{ id: 'grandchild-1', label: 'Grandchild 1' }],
      },
    ],
  },
  { id: 'root-2', label: 'Root 2' },
];

describe('tree-view-model', () => {
  it('collects visible IDs in document order based on expanded nodes', () => {
    expect(collectVisibleIds(tree, new Set())).toEqual(['root-1', 'root-2']);

    expect(collectVisibleIds(tree, new Set(['root-1']))).toEqual(['root-1', 'child-1', 'child-2', 'root-2']);

    expect(collectVisibleIds(tree, new Set(['root-1', 'child-2']))).toEqual([
      'root-1',
      'child-1',
      'child-2',
      'grandchild-1',
      'root-2',
    ]);
  });

  it('finds nodes and parent nodes by ID', () => {
    expect(findNode(tree, 'child-2')?.label).toBe('Child 2');
    expect(findNode(tree, 'missing')).toBeUndefined();

    expect(findParent(tree, 'child-1')?.id).toBe('root-1');
    expect(findParent(tree, 'grandchild-1')?.id).toBe('child-2');
    expect(findParent(tree, 'root-1')).toBeUndefined();
  });

  it('toggles expanded state without mutating the current set', () => {
    const current = new Set<string>(['root-1']);

    const expanded = toggleExpandedState(current, 'child-2');
    expect(expanded.has('root-1')).toBe(true);
    expect(expanded.has('child-2')).toBe(true);
    expect(current.has('child-2')).toBe(false);

    const collapsed = toggleExpandedState(expanded, 'root-1');
    expect(collapsed.has('root-1')).toBe(false);
    expect(collapsed.has('child-2')).toBe(true);
  });
});
