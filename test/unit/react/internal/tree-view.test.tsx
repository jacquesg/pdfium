import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { TreeNode } from '../../../../src/react/internal/tree-view.js';
import { TreeView } from '../../../../src/react/internal/tree-view.js';

const sampleTree: TreeNode[] = [
  {
    id: 'root-1',
    label: 'Root One',
    children: [
      { id: 'child-1a', label: 'Child 1A' },
      {
        id: 'child-1b',
        label: 'Child 1B',
        children: [{ id: 'grandchild-1b1', label: 'Grandchild 1B1' }],
      },
    ],
  },
  { id: 'root-2', label: 'Root Two' },
];

describe('TreeView', () => {
  it('renders tree with correct ARIA roles', () => {
    render(<TreeView items={sampleTree} />);

    const tree = screen.getByRole('tree');
    expect(tree).toBeDefined();

    const treeItems = screen.getAllByRole('treeitem');
    expect(treeItems.length).toBe(2); // only root-level items visible initially

    // Root-1 has children so it should have aria-expanded
    const root1 = treeItems[0]!;
    expect(root1.getAttribute('aria-expanded')).toBe('false');

    // Root-2 is a leaf, no aria-expanded
    const root2 = treeItems[1]!;
    expect(root2.getAttribute('aria-expanded')).toBeNull();
  });

  it('expands and collapses nodes on click', () => {
    render(<TreeView items={sampleTree} />);

    const root1 = screen.getByText('Root One').closest('[role="treeitem"]')!;
    expect(root1.getAttribute('aria-expanded')).toBe('false');

    // Click to expand
    fireEvent.click(root1);
    expect(root1.getAttribute('aria-expanded')).toBe('true');

    // Children should now be visible
    expect(screen.getByText('Child 1A')).toBeDefined();
    expect(screen.getByText('Child 1B')).toBeDefined();

    // A group element should wrap children
    const groups = root1.querySelectorAll('[role="group"]');
    expect(groups.length).toBeGreaterThan(0);

    // Click again to collapse
    fireEvent.click(root1);
    expect(root1.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByText('Child 1A')).toBeNull();
  });

  it('ArrowDown moves focus to next visible item', () => {
    render(<TreeView items={sampleTree} />);

    const tree = screen.getByRole('tree');
    // Focus on root-1, press ArrowDown to move to root-2
    fireEvent.keyDown(tree, { key: 'ArrowDown' });

    const root2 = screen.getByText('Root Two').closest('[role="treeitem"]')!;
    expect(root2.getAttribute('tabindex')).toBe('0');
  });

  it('ArrowUp moves focus to previous visible item', () => {
    render(<TreeView items={sampleTree} />);

    const tree = screen.getByRole('tree');

    // Move down first, then up
    fireEvent.keyDown(tree, { key: 'ArrowDown' });
    fireEvent.keyDown(tree, { key: 'ArrowUp' });

    const root1 = screen.getByText('Root One').closest('[role="treeitem"]')!;
    expect(root1.getAttribute('tabindex')).toBe('0');
  });

  it('ArrowRight expands collapsed node', () => {
    render(<TreeView items={sampleTree} />);

    const tree = screen.getByRole('tree');
    const root1 = screen.getByText('Root One').closest('[role="treeitem"]')!;
    expect(root1.getAttribute('aria-expanded')).toBe('false');

    fireEvent.keyDown(tree, { key: 'ArrowRight' });
    expect(root1.getAttribute('aria-expanded')).toBe('true');
  });

  it('ArrowRight on expanded node moves focus to first child', () => {
    render(<TreeView items={sampleTree} />);

    const tree = screen.getByRole('tree');

    // Expand root-1
    fireEvent.keyDown(tree, { key: 'ArrowRight' });
    // Now press ArrowRight again to move to first child
    fireEvent.keyDown(tree, { key: 'ArrowRight' });

    const child1a = screen.getByText('Child 1A').closest('[role="treeitem"]')!;
    expect(child1a.getAttribute('tabindex')).toBe('0');
  });

  it('ArrowLeft collapses expanded node', () => {
    render(<TreeView items={sampleTree} />);

    const tree = screen.getByRole('tree');

    // Expand root-1
    fireEvent.keyDown(tree, { key: 'ArrowRight' });
    const root1 = screen.getByText('Root One').closest('[role="treeitem"]')!;
    expect(root1.getAttribute('aria-expanded')).toBe('true');

    // Collapse it
    fireEvent.keyDown(tree, { key: 'ArrowLeft' });
    expect(root1.getAttribute('aria-expanded')).toBe('false');
  });

  it('ArrowLeft on child moves focus to parent', () => {
    render(<TreeView items={sampleTree} />);

    const tree = screen.getByRole('tree');

    // Expand root-1 and move to first child
    fireEvent.keyDown(tree, { key: 'ArrowRight' });
    fireEvent.keyDown(tree, { key: 'ArrowRight' });

    const child1a = screen.getByText('Child 1A').closest('[role="treeitem"]')!;
    expect(child1a.getAttribute('tabindex')).toBe('0');

    // ArrowLeft should move back to parent
    fireEvent.keyDown(tree, { key: 'ArrowLeft' });
    const root1 = screen.getByText('Root One').closest('[role="treeitem"]')!;
    expect(root1.getAttribute('tabindex')).toBe('0');
  });

  it('Home moves focus to first item', () => {
    render(<TreeView items={sampleTree} />);

    const tree = screen.getByRole('tree');

    // Move to root-2
    fireEvent.keyDown(tree, { key: 'ArrowDown' });
    const root2 = screen.getByText('Root Two').closest('[role="treeitem"]')!;
    expect(root2.getAttribute('tabindex')).toBe('0');

    // Press Home
    fireEvent.keyDown(tree, { key: 'Home' });
    const root1 = screen.getByText('Root One').closest('[role="treeitem"]')!;
    expect(root1.getAttribute('tabindex')).toBe('0');
  });

  it('End moves focus to last visible item', () => {
    render(<TreeView items={sampleTree} />);

    const tree = screen.getByRole('tree');

    // Press End
    fireEvent.keyDown(tree, { key: 'End' });
    const root2 = screen.getByText('Root Two').closest('[role="treeitem"]')!;
    expect(root2.getAttribute('tabindex')).toBe('0');
  });

  it('Enter activates leaf item and calls onSelect', () => {
    const onSelect = vi.fn();
    render(<TreeView items={sampleTree} onSelect={onSelect} />);

    const tree = screen.getByRole('tree');

    // Move to root-2 (a leaf)
    fireEvent.keyDown(tree, { key: 'ArrowDown' });
    fireEvent.keyDown(tree, { key: 'Enter' });

    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'root-2', label: 'Root Two' }));
  });

  it('Space toggles parent node', () => {
    render(<TreeView items={sampleTree} />);

    const tree = screen.getByRole('tree');
    const root1 = screen.getByText('Root One').closest('[role="treeitem"]')!;

    // Space on parent should toggle expansion
    fireEvent.keyDown(tree, { key: ' ' });
    expect(root1.getAttribute('aria-expanded')).toBe('true');

    fireEvent.keyDown(tree, { key: ' ' });
    expect(root1.getAttribute('aria-expanded')).toBe('false');
  });

  it('roving tabindex: only focused item has tabindex 0, others -1', () => {
    render(<TreeView items={sampleTree} />);

    const treeItems = screen.getAllByRole('treeitem');
    // First item should be focused by default
    expect(treeItems[0]!.getAttribute('tabindex')).toBe('0');
    expect(treeItems[1]!.getAttribute('tabindex')).toBe('-1');
  });

  it('returns null for empty items array', () => {
    const { container } = render(<TreeView items={[]} />);
    expect(container.querySelector('[role="tree"]')).toBeNull();
  });

  it('renders nested children correctly at multiple levels', () => {
    render(<TreeView items={sampleTree} />);

    const tree = screen.getByRole('tree');

    // Expand root-1
    fireEvent.keyDown(tree, { key: 'ArrowRight' });
    expect(screen.getByText('Child 1A')).toBeDefined();
    expect(screen.getByText('Child 1B')).toBeDefined();

    // Move to Child 1B and expand it
    fireEvent.keyDown(tree, { key: 'ArrowDown' }); // child-1a
    fireEvent.keyDown(tree, { key: 'ArrowDown' }); // child-1b
    fireEvent.keyDown(tree, { key: 'ArrowRight' }); // expand child-1b

    expect(screen.getByText('Grandchild 1B1')).toBeDefined();

    // Verify nesting levels
    const grandchild = screen.getByText('Grandchild 1B1').closest('[role="treeitem"]')!;
    expect(grandchild.getAttribute('aria-level')).toBe('3');
  });

  it('ignores unsupported keys without preventing default', () => {
    render(<TreeView items={sampleTree} />);
    const tree = screen.getByRole('tree');
    const event = new KeyboardEvent('keydown', { key: 'x', bubbles: true, cancelable: true });
    tree.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });

  it('keeps focus stable at navigation boundaries', () => {
    render(<TreeView items={sampleTree} />);
    const tree = screen.getByRole('tree');

    // At top, ArrowUp has no previous item.
    fireEvent.keyDown(tree, { key: 'ArrowUp' });
    expect(screen.getByText('Root One').closest('[role="treeitem"]')?.getAttribute('tabindex')).toBe('0');

    // Move to bottom and verify ArrowDown no-ops.
    fireEvent.keyDown(tree, { key: 'ArrowDown' });
    expect(screen.getByText('Root Two').closest('[role="treeitem"]')?.getAttribute('tabindex')).toBe('0');
    fireEvent.keyDown(tree, { key: 'ArrowDown' });
    expect(screen.getByText('Root Two').closest('[role="treeitem"]')?.getAttribute('tabindex')).toBe('0');
  });

  it('ArrowRight on a leaf node does not toggle expansion or selection', () => {
    const onSelect = vi.fn();
    render(<TreeView items={sampleTree} onSelect={onSelect} />);
    const tree = screen.getByRole('tree');

    fireEvent.keyDown(tree, { key: 'ArrowDown' }); // root-2 (leaf)
    fireEvent.keyDown(tree, { key: 'ArrowRight' });

    expect(screen.getByText('Root Two').closest('[role="treeitem"]')?.getAttribute('tabindex')).toBe('0');
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('ArrowLeft on top-level collapsed node keeps focus on the same node', () => {
    render(<TreeView items={sampleTree} />);
    const tree = screen.getByRole('tree');

    fireEvent.keyDown(tree, { key: 'ArrowLeft' });
    expect(screen.getByText('Root One').closest('[role="treeitem"]')?.getAttribute('tabindex')).toBe('0');
  });

  it('resets focus to first node when the previously focused node no longer exists', () => {
    const { rerender } = render(<TreeView items={sampleTree} />);
    const tree = screen.getByRole('tree');
    fireEvent.keyDown(tree, { key: 'ArrowDown' });
    expect(screen.getByText('Root Two').closest('[role="treeitem"]')?.getAttribute('tabindex')).toBe('0');

    rerender(<TreeView items={[{ id: 'new-root', label: 'New Root' }]} />);
    expect(screen.getByText('New Root').closest('[role="treeitem"]')?.getAttribute('tabindex')).toBe('0');
  });
});
