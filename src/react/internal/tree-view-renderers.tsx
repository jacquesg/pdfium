'use client';

import type { TreeNode } from './tree-view-model.js';

interface TreeItemsRendererProps {
  nodes: TreeNode[];
  expanded: ReadonlySet<string>;
  focusedId: string;
  level: number;
  setSize: number;
  onToggle: (id: string) => void;
  onSelect: ((node: TreeNode) => void) | undefined;
  onFocusChange: (id: string) => void;
}

function TreeItemsRenderer({
  nodes,
  expanded,
  focusedId,
  level,
  setSize,
  onToggle,
  onSelect,
  onFocusChange,
}: TreeItemsRendererProps) {
  return (
    <>
      {nodes.map((node, index) => (
        <TreeItem
          key={node.id}
          node={node}
          expanded={expanded}
          focusedId={focusedId}
          level={level}
          setSize={setSize}
          posInSet={index + 1}
          onToggle={onToggle}
          onSelect={onSelect}
          onFocusChange={onFocusChange}
        />
      ))}
    </>
  );
}

interface TreeItemProps {
  node: TreeNode;
  expanded: ReadonlySet<string>;
  focusedId: string;
  level: number;
  setSize: number;
  posInSet: number;
  onToggle: (id: string) => void;
  onSelect: ((node: TreeNode) => void) | undefined;
  onFocusChange: (id: string) => void;
}

function TreeItem({
  node,
  expanded,
  focusedId,
  level,
  setSize,
  posInSet,
  onToggle,
  onSelect,
  onFocusChange,
}: TreeItemProps) {
  const children = node.children ?? [];
  const hasChildren = children.length > 0;
  const isExpanded = expanded.has(node.id);
  const isFocused = focusedId === node.id;

  const handleClick = () => {
    onFocusChange(node.id);
    if (hasChildren) {
      onToggle(node.id);
    } else {
      onSelect?.(node);
    }
  };

  return (
    <div
      role="treeitem"
      aria-expanded={hasChildren ? isExpanded : undefined}
      aria-level={level}
      aria-setsize={setSize}
      aria-posinset={posInSet}
      aria-selected={isFocused}
      tabIndex={isFocused ? 0 : -1}
      data-pdfium-tree-id={node.id}
      onClick={handleClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleClick();
        }
      }}
      style={{
        cursor: 'pointer',
        padding: '4px 8px 4px',
        paddingInlineStart: `${(level - 1) * 16 + 8}px`,
        color: 'var(--pdfium-panel-colour, #374151)',
        backgroundColor: isFocused ? 'var(--pdfium-panel-item-active-bg, #eff6ff)' : 'transparent',
        borderRadius: '4px',
        userSelect: 'none',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {hasChildren ? (
          <span
            aria-hidden="true"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '16px',
              flexShrink: 0,
              transition: 'transform 150ms ease',
              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
              opacity: 0.65,
            }}
          >
            <svg
              aria-hidden="true"
              width={12}
              height={12}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </span>
        ) : (
          <span style={{ width: '16px', flexShrink: 0 }} />
        )}
        <span>{node.label}</span>
      </span>
      {hasChildren && isExpanded ? (
        // biome-ignore lint/a11y/useSemanticElements: WAI-ARIA APG tree pattern requires role="group" for nested items
        <div role="group" style={{ margin: 0, padding: 0 }}>
          <TreeItemsRenderer
            nodes={children}
            expanded={expanded}
            focusedId={focusedId}
            level={level + 1}
            setSize={children.length}
            onToggle={onToggle}
            onSelect={onSelect}
            onFocusChange={onFocusChange}
          />
        </div>
      ) : null}
    </div>
  );
}

export { TreeItemsRenderer };
