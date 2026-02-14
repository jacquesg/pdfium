import { describe, expect, it } from 'vitest';
import type { PanelConfig, PanelEntry } from '../../../../src/react/components/panels/types.js';
import {
  resolvePanelOverlay,
  resolvePanelViewportSettings,
  resolveViewerLayoutMode,
} from '../../../../src/react/internal/viewer-layout.js';

describe('resolveViewerLayoutMode', () => {
  it('prioritises render-function children', () => {
    const mode = resolveViewerLayoutMode({
      children: () => null,
      hasPanelBar: true,
    });
    expect(mode).toBe('render-function');
  });

  it('uses panel-layout when panel bar is available and children are not a function', () => {
    const mode = resolveViewerLayoutMode({
      children: undefined,
      hasPanelBar: true,
    });
    expect(mode).toBe('panel-layout');
  });

  it('uses custom-children layout for explicit children without panel bar', () => {
    const mode = resolveViewerLayoutMode({
      children: 'custom-content',
      hasPanelBar: false,
    });
    expect(mode).toBe('custom-children');
  });

  it('falls back to default layout when no children and no panel bar', () => {
    const mode = resolveViewerLayoutMode({
      children: undefined,
      hasPanelBar: false,
    });
    expect(mode).toBe('default-layout');
  });
});

describe('resolvePanelViewportSettings', () => {
  it('applies built-in panel viewport effects', () => {
    const settings = resolvePanelViewportSettings({
      activePanel: 'forms',
      panels: ['forms', 'thumbnails'],
      showTextLayer: true,
      showAnnotations: true,
      renderFormFields: false,
    });

    expect(settings).toEqual({
      showTextLayer: false,
      showAnnotations: false,
      renderFormFields: true,
    });
  });

  it('applies custom panel viewport overrides and preserves unspecified defaults', () => {
    const customPanel: PanelConfig = {
      id: 'custom-a',
      icon: null,
      label: 'Custom A',
      render: () => null,
      viewportEffects: { showAnnotations: false },
    };
    const panels: readonly PanelEntry[] = [customPanel];

    const settings = resolvePanelViewportSettings({
      activePanel: 'custom-a',
      panels,
      showTextLayer: true,
      showAnnotations: true,
      renderFormFields: false,
    });

    expect(settings).toEqual({
      showTextLayer: true,
      showAnnotations: false,
      renderFormFields: false,
    });
  });

  it('falls back to defaults when the active panel is missing', () => {
    const settings = resolvePanelViewportSettings({
      activePanel: 'missing',
      panels: ['thumbnails'],
      showTextLayer: true,
      showAnnotations: false,
      renderFormFields: true,
    });

    expect(settings).toEqual({
      showTextLayer: true,
      showAnnotations: false,
      renderFormFields: true,
    });
  });
});

describe('resolvePanelOverlay', () => {
  it('prefers panel overlay when present', () => {
    const panelOverlay = () => null;
    const externalOverlay = () => 'external';
    expect(resolvePanelOverlay(panelOverlay, externalOverlay)).toBe(panelOverlay);
  });

  it('falls back to external overlay when panel overlay is absent', () => {
    const externalOverlay = () => 'external';
    expect(resolvePanelOverlay(null, externalOverlay)).toBe(externalOverlay);
  });
});
