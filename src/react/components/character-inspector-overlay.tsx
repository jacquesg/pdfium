import { type CSSProperties, type ReactNode, useEffect, useLayoutEffect } from 'react';
import type { WorkerPDFiumDocument } from '../../context/worker-client.js';
import type { CharacterInfo, CharBox } from '../../core/types.js';
import { pdfRectToScreen } from '../coordinates.js';
import { useCharacterInspector } from '../hooks/use-character-inspector.js';

/** Combined character info payload. */
type CharacterChangeInfo = { charInfo: CharacterInfo; charBox: CharBox; isPinned: boolean } | null;

interface CharacterInspectorOverlayProps {
  document: WorkerPDFiumDocument;
  pageIndex: number;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  /** Render character info. Called with null when no character is hovered. */
  children?: ((info: CharacterChangeInfo) => ReactNode) | undefined;
  /** Callback fired when the hovered character changes. */
  onCharacterChange?: ((info: CharacterChangeInfo) => void) | undefined;
  /** Bounding box stroke colour when hovering. */
  boxStroke?: string;
  /** Bounding box fill colour when hovering. */
  boxFill?: string;
  /** Bounding box stroke colour when pinned. */
  pinnedBoxStroke?: string;
  /** Bounding box fill colour when pinned. */
  pinnedBoxFill?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * Headless character inspector overlay.
 *
 * Renders a transparent canvas that tracks mouse position, queries the
 * character at that position via the worker, and draws a bounding box
 * around the hovered character. The `children` render prop receives the
 * current character info for the consumer to display.
 */
function CharacterInspectorOverlay({
  document,
  pageIndex,
  width,
  height,
  originalWidth,
  originalHeight,
  children,
  onCharacterChange,
  boxStroke = 'rgba(59, 130, 246, 0.9)',
  boxFill = 'rgba(59, 130, 246, 0.1)',
  pinnedBoxStroke = 'rgba(59, 130, 246, 1)',
  pinnedBoxFill = 'rgba(59, 130, 246, 0.2)',
  className,
  style,
}: CharacterInspectorOverlayProps) {
  const scale = originalWidth > 0 ? width / originalWidth : 1;

  const { charInfo, charBox, isPinned, onMouseMove, onMouseLeave, onClick, overlayRef } = useCharacterInspector(
    document,
    pageIndex,
    { width, height, originalWidth, originalHeight },
  );

  useLayoutEffect(() => {
    const canvas = overlayRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    if (!charBox) return;

    const screen = pdfRectToScreen(charBox, { scale, originalHeight });
    ctx.fillStyle = isPinned ? pinnedBoxFill : boxFill;
    ctx.fillRect(screen.x, screen.y, screen.width, screen.height);
    ctx.strokeStyle = isPinned ? pinnedBoxStroke : boxStroke;
    ctx.lineWidth = 2;
    ctx.strokeRect(screen.x, screen.y, screen.width, screen.height);
  }, [
    charBox,
    width,
    height,
    originalHeight,
    scale,
    isPinned,
    boxStroke,
    boxFill,
    pinnedBoxStroke,
    pinnedBoxFill,
    overlayRef,
  ]);

  const info: CharacterChangeInfo = charInfo && charBox ? { charInfo, charBox, isPinned } : null;

  useEffect(() => {
    const change: CharacterChangeInfo = charInfo && charBox ? { charInfo, charBox, isPinned } : null;
    onCharacterChange?.(change);
  }, [charInfo, charBox, isPinned, onCharacterChange]);

  return (
    <>
      <canvas
        ref={overlayRef}
        width={width}
        height={height}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        onClick={onClick}
        className={className}
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'auto',
          cursor: charInfo ? 'crosshair' : 'default',
          zIndex: 40,
          ...style,
        }}
      />
      {children?.(info)}
    </>
  );
}

export { CharacterInspectorOverlay };
export type { CharacterInspectorOverlayProps };
