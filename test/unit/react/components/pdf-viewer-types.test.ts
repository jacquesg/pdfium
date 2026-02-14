import { describe, expect, it } from 'vitest';
import type { PDFViewerClassNames, PDFViewerProps } from '../../../../src/react/components/pdf-viewer-types.js';

describe('pdf-viewer-types contracts', () => {
  it('accepts valid class name and props contracts', () => {
    const classNames: PDFViewerClassNames = {
      root: 'viewer-root',
      toolbar: 'viewer-toolbar',
      pages: 'viewer-pages',
    };

    const props: PDFViewerProps = {
      initialScale: 1.25,
      initialScrollMode: 'continuous',
      initialSpreadMode: 'none',
      initialInteractionMode: 'pan',
      showSearch: true,
      showTextLayer: true,
      showAnnotations: true,
      showLinks: true,
      renderFormFields: false,
      gap: 16,
      bufferPages: 1,
      keyboardShortcuts: true,
      panels: ['thumbnails', { id: 'custom', icon: null, label: 'Custom', render: () => null }],
      initialPanel: 'thumbnails',
      className: 'viewer',
      classNames,
      style: { minHeight: 320 },
      children: null,
    };

    expect(props.classNames?.toolbar).toBe('viewer-toolbar');
    expect(props.panels?.length).toBe(2);
  });

  it('supports render-prop children signature', () => {
    const props: PDFViewerProps = {
      children: (state) => {
        return state.viewer ? null : null;
      },
    };

    expect(typeof props.children).toBe('function');
  });

  it('rejects unsupported scroll mode and panel entries at compile time', () => {
    // @ts-expect-error invalid scroll mode
    const invalidScroll: PDFViewerProps = { initialScrollMode: 'paged' };
    expect(invalidScroll).toBeDefined();

    const invalidPanels = {
      // @ts-expect-error panel entries must be built-in IDs or panel config objects
      panels: ['thumbnails', 42],
    } satisfies PDFViewerProps;
    expect(invalidPanels).toBeDefined();
  });
});
