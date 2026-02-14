import { render } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it } from 'vitest';
import { MarqueeOverlay } from '../../../../src/react/components/marquee-overlay.js';

describe('MarqueeOverlay', () => {
  const containerRef = createRef<HTMLDivElement>();

  it('renders nothing when rect is null', () => {
    const { container } = render(<MarqueeOverlay rect={null} containerRef={containerRef} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders a div when rect is provided', () => {
    const { container } = render(
      <MarqueeOverlay rect={{ x: 10, y: 20, width: 100, height: 50 }} containerRef={containerRef} />,
    );
    const el = container.firstElementChild as HTMLElement;
    expect(el).not.toBeNull();
    expect(el.tagName).toBe('DIV');
  });

  it('has correct dimensions from rect', () => {
    const { container } = render(
      <MarqueeOverlay rect={{ x: 15, y: 25, width: 200, height: 80 }} containerRef={containerRef} />,
    );
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.width).toBe('200px');
    expect(el.style.height).toBe('80px');
    expect(el.style.left).toBe('15px');
    expect(el.style.top).toBe('25px');
  });

  it('uses position absolute and pointer-events none', () => {
    const { container } = render(
      <MarqueeOverlay rect={{ x: 0, y: 0, width: 50, height: 50 }} containerRef={containerRef} />,
    );
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.position).toBe('absolute');
    expect(el.style.pointerEvents).toBe('none');
  });

  it('has aria-hidden true', () => {
    const { container } = render(
      <MarqueeOverlay rect={{ x: 0, y: 0, width: 50, height: 50 }} containerRef={containerRef} />,
    );
    const el = container.firstElementChild as HTMLElement;
    expect(el.getAttribute('aria-hidden')).toBe('true');
  });
});
