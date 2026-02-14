import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ColourSwatch } from '../../../../src/react/internal/colour-swatch.js';

describe('ColourSwatch', () => {
  it('renders an em dash when colour is undefined', () => {
    render(<ColourSwatch colour={undefined} className="muted" />);

    const dash = screen.getByText('\u2014');
    expect(dash.className).toBe('muted');
  });

  it('renders swatch and label when colour is provided', () => {
    const { container } = render(<ColourSwatch colour={{ r: 10, g: 20, b: 30, a: 255 }} label="Highlight" />);

    expect(screen.getByText('Highlight')).toBeDefined();
    const swatch = container.querySelector('span[aria-hidden="true"]') as HTMLElement;
    expect(swatch).toBeDefined();
    expect(swatch.getAttribute('style')).toContain('background-color: rgba(10, 20, 30, 1)');
    expect(swatch.style.width).toBe('16px');
    expect(swatch.style.height).toBe('16px');
  });

  it('omits label node when label is undefined', () => {
    const { container } = render(<ColourSwatch colour={{ r: 1, g: 2, b: 3, a: 4 }} />);

    const root = container.firstElementChild as HTMLElement;
    expect(root.textContent).toBe('');
  });
});
