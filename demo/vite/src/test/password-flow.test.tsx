import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { PasswordDialog } from '../components/PasswordDialog';
import { PDFiumProvider, usePDFium } from '../hooks/usePDFium';

const TIMEOUT = { timeout: 10000 };

/**
 * Minimal harness that wires `usePDFium` password state to `PasswordDialog`
 * — the same integration path as `App.tsx`, but without tabs/chrome.
 */
function PasswordFlowHarness() {
  const {
    loadDocument,
    document: pdfDoc,
    documentName,
    password,
    isInitialising,
  } = usePDFium();

  const loadProtected = async () => {
    const res = await fetch('/protected.pdf');
    const data = await res.arrayBuffer();
    await loadDocument(new Uint8Array(data), 'protected.pdf');
  };

  const loadSample = async () => {
    const res = await fetch('/sample.pdf');
    const data = await res.arrayBuffer();
    await loadDocument(new Uint8Array(data), 'sample.pdf');
  };

  return (
    <div>
      {isInitialising && <span data-testid="loading">Loading...</span>}
      <button onClick={loadProtected}>Load Protected</button>
      <button onClick={loadSample}>Load Sample</button>
      {pdfDoc && documentName && <span data-testid="doc-name">{documentName}</span>}
      <PasswordDialog
        isOpen={password.required}
        onSubmit={password.submit}
        onCancel={password.cancel}
        error={password.error ?? undefined}
      />
    </div>
  );
}

function renderHarness() {
  const user = userEvent.setup();
  render(
    <PDFiumProvider>
      <PasswordFlowHarness />
    </PDFiumProvider>,
  );
  return { user };
}

/** Wait for provider initialisation to complete */
async function waitForInit() {
  await expect.poll(() => screen.queryByTestId('loading'), TIMEOUT).toBeNull();
}

/** Click "Load Protected" and wait for the password dialog */
async function openProtectedFlow(user: ReturnType<typeof userEvent.setup>) {
  const btn = screen.getByRole('button', { name: 'Load Protected' });
  await user.click(btn);
  await screen.findByRole('dialog', {}, TIMEOUT);
}

describe('Password Flow Integration', () => {
  it('shows password dialog when loading protected PDF', async () => {
    const { user } = renderHarness();
    await waitForInit();

    await openProtectedFlow(user);

    expect(screen.getByText('Password Required')).toBeDefined();
    expect(screen.getByLabelText('Document password')).toBeDefined();
  });

  it('shows error for wrong password', async () => {
    const { user } = renderHarness();
    await waitForInit();
    await openProtectedFlow(user);

    const input = screen.getByLabelText('Document password');
    await user.type(input, 'wrongpass');
    await user.click(screen.getByRole('button', { name: 'Open' }));

    // Dialog should remain open and document should not load.
    await expect.poll(() => screen.queryByRole('dialog'), TIMEOUT).not.toBeNull();
    expect(screen.queryByTestId('doc-name')).toBeNull();

    // Error UI should communicate incorrect password.
    const alert = await screen.findByRole('alert', {}, TIMEOUT);
    expect(alert.textContent).toContain('Incorrect password');
  });

  it('opens document with correct password', async () => {
    const { user } = renderHarness();
    await waitForInit();
    await openProtectedFlow(user);

    const input = screen.getByLabelText('Document password');
    await user.type(input, '12345678');
    await user.click(screen.getByRole('button', { name: 'Open' }));

    // Dialog should close
    await expect.poll(() => screen.queryByRole('dialog'), TIMEOUT).toBeNull();
    // Document should be loaded
    const docName = await screen.findByTestId('doc-name', {}, TIMEOUT);
    expect(docName.textContent).toBe('protected.pdf');
  });

  it('cancel resets password state', async () => {
    const { user } = renderHarness();
    await waitForInit();
    await openProtectedFlow(user);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    // Dialog should close
    await expect.poll(() => screen.queryByRole('dialog'), TIMEOUT).toBeNull();
    // No document loaded (previous was disposed before password attempt)
    expect(screen.queryByTestId('doc-name')).toBeNull();
  });

  it('loading new document cancels pending password flow', async () => {
    const { user } = renderHarness();
    await waitForInit();
    await openProtectedFlow(user);

    // While dialog is open, load a different (unprotected) document.
    // Use fireEvent + hidden:true because Radix Dialog sets aria-hidden on
    // content behind the modal and blocks pointer events via the overlay.
    // This simulates a programmatic load (e.g. drag-and-drop) while the
    // password dialog is open.
    fireEvent.click(screen.getByRole('button', { name: 'Load Sample', hidden: true }));

    // Dialog should auto-close
    await expect.poll(() => screen.queryByRole('dialog'), TIMEOUT).toBeNull();
    // sample.pdf should be loaded
    const docName = await screen.findByTestId('doc-name', {}, TIMEOUT);
    expect(docName.textContent).toBe('sample.pdf');
  });
});
