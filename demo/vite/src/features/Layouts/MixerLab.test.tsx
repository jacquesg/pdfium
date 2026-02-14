import { render, screen } from '@testing-library/react';
import { describe, it } from 'vitest';
import { PDFiumProvider } from '../../hooks/usePDFium';
import { MixerLab } from './MixerLab';

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <PDFiumProvider>{ui}</PDFiumProvider>
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
