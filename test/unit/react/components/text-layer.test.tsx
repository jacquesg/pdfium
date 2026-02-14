import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { TextLayer } from '../../../../src/react/components/text-layer.js';

// ── Mock the worker-client so PDFiumProvider can initialise ──────
vi.mock('../../../../src/context/worker-client.js', () => ({
  WorkerPDFium: {
    create: vi.fn().mockResolvedValue({
      openDocument: vi.fn(),
      dispose: vi.fn(),
    }),
  },
}));

// Lazy import after mock is established
const { PDFiumProvider } = await import('../../../../src/react/context.js');

function createWrapper() {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <PDFiumProvider wasmBinary={new ArrayBuffer(0)} workerUrl="worker.js">
        {children}
      </PDFiumProvider>
    );
  };
}

describe('TextLayer', () => {
  it('renders nothing when document is null (no spans produced)', () => {
    const Wrapper = createWrapper();
    const { container } = render(
      <Wrapper>
        <TextLayer document={null} pageIndex={0} scale={1} width={612} height={792} originalHeight={792} />
      </Wrapper>,
    );

    // Without a document, useTextContent returns no data, so no spans
    const spans = container.querySelectorAll('.pdfium-text-overlay span');
    expect(spans).toHaveLength(0);
  });

  it('renders with tabIndex on the outer overlay div', () => {
    const Wrapper = createWrapper();
    const { container } = render(
      <Wrapper>
        <TextLayer document={null} pageIndex={0} scale={1} width={612} height={792} originalHeight={792} />
      </Wrapper>,
    );

    // TextOverlay always renders its outer div with tabIndex={0}
    const overlayDiv = container.querySelector('[tabindex="0"]');
    expect(overlayDiv).not.toBeNull();
  });

  it('passes optional props through to TextOverlay', () => {
    const Wrapper = createWrapper();
    const { container } = render(
      <Wrapper>
        <TextLayer
          document={null}
          pageIndex={0}
          scale={1}
          width={612}
          height={792}
          originalHeight={792}
          className="text-layer-custom"
          selectionColour="rgba(0, 255, 0, 0.3)"
          nonce="csp-nonce"
        />
      </Wrapper>,
    );

    const outerDiv = container.querySelector('.text-layer-custom');
    expect(outerDiv).not.toBeNull();

    const styleTag = container.querySelector('style');
    expect(styleTag).not.toBeNull();
    expect(styleTag!.getAttribute('nonce')).toBe('csp-nonce');
  });
});
