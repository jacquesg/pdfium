import { describe, expect, it } from 'vitest';
import {
  PANEL_BADGE_PILL_STYLE,
  PANEL_BADGE_TAG_STYLE,
  PANEL_ELLIPSIS_MONO_TEXT_STYLE,
  PANEL_ICON_GHOST_BUTTON_STYLE,
  PANEL_ROW_ALIGN_CENTER_STYLE,
  PANEL_ROW_BETWEEN_CENTER_STYLE,
  PANEL_SELECTABLE_ITEM_BASE_STYLE,
  PANEL_STACK_4_STYLE,
  PANEL_STACK_12_STYLE,
  PANEL_TEXT_MUTED_11_STYLE,
  PANEL_TEXT_MUTED_12_STYLE,
} from '../../../../src/react/internal/panel-view-primitives.js';

describe('panel-view-primitives', () => {
  it('defines stack and row layout primitives', () => {
    expect(PANEL_STACK_4_STYLE.display).toBe('flex');
    expect(PANEL_STACK_4_STYLE.flexDirection).toBe('column');
    expect(PANEL_STACK_4_STYLE.gap).toBe('4px');
    expect(PANEL_STACK_12_STYLE.gap).toBe('12px');
    expect(PANEL_ROW_BETWEEN_CENTER_STYLE.justifyContent).toBe('space-between');
    expect(PANEL_ROW_ALIGN_CENTER_STYLE.alignItems).toBe('center');
  });

  it('defines text and badge primitives', () => {
    expect(PANEL_TEXT_MUTED_12_STYLE.fontSize).toBe('12px');
    expect(PANEL_TEXT_MUTED_11_STYLE.fontSize).toBe('11px');
    expect(PANEL_BADGE_PILL_STYLE.borderRadius).toBe('9999px');
    expect(PANEL_BADGE_TAG_STYLE.borderRadius).toBe('4px');
  });

  it('defines interactive item and icon-button primitives', () => {
    expect(PANEL_SELECTABLE_ITEM_BASE_STYLE.cursor).toBe('pointer');
    expect(PANEL_SELECTABLE_ITEM_BASE_STYLE.borderRadius).toBe('6px');
    expect(PANEL_ICON_GHOST_BUTTON_STYLE.background).toBe('none');
    expect(PANEL_ICON_GHOST_BUTTON_STYLE.border).toBe('none');
    expect(PANEL_ELLIPSIS_MONO_TEXT_STYLE.textOverflow).toBe('ellipsis');
    expect(PANEL_ELLIPSIS_MONO_TEXT_STYLE.fontFamily).toBe('monospace');
  });
});
