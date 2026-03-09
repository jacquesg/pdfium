import { screenToPdf } from '../../coordinates.js';
import type { CreateAnnotationOptions } from '../command.js';
import type { EditorContextValue } from '../context.js';
import { buildPdfRectFromScreenPoints } from './editor-overlay-action-support.js';

export function buildInkCreationRequest({
  originalHeight,
  points,
  scale,
  toolConfig,
}: {
  readonly originalHeight: number;
  readonly points: ReadonlyArray<{ x: number; y: number }>;
  readonly scale: number;
  readonly toolConfig: EditorContextValue['toolConfigs']['ink'];
}) {
  return {
    rect: buildPdfRectFromScreenPoints(points, scale, originalHeight),
    options: {
      colour: toolConfig.colour,
      borderWidth: toolConfig.strokeWidth,
      inkPaths: [points.map((point) => screenToPdf(point, { scale, originalHeight }))],
    } satisfies CreateAnnotationOptions,
  };
}
