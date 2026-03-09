import { render, screen } from '@testing-library/react';
import { describe, it } from 'vitest';
import { PDFiumProvider } from '../../hooks/usePDFium';
import { CreatorLab } from './CreatorLab';

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <PDFiumProvider>{ui}</PDFiumProvider>
  );
}

describe('CreatorLab', () => {
  it('renders creation controls', async () => {
    renderWithProviders(<CreatorLab />);
    await screen.findByRole('heading', { name: /Templates/i });
    await screen.findByRole('heading', { name: /Add Object/i });
    await screen.findByRole('button', { name: /^Text$/i });
    await screen.findByRole('button', { name: /^Rect$/i });
    await screen.findByRole('button', { name: /Generate & Preview/i });
  });
});
