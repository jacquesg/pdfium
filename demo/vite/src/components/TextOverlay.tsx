import { useEffect, useState, memo } from 'react';

interface TextOverlayProps {
  text: string | null;
  rects: Float32Array | null; // [left, right, bottom, top] flat array
  scale: number;
  width: number;
  height: number;
  originalHeight: number;
}

interface TextSpan {
  text: string;
  left: number;
  top: number;
  width: number;
  height: number;
  fontSize: number;
}

export const TextOverlay = memo(({ text, rects, scale, width, height, originalHeight }: TextOverlayProps) => {
  const [spans, setSpans] = useState<TextSpan[]>([]);

  useEffect(() => {
    if (!text || !rects || text.length === 0) {
      setSpans([]);
      return;
    }

    // Zero-delay timeout to unblock UI during heavy processing
    const timer = setTimeout(() => {
      try {
        const newSpans: TextSpan[] = [];
        let currentSpan: TextSpan | null = null;
        let lastRight = -1;
        const count = text.length;

        for (let i = 0; i < count; i++) {
          const offset = i * 4;
          const l = rects[offset];
          const r = rects[offset + 1];
          const b = rects[offset + 2];
          const t = rects[offset + 3];
          
          // Filter out empty/invalid
          // If all zeros, it's likely a non-printing char or invalid
          if (Math.abs(r - l) < 0.1 || Math.abs(t - b) < 0.1) continue;

          const char = text[i];
          if (char === '\u0000') continue;

          // Convert PDF coords to CSS (Top-Left origin)
          const charLeft = l * scale;
          const charTop = (originalHeight - t) * scale;
          const charWidth = (r - l) * scale;
          const charHeight = (t - b) * scale;
          
          // Use bounding box height for pixel-perfect selection
          const charFontSize = charHeight; 

          let merged = false;
          if (currentSpan) {
            const charBottom = charTop + charHeight;
            const verticalOverlap = Math.min(currentSpan.top + currentSpan.height, charBottom) - Math.max(currentSpan.top, charTop);
            const isSameLine = verticalOverlap > (Math.min(currentSpan.height, charHeight) * 0.5);
            
            const gap = charLeft - lastRight;
            const isAdjacent = gap > -2 && gap < (currentSpan.fontSize * 0.8); 
            // Relaxed size check: Allow 60% difference relative to max size
            const maxSize = Math.max(currentSpan.fontSize, charFontSize);
            const isSameSize = Math.abs(currentSpan.fontSize - charFontSize) < (maxSize * 0.6);

            if (isSameLine && isAdjacent && isSameSize) {
              // If there's a significant gap (but still considered adjacent), inject a space
              if (gap > (currentSpan.fontSize * 0.2) && !currentSpan.text.endsWith(' ') && char !== ' ') {
                currentSpan.text += ' ';
              }

              currentSpan.text += char;
              currentSpan.width = (charLeft + charWidth) - currentSpan.left;
              
              const newTop = Math.min(currentSpan.top, charTop);
              const newBottom = Math.max(currentSpan.top + currentSpan.height, charBottom);
              currentSpan.top = newTop;
              currentSpan.height = newBottom - newTop;
              // Update fontSize to match the visual height of the block (grow only)
              currentSpan.fontSize = Math.max(currentSpan.fontSize, charFontSize);
              
              lastRight = charLeft + charWidth;
              merged = true;
            }
          }

          if (!merged) {
            if (currentSpan) newSpans.push(currentSpan);
            currentSpan = {
              text: char,
              left: charLeft,
              top: charTop,
              width: charWidth,
              height: charHeight,
              fontSize: charFontSize
            };
            lastRight = charLeft + charWidth;
          }
        }
        if (currentSpan) newSpans.push(currentSpan);

        setSpans(newSpans);

      } catch (e) {
        console.error('Failed to generate text overlay', e);
        setSpans([]);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [text, rects, scale, originalHeight]);

  return (
    <div 
      className="absolute inset-0 text-overlay"
      style={{ 
        width, 
        height, 
        zIndex: 10, 
        opacity: 1, 
        pointerEvents: 'auto',
        cursor: 'text',
        userSelect: 'text',
        WebkitUserSelect: 'text',
        isolation: 'isolate'
      }}
    >
      <style>{`
        .text-overlay { --selection-color: rgba(20, 100, 255, 0.3); }
        .text-overlay span { 
          color: transparent; 
          cursor: text; 
          white-space: pre; 
          line-height: 1;
          transform-origin: 0 0;
        }
        .text-overlay ::selection { background: var(--selection-color); }
      `}</style>
      
      {spans.map((span, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            left: `${span.left}px`,
            top: `${span.top}px`,
            width: `${span.width}px`, 
            height: `${span.height}px`,
            fontSize: `${span.fontSize}px`,
            fontFamily: 'sans-serif',
            overflow: 'hidden'
          }}
        >
          {span.text}
        </span>
      ))}
      <div style={{ position: 'absolute', top: '100%', left: '0', width: '1px', height: '1px' }} />
    </div>
  );
});