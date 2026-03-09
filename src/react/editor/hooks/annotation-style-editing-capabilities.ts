import { type AnnotationColourType, AnnotationType, type Colour } from '../../../core/types.js';
import {
  primaryColourTypeForAnnotation,
  supportsBorderEditing,
  supportsFillColour,
  supportsFillToggle,
  supportsStrokeColour,
} from './annotation-style-editing-support.js';

export interface AnnotationStyleEditingCapabilities {
  readonly canEditBorder: boolean;
  readonly canEditFill: boolean;
  readonly canEditStroke: boolean;
  readonly canToggleFill: boolean;
  readonly fillColourType: AnnotationColourType;
  readonly primaryColourType: AnnotationColourType;
}

export function getAnnotationStyleEditingCapabilities(
  effectiveType: AnnotationType,
): AnnotationStyleEditingCapabilities {
  return {
    canEditBorder: supportsBorderEditing(effectiveType),
    canEditFill: supportsFillColour(effectiveType),
    canEditStroke: supportsStrokeColour(effectiveType),
    canToggleFill: supportsFillToggle(effectiveType),
    fillColourType: effectiveType === AnnotationType.Highlight ? 'stroke' : 'interior',
    primaryColourType: primaryColourTypeForAnnotation(effectiveType),
  };
}

export function getAnnotationStylePrimaryAlpha(
  primaryColourType: AnnotationColourType,
  localInteriorColour: Colour,
  localStrokeColour: Colour,
): number {
  return (primaryColourType === 'interior' ? localInteriorColour : localStrokeColour).a ?? 255;
}
