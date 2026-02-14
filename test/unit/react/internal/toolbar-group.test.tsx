import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ToolbarGroup } from '../../../../src/react/internal/toolbar-group.js';

describe('ToolbarGroup', () => {
  it('renders group semantics and data attributes', () => {
    render(
      <ToolbarGroup groupId="navigation" label="Page navigation">
        <button type="button">Prev</button>
      </ToolbarGroup>,
    );

    const group = screen.getByRole('group', { name: 'Page navigation' });
    expect(group.getAttribute('data-toolbar-group')).toBe('navigation');
    expect(group.style.display).toBe('flex');
    expect(group.style.alignItems).toBe('center');
    expect(group.style.gap).toBe('2px');
  });

  it('merges style overrides', () => {
    render(
      <ToolbarGroup groupId="spread-mode" label="Page spread" style={{ opacity: 0.4 }}>
        <button type="button">Spread</button>
      </ToolbarGroup>,
    );

    const group = screen.getByRole('group', { name: 'Page spread' });
    expect(group.style.opacity).toBe('0.4');
  });
});
