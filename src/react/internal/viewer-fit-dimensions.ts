import { PageRotation } from '../../core/types.js';
import type { PageDimension } from '../hooks/use-page-dimensions.js';
import type { SpreadMode } from '../hooks/use-visible-pages.js';
import { getSpreadPartnerIndex } from './spread-layout.js';

interface ResolveFitPageDimensionsOptions {
  dimensions: PageDimension[] | undefined;
  pageIndex: number;
  pageCount: number;
  spreadMode: SpreadMode;
  pageGap: number;
  getRotation: (pageIndex: number) => PageRotation;
}

interface FitPageDimensions {
  width: number;
  height: number;
}

const DEFAULT_PAGE_WIDTH = 612;
const DEFAULT_PAGE_HEIGHT = 792;

function isTransposedRotation(rotation: PageRotation): boolean {
  return rotation === PageRotation.Clockwise90 || rotation === PageRotation.CounterClockwise90;
}

function getRotatedPageDimensions(dimension: PageDimension | undefined, rotation: PageRotation): FitPageDimensions {
  const width = dimension?.width ?? DEFAULT_PAGE_WIDTH;
  const height = dimension?.height ?? DEFAULT_PAGE_HEIGHT;
  if (isTransposedRotation(rotation)) {
    return { width: height, height: width };
  }
  return { width, height };
}

function resolveFitPageDimensions({
  dimensions,
  pageIndex,
  pageCount,
  spreadMode,
  pageGap,
  getRotation,
}: ResolveFitPageDimensionsOptions): FitPageDimensions {
  const currentRotation = getRotation(pageIndex);
  const currentPage = getRotatedPageDimensions(dimensions?.[pageIndex], currentRotation);

  let width = currentPage.width;
  let height = currentPage.height;

  const spreadPartner = getSpreadPartnerIndex(pageIndex, spreadMode, pageCount);
  if (spreadPartner !== null && dimensions) {
    const partnerRotation = getRotation(spreadPartner);
    const partnerPage = getRotatedPageDimensions(dimensions[spreadPartner], partnerRotation);
    width += partnerPage.width + pageGap;
    height = Math.max(height, partnerPage.height);
  }

  return { width, height };
}

export { DEFAULT_PAGE_HEIGHT, DEFAULT_PAGE_WIDTH, resolveFitPageDimensions };
export type { FitPageDimensions, ResolveFitPageDimensionsOptions };
