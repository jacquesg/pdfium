'use client';

import type { ReactNode } from 'react';

// ---------------------------------------------------------------------------
// Panel IDs & Configuration
// ---------------------------------------------------------------------------

/** Built-in panel identifiers in UI order. */
const BUILTIN_PANEL_IDS = [
  'thumbnails',
  'bookmarks',
  'annotations',
  'objects',
  'forms',
  'text',
  'structure',
  'attachments',
  'links',
  'info',
] as const;

type PanelId = (typeof BUILTIN_PANEL_IDS)[number];

/** Viewport effects a panel can apply when active. */
interface ViewportEffects {
  showTextLayer?: boolean | undefined;
  showAnnotations?: boolean | undefined;
  renderFormFields?: boolean | undefined;
}

/** Custom panel configuration for extending the viewer. */
interface PanelConfig {
  id: string;
  icon: ReactNode;
  label: string;
  render: () => ReactNode;
  viewportEffects?: Partial<ViewportEffects> | undefined;
}

/** A panel entry is either a built-in ID or a custom config. */
type PanelEntry = PanelId | PanelConfig;

// ---------------------------------------------------------------------------
// Built-in panel defaults
// ---------------------------------------------------------------------------

const BUILTIN_VIEWPORT_EFFECTS: Record<PanelId, ViewportEffects> = {
  thumbnails: {},
  bookmarks: {},
  annotations: { showTextLayer: true, showAnnotations: true, renderFormFields: false },
  objects: { showTextLayer: false, showAnnotations: false, renderFormFields: false },
  forms: { showTextLayer: false, showAnnotations: false, renderFormFields: true },
  text: { showTextLayer: false, showAnnotations: false, renderFormFields: false },
  structure: {},
  attachments: {},
  links: {},
  info: {},
};

const BUILTIN_LABELS: Record<PanelId, string> = {
  thumbnails: 'Thumbnails',
  bookmarks: 'Bookmarks',
  annotations: 'Annotations',
  objects: 'Page Objects',
  forms: 'Form Fields',
  text: 'Text',
  structure: 'Structure',
  attachments: 'Attachments',
  links: 'Links',
  info: 'Document Info',
};

function isBuiltinPanelId(entry: PanelEntry): entry is PanelId {
  return typeof entry === 'string';
}

function getPanelId(entry: PanelEntry): string {
  return isBuiltinPanelId(entry) ? entry : entry.id;
}

function getPanelLabel(entry: PanelEntry): string {
  return isBuiltinPanelId(entry) ? BUILTIN_LABELS[entry] : entry.label;
}

function getViewportEffects(activePanel: string | null, resolvedPanels: readonly PanelEntry[]): ViewportEffects {
  if (activePanel === null) return {};
  const entry = resolvedPanels.find((e) => getPanelId(e) === activePanel);
  if (!entry) return {};
  if (isBuiltinPanelId(entry)) return BUILTIN_VIEWPORT_EFFECTS[entry];
  return entry.viewportEffects ?? {};
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { BUILTIN_LABELS, BUILTIN_VIEWPORT_EFFECTS, getPanelId, getPanelLabel, getViewportEffects, isBuiltinPanelId };
export { BUILTIN_PANEL_IDS };
export type { PanelConfig, PanelEntry, PanelId, ViewportEffects };
