import { AnnotationType, type Rect } from '../../../core/types.js';
import type { CreateAnnotationOptions } from '../command.js';
import { buildFallbackLineRect } from '../components/editor-overlay-fallback-line-rect.js';
import type { ShapeCreateDetail } from '../components/shape-creation-overlay.types.js';
import type { EditorContextValue } from '../context.js';

export function resolveShapeCreationRequest({
  activeTool,
  detail,
  rect,
  scale,
  toolConfigs,
}: {
  readonly activeTool: EditorContextValue['activeTool'];
  readonly detail: ShapeCreateDetail | undefined;
  readonly rect: Rect;
  readonly scale: number;
  readonly toolConfigs: EditorContextValue['toolConfigs'];
}): { subtype: AnnotationType; rect: Rect; options: CreateAnnotationOptions } | null {
  if (activeTool === 'line') {
    const start = detail?.start ?? { x: rect.left, y: rect.top };
    const end = detail?.end ?? { x: rect.right, y: rect.bottom };
    return {
      subtype: AnnotationType.Ink,
      rect: buildFallbackLineRect(start, end, toolConfigs.line.strokeWidth, scale),
      options: {
        colour: toolConfigs.line.strokeColour,
        inkPaths: [[start, end]],
        borderWidth: toolConfigs.line.strokeWidth,
        isLineFallback: true,
      },
    };
  }

  if (activeTool !== 'rectangle' && activeTool !== 'circle') {
    return null;
  }

  const shapeConfig = toolConfigs[activeTool];
  return {
    subtype: activeTool === 'rectangle' ? AnnotationType.Square : AnnotationType.Circle,
    rect,
    options: {
      strokeColour: shapeConfig.strokeColour,
      borderWidth: shapeConfig.strokeWidth,
      ...(shapeConfig.fillColour !== null ? { interiorColour: shapeConfig.fillColour } : {}),
    },
  };
}
