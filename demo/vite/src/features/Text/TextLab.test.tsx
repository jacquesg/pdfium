import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PDFiumProvider } from '../../hooks/usePDFium';
import { TextLab } from './TextLab';

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <PDFiumProvider>{ui}</PDFiumProvider>
    </QueryClientProvider>
  );
}

describe('TextLab', () => {
  it('renders text with correct Reading Order (Columns separated)', async () => {
    const { container } = renderWithProviders(<TextLab />);

    await screen.findByText(/Text Selection Layer/i);
    const loader = await screen.findByText(/Switching to TraceMonkey.../i, {}, { timeout: 5000 });
    await waitForElementToBeRemoved(loader, { timeout: 30000 });
    await screen.findByText(/Document: reference.pdf/i);

    await waitFor(() => {
      const spanCount = container.querySelectorAll('.text-overlay span').length;
      if (spanCount === 0) throw new Error('Waiting for text spans to render...');
    }, { timeout: 5000 });

    const spans = Array.from(container.querySelectorAll('.text-overlay span'));
    const fullText = spans.map((s) => s.textContent).join(' ').replace(/\s+/g, ' ');

    // Key Phrases from TraceMonkey Page 1
    const phraseCol1Top = "Introduction";
    // Regex match to handle variable merging of hyphenated words
    // "client - side" might become "client-side"
    const matchCol1Bottom = fullText.match(/client\s*-\s*side\s+web\s+programming/);
    const idxCol1Bottom = matchCol1Bottom?.index ?? -1;

    const phraseCol2Top = "used for the application logic";

    const idxCol1Top = fullText.indexOf(phraseCol1Top);
    const idxCol2Top = fullText.indexOf(phraseCol2Top);

    expect(idxCol1Top).toBeGreaterThan(-1);
    expect(idxCol1Bottom).toBeGreaterThan(-1);
    expect(idxCol2Top).toBeGreaterThan(-1);

    // Verify Reading Order:
    // Col 1 Top -> Col 1 Bottom -> Col 2 Top
    expect(idxCol1Bottom).toBeGreaterThan(idxCol1Top);
    expect(idxCol2Top).toBeGreaterThan(idxCol1Bottom);
  });
});
