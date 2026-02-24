import type { ReactNode } from 'react';
import type { PanelEntry } from '../components/panels/types.js';
import { getViewportEffects } from '../components/panels/types.js';
import type { PageOverlayInfo } from '../components/pdf-page-view.js';

type ViewerLayoutMode = 'render-function' | 'panel-layout' | 'custom-children' | 'default-layout';

interface ResolveViewerLayoutModeOptions {
  children: unknown;
  hasPanelBar: boolean;
}

interface ResolvePanelViewportSettingsOptions {
  activePanel: string | null;
  panels: readonly PanelEntry[];
  showTextLayer: boolean;
  showAnnotations: boolean;
  renderFormFields: boolean;
}

interface PanelViewportSettings {
  showTextLayer: boolean;
  showAnnotations: boolean;
  renderFormFields: boolean;
}

function resolveViewerLayoutMode({ children, hasPanelBar }: ResolveViewerLayoutModeOptions): ViewerLayoutMode {
  if (typeof children === 'function') return 'render-function';
  if (hasPanelBar) return 'panel-layout';
  if (children !== undefined) return 'custom-children';
  return 'default-layout';
}

function resolvePanelViewportSettings({
  activePanel,
  panels,
  showTextLayer,
  showAnnotations,
  renderFormFields,
}: ResolvePanelViewportSettingsOptions): PanelViewportSettings {
  const effects = getViewportEffects(activePanel, panels);
  return {
    showTextLayer: effects.showTextLayer ?? showTextLayer,
    showAnnotations: effects.showAnnotations ?? showAnnotations,
    renderFormFields: effects.renderFormFields ?? renderFormFields,
  };
}

function resolvePanelOverlay(
  panelOverlay: ((info: PageOverlayInfo) => ReactNode) | null,
  renderPageOverlay: ((info: PageOverlayInfo) => ReactNode) | undefined,
): ((info: PageOverlayInfo) => ReactNode) | undefined {
  return panelOverlay ?? renderPageOverlay;
}

export { resolvePanelOverlay, resolvePanelViewportSettings, resolveViewerLayoutMode };
export type {
  PanelViewportSettings,
  ResolvePanelViewportSettingsOptions,
  ResolveViewerLayoutModeOptions,
  ViewerLayoutMode,
};
