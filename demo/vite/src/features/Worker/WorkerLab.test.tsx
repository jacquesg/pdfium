import { render, screen, waitForElementToBeRemoved } from '@testing-library/react';
import { describe, it } from 'vitest';
import { WorkerLab } from './WorkerLab';
import { PDFiumProvider } from '../../hooks/usePDFium';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <PDFiumProvider>{ui}</PDFiumProvider>
    </QueryClientProvider>
  );
}

describe('WorkerLab', () => {
  it('loads reference PDF, renders pages and text layer', async () => {
    const { container } = renderWithProviders(<WorkerLab />);
    
    // Check initial loading state
    await screen.findByText(/Booting Worker|Downloading/i);
    
    // Check final ready state
    await screen.findByText(/Trace Monkey/i, {}, { timeout: 30000 });
    
    // Check page count
    await screen.findByText(/14 Pages/i);

    // Wait for Page 1 placeholder to disappear (rendering complete)
    const placeholder = await screen.findByText(/^Page 1$/i);
    await waitForElementToBeRemoved(placeholder, { timeout: 15000 });

    // Check for Text Layer presence (by class name)
    const textLayer = container.querySelector('.text-overlay');
    if (!textLayer) {
        throw new Error('Worker Text Layer not found - feature failed');
    }
  });
});
