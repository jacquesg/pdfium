import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { PDFPanelState, PDFViewerState } from '../../../../src/react/components/pdf-viewer-context.js';
import { usePDFPanel, usePDFViewer } from '../../../../src/react/components/pdf-viewer-context.js';
import { PDFViewerProviders } from '../../../../src/react/components/pdf-viewer-providers.js';

function Probe() {
  const viewer = usePDFViewer();
  const panel = usePDFPanel();
  return (
    <div
      data-testid="probe"
      data-query={viewer.searchQuery}
      data-active-panel={String(viewer.activePanel)}
      data-has-panel-bar={String(panel.hasPanelBar)}
    />
  );
}

describe('PDFViewerProviders', () => {
  it('provides viewer and panel state to descendant hooks', () => {
    const viewerState: PDFViewerState = {
      viewer: {} as never,
      search: {} as never,
      searchQuery: 'needle',
      setSearchQuery: vi.fn(),
      isSearchOpen: true,
      toggleSearch: vi.fn(),
      documentViewRef: { current: null },
    };

    const panelState: PDFPanelState = {
      activePanel: 'thumbnails',
      togglePanel: vi.fn(),
      setPanelOverlay: vi.fn(),
      hasPanelBar: true,
    };

    render(
      <PDFViewerProviders viewerState={viewerState} panelState={panelState}>
        <Probe />
      </PDFViewerProviders>,
    );

    const probe = screen.getByTestId('probe');
    expect(probe.getAttribute('data-query')).toBe('needle');
    expect(probe.getAttribute('data-active-panel')).toBe('thumbnails');
    expect(probe.getAttribute('data-has-panel-bar')).toBe('true');
  });
});
