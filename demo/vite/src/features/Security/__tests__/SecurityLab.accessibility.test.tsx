import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PDFiumProvider } from '../../../hooks/usePDFium';
import { SecurityLab } from '../SecurityLab';

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <PDFiumProvider mode="mock">{ui}</PDFiumProvider>
  );
}

describe('SecurityLab accessibility', () => {
  it('shows loading spinner with role="status" before PDFium initialises', () => {
    // SecurityLab shows a spinner while PDFium is null
    // The spinner should have role="status" for screen readers
    renderWithProviders(<SecurityLab />);

    // Initially shows loading state — the spinner may or may not be present
    // depending on how fast PDFium loads, but if it is, it should have role="status"
    const statusElements = screen.queryAllByRole('status');
    // At least one status element should exist during init
    // (could be the SecurityLab spinner or another loading indicator)
    expect(statusElements.length).toBeGreaterThan(0);
    expect(statusElements[0]!.getAttribute('aria-label')).toBe('Loading');
  });

  it('renders password demo after loading', async () => {
    renderWithProviders(<SecurityLab />);
    await screen.findByRole('button', { name: /Load Protected PDF/i }, { timeout: 5000 });
  });
});
