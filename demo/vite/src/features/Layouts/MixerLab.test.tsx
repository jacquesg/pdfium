import { render, screen } from '@testing-library/react';
import { describe, it } from 'vitest';
import { PDFiumProvider } from '../../hooks/usePDFium';
import { MixerLab } from './MixerLab';
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

describe('MixerLab', () => {
  it('renders mixer interface', async () => {
    renderWithProviders(<MixerLab />);
    await screen.findByText(/Source A \(Main\)/i);
    await screen.findByText(/Source B/i);
    await screen.findByText(/Merge B into A/i);
    await screen.findByText(/Generate N-Up/i);
  });
});
