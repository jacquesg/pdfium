import { describe, expect, it } from 'vitest';
import { VISUALLY_HIDDEN_STYLE } from '../../../../src/react/internal/a11y.js';

describe('a11y', () => {
  it('exports a visually hidden style primitive', () => {
    expect(VISUALLY_HIDDEN_STYLE.position).toBe('absolute');
    expect(VISUALLY_HIDDEN_STYLE.width).toBe(1);
    expect(VISUALLY_HIDDEN_STYLE.height).toBe(1);
    expect(VISUALLY_HIDDEN_STYLE.overflow).toBe('hidden');
    expect(VISUALLY_HIDDEN_STYLE.clip).toBe('rect(0,0,0,0)');
  });
});
