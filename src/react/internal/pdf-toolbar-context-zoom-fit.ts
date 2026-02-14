'use client';

import type { UseViewerSetupResult } from '../hooks/use-viewer-setup.js';
import type { ButtonOverrides, ButtonProps, FitRenderProps, ZoomRenderProps } from './pdf-toolbar-types.js';
import { TOOLBAR_LABELS } from './toolbar-config.js';
import { createToolbarButtonProps } from './toolbar-prop-getters.js';

function createZoomRenderProps(zoom: UseViewerSetupResult['zoom']): ZoomRenderProps {
  const { scale, setScale, zoomIn, zoomOut, reset, canZoomIn, canZoomOut } = zoom;
  const percentage = Math.round(scale * 100);

  const getZoomInProps = (overrides?: ButtonOverrides): ButtonProps =>
    createToolbarButtonProps(
      {
        disabled: !canZoomIn,
        onClick: zoomIn,
        ariaLabel: TOOLBAR_LABELS.zoomIn,
      },
      overrides,
    );

  const getZoomOutProps = (overrides?: ButtonOverrides): ButtonProps =>
    createToolbarButtonProps(
      {
        disabled: !canZoomOut,
        onClick: zoomOut,
        ariaLabel: TOOLBAR_LABELS.zoomOut,
      },
      overrides,
    );

  const getResetProps = (overrides?: ButtonOverrides): ButtonProps =>
    createToolbarButtonProps(
      {
        disabled: false,
        onClick: reset,
        ariaLabel: TOOLBAR_LABELS.resetZoom,
      },
      overrides,
    );

  return {
    scale,
    setScale,
    zoomIn,
    zoomOut,
    reset,
    canZoomIn,
    canZoomOut,
    percentage,
    getZoomInProps,
    getZoomOutProps,
    getResetProps,
  };
}

function createFitRenderProps(fit: UseViewerSetupResult['fit']): FitRenderProps {
  const { fitWidth, fitHeight, fitPage, fitScale, activeFitMode } = fit;

  const getFitWidthProps = (overrides?: ButtonOverrides): ButtonProps =>
    createToolbarButtonProps(
      {
        disabled: false,
        onClick: fitWidth,
        ariaLabel: TOOLBAR_LABELS.fitToWidth,
      },
      overrides,
    );

  const getFitHeightProps = (overrides?: ButtonOverrides): ButtonProps =>
    createToolbarButtonProps(
      {
        disabled: false,
        onClick: fitHeight,
        ariaLabel: TOOLBAR_LABELS.fitToHeight,
      },
      overrides,
    );

  const getFitPageProps = (overrides?: ButtonOverrides): ButtonProps =>
    createToolbarButtonProps(
      {
        disabled: false,
        onClick: fitPage,
        ariaLabel: TOOLBAR_LABELS.fitToPage,
      },
      overrides,
    );

  return {
    fitWidth,
    fitHeight,
    fitPage,
    fitScale,
    activeFitMode,
    getFitWidthProps,
    getFitHeightProps,
    getFitPageProps,
  };
}

export { createFitRenderProps, createZoomRenderProps };
