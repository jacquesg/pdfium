import type { EditorTool, TextMarkupActionTool } from '../types.js';

export const DEFAULT_POINTER_SHORTCUT_KEY = 'v';
const MARKUP_ACTION_TOOLS = new Set<TextMarkupActionTool>(['highlight', 'underline', 'strikeout']);

export function isEditableElement(element: Element | null): boolean {
  if (!element) return false;
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  ) {
    return true;
  }
  return (
    element instanceof HTMLElement &&
    (element.isContentEditable || element.closest('[contenteditable]:not([contenteditable="false"])') !== null)
  );
}

export function isMarkupActionTool(tool: EditorTool | TextMarkupActionTool): tool is TextMarkupActionTool {
  return MARKUP_ACTION_TOOLS.has(tool as TextMarkupActionTool);
}
