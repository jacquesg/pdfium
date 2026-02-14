import { describe, expect, it } from 'vitest';
import {
  getFocusableToolbarItems,
  initialiseToolbarRovingTabStop,
} from '../../../../src/react/internal/pdf-toolbar-focus.js';

describe('pdf-toolbar-focus', () => {
  it('returns enabled toolbar controls only', () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <button type="button">A</button>
      <button type="button" disabled>B</button>
      <input type="text" />
      <input type="text" disabled />
      <select><option>one</option></select>
      <select disabled><option>two</option></select>
    `;

    const focusables = getFocusableToolbarItems(container);
    expect(focusables).toHaveLength(3);
    expect(focusables.map((node) => node.tagName)).toEqual(['BUTTON', 'INPUT', 'SELECT']);
  });

  it('initialises exactly one roving tab stop', () => {
    const container = document.createElement('div');
    const first = document.createElement('button');
    const second = document.createElement('button');
    const third = document.createElement('button');
    container.append(first, second, third);

    const focusables = initialiseToolbarRovingTabStop(container);
    expect(focusables).toHaveLength(3);
    const tabIndexes = focusables.map((node) => node.getAttribute('tabindex'));
    expect(tabIndexes.filter((value) => value === '0')).toHaveLength(1);
    expect(tabIndexes.filter((value) => value === '-1')).toHaveLength(2);
  });
});
