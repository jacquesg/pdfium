'use client';

import { PageRotation } from '../../core/types.js';
import type { PageDimension } from '../hooks/use-page-dimensions.js';

export type SpreadMode = 'none' | 'odd' | 'even';
export type ScrollMode = 'continuous' | 'single' | 'horizontal';

interface EffectivePageDimension {
  width: number;
  height: number;
}

interface ResolveVisiblePagesGeometryArgs {
  dimensions: PageDimension[] | undefined;
  scale: number;
  gap: number;
  spreadMode: SpreadMode;
  getRotation: ((pageIndex: number) => PageRotation) | undefined;
  scrollMode: ScrollMode;
}

interface VisiblePagesGeometry {
  spreadRows: number[][];
  rowOffsets: number[];
  pageOffsets: number[];
  totalHeight: number;
  totalWidth: number | undefined;
  maxContentWidth: number;
}

function buildSpreadRows(pageCount: number, mode: SpreadMode): number[][] {
  if (mode === 'none' || pageCount === 0) {
    return Array.from({ length: pageCount }, (_, i) => [i]);
  }

  const rows: number[][] = [];

  if (mode === 'odd') {
    rows.push([0]);
    for (let i = 1; i < pageCount; i += 2) {
      const row = [i];
      if (i + 1 < pageCount) row.push(i + 1);
      rows.push(row);
    }
    return rows;
  }

  for (let i = 0; i < pageCount; i += 2) {
    const row = [i];
    if (i + 1 < pageCount) row.push(i + 1);
    rows.push(row);
  }

  return rows;
}

function getEffectivePageDimension(
  dimension: PageDimension | undefined,
  pageIndex: number,
  getRotation: ((pageIndex: number) => PageRotation) | undefined,
): EffectivePageDimension {
  const width = dimension?.width ?? 612;
  const height = dimension?.height ?? 792;

  if (!getRotation) return { width, height };

  const rotation = getRotation(pageIndex);
  if (rotation === PageRotation.Clockwise90 || rotation === PageRotation.CounterClockwise90) {
    return { width: height, height: width };
  }

  return { width, height };
}

function resolveVisiblePagesGeometry({
  dimensions,
  scale,
  gap,
  spreadMode,
  getRotation,
  scrollMode,
}: ResolveVisiblePagesGeometryArgs): VisiblePagesGeometry {
  if (!dimensions || dimensions.length === 0) {
    return {
      spreadRows: [],
      rowOffsets: [],
      pageOffsets: [],
      totalHeight: 0,
      totalWidth: undefined,
      maxContentWidth: 0,
    };
  }

  const spreadRows = buildSpreadRows(dimensions.length, spreadMode);
  const rowOffsets: number[] = [];
  const pageOffsets: number[] = new Array<number>(dimensions.length).fill(0);

  let offset = 0;
  let maxContentWidth = 0;

  for (let rowIndex = 0; rowIndex < spreadRows.length; rowIndex++) {
    if (rowIndex > 0) offset += gap;
    rowOffsets.push(offset);

    const row = spreadRows[rowIndex] ?? [];
    if (scrollMode === 'horizontal') {
      let rowWidth = 0;
      for (let columnIndex = 0; columnIndex < row.length; columnIndex++) {
        if (columnIndex > 0) rowWidth += gap;

        const pageIndex = row[columnIndex];
        if (pageIndex === undefined) continue;

        pageOffsets[pageIndex] = offset + rowWidth;
        const effective = getEffectivePageDimension(dimensions[pageIndex], pageIndex, getRotation);
        rowWidth += effective.width * scale;
      }
      offset += rowWidth;
      continue;
    }

    let rowHeight = 0;
    let rowWidth = 0;

    for (let columnIndex = 0; columnIndex < row.length; columnIndex++) {
      if (columnIndex > 0) rowWidth += gap;

      const pageIndex = row[columnIndex];
      if (pageIndex === undefined) continue;

      const effective = getEffectivePageDimension(dimensions[pageIndex], pageIndex, getRotation);
      rowHeight = Math.max(rowHeight, effective.height * scale);
      rowWidth += effective.width * scale;
      pageOffsets[pageIndex] = offset;
    }

    maxContentWidth = Math.max(maxContentWidth, rowWidth);
    offset += rowHeight;
  }

  rowOffsets.push(offset);

  return {
    spreadRows,
    rowOffsets,
    pageOffsets,
    totalHeight: scrollMode === 'horizontal' ? 0 : offset,
    totalWidth: scrollMode === 'horizontal' ? offset : undefined,
    maxContentWidth: scrollMode === 'horizontal' ? 0 : maxContentWidth,
  };
}

export { buildSpreadRows, getEffectivePageDimension, resolveVisiblePagesGeometry };
export type { EffectivePageDimension, ResolveVisiblePagesGeometryArgs, VisiblePagesGeometry };
