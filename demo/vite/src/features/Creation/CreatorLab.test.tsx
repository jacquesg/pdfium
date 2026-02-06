import { render, screen } from '@testing-library/react';
import { describe, it } from 'vitest';
import { PDFiumProvider } from '../../hooks/usePDFium';
import { CreatorLab } from './CreatorLab';
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

describe('CreatorLab', () => {
  it('renders creation controls', async () => {
    renderWithProviders(<CreatorLab />);
    await screen.findByText(/PDF Creator/i);
    await screen.findByRole('button', { name: /Text/i });
    await screen.findByRole('button', { name: /Rectangle/i });
    await screen.findByRole('button', { name: /Generate & Preview/i });
  });
});
