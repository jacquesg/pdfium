import type { ReactNode } from 'react';
import type { AnnotationPropertyPanelOpacityControlProps } from './annotation-property-panel-style-section.types.js';
import { labelStyle } from './annotation-property-panel-support.js';

export function AnnotationPropertyPanelOpacityControl({
  handleOpacityClick,
  handleOpacityInputChange,
  handleOpacityMouseEnd,
  handleOpacityPointerEnd,
  handleStyleInputBlur,
  primaryAlpha,
}: AnnotationPropertyPanelOpacityControlProps): ReactNode {
  return (
    <label style={labelStyle}>
      Opacity
      <input
        data-testid="opacity-input"
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={primaryAlpha / 255}
        onChange={handleOpacityInputChange}
        onBlur={handleStyleInputBlur}
        onClick={handleOpacityClick}
        onPointerUp={handleOpacityPointerEnd}
        onMouseUp={handleOpacityMouseEnd}
        style={{ flex: 1 }}
      />
      <span style={{ fontSize: 11, minWidth: 32 }}>{Math.round((primaryAlpha / 255) * 100)}%</span>
    </label>
  );
}
