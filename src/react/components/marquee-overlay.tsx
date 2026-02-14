'use client';

import type { CSSProperties, RefObject } from 'react';

interface MarqueeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface MarqueeOverlayProps {
  rect: MarqueeRect | null;
  containerRef: RefObject<HTMLElement | null>;
}

/**
 * Renders a semi-transparent selection rectangle for marquee zoom.
 * Positioned absolutely within the scroll container. Only renders when `rect` is non-null.
 */
function MarqueeOverlay({ rect }: MarqueeOverlayProps) {
  if (!rect) return null;

  const style: CSSProperties = {
    position: 'absolute',
    left: rect.x,
    top: rect.y,
    width: rect.width,
    height: rect.height,
    background: 'var(--pdfium-marquee-bg, rgba(59,130,246,0.15))',
    border: '2px solid var(--pdfium-marquee-border, rgba(59,130,246,0.5))',
    borderRadius: 2,
    zIndex: 10,
    pointerEvents: 'none',
  };

  return <div data-pdfium-marquee aria-hidden="true" style={style} />;
}

export { MarqueeOverlay };
export type { MarqueeOverlayProps, MarqueeRect };
