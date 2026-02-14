'use client';

import type { UseViewerSetupResult } from '../hooks/use-viewer-setup.js';
import type {
  ButtonOverrides,
  ButtonProps,
  InteractionModeRenderProps,
  RotationRenderProps,
  ScrollModeRenderProps,
  SelectOverrides,
  SelectProps,
  SpreadRenderProps,
} from './pdf-toolbar-types.js';
import { TOOLBAR_LABELS, TOOLBAR_SCROLL_MODE_OPTIONS, TOOLBAR_SPREAD_MODE_OPTIONS } from './toolbar-config.js';
import { createToolbarButtonProps, createToolbarSelectProps } from './toolbar-prop-getters.js';
import { parseToolbarScrollMode, parseToolbarSpreadMode } from './toolbar-value-parsers.js';

function createScrollModeRenderProps(scroll: UseViewerSetupResult['scroll']): ScrollModeRenderProps {
  const { scrollMode, setScrollMode } = scroll;

  const getSelectProps = (overrides?: SelectOverrides): SelectProps =>
    createToolbarSelectProps(
      {
        value: scrollMode,
        onChange: (e) => {
          const mode = parseToolbarScrollMode(e.target.value);
          if (mode !== null) setScrollMode(mode);
        },
        ariaLabel: TOOLBAR_LABELS.scrollMode,
      },
      overrides,
    );

  return { scrollMode, setScrollMode, options: TOOLBAR_SCROLL_MODE_OPTIONS, getSelectProps };
}

function createRotationRenderProps(rotation: UseViewerSetupResult['rotation'], pageIndex: number): RotationRenderProps {
  const { rotatePage, rotateAllPages, resetPageRotation, resetAllRotations, getRotation, rotations } = rotation;

  const getRotateCwProps = (overrides?: ButtonOverrides): ButtonProps =>
    createToolbarButtonProps(
      {
        disabled: false,
        onClick: () => rotatePage(pageIndex, 'cw'),
        ariaLabel: TOOLBAR_LABELS.rotateClockwise,
      },
      overrides,
    );

  const getRotateCcwProps = (overrides?: ButtonOverrides): ButtonProps =>
    createToolbarButtonProps(
      {
        disabled: false,
        onClick: () => rotatePage(pageIndex, 'ccw'),
        ariaLabel: TOOLBAR_LABELS.rotateCounterClockwise,
      },
      overrides,
    );

  const getResetRotationProps = (overrides?: ButtonOverrides): ButtonProps =>
    createToolbarButtonProps(
      {
        disabled: false,
        onClick: () => resetPageRotation(pageIndex),
        ariaLabel: TOOLBAR_LABELS.resetRotation,
      },
      overrides,
    );

  return {
    rotations,
    getRotation,
    rotatePage,
    rotateAllPages,
    resetPageRotation,
    resetAllRotations,
    getRotateCwProps,
    getRotateCcwProps,
    getResetRotationProps,
  };
}

function createSpreadRenderProps(spread: UseViewerSetupResult['spread']): SpreadRenderProps {
  const { spreadMode, setSpreadMode } = spread;

  const getSelectProps = (overrides?: SelectOverrides): SelectProps =>
    createToolbarSelectProps(
      {
        value: spreadMode,
        onChange: (e) => {
          const nextSpreadMode = parseToolbarSpreadMode(e.target.value);
          if (nextSpreadMode !== null) setSpreadMode(nextSpreadMode);
        },
        ariaLabel: TOOLBAR_LABELS.spreadMode,
      },
      overrides,
    );

  return { spreadMode, setSpreadMode, options: TOOLBAR_SPREAD_MODE_OPTIONS, getSelectProps };
}

function createInteractionRenderProps(interaction: UseViewerSetupResult['interaction']): InteractionModeRenderProps {
  const { mode, setMode, isDragging, marqueeRect } = interaction;

  const getPointerProps = (overrides?: ButtonOverrides): ButtonProps =>
    createToolbarButtonProps(
      {
        disabled: false,
        onClick: () => setMode('pointer'),
        ariaLabel: TOOLBAR_LABELS.pointerTool,
        ariaPressed: mode === 'pointer',
      },
      overrides,
    );

  const getPanProps = (overrides?: ButtonOverrides): ButtonProps =>
    createToolbarButtonProps(
      {
        disabled: false,
        onClick: () => setMode('pan'),
        ariaLabel: TOOLBAR_LABELS.handTool,
        ariaPressed: mode === 'pan',
      },
      overrides,
    );

  const getMarqueeProps = (overrides?: ButtonOverrides): ButtonProps =>
    createToolbarButtonProps(
      {
        disabled: false,
        onClick: () => setMode('marquee-zoom'),
        ariaLabel: TOOLBAR_LABELS.marqueeZoom,
        ariaPressed: mode === 'marquee-zoom',
      },
      overrides,
    );

  return { mode, setMode, isDragging, marqueeRect, getPointerProps, getPanProps, getMarqueeProps };
}

export {
  createInteractionRenderProps,
  createRotationRenderProps,
  createScrollModeRenderProps,
  createSpreadRenderProps,
};
