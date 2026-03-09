import type { EditorTool, TextMarkupActionTool } from './types.js';

export type EditorToolbarGroup = 'markup' | 'drawing' | 'advanced';

export interface EditorToolbarToolDefinition {
  readonly tool: EditorTool | TextMarkupActionTool;
  readonly label: string;
  readonly group: EditorToolbarGroup;
  readonly action?: boolean;
}

export const EDITOR_TOOLBAR_GROUP_LABELS: Readonly<Record<EditorToolbarGroup, string>> = {
  markup: 'Text markup',
  drawing: 'Drawing',
  advanced: 'Advanced',
};

export const EDITOR_TOOLBAR_TOOLS: readonly EditorToolbarToolDefinition[] = [
  { tool: 'highlight', label: 'Highlight', group: 'markup', action: true },
  { tool: 'underline', label: 'Underline', group: 'markup', action: true },
  { tool: 'strikeout', label: 'Strikeout', group: 'markup', action: true },
  { tool: 'freetext', label: 'Text', group: 'drawing' },
  { tool: 'ink', label: 'Draw', group: 'drawing' },
  { tool: 'rectangle', label: 'Rectangle', group: 'drawing' },
  { tool: 'circle', label: 'Circle', group: 'drawing' },
  { tool: 'line', label: 'Line', group: 'drawing' },
  { tool: 'stamp', label: 'Stamp', group: 'advanced' },
  { tool: 'redact', label: 'Redact', group: 'advanced' },
];
