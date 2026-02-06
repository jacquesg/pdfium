import { render, screen } from '@testing-library/react';
import { describe, it } from 'vitest';
import { PDFiumProvider } from '../../hooks/usePDFium';
import { InspectorLab } from './InspectorLab';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const createTestQueryClient = () => new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <PDFiumProvider>{ui}</PDFiumProvider>
    </QueryClientProvider>
  );
}

describe('InspectorLab', () => {
  it('displays metadata sections', async () => {
    renderWithProviders(<InspectorLab />);
    // Wait for document load implicit in provider
    await screen.findByText(/Metadata/i, {}, { timeout: 5000 });
    await screen.findByText(/Digital Signatures/i);
    await screen.findByText(/Embedded JavaScript/i);
  });

  it('shows PDF version', async () => {
    renderWithProviders(<InspectorLab />);
    // sample.pdf is usually version 1.4 or similar
    await screen.findByText(/PDF Ver/i, {}, { timeout: 5000 });
  });
});
