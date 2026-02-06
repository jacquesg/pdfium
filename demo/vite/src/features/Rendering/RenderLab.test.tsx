import { render, screen } from '@testing-library/react';
import { describe, it } from 'vitest';
import { PDFiumProvider } from '../../hooks/usePDFium';
import { RenderLab } from './RenderLab';
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

describe('RenderLab', () => {
  it('renders navigator and controls', async () => {
    renderWithProviders(<RenderLab />);
    await screen.findByText(/Navigator/i);
    await screen.findByText(/Progressive Test/i);
    await screen.findByRole('button', { name: /Start Render/i });
  });
});
