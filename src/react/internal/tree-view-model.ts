interface TreeNode {
  id: string;
  label: string;
  children?: TreeNode[] | undefined;
  data?: Record<string, unknown> | undefined;
}

function collectVisibleIds(nodes: TreeNode[], expanded: ReadonlySet<string>): string[] {
  const result: string[] = [];

  for (const node of nodes) {
    result.push(node.id);
    if (node.children && node.children.length > 0 && expanded.has(node.id)) {
      result.push(...collectVisibleIds(node.children, expanded));
    }
  }

  return result;
}

function findNode(nodes: TreeNode[], id: string): TreeNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (!node.children) continue;

    const found = findNode(node.children, id);
    if (found) return found;
  }

  return undefined;
}

function findParent(nodes: TreeNode[], id: string): TreeNode | undefined {
  for (const node of nodes) {
    if (!node.children) continue;

    for (const child of node.children) {
      if (child.id === id) return node;
    }

    const found = findParent(node.children, id);
    if (found) return found;
  }

  return undefined;
}

function toggleExpandedState(current: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(current);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  return next;
}

export { collectVisibleIds, findNode, findParent, toggleExpandedState };
export type { TreeNode };
