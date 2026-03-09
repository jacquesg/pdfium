import { render, screen } from '@testing-library/react';
import { describe, it } from 'vitest';
import { PDFiumProvider } from '../../hooks/usePDFium';
import { SecurityLab } from './SecurityLab';

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <PDFiumProvider mode="mock">{ui}</PDFiumProvider>
  );
}

describe('SecurityLab', () => {
  it('renders password demo section', async () => {
    renderWithProviders(<SecurityLab />);
    // PasswordDemo should show its button
    await screen.findByRole('button', { name: /Load Protected PDF/i }, { timeout: 5000 });
  });

  it('renders error catalogue section', async () => {
    renderWithProviders(<SecurityLab />);
    // ErrorCatalogue should show the hierarchy
    await screen.findByText(/Error Hierarchy/i, {}, { timeout: 5000 });
  });

  it('shows error code reference table', async () => {
    renderWithProviders(<SecurityLab />);
    await screen.findByText(/Error Code Reference/i, {}, { timeout: 5000 });
  });

  it('shows a retryable init error state', async () => {
    render(
      <PDFiumProvider mode="mock" mockOptions={{ initialisationError: new Error('Mock init failure') }}>
        <SecurityLab />
      </PDFiumProvider>,
    );

    await screen.findByText(/PDFium failed to initialise/i, {}, { timeout: 5000 });
    await screen.findByText(/Mock init failure/i, {}, { timeout: 5000 });
    await screen.findByRole('button', { name: /Retry Initialisation/i }, { timeout: 5000 });
  });
});
