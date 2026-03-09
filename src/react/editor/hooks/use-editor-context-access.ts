import { useContext } from 'react';
import type { EditorContextValue } from '../editor-context.types.js';
import { EditorContext } from '../editor-context-instance.js';

export function useEditor(): EditorContextValue {
  const ctx = useContext(EditorContext);
  if (ctx === null) {
    throw new Error('useEditor must be used within an EditorProvider');
  }
  return ctx;
}

export function useEditorOptional(): EditorContextValue | null {
  return useContext(EditorContext);
}
