import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PDFiumProvider } from '../../hooks/usePDFium';
import { RenderLab } from './RenderLab';

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <PDFiumProvider>{ui}</PDFiumProvider>
  );
}

describe('RenderLab', () => {
  async function openRenderControls() {
    const openButton = screen.queryByRole('button', { name: /Open Render Controls/i });
    if (openButton) {
      fireEvent.click(openButton);
      await screen.findByRole('button', { name: /Close Render Controls/i }, { timeout: 5000 });
    }
  }

  it('renders navigator and controls', async () => {
    renderWithProviders(<RenderLab />);
    await openRenderControls();
    await screen.findByRole('heading', { name: /Render Demos/i }, { timeout: 5000 });
    await screen.findByRole('heading', { name: /Page Boxes/i }, { timeout: 5000 });
  });

  it('shows minimap only when a document is loaded', async () => {
    renderWithProviders(<RenderLab />);
    await openRenderControls();
    expect(screen.queryByRole('heading', { name: /Page Minimap/i })).toBeNull();
  });

  it('shows viewport readout when demos are enabled', async () => {
    renderWithProviders(<RenderLab />);
    await openRenderControls();
    fireEvent.click(await screen.findByRole('button', { name: /Show Clip & Scale Demos/i }, { timeout: 5000 }));
    await screen.findByText(/Viewport:\s*\[/i, {}, { timeout: 5000 });
    await screen.findByRole('button', { name: /Hide Demos/i }, { timeout: 5000 });
  });

  it('renders Fetch Page Info button', async () => {
    renderWithProviders(<RenderLab />);
    await screen.findByRole('button', { name: /Fetch Page Info/i }, { timeout: 5000 });
  });

  it('renders clip and scale demo hint', async () => {
    renderWithProviders(<RenderLab />);
    await screen.findByText(/Toggle to see clip-rect viewport and scaled render/i, {}, { timeout: 5000 });
  });
});
