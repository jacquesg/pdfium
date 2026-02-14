import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  ContinuousScrollIcon,
  DEFAULT_TOOLBAR_ICON_SIZE,
  EvenSpreadIcon,
  HorizontalScrollIcon,
  NoSpreadIcon,
  OddSpreadIcon,
  SinglePageIcon,
} from '../../../../src/react/internal/default-toolbar-icons.js';

describe('default-toolbar-icons', () => {
  it('renders scroll/spread icons at the shared default size', () => {
    const icons = [
      ContinuousScrollIcon,
      SinglePageIcon,
      HorizontalScrollIcon,
      NoSpreadIcon,
      OddSpreadIcon,
      EvenSpreadIcon,
    ];

    for (const Icon of icons) {
      const { container, unmount } = render(<Icon />);
      const svg = container.querySelector('svg');
      expect(svg).not.toBeNull();
      expect(svg?.getAttribute('width')).toBe(String(DEFAULT_TOOLBAR_ICON_SIZE));
      expect(svg?.getAttribute('height')).toBe(String(DEFAULT_TOOLBAR_ICON_SIZE));
      unmount();
    }
  });
});
