import { describe, expect, it } from 'vitest';
import {
  collapsePath,
  expandPath,
  expandPaths,
  toggleExpandedPath,
} from '../../../../src/react/internal/bookmark-expansion.js';

describe('bookmark-expansion utilities', () => {
  it('toggles a path on when absent', () => {
    const previous = new Set<string>(['0']);
    const next = toggleExpandedPath(previous, '1');

    expect(Array.from(next).sort()).toEqual(['0', '1']);
    expect(Array.from(previous)).toEqual(['0']);
    expect(next).not.toBe(previous);
  });

  it('toggles a path off when present', () => {
    const previous = new Set<string>(['0', '1']);
    const next = toggleExpandedPath(previous, '1');

    expect(Array.from(next)).toEqual(['0']);
    expect(Array.from(previous).sort()).toEqual(['0', '1']);
    expect(next).not.toBe(previous);
  });

  it('expands a single path without mutating input', () => {
    const previous = new Set<string>(['0']);
    const next = expandPath(previous, '1');

    expect(Array.from(next).sort()).toEqual(['0', '1']);
    expect(Array.from(previous)).toEqual(['0']);
    expect(next).not.toBe(previous);
  });

  it('keeps contents stable when expanding an already expanded path', () => {
    const previous = new Set<string>(['0', '1']);
    const next = expandPath(previous, '1');

    expect(Array.from(next).sort()).toEqual(['0', '1']);
    expect(Array.from(previous).sort()).toEqual(['0', '1']);
    expect(next).not.toBe(previous);
  });

  it('collapses a single path without mutating input', () => {
    const previous = new Set<string>(['0', '1']);
    const next = collapsePath(previous, '1');

    expect(Array.from(next)).toEqual(['0']);
    expect(Array.from(previous).sort()).toEqual(['0', '1']);
    expect(next).not.toBe(previous);
  });

  it('keeps contents stable when collapsing a missing path', () => {
    const previous = new Set<string>(['0']);
    const next = collapsePath(previous, '1');

    expect(Array.from(next)).toEqual(['0']);
    expect(Array.from(previous)).toEqual(['0']);
    expect(next).not.toBe(previous);
  });

  it('expands multiple paths and deduplicates input paths naturally', () => {
    const previous = new Set<string>(['0']);
    const next = expandPaths(previous, ['1', '2', '1']);

    expect(Array.from(next).sort()).toEqual(['0', '1', '2']);
    expect(Array.from(previous)).toEqual(['0']);
    expect(next).not.toBe(previous);
  });
});
