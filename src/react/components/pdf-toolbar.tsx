import type { ReactElement } from 'react';
import { useToolbarContext } from '../internal/pdf-toolbar-context.js';
import { usePDFToolbarContextValue } from '../internal/pdf-toolbar-context-controller.js';
import { PDFToolbarRoot } from '../internal/pdf-toolbar-root.js';
import {
  FirstLastPageSlot,
  FitSlot,
  FullscreenSlot,
  InteractionModeSlot,
  NavigationSlot,
  PrintSlot,
  RotationSlot,
  ScrollModeSlot,
  SearchSlot,
  SpreadSlot,
  ZoomSlot,
} from '../internal/pdf-toolbar-slots.js';
import type {
  ButtonOverrides,
  ButtonProps,
  FirstLastPageRenderProps,
  FitRenderProps,
  FullscreenRenderProps,
  InputOverrides,
  InputProps,
  InteractionModeRenderProps,
  NavigationRenderProps,
  PDFToolbarProps,
  PrintRenderProps,
  RotationRenderProps,
  ScrollModeRenderProps,
  SearchInputProps,
  SearchRenderProps,
  SelectOverrides,
  SelectProps,
  SpreadRenderProps,
  ToolbarContextValue,
  ToolbarSearchState,
  ZoomRenderProps,
} from '../internal/pdf-toolbar-types.js';

interface PDFToolbarCompoundComponent {
  (props: PDFToolbarProps): ReactElement;
  Navigation: typeof NavigationSlot;
  Zoom: typeof ZoomSlot;
  Fit: typeof FitSlot;
  ScrollMode: typeof ScrollModeSlot;
  Search: typeof SearchSlot;
  Rotation: typeof RotationSlot;
  Spread: typeof SpreadSlot;
  Fullscreen: typeof FullscreenSlot;
  Print: typeof PrintSlot;
  InteractionMode: typeof InteractionModeSlot;
  FirstLastPage: typeof FirstLastPageSlot;
}

function PDFToolbarBase({ viewer, search: searchState, children, ...rest }: PDFToolbarProps) {
  const contextValue = usePDFToolbarContextValue(viewer, searchState);
  return (
    <PDFToolbarRoot contextValue={contextValue} {...rest}>
      {children}
    </PDFToolbarRoot>
  );
}

const PDFToolbar = Object.assign(PDFToolbarBase, {
  Navigation: NavigationSlot,
  Zoom: ZoomSlot,
  Fit: FitSlot,
  ScrollMode: ScrollModeSlot,
  Search: SearchSlot,
  Rotation: RotationSlot,
  Spread: SpreadSlot,
  Fullscreen: FullscreenSlot,
  Print: PrintSlot,
  InteractionMode: InteractionModeSlot,
  FirstLastPage: FirstLastPageSlot,
}) as PDFToolbarCompoundComponent;

export { PDFToolbar, useToolbarContext };
export type {
  ButtonOverrides,
  ButtonProps,
  FirstLastPageRenderProps,
  FitRenderProps,
  FullscreenRenderProps,
  InputOverrides,
  InputProps,
  InteractionModeRenderProps,
  NavigationRenderProps,
  PDFToolbarProps,
  PrintRenderProps,
  RotationRenderProps,
  ScrollModeRenderProps,
  SearchInputProps,
  SearchRenderProps,
  SelectOverrides,
  SelectProps,
  SpreadRenderProps,
  ToolbarContextValue,
  ToolbarSearchState,
  ZoomRenderProps,
};
