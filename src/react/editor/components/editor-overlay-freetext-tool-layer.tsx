import type { ReactNode, PointerEvent as ReactPointerEvent } from 'react';
import type { FreeTextInputActions } from '../hooks/use-freetext-input.js';
import type { FreeTextToolConfig } from '../types.js';
import {
  buildInteractiveOverlayStyle,
  type EditorOverlayPdfLayerDimensions,
} from './editor-overlay-tool-layer-support.js';
import { FreeTextEditor } from './freetext-editor.js';

interface EditorOverlayFreeTextToolLayerProps extends EditorOverlayPdfLayerDimensions {
  readonly freetextConfig: FreeTextToolConfig;
  readonly freetextInput: FreeTextInputActions;
  readonly freetextIsActive: boolean;
  readonly onFreeTextClick: (event: ReactPointerEvent) => void;
}

export function EditorOverlayFreeTextToolLayer({
  freetextConfig,
  freetextInput,
  freetextIsActive,
  height,
  onFreeTextClick,
  originalHeight,
  scale,
  width,
}: EditorOverlayFreeTextToolLayerProps): ReactNode {
  return (
    <>
      <FreeTextEditor
        input={freetextInput}
        scale={scale}
        originalHeight={originalHeight}
        fontSize={freetextConfig.fontSize}
        fontFamily={freetextConfig.fontName}
      />
      {!freetextIsActive && (
        <div
          data-testid="freetext-click-overlay"
          style={buildInteractiveOverlayStyle({ width, height }, 'text')}
          onPointerDown={onFreeTextClick}
        />
      )}
    </>
  );
}
