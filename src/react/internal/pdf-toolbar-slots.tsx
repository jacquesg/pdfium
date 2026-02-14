'use client';

import type { ReactNode } from 'react';
import { useToolbarContext } from './pdf-toolbar-context.js';
import type {
  FirstLastPageRenderProps,
  FitRenderProps,
  FullscreenRenderProps,
  InteractionModeRenderProps,
  NavigationRenderProps,
  PrintRenderProps,
  RotationRenderProps,
  ScrollModeRenderProps,
  SearchRenderProps,
  SpreadRenderProps,
  ZoomRenderProps,
} from './pdf-toolbar-types.js';

interface NavigationSlotProps {
  children: (props: NavigationRenderProps) => ReactNode;
}

function NavigationSlot({ children }: NavigationSlotProps) {
  const { navigation } = useToolbarContext();
  return <>{children(navigation)}</>;
}

interface ZoomSlotProps {
  children: (props: ZoomRenderProps) => ReactNode;
}

function ZoomSlot({ children }: ZoomSlotProps) {
  const { zoom } = useToolbarContext();
  return <>{children(zoom)}</>;
}

interface FitSlotProps {
  children: (props: FitRenderProps) => ReactNode;
}

function FitSlot({ children }: FitSlotProps) {
  const { fit } = useToolbarContext();
  return <>{children(fit)}</>;
}

interface ScrollModeSlotProps {
  children: (props: ScrollModeRenderProps) => ReactNode;
}

function ScrollModeSlot({ children }: ScrollModeSlotProps) {
  const { scrollMode } = useToolbarContext();
  return <>{children(scrollMode)}</>;
}

interface SearchSlotProps {
  children: (props: SearchRenderProps) => ReactNode;
}

function SearchSlot({ children }: SearchSlotProps) {
  const { search } = useToolbarContext();
  if (!search) return null;
  return <>{children(search)}</>;
}

interface RotationSlotProps {
  children: (props: RotationRenderProps) => ReactNode;
}

function RotationSlot({ children }: RotationSlotProps) {
  const { rotation } = useToolbarContext();
  return <>{children(rotation)}</>;
}

interface SpreadSlotProps {
  children: (props: SpreadRenderProps) => ReactNode;
}

function SpreadSlot({ children }: SpreadSlotProps) {
  const { spread } = useToolbarContext();
  return <>{children(spread)}</>;
}

interface FullscreenSlotProps {
  children: (props: FullscreenRenderProps) => ReactNode;
}

function FullscreenSlot({ children }: FullscreenSlotProps) {
  const { fullscreen } = useToolbarContext();
  return <>{children(fullscreen)}</>;
}

interface PrintSlotProps {
  children: (props: PrintRenderProps) => ReactNode;
}

function PrintSlot({ children }: PrintSlotProps) {
  const { print } = useToolbarContext();
  return <>{children(print)}</>;
}

interface InteractionModeSlotProps {
  children: (props: InteractionModeRenderProps) => ReactNode;
}

function InteractionModeSlot({ children }: InteractionModeSlotProps) {
  const { interaction } = useToolbarContext();
  return <>{children(interaction)}</>;
}

interface FirstLastPageSlotProps {
  children: (props: FirstLastPageRenderProps) => ReactNode;
}

function FirstLastPageSlot({ children }: FirstLastPageSlotProps) {
  const { firstLastPage } = useToolbarContext();
  return <>{children(firstLastPage)}</>;
}

export {
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
};
