import { describe, expect, it } from 'vitest';
import {
  BUILTIN_LABELS,
  BUILTIN_PANEL_IDS,
  BUILTIN_VIEWPORT_EFFECTS,
} from '../../../../../src/react/components/panels/types.js';

describe('panel type configuration', () => {
  it('exposes built-in panel IDs in stable UI order', () => {
    expect(BUILTIN_PANEL_IDS).toEqual([
      'thumbnails',
      'bookmarks',
      'annotations',
      'objects',
      'forms',
      'text',
      'structure',
      'attachments',
      'links',
      'info',
    ]);
  });

  it('has labels and viewport effects for every built-in panel ID', () => {
    expect(Object.keys(BUILTIN_LABELS).sort()).toEqual([...BUILTIN_PANEL_IDS].sort());
    expect(Object.keys(BUILTIN_VIEWPORT_EFFECTS).sort()).toEqual([...BUILTIN_PANEL_IDS].sort());
  });
});
