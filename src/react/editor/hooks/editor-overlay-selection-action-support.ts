import type { SerialisedAnnotation } from '../../../context/protocol.js';
import { AnnotationType } from '../../../core/types.js';
import { buildFallbackLineRect } from '../components/editor-overlay-fallback-line-rect.js';
import type { EditorContextValue } from '../context.js';

type LineToolConfig = EditorContextValue['toolConfigs']['line'];

export function resolveSelectionLineStrokeWidth(
  annotation: SerialisedAnnotation,
  lineToolConfig: LineToolConfig,
): number {
  return Math.max(0.25, annotation.border?.borderWidth ?? lineToolConfig.strokeWidth);
}

export function resolveSelectionLineStrokeColour(annotation: SerialisedAnnotation, lineToolConfig: LineToolConfig) {
  return annotation.colour.stroke ?? lineToolConfig.strokeColour;
}

export function buildSelectionLinePreviewPatch({
  lineToolConfig,
  previewLine,
  previewSource,
  scale,
}: {
  readonly lineToolConfig: LineToolConfig;
  readonly previewLine: {
    start: { x: number; y: number };
    end: { x: number; y: number };
  };
  readonly previewSource: SerialisedAnnotation;
  readonly scale: number;
}) {
  const strokeWidth = resolveSelectionLineStrokeWidth(previewSource, lineToolConfig);

  return {
    bounds: buildFallbackLineRect(previewLine.start, previewLine.end, strokeWidth, scale),
    ...(previewSource.type === AnnotationType.Line ? { line: previewLine } : {}),
    ...(previewSource.type === AnnotationType.Ink && previewSource.lineFallback === true
      ? { inkPaths: [[previewLine.start, previewLine.end]] }
      : {}),
  };
}
