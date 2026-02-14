import type { StructureElement } from '../../core/types.js';
import { STRUCTURE_PANEL_COPY } from './structure-panel-copy.js';
import type { TreeNode } from './tree-view.js';

const STRUCTURE_PANEL_TABS = [
  { id: 'structure', label: STRUCTURE_PANEL_COPY.structureTabLabel },
  { id: 'named-dests', label: STRUCTURE_PANEL_COPY.namedDestinationsTabLabel },
] as const;

type StructurePanelTabId = (typeof STRUCTURE_PANEL_TABS)[number]['id'];

function isStructurePanelTabId(value: string): value is StructurePanelTabId {
  return value === 'structure' || value === 'named-dests';
}

function toStructureTreeNodes(elements: readonly StructureElement[], prefix: string): TreeNode[] {
  return elements.map((element, index) => ({
    id: `${prefix}-${index}`,
    label:
      element.type +
      (element.title ? ` \u2014 ${element.title}` : '') +
      (element.altText ? ` (${element.altText})` : '') +
      (element.lang ? ` [${element.lang}]` : ''),
    children: element.children.length > 0 ? toStructureTreeNodes(element.children, `${prefix}-${index}`) : undefined,
  }));
}

export { STRUCTURE_PANEL_TABS, isStructurePanelTabId, toStructureTreeNodes };
export type { StructurePanelTabId };
