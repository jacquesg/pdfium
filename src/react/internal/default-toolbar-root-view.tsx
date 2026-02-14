'use client';

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Printer, ZoomIn, ZoomOut } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ToolbarSearchState } from '../components/pdf-toolbar.js';
import { PDFToolbar } from '../components/pdf-toolbar.js';
import { usePDFViewerOptional } from '../components/pdf-viewer.js';
import {
  FitGroup,
  FullscreenButton,
  InteractionModeGroup,
  PanelToggles,
  PrintProgress,
  RotationGroup,
  ScrollAndSpreadGroup,
  SearchButton,
} from './default-toolbar-groups.js';
import { DEFAULT_TOOLBAR_ICON_SIZE } from './default-toolbar-icons.js';
import { PageInput, ZoomInput } from './default-toolbar-inputs.js';
import { Separator, ToolbarButton } from './default-toolbar-primitives.js';
import {
  createToolbarSearchState,
  getDefaultToolbarBreakpoint,
  getDefaultToolbarVisibility,
  type ToolbarBreakpoint,
} from './default-toolbar-state.js';
import { ToolbarGroup } from './toolbar-group.js';

interface DefaultToolbarProps {
  viewer?: import('../hooks/use-viewer-setup.js').UseViewerSetupResult | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
  children?: ReactNode | undefined;
}

const ICON_SIZE = DEFAULT_TOOLBAR_ICON_SIZE;

function DefaultToolbarRootView({ viewer: viewerProp, className, style, children }: DefaultToolbarProps) {
  const ctx = usePDFViewerOptional();
  const viewer = viewerProp ?? ctx?.viewer;

  if (!viewer) {
    throw new Error('DefaultToolbar requires a <PDFViewer> parent or an explicit `viewer` prop.');
  }

  const toolbarContainerRef = useRef<HTMLDivElement>(null);
  const [breakpoint, setBreakpoint] = useState<ToolbarBreakpoint>('full');

  useEffect(() => {
    const element = toolbarContainerRef.current;
    if (!element) return;
    let active = true;

    const observer = new ResizeObserver((entries) => {
      if (!active) return;
      const entry = entries[0];
      if (!entry || entry.target !== element) return;
      setBreakpoint(getDefaultToolbarBreakpoint(entry.contentRect.width));
    });
    observer.observe(element);
    return () => {
      active = false;
      observer.disconnect();
    };
  }, []);

  const { hideInteraction, hideModes, hideRotation } = useMemo(
    () => getDefaultToolbarVisibility(breakpoint),
    [breakpoint],
  );
  const searchState = useMemo<ToolbarSearchState | undefined>(() => createToolbarSearchState(ctx), [ctx]);

  return (
    <div ref={toolbarContainerRef}>
      <PDFToolbar
        viewer={viewer}
        search={searchState}
        className={className}
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'nowrap',
          overflowX: 'auto',
          gap: 4,
          padding: '4px 8px',
          background: 'var(--pdfium-toolbar-bg, #ffffff)',
          borderBottom: '1px solid var(--pdfium-toolbar-border, #e5e7eb)',
          color: 'var(--pdfium-toolbar-colour, #374151)',
          fontSize: 13,
          ...style,
        }}
      >
        <InteractionModeGroup hidden={hideInteraction} />

        <PDFToolbar.FirstLastPage>
          {({ getFirstProps, getLastProps }) => (
            <PDFToolbar.Navigation>
              {({ getPrevProps, getNextProps, pageCount, pageNumber, goToPage }) => (
                <ToolbarGroup groupId="navigation" label="Page navigation">
                  <ToolbarButton {...getFirstProps()} label="First page (Home)">
                    <ChevronsLeft size={ICON_SIZE} strokeWidth={2} />
                  </ToolbarButton>
                  <ToolbarButton {...getPrevProps()} label="Previous page (PgUp)">
                    <ChevronLeft size={ICON_SIZE} strokeWidth={2} />
                  </ToolbarButton>
                  <PageInput pageNumber={pageNumber} pageCount={pageCount} goToPage={goToPage} />
                  <ToolbarButton {...getNextProps()} label="Next page (PgDn)">
                    <ChevronRight size={ICON_SIZE} strokeWidth={2} />
                  </ToolbarButton>
                  <ToolbarButton {...getLastProps()} label="Last page (End)">
                    <ChevronsRight size={ICON_SIZE} strokeWidth={2} />
                  </ToolbarButton>
                </ToolbarGroup>
              )}
            </PDFToolbar.Navigation>
          )}
        </PDFToolbar.FirstLastPage>

        <Separator />

        <PDFToolbar.Zoom>
          {({ getZoomOutProps, getZoomInProps, percentage, setScale }) => (
            <ToolbarGroup groupId="zoom" label="Zoom controls">
              <ToolbarButton {...getZoomOutProps()} label="Zoom out (Ctrl+-)">
                <ZoomOut size={ICON_SIZE} strokeWidth={2} />
              </ToolbarButton>
              <ZoomInput percentage={percentage} setScale={setScale} />
              <ToolbarButton {...getZoomInProps()} label="Zoom in (Ctrl+=)">
                <ZoomIn size={ICON_SIZE} strokeWidth={2} />
              </ToolbarButton>
            </ToolbarGroup>
          )}
        </PDFToolbar.Zoom>

        <Separator />

        <FitGroup />

        <Separator />

        <RotationGroup hidden={hideRotation} />

        {!hideModes && (
          <>
            <ScrollAndSpreadGroup />
            <Separator />
          </>
        )}

        <PanelToggles />
        <SearchButton />

        <PDFToolbar.Print>
          {({ getPrintProps, isPrinting, progress }) => (
            <ToolbarButton {...getPrintProps()} label={isPrinting ? 'Cancel print' : 'Print (Ctrl+P)'}>
              {isPrinting ? <PrintProgress progress={progress} /> : <Printer size={ICON_SIZE} strokeWidth={2} />}
            </ToolbarButton>
          )}
        </PDFToolbar.Print>

        <FullscreenButton />
        {children}
      </PDFToolbar>
    </div>
  );
}

export { DefaultToolbarRootView };
export type { DefaultToolbarProps };
