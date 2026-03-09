import type { ReactNode } from 'react';
import type { SelectionBoxOverlayProps } from './selection-overlay-box-renderer.types.js';

type SelectionBoxLivePreviewProps = Pick<
  SelectionBoxOverlayProps,
  'appearance' | 'boxFillColour' | 'boxStrokeColour' | 'liveStrokeWidth' | 'overlayRect'
>;

export function SelectionBoxLivePreview({
  appearance,
  boxFillColour,
  boxStrokeColour,
  liveStrokeWidth,
  overlayRect,
}: SelectionBoxLivePreviewProps): ReactNode {
  if (appearance.kind !== 'rectangle' && appearance.kind !== 'ellipse') {
    return null;
  }

  return (
    <svg
      data-testid="selection-shape-preview"
      aria-hidden="true"
      focusable="false"
      style={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none' }}
    >
      {appearance.kind === 'rectangle' ? (
        <rect
          x={liveStrokeWidth / 2}
          y={liveStrokeWidth / 2}
          width={Math.max(0, overlayRect.width - liveStrokeWidth)}
          height={Math.max(0, overlayRect.height - liveStrokeWidth)}
          fill={boxFillColour}
          stroke={boxStrokeColour}
          strokeWidth={liveStrokeWidth}
        />
      ) : (
        <ellipse
          cx={overlayRect.width / 2}
          cy={overlayRect.height / 2}
          rx={Math.max(0, overlayRect.width / 2 - liveStrokeWidth / 2)}
          ry={Math.max(0, overlayRect.height / 2 - liveStrokeWidth / 2)}
          fill={boxFillColour}
          stroke={boxStrokeColour}
          strokeWidth={liveStrokeWidth}
        />
      )}
    </svg>
  );
}
