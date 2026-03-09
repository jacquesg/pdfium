import { createContext } from 'react';
import type { EditorContextValue } from './editor-context.types.js';

export const EditorContext = createContext<EditorContextValue | null>(null);
