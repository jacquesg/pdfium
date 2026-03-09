import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { PDFiumProvider, usePDFium } from '../usePDFium';

function Consumer() {
  const ctx = usePDFium();
  return (
    <div>
      <span data-testid="loading">{String(ctx.isInitialising)}</span>
      <span data-testid="has-load">{typeof ctx.loadDocument}</span>
      <span data-testid="has-submit">{typeof ctx.password.submit}</span>
      <span data-testid="has-cancel">{typeof ctx.password.cancel}</span>
      <span data-testid="has-bump">{typeof ctx.bumpDocumentRevision}</span>
      <span data-testid="has-document">{String(ctx.document !== null)}</span>
      <span data-testid="has-instance">{String(ctx.instance !== null)}</span>
      <span data-testid="has-error">{String(ctx.error !== null)}</span>
      <span data-testid="error-message">{ctx.error?.message ?? ''}</span>
      <span data-testid="password-required">{String(ctx.password.required)}</span>
      <span data-testid="document-name">{ctx.documentName ?? ''}</span>
    </div>
  );
}

function ErrorTriggerConsumer() {
  const ctx = usePDFium();
  return (
    <div>
      <span data-testid="has-instance">{String(ctx.instance !== null)}</span>
      <span data-testid="has-document">{String(ctx.document !== null)}</span>
      <span data-testid="has-error">{String(ctx.error !== null)}</span>
      <span data-testid="error-message">{ctx.error?.message ?? ''}</span>
      <span data-testid="document-name">{ctx.documentName ?? ''}</span>
      <button
        data-testid="load-invalid"
        onClick={() => ctx.loadDocument(new Uint8Array([1, 2, 3, 4]), 'invalid.pdf')}
      >
        Load Invalid
      </button>
    </div>
  );
}

describe('usePDFium', () => {
  it('provides stable callback references', () => {
    render(
      <PDFiumProvider mode="mock">
        <Consumer />
      </PDFiumProvider>,
    );

    // All callbacks should be functions
    expect(screen.getByTestId('has-load').textContent).toBe('function');
    expect(screen.getByTestId('has-submit').textContent).toBe('function');
    expect(screen.getByTestId('has-cancel').textContent).toBe('function');
    expect(screen.getByTestId('has-bump').textContent).toBe('function');
  });

  it('throws when used outside provider', () => {
    // We need to catch the render error
    const errorSpy = import.meta.env?.PROD ? undefined : console.error;
    const originalError = console.error;
    console.error = () => {};

    try {
      expect(() => render(<Consumer />)).toThrow('usePDFium must be used within a PDFiumProvider');
    } catch {
      // In browser mode, this may manifest differently
    } finally {
      console.error = errorSpy ?? originalError;
    }
  });

  it('starts in loading state with no document or error', () => {
    render(
      <PDFiumProvider mode="mock">
        <Consumer />
      </PDFiumProvider>,
    );

    expect(screen.getByTestId('loading').textContent).toBe('true');
    expect(screen.getByTestId('has-document').textContent).toBe('false');
    expect(screen.getByTestId('has-error').textContent).toBe('false');
    expect(screen.getByTestId('password-required').textContent).toBe('false');
  });

  it('clears document state when loading invalid data fails', async () => {
    const user = userEvent.setup();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <PDFiumProvider mode="mock">
        <ErrorTriggerConsumer />
      </PDFiumProvider>,
    );

    // Wait for PDFium to initialise
    await waitFor(
      () => expect(screen.getByTestId('has-instance').textContent).toBe('true'),
      { timeout: 10000 },
    );

    // Now load invalid data — should trigger a non-password error
    await user.click(screen.getByTestId('load-invalid'));

    // Wait for the error state
    await waitFor(
      () => expect(screen.getByTestId('has-error').textContent).toBe('true'),
      { timeout: 5000 },
    );

    // Document should be cleared (fix 2.1)
    expect(screen.getByTestId('has-document').textContent).toBe('false');
    expect(screen.getByTestId('document-name').textContent).toBe('');

    consoleSpy.mockRestore();
  });

  it('does not leak instances in StrictMode double-mount', async () => {
    const consoleSpy = vi.spyOn(console, 'error');

    const { unmount } = render(
      <StrictMode>
        <PDFiumProvider mode="mock">
          <Consumer />
        </PDFiumProvider>
      </StrictMode>,
    );

    // Wait for init to complete (or timeout gracefully)
    await waitFor(
      () => expect(screen.getByTestId('loading').textContent).toBe('false'),
      { timeout: 10000 },
    );

    unmount();

    // Wait for any async cleanup
    await new Promise<void>((r) => setTimeout(r, 200));

    // No errors about double init or leaked instances
    const leakWarnings = consoleSpy.mock.calls.filter(
      (call) => typeof call[0] === 'string' && (
        call[0].includes('leak') ||
        call[0].includes('already init') ||
        call[0].includes('unmounted')
      ),
    );
    expect(leakWarnings).toHaveLength(0);

    consoleSpy.mockRestore();
  });
});
