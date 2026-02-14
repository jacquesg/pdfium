import { describe, expect, it, vi } from 'vitest';
import { createPDFViewerCompound } from '../../../../src/react/components/pdf-viewer-compound.js';

describe('createPDFViewerCompound', () => {
  it('attaches slot components to the root component and returns the same function', () => {
    const root = vi.fn(() => null);
    const slots = {
      Pages: vi.fn(),
      Thumbnails: vi.fn(),
      Search: vi.fn(),
      Bookmarks: vi.fn(),
    };

    const compound = createPDFViewerCompound(root, slots);

    expect(compound).toBe(root);
    expect(compound.Pages).toBe(slots.Pages);
    expect(compound.Thumbnails).toBe(slots.Thumbnails);
    expect(compound.Search).toBe(slots.Search);
    expect(compound.Bookmarks).toBe(slots.Bookmarks);
  });
});
