/**
 * Tests for the editor subpath API surface.
 * Ensures we are exporting what we expect from `@scaryterry/pdfium/react/editor`.
 */

import { describe, expect, it } from 'vitest';
import * as editorExports from '../../../../src/react/editor/index.js';

describe('react/editor public API', () => {
  it('exports match snapshot', () => {
    const exportedNames = Object.keys(editorExports).sort();
    expect(exportedNames).toMatchSnapshot();
  });

  it('exports command classes', () => {
    expect(typeof editorExports.CommandStack).toBe('function');
    expect(typeof editorExports.CompositeCommand).toBe('function');
    expect(typeof editorExports.CreateAnnotationCommand).toBe('function');
    expect(typeof editorExports.DeletePageCommand).toBe('function');
    expect(typeof editorExports.InsertBlankPageCommand).toBe('function');
    expect(typeof editorExports.MovePageCommand).toBe('function');
    expect(typeof editorExports.RemoveAnnotationCommand).toBe('function');
    expect(typeof editorExports.SetAnnotationRectCommand).toBe('function');
    expect(typeof editorExports.SetAnnotationColourCommand).toBe('function');
    expect(typeof editorExports.SetAnnotationStringCommand).toBe('function');
  });

  it('exports components', () => {
    expect(typeof editorExports.AnnotationPropertyPanel).toBe('function');
    expect(typeof editorExports.EditorOverlay).toBe('function');
    expect(typeof editorExports.EditorToolbar).toBe('function');
    expect(typeof editorExports.FreeTextEditor).toBe('function');
    expect(typeof editorExports.InkCanvas).toBe('function');
    expect(typeof editorExports.PageManagementPanel).toBe('function');
    expect(typeof editorExports.RedactionOverlay).toBe('function');
    expect(typeof editorExports.SelectionOverlay).toBe('function');
    expect(typeof editorExports.ShapeCreationOverlay).toBe('function');
    expect(typeof editorExports.TextMarkupOverlay).toBe('function');
  });

  it('exports provider and hooks', () => {
    expect(typeof editorExports.EditorProvider).toBe('function');
    expect(typeof editorExports.useEditor).toBe('function');
    expect(typeof editorExports.useEditorOptional).toBe('function');
    expect(typeof editorExports.useAnnotationCrud).toBe('function');
    expect(typeof editorExports.useAnnotationSelection).toBe('function');
    expect(typeof editorExports.useEditorDirtyState).toBe('function');
    expect(typeof editorExports.useEditorInteractionBridge).toBe('function');
    expect(typeof editorExports.useEditorSave).toBe('function');
    expect(typeof editorExports.useEditorTool).toBe('function');
    expect(typeof editorExports.useFreeTextInput).toBe('function');
    expect(typeof editorExports.useInkDrawing).toBe('function');
    expect(typeof editorExports.usePageManagement).toBe('function');
    expect(typeof editorExports.useRedaction).toBe('function');
    expect(typeof editorExports.useTextMarkup).toBe('function');
    expect(typeof editorExports.useAnnotationMutationStore).toBe('function');
  });

  it('exports default tool configs with expected shape', () => {
    expect(editorExports.DEFAULT_TOOL_CONFIGS).toBeDefined();
    expect(editorExports.DEFAULT_TOOL_CONFIGS.ink).toHaveProperty('colour');
    expect(editorExports.DEFAULT_TOOL_CONFIGS.ink).toHaveProperty('strokeWidth');
    expect(editorExports.DEFAULT_TOOL_CONFIGS.stamp).toHaveProperty('stampType');
  });
});
