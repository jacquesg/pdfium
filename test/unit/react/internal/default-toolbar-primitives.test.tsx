import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Separator, ToolbarButton } from '../../../../src/react/internal/default-toolbar-primitives.js';

describe('default-toolbar-primitives', () => {
  it('renders toolbar button with label and pressed state', () => {
    render(
      <ToolbarButton label="Zoom in" active>
        <span data-testid="icon">+</span>
      </ToolbarButton>,
    );

    const button = screen.getByRole('button', { name: 'Zoom in' });
    expect(button.getAttribute('title')).toBe('Zoom in');
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTestId('icon')).toBeDefined();
  });

  it('renders toolbar button disabled semantics', () => {
    render(
      <ToolbarButton label="Print" disabled>
        P
      </ToolbarButton>,
    );

    const button = screen.getByRole('button', { name: 'Print' });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(button.getAttribute('aria-disabled')).toBe('true');
  });

  it('renders a visual separator with aria-hidden', () => {
    const { container } = render(<Separator />);
    const separator = container.querySelector('span');
    expect(separator).not.toBeNull();
    expect(separator?.getAttribute('aria-hidden')).toBe('true');
  });
});
