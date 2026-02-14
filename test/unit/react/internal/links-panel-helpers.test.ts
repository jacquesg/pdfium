import { describe, expect, it } from 'vitest';
import type { SerialisedLink } from '../../../../src/context/protocol.js';
import { ActionType, DestinationFitType } from '../../../../src/core/types.js';
import {
  clampLinksPageIndex,
  formatLinkTarget,
  isLinksPanelTabId,
} from '../../../../src/react/internal/links-panel-helpers.js';

function createLink(overrides?: Partial<SerialisedLink>): SerialisedLink {
  return {
    index: 0,
    bounds: { left: 1, top: 2, right: 3, bottom: 4 },
    action: undefined,
    destination: undefined,
    ...overrides,
  };
}

describe('links-panel-helpers', () => {
  it('formats link target for uri, destination, and empty links', () => {
    expect(
      formatLinkTarget(
        createLink({
          action: { type: ActionType.URI, uri: 'https://example.com', filePath: undefined },
        }),
      ),
    ).toBe('https://example.com');
    expect(
      formatLinkTarget(
        createLink({
          destination: { pageIndex: 2, fitType: DestinationFitType.Fit, x: undefined, y: undefined, zoom: undefined },
        }),
      ),
    ).toBe('GoTo Page 3');
    expect(formatLinkTarget(createLink())).toBe('\u2014');
  });

  it('clamps web-links page selection safely', () => {
    expect(clampLinksPageIndex(2, 10)).toBe(2);
    expect(clampLinksPageIndex(-5, 10)).toBe(0);
    expect(clampLinksPageIndex(99, 3)).toBe(2);
    expect(clampLinksPageIndex(Number.NaN, 4)).toBe(0);
  });

  it('validates supported links panel tabs', () => {
    expect(isLinksPanelTabId('links')).toBe(true);
    expect(isLinksPanelTabId('weblinks')).toBe(true);
    expect(isLinksPanelTabId('other')).toBe(false);
  });
});
