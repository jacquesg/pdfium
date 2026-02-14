import { describe, expect, it } from 'vitest';
import { DefaultToolbar, Separator } from '../../../src/react/components/default-toolbar.js';
import * as ReactAPI from '../../../src/react/index.js';

describe('React API Contract', () => {
  const expectReactComponent = (value: unknown) => {
    const kind = typeof value;
    expect(kind === 'function' || kind === 'object').toBe(true);
  };

  it('keeps barrel exports consistent with source exports', () => {
    expect(ReactAPI.DefaultToolbar).toBe(DefaultToolbar);
    expect(ReactAPI.Separator).toBe(Separator);
    expect(Reflect.has(ReactAPI, 'ToolbarSeparator')).toBe(false);
  });

  it('exposes key runtime entrypoints as functions', () => {
    expectReactComponent(ReactAPI.PDFViewer);
    expectReactComponent(ReactAPI.PDFToolbar);
    expectReactComponent(ReactAPI.PDFDocumentView);
    expectReactComponent(ReactAPI.ActivityBar);
    expect(typeof ReactAPI.prefetchPageData).toBe('function');
    expect(typeof ReactAPI.applyPDFiumTheme).toBe('function');
  });
});
