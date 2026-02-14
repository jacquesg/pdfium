import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { TreeNode } from '../../../../src/react/internal/tree-view-model.js';
import { TreeItemsRenderer } from '../../../../src/react/internal/tree-view-renderers.js';

describe('TreeItemsRenderer', () => {
  it('activates a leaf node on click', () => {
    const nodes: TreeNode[] = [{ id: 'leaf', label: 'Leaf' }];
    const onToggle = vi.fn();
    const onSelect = vi.fn();
    const onFocusChange = vi.fn();

    render(
      <TreeItemsRenderer
        nodes={nodes}
        expanded={new Set()}
        focusedId="leaf"
        level={1}
        setSize={1}
        onToggle={onToggle}
        onSelect={onSelect}
        onFocusChange={onFocusChange}
      />,
    );

    fireEvent.click(screen.getByRole('treeitem'));
    expect(onFocusChange).toHaveBeenCalledWith('leaf');
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'leaf' }));
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('activates a parent node on click by toggling expansion', () => {
    const nodes: TreeNode[] = [{ id: 'parent', label: 'Parent', children: [{ id: 'child', label: 'Child' }] }];
    const onToggle = vi.fn();
    const onSelect = vi.fn();
    const onFocusChange = vi.fn();

    render(
      <TreeItemsRenderer
        nodes={nodes}
        expanded={new Set()}
        focusedId="parent"
        level={1}
        setSize={1}
        onToggle={onToggle}
        onSelect={onSelect}
        onFocusChange={onFocusChange}
      />,
    );

    fireEvent.click(screen.getByRole('treeitem'));
    expect(onFocusChange).toHaveBeenCalledWith('parent');
    expect(onToggle).toHaveBeenCalledWith('parent');
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('does not throw when a leaf is activated without onSelect', () => {
    const nodes: TreeNode[] = [{ id: 'leaf', label: 'Leaf' }];
    const onToggle = vi.fn();
    const onFocusChange = vi.fn();

    render(
      <TreeItemsRenderer
        nodes={nodes}
        expanded={new Set()}
        focusedId="leaf"
        level={1}
        setSize={1}
        onToggle={onToggle}
        onSelect={undefined}
        onFocusChange={onFocusChange}
      />,
    );

    fireEvent.click(screen.getByRole('treeitem'));
    expect(onFocusChange).toHaveBeenCalledWith('leaf');
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('handles Enter and Space keys as activations and ignores unrelated keys', () => {
    const nodes: TreeNode[] = [{ id: 'leaf', label: 'Leaf' }];
    const onToggle = vi.fn();
    const onSelect = vi.fn();
    const onFocusChange = vi.fn();

    render(
      <TreeItemsRenderer
        nodes={nodes}
        expanded={new Set()}
        focusedId="leaf"
        level={1}
        setSize={1}
        onToggle={onToggle}
        onSelect={onSelect}
        onFocusChange={onFocusChange}
      />,
    );

    const item = screen.getByRole('treeitem');

    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    item.dispatchEvent(enterEvent);
    expect(enterEvent.defaultPrevented).toBe(true);

    const spaceEvent = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
    item.dispatchEvent(spaceEvent);
    expect(spaceEvent.defaultPrevented).toBe(true);

    const otherEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    item.dispatchEvent(otherEvent);
    expect(otherEvent.defaultPrevented).toBe(false);

    expect(onFocusChange).toHaveBeenCalledTimes(2);
    expect(onSelect).toHaveBeenCalledTimes(2);
    expect(onToggle).not.toHaveBeenCalled();
  });
});
