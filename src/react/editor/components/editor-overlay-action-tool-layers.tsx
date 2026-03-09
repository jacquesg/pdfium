import type { ReactNode } from 'react';
import { EditorOverlayMarkupToolLayer } from './editor-overlay-markup-tool-layer.js';
import { EditorOverlayRedactToolLayer } from './editor-overlay-redact-tool-layer.js';
import { EditorOverlayStampToolLayer } from './editor-overlay-stamp-tool-layer.js';
import type { EditorOverlayToolLayerSectionProps } from './editor-overlay-tool-layer.types.js';

export function EditorOverlayActionToolLayers({
  activeTool,
  height,
  onMarkupCreate,
  onMarkupProcessResult,
  onRedactCreate,
  onStampClick,
  originalHeight,
  pendingMarkupAction,
  scale,
  width,
}: EditorOverlayToolLayerSectionProps): ReactNode {
  return (
    <>
      {pendingMarkupAction !== null && (
        <EditorOverlayMarkupToolLayer
          tool={pendingMarkupAction.tool}
          width={width}
          height={height}
          scale={scale}
          originalHeight={originalHeight}
          onMarkupCreate={onMarkupCreate}
          onMarkupProcessResult={onMarkupProcessResult}
        />
      )}
      {activeTool === 'redact' && (
        <EditorOverlayRedactToolLayer
          width={width}
          height={height}
          scale={scale}
          originalHeight={originalHeight}
          onRedactCreate={onRedactCreate}
        />
      )}
      {activeTool === 'stamp' && (
        <EditorOverlayStampToolLayer width={width} height={height} onStampClick={onStampClick} />
      )}
    </>
  );
}
