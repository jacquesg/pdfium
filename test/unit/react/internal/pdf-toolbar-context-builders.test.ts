import { describe, expect, it } from 'vitest';
import * as actionsAndSearch from '../../../../src/react/internal/pdf-toolbar-context-actions-search.js';
import {
  createFirstLastPageRenderProps,
  createFitRenderProps,
  createFullscreenRenderProps,
  createGoToPage,
  createInteractionRenderProps,
  createNavigationRenderProps,
  createPrintRenderProps,
  createRotationRenderProps,
  createScrollModeRenderProps,
  createSearchRenderProps,
  createSpreadRenderProps,
  createToolbarContextValue,
  createZoomRenderProps,
} from '../../../../src/react/internal/pdf-toolbar-context-builders.js';
import * as modeControls from '../../../../src/react/internal/pdf-toolbar-context-mode-controls.js';
import * as navigation from '../../../../src/react/internal/pdf-toolbar-context-navigation.js';
import * as zoomFit from '../../../../src/react/internal/pdf-toolbar-context-zoom-fit.js';

describe('pdf-toolbar-context-builders', () => {
  it('re-exports navigation builders', () => {
    expect(createGoToPage).toBe(navigation.createGoToPage);
    expect(createNavigationRenderProps).toBe(navigation.createNavigationRenderProps);
  });

  it('re-exports zoom/fit builders', () => {
    expect(createZoomRenderProps).toBe(zoomFit.createZoomRenderProps);
    expect(createFitRenderProps).toBe(zoomFit.createFitRenderProps);
  });

  it('re-exports mode-control builders', () => {
    expect(createScrollModeRenderProps).toBe(modeControls.createScrollModeRenderProps);
    expect(createRotationRenderProps).toBe(modeControls.createRotationRenderProps);
    expect(createSpreadRenderProps).toBe(modeControls.createSpreadRenderProps);
    expect(createInteractionRenderProps).toBe(modeControls.createInteractionRenderProps);
  });

  it('re-exports action/search builders', () => {
    expect(createFullscreenRenderProps).toBe(actionsAndSearch.createFullscreenRenderProps);
    expect(createPrintRenderProps).toBe(actionsAndSearch.createPrintRenderProps);
    expect(createFirstLastPageRenderProps).toBe(actionsAndSearch.createFirstLastPageRenderProps);
    expect(createSearchRenderProps).toBe(actionsAndSearch.createSearchRenderProps);
    expect(createToolbarContextValue).toBe(actionsAndSearch.createToolbarContextValue);
  });
});
