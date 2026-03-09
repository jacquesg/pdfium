/**
 * Available editor tools.
 */
export type EditorTool = 'freetext' | 'ink' | 'rectangle' | 'circle' | 'line' | 'stamp' | 'redact';

/**
 * One-shot text markup actions.
 */
export type TextMarkupActionTool = 'highlight' | 'underline' | 'strikeout';

/**
 * Editor mode.
 *
 * `idle` means neutral annotation-selection mode.
 */
export type EditorMode = 'idle' | EditorTool;

/**
 * All keys that have editable tool configuration.
 */
export type ToolConfigKey = EditorTool | TextMarkupActionTool;
