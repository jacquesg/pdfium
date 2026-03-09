import type { useAnnotationStyleEditing } from '../hooks/use-annotation-style-editing.js';

type AnnotationStyleEditingState = ReturnType<typeof useAnnotationStyleEditing>;

export type AnnotationPropertyPanelColourControlsProps = Pick<
  AnnotationStyleEditingState,
  | 'canEditFill'
  | 'canEditStroke'
  | 'canToggleFill'
  | 'fillEnabled'
  | 'handleFillEnabledChange'
  | 'handleInteriorColourChange'
  | 'handleStrokeColourChange'
  | 'handleStyleInputBlur'
  | 'localInteriorColour'
  | 'localStrokeColour'
>;

export type AnnotationPropertyPanelOpacityControlProps = Pick<
  AnnotationStyleEditingState,
  | 'handleOpacityClick'
  | 'handleOpacityInputChange'
  | 'handleOpacityMouseEnd'
  | 'handleOpacityPointerEnd'
  | 'handleStyleInputBlur'
  | 'primaryAlpha'
>;

export type AnnotationPropertyPanelBorderControlProps = Pick<
  AnnotationStyleEditingState,
  | 'displayedBorder'
  | 'handleBorderWidthChange'
  | 'handleBorderWidthCommit'
  | 'handleBorderWidthFocus'
  | 'handleBorderWidthKeyDown'
  | 'localBorderWidth'
>;

export type AnnotationPropertyPanelStyleSectionProps = AnnotationPropertyPanelColourControlsProps &
  AnnotationPropertyPanelOpacityControlProps &
  AnnotationPropertyPanelBorderControlProps;
