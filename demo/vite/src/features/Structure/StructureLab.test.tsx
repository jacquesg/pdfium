import { render, screen } from '@testing-library/react';
import { describe, it } from 'vitest';
import { PDFiumProvider } from '../../hooks/usePDFium';
import { StructureLab } from './StructureLab';
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

describe('StructureLab', () => {
  it('renders tab buttons', async () => {
    renderWithProviders(<StructureLab />);
    // Tabs
    await screen.findByRole('button', { name: /Bookmarks/i });
    await screen.findByRole('button', { name: /Attachments/i });
    await screen.findByRole('button', { name: /Links/i });
  });

  it('displays default bookmark view', async () => {
    renderWithProviders(<StructureLab />);
    // If sample.pdf has no bookmarks, it shows "No bookmarks found"
    // We check for either the list or the empty state
    const emptyState = screen.queryByText(/No bookmarks found/i);
    // If bookmarks exist, we might have multiple icons
    const listState = screen.queryAllByText(/📄/i);
    
    // Assert that one of them exists
    if (!emptyState && listState.length === 0) {
      throw new Error('Neither empty state nor bookmarks list found');
    }
    await screen.findByRole('button', { name: /Bookmarks/i });
  });
});
