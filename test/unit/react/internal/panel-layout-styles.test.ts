import { describe, expect, it } from 'vitest';
import {
  PANEL_DETAIL_REGION_STYLE,
  PANEL_MONO_BLOCK_STYLE,
  PANEL_ROOT_CONTAINER_STYLE,
  PANEL_SCROLL_REGION_STYLE,
  PANEL_SECTION_HEADING_STYLE,
  PANEL_SUMMARY_STYLE,
} from '../../../../src/react/internal/panel-layout-styles.js';

describe('panel-layout-styles', () => {
  it('defines reusable root and scroll styles', () => {
    expect(PANEL_ROOT_CONTAINER_STYLE.display).toBe('flex');
    expect(PANEL_ROOT_CONTAINER_STYLE.flexDirection).toBe('column');
    expect(PANEL_SCROLL_REGION_STYLE.overflowY).toBe('auto');
    expect(PANEL_SCROLL_REGION_STYLE.minHeight).toBe(0);
  });

  it('defines summary/detail/heading styles', () => {
    expect(PANEL_SUMMARY_STYLE.fontFamily).toBe('monospace');
    expect(PANEL_DETAIL_REGION_STYLE.maxHeight).toBe('45%');
    expect(PANEL_SECTION_HEADING_STYLE.fontWeight).toBe(600);
  });

  it('defines monospace block style for structured data sections', () => {
    expect(PANEL_MONO_BLOCK_STYLE.fontFamily).toBe('monospace');
    expect(PANEL_MONO_BLOCK_STYLE.borderRadius).toBe('4px');
  });
});
