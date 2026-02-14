import { describe, expect, it } from 'vitest';
import {
  TOOLBAR_LABELS,
  TOOLBAR_SCROLL_MODE_OPTIONS,
  TOOLBAR_SEARCH_PLACEHOLDER,
  TOOLBAR_SPREAD_MODE_OPTIONS,
} from '../../../../src/react/internal/toolbar-config.js';

describe('toolbar-config', () => {
  it('defines the expected scroll mode options contract', () => {
    expect(TOOLBAR_SCROLL_MODE_OPTIONS).toEqual([
      { value: 'continuous', label: 'Continuous' },
      { value: 'single', label: 'Single page' },
      { value: 'horizontal', label: 'Horizontal' },
    ]);
  });

  it('defines the expected spread mode options contract', () => {
    expect(TOOLBAR_SPREAD_MODE_OPTIONS).toEqual([
      { value: 'none', label: 'No spreads' },
      { value: 'odd', label: 'Odd spreads' },
      { value: 'even', label: 'Even spreads' },
    ]);
  });

  it('defines canonical toolbar labels and search placeholder', () => {
    expect(TOOLBAR_LABELS.previousPage).toBe('Previous page');
    expect(TOOLBAR_LABELS.nextPage).toBe('Next page');
    expect(TOOLBAR_LABELS.enterFullscreen).toBe('Enter fullscreen');
    expect(TOOLBAR_LABELS.exitFullscreen).toBe('Exit fullscreen');
    expect(TOOLBAR_LABELS.searchOpen).toBe('Open search');
    expect(TOOLBAR_LABELS.searchClose).toBe('Close search');
    expect(TOOLBAR_LABELS.searchInput).toBe('Search in document');
    expect(TOOLBAR_SEARCH_PLACEHOLDER).toBe('Search...');
  });
});
