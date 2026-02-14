'use client';

import type { ChangeEventHandler, CSSProperties, ReactNode } from 'react';
import type { FullscreenState } from '../hooks/use-fullscreen.js';
import type { InteractionModeState } from '../hooks/use-interaction-mode.js';
import type { PrintState } from '../hooks/use-print.js';
import type { RotationState } from '../hooks/use-rotation.js';
import type {
  FitState,
  NavigationState,
  ScrollModeState,
  SpreadModeState,
  UseViewerSetupResult,
  ZoomState,
} from '../hooks/use-viewer-setup.js';
import type { SpreadMode } from '../hooks/use-visible-pages.js';

interface ButtonOverrides {
  className?: string;
  style?: CSSProperties;
}

interface InputOverrides {
  className?: string;
  style?: CSSProperties;
}

interface SelectOverrides {
  className?: string;
  style?: CSSProperties;
}

interface ButtonProps extends ButtonOverrides {
  type: 'button';
  disabled: boolean;
  onClick: () => void;
  'aria-label': string;
  'aria-pressed'?: boolean | undefined;
}

interface InputProps extends InputOverrides {
  type: 'number';
  min: number;
  max: number;
  value: number;
  disabled: boolean;
  onChange: ChangeEventHandler<HTMLInputElement>;
  'aria-label': string;
}

interface SelectProps extends SelectOverrides {
  value: string;
  onChange: ChangeEventHandler<HTMLSelectElement>;
  'aria-label': string;
}

interface NavigationRenderProps extends NavigationState {
  pageNumber: number;
  goToPage: (pageNumber: number) => void;
  getPrevProps: (overrides?: ButtonOverrides) => ButtonProps;
  getNextProps: (overrides?: ButtonOverrides) => ButtonProps;
  getInputProps: (overrides?: InputOverrides) => InputProps;
}

interface ZoomRenderProps extends ZoomState {
  percentage: number;
  getZoomInProps: (overrides?: ButtonOverrides) => ButtonProps;
  getZoomOutProps: (overrides?: ButtonOverrides) => ButtonProps;
  getResetProps: (overrides?: ButtonOverrides) => ButtonProps;
}

interface FitRenderProps extends FitState {
  getFitWidthProps: (overrides?: ButtonOverrides) => ButtonProps;
  getFitHeightProps: (overrides?: ButtonOverrides) => ButtonProps;
  getFitPageProps: (overrides?: ButtonOverrides) => ButtonProps;
}

interface ScrollModeRenderProps extends ScrollModeState {
  options: ReadonlyArray<{ value: 'continuous' | 'single' | 'horizontal'; label: string }>;
  getSelectProps: (overrides?: SelectOverrides) => SelectProps;
}

interface RotationRenderProps extends RotationState {
  getRotateCwProps: (overrides?: ButtonOverrides) => ButtonProps;
  getRotateCcwProps: (overrides?: ButtonOverrides) => ButtonProps;
  getResetRotationProps: (overrides?: ButtonOverrides) => ButtonProps;
}

interface SpreadRenderProps extends SpreadModeState {
  options: ReadonlyArray<{ value: SpreadMode; label: string }>;
  getSelectProps: (overrides?: SelectOverrides) => SelectProps;
}

interface FullscreenRenderProps extends FullscreenState {
  getToggleProps: (overrides?: ButtonOverrides) => ButtonProps;
}

interface PrintRenderProps extends PrintState {
  getPrintProps: (overrides?: ButtonOverrides) => ButtonProps;
}

interface InteractionModeRenderProps extends InteractionModeState {
  getPointerProps: (overrides?: ButtonOverrides) => ButtonProps;
  getPanProps: (overrides?: ButtonOverrides) => ButtonProps;
  getMarqueeProps: (overrides?: ButtonOverrides) => ButtonProps;
}

interface FirstLastPageRenderProps {
  isFirst: boolean;
  isLast: boolean;
  getFirstProps: (overrides?: ButtonOverrides) => ButtonProps;
  getLastProps: (overrides?: ButtonOverrides) => ButtonProps;
}

interface ToolbarSearchState {
  query: string;
  setQuery: (query: string) => void;
  totalMatches: number;
  currentIndex: number;
  isSearching: boolean;
  next: () => void;
  prev: () => void;
  isOpen: boolean;
  toggle: () => void;
}

interface SearchInputProps extends InputOverrides {
  type: 'search';
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  placeholder: string;
  'aria-label': string;
}

interface SearchRenderProps extends ToolbarSearchState {
  getInputProps: (overrides?: InputOverrides) => SearchInputProps;
  getToggleProps: (overrides?: ButtonOverrides) => ButtonProps;
  getNextProps: (overrides?: ButtonOverrides) => ButtonProps;
  getPrevProps: (overrides?: ButtonOverrides) => ButtonProps;
}

interface ToolbarContextValue {
  navigation: NavigationRenderProps;
  zoom: ZoomRenderProps;
  fit: FitRenderProps;
  scrollMode: ScrollModeRenderProps;
  search: SearchRenderProps | null;
  rotation: RotationRenderProps;
  spread: SpreadRenderProps;
  fullscreen: FullscreenRenderProps;
  print: PrintRenderProps;
  interaction: InteractionModeRenderProps;
  firstLastPage: FirstLastPageRenderProps;
}

interface PDFToolbarProps {
  viewer: UseViewerSetupResult;
  search?: ToolbarSearchState | undefined;
  children?: ReactNode | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

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
