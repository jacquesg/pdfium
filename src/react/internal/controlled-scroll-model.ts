import { PageRotation } from '../../core/types.js';
import { buildSpreadRows } from './spread-layout.js';

interface PageDimensionLike {
  width: number;
  height: number;
}

interface GetTargetPageOffsetInput {
  dimensions: readonly PageDimensionLike[];
  targetPage: number;
  scale: number;
  gap: number;
  isHorizontal: boolean;
  spreadMode: 'none' | 'odd' | 'even';
  getRotation?: ((pageIndex: number) => PageRotation) | undefined;
}

interface ControlledScrollRequest {
  pageIndex: number;
  generation: number | undefined;
}

type ControlledScrollDecisionAction = 'clear' | 'skip' | 'consume-reported' | 'scroll';

interface ResolveControlledScrollDecisionInput {
  controlledPageIndex: number | undefined;
  scrollGeneration: number | undefined;
  previousRequest: ControlledScrollRequest | null;
  currentPageIndex: number;
  reportedPages: ReadonlySet<number>;
}

interface ControlledScrollDecision {
  action: ControlledScrollDecisionAction;
  nextRequest: ControlledScrollRequest | null;
}

function getAxisPageSize(
  dim: PageDimensionLike | undefined,
  pageIndex: number,
  scale: number,
  isHorizontal: boolean,
  getRotation: ((pageIndex: number) => PageRotation) | undefined,
): number {
  const width = dim?.width ?? 0;
  const height = dim?.height ?? 0;
  const rotation = getRotation?.(pageIndex);
  const transposed = rotation === PageRotation.Clockwise90 || rotation === PageRotation.CounterClockwise90;
  const axisSize = isHorizontal ? (transposed ? height : width) : transposed ? width : height;
  return axisSize * scale;
}

function getTargetPageOffset(input: GetTargetPageOffsetInput): { pageOffset: number; pageSize: number } | null {
  const { dimensions, targetPage, scale, gap, isHorizontal, spreadMode, getRotation } = input;
  const rows = buildSpreadRows(dimensions.length, spreadMode);
  let rowOffset = 0;

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    if (rowIndex > 0) rowOffset += gap;
    const row = rows[rowIndex];
    if (!row) continue;

    let rowSize = 0;
    let intraOffset = 0;
    let targetOffsetInRow = 0;
    let targetSize = 0;
    let hasTarget = false;

    for (let index = 0; index < row.length; index++) {
      const pageIndex = row[index];
      if (pageIndex === undefined) continue;
      const size = getAxisPageSize(dimensions[pageIndex], pageIndex, scale, isHorizontal, getRotation);

      if (isHorizontal) {
        if (pageIndex === targetPage) {
          targetOffsetInRow = intraOffset;
          targetSize = size;
          hasTarget = true;
        }
        intraOffset += size;
        if (index < row.length - 1) intraOffset += gap;
        rowSize = intraOffset;
      } else {
        rowSize = Math.max(rowSize, size);
        if (pageIndex === targetPage) {
          targetSize = size;
          hasTarget = true;
        }
      }
    }

    if (hasTarget) {
      return {
        pageOffset: gap + rowOffset + (isHorizontal ? targetOffsetInRow : 0),
        pageSize: targetSize,
      };
    }

    rowOffset += rowSize;
  }

  return null;
}

function resolveControlledScrollDecision(input: ResolveControlledScrollDecisionInput): ControlledScrollDecision {
  const { controlledPageIndex, scrollGeneration, previousRequest, currentPageIndex, reportedPages } = input;

  if (controlledPageIndex === undefined) {
    return { action: 'clear', nextRequest: null };
  }

  const nextRequest: ControlledScrollRequest = { pageIndex: controlledPageIndex, generation: scrollGeneration };

  if (previousRequest && scrollGeneration !== previousRequest.generation) {
    return { action: 'scroll', nextRequest };
  }

  if (reportedPages.has(controlledPageIndex)) {
    return { action: 'consume-reported', nextRequest };
  }

  if (controlledPageIndex === currentPageIndex) {
    return { action: 'skip', nextRequest };
  }

  return { action: 'scroll', nextRequest };
}

export { getTargetPageOffset, resolveControlledScrollDecision };
export type {
  ControlledScrollDecision,
  ControlledScrollDecisionAction,
  ControlledScrollRequest,
  GetTargetPageOffsetInput,
  ResolveControlledScrollDecisionInput,
};
