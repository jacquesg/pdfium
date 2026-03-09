import type { ReactNode } from 'react';
import type { AnnotationPropertyPanelColourControlsProps } from './annotation-property-panel-style-section.types.js';
import { colourToHex, labelStyle } from './annotation-property-panel-support.js';

export function AnnotationPropertyPanelColourControls({
  canEditFill,
  canEditStroke,
  canToggleFill,
  fillEnabled,
  handleFillEnabledChange,
  handleInteriorColourChange,
  handleStrokeColourChange,
  handleStyleInputBlur,
  localInteriorColour,
  localStrokeColour,
}: AnnotationPropertyPanelColourControlsProps): ReactNode {
  return (
    <>
      {canEditStroke && (
        <label style={labelStyle}>
          Stroke
          <input
            data-testid="stroke-colour-input"
            type="color"
            value={colourToHex(localStrokeColour)}
            onChange={handleStrokeColourChange}
            onInput={handleStrokeColourChange}
            onBlur={handleStyleInputBlur}
          />
        </label>
      )}

      {canEditFill && (
        <label style={labelStyle}>
          Fill
          {canToggleFill && (
            <input
              data-testid="fill-enabled-input"
              type="checkbox"
              checked={fillEnabled}
              onChange={handleFillEnabledChange}
              title="Enable fill"
            />
          )}
          <input
            data-testid="interior-colour-input"
            type="color"
            value={colourToHex(localInteriorColour)}
            onChange={handleInteriorColourChange}
            onInput={handleInteriorColourChange}
            onBlur={handleStyleInputBlur}
            disabled={canToggleFill && !fillEnabled}
          />
          {canToggleFill && !fillEnabled && <span style={{ fontSize: 11, color: '#666' }}>None</span>}
        </label>
      )}
    </>
  );
}
