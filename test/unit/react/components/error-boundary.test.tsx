import { cleanup, fireEvent, render } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PDFiumError, PDFiumErrorCode } from '../../../../src/core/errors.js';
import { PDFiumErrorBoundary } from '../../../../src/react/components/error-boundary.js';

let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  // React intentionally logs caught render errors to stderr; suppress in tests.
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
  cleanup();
});

/** A component that throws the given error during render. */
function ThrowError({ error }: { error: Error }): never {
  throw error;
}

describe('PDFiumErrorBoundary', () => {
  it('renders children when no error is thrown', () => {
    const { container } = render(
      <PDFiumErrorBoundary>
        <p>All good</p>
      </PDFiumErrorBoundary>,
    );

    expect(container.textContent).toContain('All good');
  });

  it('catches PDFiumError and shows default fallback with role="alert"', () => {
    const pdfError = new PDFiumError(PDFiumErrorCode.DOC_FORMAT_INVALID, 'Bad PDF format');

    const { container } = render(
      <PDFiumErrorBoundary>
        <ThrowError error={pdfError} />
      </PDFiumErrorBoundary>,
    );

    const alert = container.querySelector('[role="alert"]');
    expect(alert).not.toBeNull();
    expect(alert!.textContent).toContain('Bad PDF format');
  });

  it('does NOT catch non-PDFiumError (re-throws to parent boundary)', () => {
    const genericError = new Error('Something went wrong');

    let caughtError: Error | null = null;

    class ParentBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
      constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false };
      }

      static getDerivedStateFromError(error: Error) {
        caughtError = error;
        return { hasError: true };
      }

      override render() {
        if (this.state.hasError) return <div>Parent caught it</div>;
        return this.props.children;
      }
    }

    const { container } = render(
      <ParentBoundary>
        <PDFiumErrorBoundary>
          <ThrowError error={genericError} />
        </PDFiumErrorBoundary>
      </ParentBoundary>,
    );

    // The parent boundary should have caught the error, not PDFiumErrorBoundary
    expect(caughtError).toBe(genericError);
    expect(container.textContent).toContain('Parent caught it');
  });

  it('resets error state when resetKeys change', () => {
    const pdfError = new PDFiumError(PDFiumErrorCode.DOC_LOAD_UNKNOWN, 'Load failed');

    const { container, rerender } = render(
      <PDFiumErrorBoundary resetKeys={['key-1']}>
        <ThrowError error={pdfError} />
      </PDFiumErrorBoundary>,
    );

    // Error should be caught
    expect(container.querySelector('[role="alert"]')).not.toBeNull();

    // Change resetKeys — should trigger auto-reset
    rerender(
      <PDFiumErrorBoundary resetKeys={['key-2']}>
        <p>Recovered</p>
      </PDFiumErrorBoundary>,
    );

    expect(container.textContent).toContain('Recovered');
  });

  it('calls fallbackRender with error and resetErrorBoundary', () => {
    const pdfError = new PDFiumError(PDFiumErrorCode.RENDER_FAILED, 'Render failed');

    const { container } = render(
      <PDFiumErrorBoundary
        fallbackRender={({ error, resetErrorBoundary }) => (
          <div>
            <p>Custom fallback: {error.message}</p>
            <button type="button" onClick={resetErrorBoundary}>
              Reset
            </button>
          </div>
        )}
      >
        <ThrowError error={pdfError} />
      </PDFiumErrorBoundary>,
    );

    expect(container.textContent).toContain('Custom fallback: Render failed');
    const resetBtn = container.querySelector('button');
    expect(resetBtn).not.toBeNull();
    expect(resetBtn!.textContent).toBe('Reset');
  });

  it('fires onError callback when a PDFiumError is caught', () => {
    const onError = vi.fn();
    const pdfError = new PDFiumError(PDFiumErrorCode.PAGE_NOT_FOUND, 'Page missing');

    render(
      <PDFiumErrorBoundary onError={onError}>
        <ThrowError error={pdfError} />
      </PDFiumErrorBoundary>,
    );

    expect(onError).toHaveBeenCalledOnce();
    expect(onError).toHaveBeenCalledWith(pdfError);
  });

  it('shows default fallback with a Retry button that resets the error', () => {
    let shouldThrow = true;
    const pdfError = new PDFiumError(PDFiumErrorCode.DOC_FORMAT_INVALID, 'Bad format');

    function MaybeThrow() {
      if (shouldThrow) throw pdfError;
      return <p>Content loaded</p>;
    }

    const { container } = render(
      <PDFiumErrorBoundary>
        <MaybeThrow />
      </PDFiumErrorBoundary>,
    );

    // Error is showing
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    const retryButton = container.querySelector('button') as HTMLButtonElement;
    expect(retryButton).not.toBeNull();
    expect(retryButton.textContent).toBe('Retry');

    // Stop throwing, then click Retry
    shouldThrow = false;
    fireEvent.click(retryButton);

    expect(container.textContent).toContain('Content loaded');
  });

  it('renders static fallback prop when provided', () => {
    const pdfError = new PDFiumError(PDFiumErrorCode.MEMORY_ALLOCATION_FAILED, 'OOM');

    const { container } = render(
      <PDFiumErrorBoundary fallback={<div>Static fallback</div>}>
        <ThrowError error={pdfError} />
      </PDFiumErrorBoundary>,
    );

    expect(container.textContent).toContain('Static fallback');
  });

  it('default fallback shows the error code', () => {
    const pdfError = new PDFiumError(PDFiumErrorCode.DOC_FORMAT_INVALID, 'Bad format');

    const { container } = render(
      <PDFiumErrorBoundary>
        <ThrowError error={pdfError} />
      </PDFiumErrorBoundary>,
    );

    const alert = container.querySelector('[role="alert"]');
    expect(alert).not.toBeNull();
    // The error code (201) should be displayed somewhere in the fallback
    expect(alert!.textContent).toContain(String(PDFiumErrorCode.DOC_FORMAT_INVALID));
  });
});
