import { type CSSProperties, useDeferredValue, useMemo } from 'react';
import { mergeClassNames } from '../internal/component-api.js';

interface TextSpan {
  text: string;
  left: number;
  top: number;
  width: number;
  height: number;
  fontSize: number;
}

interface TextOverlayProps {
  text: string | null;
  rects: Float32Array | null;
  scale: number;
  width: number;
  height: number;
  originalHeight: number;
  selectionColour?: string;
  nonce?: string;
  className?: string;
  style?: CSSProperties;
}

function computeSpans(text: string, rects: Float32Array, scale: number, originalHeight: number): TextSpan[] {
  const spans: TextSpan[] = [];
  let current: TextSpan | null = null;
  let lastRight = -1;
  const count = text.length;

  for (let i = 0; i < count; i++) {
    const offset = i * 4;
    const l = rects[offset];
    const r = rects[offset + 1];
    const b = rects[offset + 2];
    const t = rects[offset + 3];
    if (l === undefined || r === undefined || b === undefined || t === undefined) continue;

    if (Math.abs(r - l) < 0.1 || Math.abs(t - b) < 0.1) continue;

    const char = text[i];
    if (char === undefined) continue;
    if (char === '\u0000') continue;

    const charLeft = l * scale;
    const charTop = (originalHeight - t) * scale;
    const charWidth = (r - l) * scale;
    const charHeight = (t - b) * scale;
    const charFontSize = charHeight;

    let merged = false;
    if (current) {
      const charBottom = charTop + charHeight;
      const verticalOverlap = Math.min(current.top + current.height, charBottom) - Math.max(current.top, charTop);
      const isSameLine = verticalOverlap > Math.min(current.height, charHeight) * 0.5;

      const gap = charLeft - lastRight;
      const isAdjacent = gap > -2 && gap < current.fontSize * 0.8;

      const maxSize = Math.max(current.fontSize, charFontSize);
      const isSameSize = Math.abs(current.fontSize - charFontSize) < maxSize * 0.3;

      if (isSameLine && isAdjacent && isSameSize) {
        if (gap > current.fontSize * 0.2 && !current.text.endsWith(' ') && char !== ' ') {
          current.text += ' ';
        }
        current.text += char;
        current.width = charLeft + charWidth - current.left;
        const newTop = Math.min(current.top, charTop);
        const newBottom = Math.max(current.top + current.height, charBottom);
        current.top = newTop;
        current.height = newBottom - newTop;
        current.fontSize = Math.max(current.fontSize, charFontSize);
        lastRight = charLeft + charWidth;
        merged = true;
      }
    }

    if (!merged) {
      if (current) spans.push(current);
      current = {
        text: char,
        left: charLeft,
        top: charTop,
        width: charWidth,
        height: charHeight,
        fontSize: charFontSize,
      };
      lastRight = charLeft + charWidth;
    }
  }
  if (current) spans.push(current);
  return spans;
}

function TextOverlay({
  text,
  rects,
  scale,
  width,
  height,
  originalHeight,
  selectionColour,
  nonce,
  className,
  style,
}: TextOverlayProps) {
  const deferredText = useDeferredValue(text);
  const deferredRects = useDeferredValue(rects);

  const spans = useMemo(() => {
    if (!deferredText || !deferredRects || deferredText.length === 0) return [];
    return computeSpans(deferredText, deferredRects, scale, originalHeight);
  }, [deferredText, deferredRects, scale, originalHeight]);

  const colour = selectionColour ?? 'rgba(20, 100, 255, 0.3)';

  return (
    <div
      className={mergeClassNames('pdfium-text-layer', className)}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: tabIndex enables keyboard-based text selection
      tabIndex={0}
      style={{
        position: 'absolute',
        inset: 0,
        width,
        height,
        zIndex: 10,
        pointerEvents: 'auto',
        cursor: 'text',
        userSelect: 'text',
        WebkitUserSelect: 'text',
        isolation: 'isolate',
        ...style,
      }}
    >
      <style nonce={nonce}>{`
        .pdfium-text-overlay span {
          color: transparent;
          cursor: text;
          white-space: pre;
          line-height: 1;
          transform-origin: 0 0;
        }
        .pdfium-text-overlay ::selection { background: var(--pdfium-selection-colour); }
      `}</style>
      <div className="pdfium-text-overlay" style={{ '--pdfium-selection-colour': colour } as CSSProperties}>
        {spans.map((span, i) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: spans are positionally derived from stable character rects — no stable key exists
            key={i}
            style={{
              position: 'absolute',
              left: `${span.left}px`,
              top: `${span.top}px`,
              width: `${span.width}px`,
              height: `${span.height}px`,
              fontSize: `${span.fontSize}px`,
              fontFamily: 'sans-serif',
              overflow: 'hidden',
            }}
          >
            {span.text}
          </span>
        ))}
      </div>
    </div>
  );
}

export { TextOverlay, computeSpans };
export type { TextOverlayProps, TextSpan };
