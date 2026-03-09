import type { ReactNode } from 'react';
import { MAX_BORDER_WIDTH } from '../hooks/use-annotation-style-editing.js';
import type { AnnotationPropertyPanelBorderControlProps } from './annotation-property-panel-style-section.types.js';
import { labelStyle } from './annotation-property-panel-support.js';

export function AnnotationPropertyPanelBorderControl({
  displayedBorder,
  handleBorderWidthChange,
  handleBorderWidthCommit,
  handleBorderWidthFocus,
  handleBorderWidthKeyDown,
  localBorderWidth,
}: AnnotationPropertyPanelBorderControlProps): ReactNode {
  if (displayedBorder === null) {
    return null;
  }

  return (
    <>
      <label style={labelStyle}>
        Border
        <input
          data-testid="border-width-input"
          type="number"
          min="0"
          max={MAX_BORDER_WIDTH}
          step="0.5"
          value={localBorderWidth}
          onFocus={() => {
            handleBorderWidthFocus();
          }}
          onChange={handleBorderWidthChange}
          onBlur={handleBorderWidthCommit}
          onKeyDown={handleBorderWidthKeyDown}
          style={{ width: 72 }}
        />
        <span style={{ fontSize: 11 }}>px</span>
      </label>
      <div data-testid="border-info" style={{ fontSize: 12, color: '#666' }}>
        Radius: {displayedBorder.horizontalRadius}px / {displayedBorder.verticalRadius}px
      </div>
    </>
  );
}
