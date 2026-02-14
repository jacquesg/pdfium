import type { ReactNode } from 'react';

interface PDFViewerSlotComponents {
  Pages: unknown;
  Thumbnails: unknown;
  Search: unknown;
  Bookmarks: unknown;
}

type PDFViewerCompoundComponent<Props, Slots extends PDFViewerSlotComponents> = ((props: Props) => ReactNode) & Slots;

function createPDFViewerCompound<Props, Slots extends PDFViewerSlotComponents>(
  root: (props: Props) => ReactNode,
  slots: Slots,
): PDFViewerCompoundComponent<Props, Slots> {
  const component = root as PDFViewerCompoundComponent<Props, Slots>;
  component.Pages = slots.Pages;
  component.Thumbnails = slots.Thumbnails;
  component.Search = slots.Search;
  component.Bookmarks = slots.Bookmarks;
  return component;
}

export { createPDFViewerCompound };
export type { PDFViewerCompoundComponent, PDFViewerSlotComponents };
