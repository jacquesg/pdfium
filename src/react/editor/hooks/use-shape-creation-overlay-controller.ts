import type { ShapeCreationOverlayProps } from '../components/shape-creation-overlay.js';
import { useShapeCreationDrag } from './use-shape-creation-drag.js';

type UseShapeCreationOverlayControllerOptions = Pick<
  ShapeCreationOverlayProps,
  'height' | 'onCreate' | 'originalHeight' | 'scale' | 'strokeColour' | 'strokeWidth' | 'tool' | 'width'
>;

export function useShapeCreationOverlayController({
  height,
  onCreate,
  originalHeight,
  scale,
  strokeColour = '#000000',
  strokeWidth = 2,
  tool,
  width,
}: UseShapeCreationOverlayControllerOptions) {
  const dragState = useShapeCreationDrag({
    tool,
    width,
    height,
    scale,
    originalHeight,
    strokeWidth,
    onCreate,
  });

  return {
    ...dragState,
    height,
    strokeColour,
    strokeWidth,
    tool,
    width,
  };
}

export type ShapeCreationOverlayControllerResult = ReturnType<typeof useShapeCreationOverlayController>;
