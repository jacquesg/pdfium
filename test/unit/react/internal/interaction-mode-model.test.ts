import { afterEach, describe, expect, it } from 'vitest';
import {
  createMarqueeRect,
  injectInteractionCss,
  resolveMarqueeZoom,
  resolvePanScrollPosition,
} from '../../../../src/react/internal/interaction-mode-model.js';

const STYLE_ID = 'pdfium-interaction-css';

afterEach(() => {
  document.getElementById(STYLE_ID)?.remove();
});

describe('interaction-mode-model', () => {
  it('normalizes marquee rectangle coordinates regardless of drag direction', () => {
    expect(createMarqueeRect(40, 30, 10, 50)).toEqual({
      x: 10,
      y: 30,
      width: 30,
      height: 20,
    });
  });

  it('resolves pan drag into next scroll coordinates', () => {
    expect(
      resolvePanScrollPosition(
        {
          x: 100,
          y: 100,
          scrollLeft: 300,
          scrollTop: 200,
        },
        80,
        60,
      ),
    ).toEqual({
      scrollLeft: 320,
      scrollTop: 240,
    });
  });

  it('rejects marquee zoom when rectangle is too small', () => {
    expect(
      resolveMarqueeZoom({
        rect: { x: 10, y: 10, width: 4, height: 10 },
        scale: 1,
        containerWidth: 800,
        containerHeight: 600,
        containerScrollLeft: 0,
        containerScrollTop: 0,
      }),
    ).toBeNull();
  });

  it('computes marquee zoom anchor and target scroll positions', () => {
    const result = resolveMarqueeZoom({
      rect: { x: 100, y: 50, width: 200, height: 100 },
      scale: 2,
      containerWidth: 800,
      containerHeight: 600,
      containerScrollLeft: 50,
      containerScrollTop: 25,
    });

    expect(result).toMatchObject({
      newScale: 8,
      anchor: {
        cursorX: 400,
        cursorY: 300,
        scrollLeft: -150,
        scrollTop: -175,
        ratio: 4,
      },
      targetScrollLeft: 600,
      targetScrollTop: 200,
    });
  });

  it('injects interaction CSS once and reuses the same style element', () => {
    injectInteractionCss();
    injectInteractionCss();

    const nodes = Array.from(document.querySelectorAll<HTMLStyleElement>(`style#${STYLE_ID}`));
    expect(nodes).toHaveLength(1);
    expect(nodes[0]?.textContent).toContain('[data-pdfium-interaction="pan"] .pdfium-text-layer');
  });
});
