/**
 * Editor layer for the PDFium React SDK.
 *
 * Provides opt-in annotation editing, page management, tool system,
 * undo/redo, and interactive overlays.
 *
 * @module react/editor
 */

// ── Command system ────────────────────────────────────────────
export type { CreateAnnotationOptions, EditorCommand, PageAccessor } from './command.js';
export {
  CommandStack,
  CompositeCommand,
  CreateAnnotationCommand,
  DeletePageCommand,
  InsertBlankPageCommand,
  MovePageCommand,
  RemoveAnnotationCommand,
  SetAnnotationColourCommand,
  SetAnnotationRectCommand,
  SetAnnotationStringCommand,
} from './command.js';
// ── Components ────────────────────────────────────────────────
export type { AnnotationPropertyPanelProps } from './components/annotation-property-panel.js';
export { AnnotationPropertyPanel } from './components/annotation-property-panel.js';
export type { EditorOverlayProps } from './components/editor-overlay.js';
export { EditorOverlay } from './components/editor-overlay.js';
export type { EditorToolbarProps } from './components/editor-toolbar.js';
export { EditorToolbar } from './components/editor-toolbar.js';
export type { FreeTextEditorProps } from './components/freetext-editor.js';
export { FreeTextEditor } from './components/freetext-editor.js';
export type { InkCanvasProps } from './components/ink-canvas.js';
export { InkCanvas } from './components/ink-canvas.js';
export type { PageManagementPanelProps } from './components/page-management-panel.js';
export { PageManagementPanel } from './components/page-management-panel.js';
export type { RedactionOverlayProps } from './components/redaction-overlay.js';
export { RedactionOverlay } from './components/redaction-overlay.js';
export type { SelectionOverlayProps } from './components/selection-overlay.js';
export { SelectionOverlay } from './components/selection-overlay.js';
export type { ShapeCreationOverlayProps } from './components/shape-creation-overlay.js';
export { ShapeCreationOverlay } from './components/shape-creation-overlay.js';
export type { TextMarkupOverlayProps } from './components/text-markup-overlay.js';
export { TextMarkupOverlay } from './components/text-markup-overlay.js';
// ── Context / Provider ────────────────────────────────────────
export type { EditorContextValue, EditorProviderProps } from './context.js';
export { EditorProvider, useEditor, useEditorOptional } from './context.js';
// ── Hooks ─────────────────────────────────────────────────────
export type { AnnotationCrudActions } from './hooks/use-annotation-crud.js';
export { useAnnotationCrud } from './hooks/use-annotation-crud.js';
export type { AnnotationSelectionActions } from './hooks/use-annotation-selection.js';
export { useAnnotationSelection } from './hooks/use-annotation-selection.js';
export type { EditorDirtyStateActions } from './hooks/use-editor-dirty-state.js';
export { useEditorDirtyState } from './hooks/use-editor-dirty-state.js';
export type {
  EditorInteractionBridgeActions,
  EditorInteractionBridgeOptions,
  EditorInteractionBridgeViewerState,
} from './hooks/use-editor-interaction-bridge.js';
export { useEditorInteractionBridge } from './hooks/use-editor-interaction-bridge.js';
export type { EditorSaveActions } from './hooks/use-editor-save.js';
export { useEditorSave } from './hooks/use-editor-save.js';
export type { EditorToolActions } from './hooks/use-editor-tool.js';
export { useEditorTool } from './hooks/use-editor-tool.js';
export type { FreeTextInputActions, FreeTextInputState } from './hooks/use-freetext-input.js';
export { useFreeTextInput } from './hooks/use-freetext-input.js';
export type { DrawPoint, InkDrawingActions } from './hooks/use-ink-drawing.js';
export { useInkDrawing } from './hooks/use-ink-drawing.js';
export type { PageManagementActions } from './hooks/use-page-management.js';
export { usePageManagement } from './hooks/use-page-management.js';
export type { RedactionActions } from './hooks/use-redaction.js';
export { useRedaction } from './hooks/use-redaction.js';
export type { TextMarkupActions } from './hooks/use-text-markup.js';
export { useTextMarkup } from './hooks/use-text-markup.js';
export type { OptimisticAnnotationPatch } from './internal/annotation-mutation-store.js';
export {
  useAnnotationMutationPending,
  useAnnotationMutationStore,
  useResolvedEditorAnnotations,
} from './internal/annotation-mutation-store.js';
export {
  getUnknownErrorMessage,
  isEditorRedactionAnnotation,
  isFallbackRedactionAnnotation,
  isNativeRedactionAnnotation,
  isUnsupportedAnnotationCreateError,
  REDACTION_FALLBACK_CONTENTS_MARKER,
} from './redaction-utils.js';
// ── Types ─────────────────────────────────────────────────────
export type {
  AnnotationSelection,
  EditorMode,
  EditorTool,
  FreeTextToolConfig,
  InkToolConfig,
  RedactToolConfig,
  ShapeToolConfig,
  StampToolConfig,
  StampType,
  TextMarkupActionTool,
  TextMarkupToolConfig,
  ToolConfigKey,
  ToolConfigMap,
} from './types.js';
export { DEFAULT_TOOL_CONFIGS } from './types.js';
