'use client';

import type { CSSProperties, KeyboardEvent } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { collectVisibleIds, findNode, findParent, type TreeNode, toggleExpandedState } from './tree-view-model.js';
import { TreeItemsRenderer } from './tree-view-renderers.js';

interface TreeViewProps {
  items: TreeNode[];
  onSelect?: ((node: TreeNode) => void) | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

/** WAI-ARIA APG compliant TreeView with roving tabindex and full keyboard navigation. */
function TreeView({ items, onSelect, className, style }: TreeViewProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [focusedId, setFocusedId] = useState<string>(items[0]?.id ?? '');
  const treeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const firstId = items[0]?.id;
    if (!firstId) return;
    if (focusedId && findNode(items, focusedId)) return;
    setFocusedId(firstId);
  }, [focusedId, items]);

  const toggle = useCallback((id: string) => {
    setExpanded((previous) => toggleExpandedState(previous, id));
  }, []);

  const focusNode = useCallback((id: string) => {
    setFocusedId(id);
    const element = treeRef.current?.querySelector<HTMLElement>(`[data-pdfium-tree-id="${CSS.escape(id)}"]`);
    element?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const visible = collectVisibleIds(items, expanded);
      const index = visible.indexOf(focusedId);
      if (index === -1) return;

      let handled = true;

      switch (event.key) {
        case 'ArrowDown': {
          const nextId = visible[index + 1];
          if (nextId !== undefined) focusNode(nextId);
          break;
        }
        case 'ArrowUp': {
          const previousId = visible[index - 1];
          if (previousId !== undefined) focusNode(previousId);
          break;
        }
        case 'ArrowRight': {
          const node = findNode(items, focusedId);
          if (node?.children && node.children.length > 0) {
            if (!expanded.has(focusedId)) {
              toggle(focusedId);
            } else {
              const firstChild = node.children[0];
              if (firstChild) focusNode(firstChild.id);
            }
          }
          break;
        }
        case 'ArrowLeft': {
          const node = findNode(items, focusedId);
          if (node?.children && node.children.length > 0 && expanded.has(focusedId)) {
            toggle(focusedId);
          } else {
            const parent = findParent(items, focusedId);
            if (parent) focusNode(parent.id);
          }
          break;
        }
        case 'Home': {
          const firstId = visible[0];
          if (firstId !== undefined) focusNode(firstId);
          break;
        }
        case 'End': {
          const lastId = visible[visible.length - 1];
          if (lastId !== undefined) focusNode(lastId);
          break;
        }
        case 'Enter':
        case ' ': {
          const node = findNode(items, focusedId);
          if (node) {
            if (node.children && node.children.length > 0) {
              toggle(focusedId);
            } else {
              onSelect?.(node);
            }
          }
          break;
        }
        default:
          handled = false;
      }

      if (!handled) return;
      event.preventDefault();
      event.stopPropagation();
    },
    [expanded, focusedId, focusNode, items, onSelect, toggle],
  );

  if (items.length === 0) return null;

  return (
    <div
      ref={treeRef}
      role="tree"
      aria-label="Tree"
      className={className}
      style={{ margin: 0, padding: 0, ...style }}
      onKeyDown={handleKeyDown}
    >
      <TreeItemsRenderer
        nodes={items}
        expanded={expanded}
        focusedId={focusedId}
        level={1}
        setSize={items.length}
        onToggle={toggle}
        onSelect={onSelect}
        onFocusChange={setFocusedId}
      />
    </div>
  );
}

export { TreeView };
export type { TreeNode };
