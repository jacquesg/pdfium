'use client';

import type { ReactNode } from 'react';
import { PDFViewerProviders } from '../components/pdf-viewer-providers.js';
import type { PDFViewerProps } from '../components/pdf-viewer-types.js';
import type { BuildPDFViewerRootContentOptions } from './pdf-viewer-root-content.js';
import { buildPDFViewerRootContent } from './pdf-viewer-root-content.js';
import type { UsePDFViewerControllerOptions, UsePDFViewerControllerResult } from './use-pdf-viewer-controller.js';
import { usePDFViewerController } from './use-pdf-viewer-controller.js';

interface MappedPDFViewerPipelineProps {
  controllerOptions: UsePDFViewerControllerOptions;
  contentOptions: Omit<BuildPDFViewerRootContentOptions, 'controller'>;
}

interface RenderPDFViewerPipelineRootOptions {
  controller: UsePDFViewerControllerResult;
  mappedProps: MappedPDFViewerPipelineProps;
}

function mapPDFViewerPipelineProps(props: PDFViewerProps): MappedPDFViewerPipelineProps {
  const {
    initialScale,
    initialScrollMode,
    initialSpreadMode,
    initialInteractionMode,
    showSearch = true,
    showTextLayer = true,
    showAnnotations = true,
    showLinks = true,
    renderFormFields = false,
    gap,
    bufferPages,
    keyboardShortcuts = true,
    renderPageOverlay,
    panels,
    initialPanel,
    className,
    classNames,
    style,
    children,
  } = props;

  return {
    controllerOptions: {
      initialScale,
      initialScrollMode,
      initialSpreadMode,
      initialInteractionMode,
      gap,
      keyboardShortcuts,
      showSearch,
      panels,
      initialPanel,
    },
    contentOptions: {
      children,
      panels,
      className,
      classNames,
      style,
      gap,
      bufferPages,
      showTextLayer,
      showAnnotations,
      showLinks,
      renderFormFields,
      renderPageOverlay,
    },
  };
}

function renderPDFViewerPipelineRoot({ controller, mappedProps }: RenderPDFViewerPipelineRootOptions): ReactNode {
  const { viewerState, panelState } = controller;
  const content = buildPDFViewerRootContent({
    controller,
    ...mappedProps.contentOptions,
  });

  return (
    <PDFViewerProviders viewerState={viewerState} panelState={panelState}>
      {content}
    </PDFViewerProviders>
  );
}

function usePDFViewerPipeline(props: PDFViewerProps): ReactNode {
  const mappedProps = mapPDFViewerPipelineProps(props);
  const controller = usePDFViewerController(mappedProps.controllerOptions);
  return renderPDFViewerPipelineRoot({ controller, mappedProps });
}

export { mapPDFViewerPipelineProps, renderPDFViewerPipelineRoot, usePDFViewerPipeline };
export type { MappedPDFViewerPipelineProps, RenderPDFViewerPipelineRootOptions };
