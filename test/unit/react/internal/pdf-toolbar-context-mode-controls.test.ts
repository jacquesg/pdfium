import { describe, expect, it, vi } from 'vitest';
import { PageRotation } from '../../../../src/core/types.js';
import {
  createInteractionRenderProps,
  createRotationRenderProps,
  createScrollModeRenderProps,
  createSpreadRenderProps,
} from '../../../../src/react/internal/pdf-toolbar-context-mode-controls.js';
import { TOOLBAR_LABELS } from '../../../../src/react/internal/toolbar-config.js';

describe('pdf-toolbar-context-mode-controls', () => {
  it('ignores invalid scroll/spread values and applies valid ones', () => {
    const setScrollMode = vi.fn();
    const scroll = createScrollModeRenderProps({
      scrollMode: 'continuous',
      setScrollMode,
    });

    scroll.getSelectProps().onChange({ target: { value: 'invalid' } } as never);
    scroll.getSelectProps().onChange({ target: { value: 'single' } } as never);

    const setSpreadMode = vi.fn();
    const spread = createSpreadRenderProps({
      spreadMode: 'none',
      setSpreadMode,
    });

    spread.getSelectProps().onChange({ target: { value: 'invalid' } } as never);
    spread.getSelectProps().onChange({ target: { value: 'odd' } } as never);

    expect(setScrollMode).toHaveBeenCalledTimes(1);
    expect(setScrollMode).toHaveBeenCalledWith('single');
    expect(setSpreadMode).toHaveBeenCalledTimes(1);
    expect(setSpreadMode).toHaveBeenCalledWith('odd');
  });

  it('binds rotation actions to the active page index', () => {
    const rotatePage = vi.fn();
    const resetPageRotation = vi.fn();

    const rotation = createRotationRenderProps(
      {
        rotatePage,
        rotateAllPages: vi.fn(),
        resetPageRotation,
        resetAllRotations: vi.fn(),
        getRotation: vi.fn(() => PageRotation.None),
        rotations: new Map(),
      },
      5,
    );

    expect(rotation.getRotateCwProps()['aria-label']).toBe(TOOLBAR_LABELS.rotateClockwise);
    expect(rotation.getRotateCcwProps()['aria-label']).toBe(TOOLBAR_LABELS.rotateCounterClockwise);
    expect(rotation.getResetRotationProps()['aria-label']).toBe(TOOLBAR_LABELS.resetRotation);

    rotation.getRotateCwProps().onClick();
    rotation.getRotateCcwProps().onClick();
    rotation.getResetRotationProps().onClick();

    expect(rotatePage).toHaveBeenNthCalledWith(1, 5, 'cw');
    expect(rotatePage).toHaveBeenNthCalledWith(2, 5, 'ccw');
    expect(resetPageRotation).toHaveBeenCalledWith(5);
  });

  it('builds interaction button props with correct pressed state and handlers', () => {
    const setMode = vi.fn();

    const interaction = createInteractionRenderProps({
      mode: 'pan',
      setMode,
      isDragging: false,
      marqueeRect: null,
    });

    expect(interaction.getPointerProps()['aria-pressed']).toBe(false);
    expect(interaction.getPanProps()['aria-pressed']).toBe(true);
    expect(interaction.getMarqueeProps()['aria-pressed']).toBe(false);

    interaction.getPointerProps().onClick();
    interaction.getPanProps().onClick();
    interaction.getMarqueeProps().onClick();

    expect(setMode).toHaveBeenNthCalledWith(1, 'pointer');
    expect(setMode).toHaveBeenNthCalledWith(2, 'pan');
    expect(setMode).toHaveBeenNthCalledWith(3, 'marquee-zoom');
  });
});
