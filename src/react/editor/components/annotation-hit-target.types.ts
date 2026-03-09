import type { ReactNode } from 'react';
import type { SerialisedAnnotation } from '../../../context/protocol.js';

export interface AnnotationHitTargetRenderOptions {
  readonly annotation: SerialisedAnnotation;
  readonly height: number;
  readonly isSelected: boolean;
  readonly onSelect: (annotationIndex: number) => void;
  readonly originalHeight: number;
  readonly scale: number;
  readonly width: number;
}

export interface AnnotationHitTargetSvgFrameProps {
  readonly children: ReactNode;
  readonly height: number;
  readonly left?: number | undefined;
  readonly top?: number | undefined;
  readonly viewBox?: string | undefined;
  readonly width: number;
}

export const HIT_TARGET_TEST_ID = 'select-hit-target';
