import { createContext, useContext } from 'react';
import { requireContextValue } from './component-api.js';
import type { ToolbarContextValue } from './pdf-toolbar-types.js';

const ToolbarContext = createContext<ToolbarContextValue | null>(null);

function useToolbarContext(): ToolbarContextValue {
  return requireContextValue(
    useContext(ToolbarContext),
    'PDFToolbar sub-components must be rendered inside a <PDFToolbar> parent.',
  );
}

export { ToolbarContext, useToolbarContext };
