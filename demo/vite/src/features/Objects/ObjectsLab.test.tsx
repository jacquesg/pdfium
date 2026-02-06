import { render, screen } from '@testing-library/react';
import { describe, it } from 'vitest';
import { PDFiumProvider } from '../../hooks/usePDFium';
import { ObjectsLab } from './ObjectsLab';
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

describe('ObjectsLab', () => {
  it('renders objects list container', async () => {
    renderWithProviders(<ObjectsLab />);
    // Wait for document load
    await screen.findByText(/Page Objects/i, {}, { timeout: 5000 });
  });
});
