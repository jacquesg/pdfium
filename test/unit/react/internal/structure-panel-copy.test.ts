import { describe, expect, it } from 'vitest';
import {
  formatNamedDestinationPage,
  formatNoDestinationFound,
  STRUCTURE_PANEL_COPY,
} from '../../../../src/react/internal/structure-panel-copy.js';

describe('structure-panel copy', () => {
  it('exposes stable user-facing copy strings', () => {
    expect(STRUCTURE_PANEL_COPY.structureTabLabel).toBe('Structure');
    expect(STRUCTURE_PANEL_COPY.namedDestinationsTabLabel).toBe('Named Dests');
    expect(STRUCTURE_PANEL_COPY.taggedBadge).toBe('Tagged');
    expect(STRUCTURE_PANEL_COPY.notTaggedBadge).toBe('Not Tagged');
    expect(STRUCTURE_PANEL_COPY.pageLabel).toBe('Page:');
    expect(STRUCTURE_PANEL_COPY.pageValueLabel).toBe('Page');
    expect(STRUCTURE_PANEL_COPY.searchPlaceholder).toBe('e.g. chapter1');
  });

  it('formats named destination search labels', () => {
    expect(formatNoDestinationFound('chapter1')).toBe('No destination found for “chapter1”');
    expect(formatNamedDestinationPage(0)).toBe('1 (index 0)');
    expect(formatNamedDestinationPage(8)).toBe('9 (index 8)');
  });
});
