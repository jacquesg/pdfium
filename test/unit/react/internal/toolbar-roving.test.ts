import { describe, expect, it } from 'vitest';
import {
  applyToolbarTabStops,
  getNextRovingIndex,
  getToolbarInitialTabStop,
  isToolbarRovingKey,
} from '../../../../src/react/internal/toolbar-roving.js';

describe('toolbar-roving', () => {
  it('detects valid roving keys', () => {
    expect(isToolbarRovingKey('ArrowLeft')).toBe(true);
    expect(isToolbarRovingKey('ArrowRight')).toBe(true);
    expect(isToolbarRovingKey('Home')).toBe(true);
    expect(isToolbarRovingKey('End')).toBe(true);
    expect(isToolbarRovingKey('Enter')).toBe(false);
    expect(isToolbarRovingKey('a')).toBe(false);
  });

  it('computes next index for right/left with wraparound', () => {
    expect(getNextRovingIndex('ArrowRight', 0, 4)).toBe(1);
    expect(getNextRovingIndex('ArrowRight', 3, 4)).toBe(0);
    expect(getNextRovingIndex('ArrowLeft', 2, 4)).toBe(1);
    expect(getNextRovingIndex('ArrowLeft', 0, 4)).toBe(3);
  });

  it('computes boundary index for Home and End', () => {
    expect(getNextRovingIndex('Home', 2, 5)).toBe(0);
    expect(getNextRovingIndex('End', 2, 5)).toBe(4);
  });

  it('returns -1 when there are no focusable items', () => {
    expect(getNextRovingIndex('Home', 0, 0)).toBe(-1);
    expect(getNextRovingIndex('ArrowRight', 0, -2)).toBe(-1);
  });

  it('resolves initial tab stop from existing tabindex=0 element', () => {
    const container = document.createElement('div');
    const first = document.createElement('button');
    const second = document.createElement('button');
    first.setAttribute('tabindex', '-1');
    second.setAttribute('tabindex', '0');
    container.append(first, second);

    const active = getToolbarInitialTabStop(container, [first, second]);
    expect(active).toBe(second);
  });

  it('resolves initial tab stop from focused element when no tab stop exists', () => {
    const container = document.createElement('div');
    const first = document.createElement('button');
    const second = document.createElement('button');
    first.setAttribute('tabindex', '-1');
    second.setAttribute('tabindex', '-1');
    container.append(first, second);
    document.body.append(container);

    second.focus();
    const active = getToolbarInitialTabStop(container, [first, second]);
    expect(active).toBe(second);
    container.remove();
  });

  it('returns null when no focusable controls exist', () => {
    const container = document.createElement('div');
    const active = getToolbarInitialTabStop(container, []);
    expect(active).toBeNull();
  });

  it('falls back to the first item when focus is outside the toolbar', () => {
    const container = document.createElement('div');
    const first = document.createElement('button');
    const second = document.createElement('button');
    first.setAttribute('tabindex', '-1');
    second.setAttribute('tabindex', '-1');
    container.append(first, second);
    document.body.append(container);

    const outsider = document.createElement('button');
    document.body.append(outsider);
    const activeElementDescriptor = Object.getOwnPropertyDescriptor(document, 'activeElement');
    Object.defineProperty(document, 'activeElement', {
      configurable: true,
      get: () => outsider,
    });

    const active = getToolbarInitialTabStop(container, [first, second]);
    expect(active).toBe(first);

    if (activeElementDescriptor) {
      Object.defineProperty(document, 'activeElement', activeElementDescriptor);
    } else {
      delete (document as { activeElement?: Element | null }).activeElement;
    }
    outsider.remove();
    container.remove();
  });

  it('falls back to the first item when there is no active element', () => {
    const container = document.createElement('div');
    const first = document.createElement('button');
    const second = document.createElement('button');
    first.setAttribute('tabindex', '-1');
    second.setAttribute('tabindex', '-1');
    container.append(first, second);

    const activeElementDescriptor = Object.getOwnPropertyDescriptor(document, 'activeElement');
    Object.defineProperty(document, 'activeElement', {
      configurable: true,
      get: () => null,
    });

    const active = getToolbarInitialTabStop(container, [first, second]);
    expect(active).toBe(first);

    if (activeElementDescriptor) {
      Object.defineProperty(document, 'activeElement', activeElementDescriptor);
    } else {
      delete (document as { activeElement?: Element | null }).activeElement;
    }
  });

  it('applies roving tabindex attributes to focusable elements', () => {
    const first = document.createElement('button');
    const second = document.createElement('button');
    const third = document.createElement('button');

    applyToolbarTabStops([first, second, third], second);

    expect(first.getAttribute('tabindex')).toBe('-1');
    expect(second.getAttribute('tabindex')).toBe('0');
    expect(third.getAttribute('tabindex')).toBe('-1');
  });
});
