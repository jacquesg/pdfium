import { render, screen } from '@testing-library/react';
import { describe, it, vi } from 'vitest';
import { PDFiumProvider } from '../../hooks/usePDFium';
import { FormsLab } from './FormsLab';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the file picker since we can't easily upload in basic tests without user-event complex setup
vi.mock('../../components/FilePicker', () => ({
  FilePicker: ({ label }: { label: string }) => <button>{label}</button>
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

function renderWithProviders(ui: React.ReactElement) {
  const client = createTestQueryClient();
  return render(
    <QueryClientProvider client={client}>
      <PDFiumProvider>
        {ui}
      </PDFiumProvider>
    </QueryClientProvider>
  );
}

describe('FormsLab', () => {
  it('renders the forms studio title', async () => {
    renderWithProviders(<FormsLab />);
    // Initial state might be loading or empty
    await screen.findByText(/Forms Studio/i);
  });

  it('shows loaded document status', async () => {
    renderWithProviders(<FormsLab />);
    // "sample.pdf" is loaded by default in usePDFium
    await screen.findByText(/Loaded: sample.pdf/i, {}, { timeout: 5000 });
  });
});
