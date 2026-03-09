import type { ReactNode } from 'react';
import { AnnotationPropertyPanelBorderControl } from './annotation-property-panel-border-control.js';
import { AnnotationPropertyPanelColourControls } from './annotation-property-panel-colour-controls.js';
import { AnnotationPropertyPanelOpacityControl } from './annotation-property-panel-opacity-control.js';
import type { AnnotationPropertyPanelStyleSectionProps } from './annotation-property-panel-style-section.types.js';

export function AnnotationPropertyPanelStyleSection({
  canEditFill,
  canEditStroke,
  canToggleFill,
  displayedBorder,
  fillEnabled,
  handleBorderWidthChange,
  handleBorderWidthCommit,
  handleBorderWidthFocus,
  handleBorderWidthKeyDown,
  handleFillEnabledChange,
  handleInteriorColourChange,
  handleOpacityClick,
  handleOpacityInputChange,
  handleOpacityMouseEnd,
  handleOpacityPointerEnd,
  handleStrokeColourChange,
  handleStyleInputBlur,
  localBorderWidth,
  localInteriorColour,
  localStrokeColour,
  primaryAlpha,
}: AnnotationPropertyPanelStyleSectionProps): ReactNode {
  return (
    <>
      <AnnotationPropertyPanelColourControls
        canEditFill={canEditFill}
        canEditStroke={canEditStroke}
        canToggleFill={canToggleFill}
        fillEnabled={fillEnabled}
        handleFillEnabledChange={handleFillEnabledChange}
        handleInteriorColourChange={handleInteriorColourChange}
        handleStrokeColourChange={handleStrokeColourChange}
        handleStyleInputBlur={handleStyleInputBlur}
        localInteriorColour={localInteriorColour}
        localStrokeColour={localStrokeColour}
      />
      <AnnotationPropertyPanelOpacityControl
        handleOpacityClick={handleOpacityClick}
        handleOpacityInputChange={handleOpacityInputChange}
        handleOpacityMouseEnd={handleOpacityMouseEnd}
        handleOpacityPointerEnd={handleOpacityPointerEnd}
        handleStyleInputBlur={handleStyleInputBlur}
        primaryAlpha={primaryAlpha}
      />
      <AnnotationPropertyPanelBorderControl
        displayedBorder={displayedBorder}
        handleBorderWidthChange={handleBorderWidthChange}
        handleBorderWidthCommit={handleBorderWidthCommit}
        handleBorderWidthFocus={handleBorderWidthFocus}
        handleBorderWidthKeyDown={handleBorderWidthKeyDown}
        localBorderWidth={localBorderWidth}
      />
    </>
  );
}
