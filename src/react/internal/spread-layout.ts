import type { SpreadMode } from '../hooks/use-visible-pages.js';

function getSpreadPartnerIndex(pageIndex: number, spreadMode: SpreadMode, pageCount: number): number | null {
  if (spreadMode === 'none' || pageCount <= 1 || pageIndex < 0 || pageIndex >= pageCount) return null;

  if (spreadMode === 'odd') {
    // Page 0 is a solo cover; subsequent pairs are (1,2), (3,4), ...
    if (pageIndex === 0) return null;
    const pairStart = pageIndex % 2 === 1 ? pageIndex : pageIndex - 1;
    const partner = pairStart === pageIndex ? pairStart + 1 : pairStart;
    return partner < pageCount ? partner : null;
  }

  // 'even': pairs (0,1), (2,3), ...
  const pairStart = pageIndex % 2 === 0 ? pageIndex : pageIndex - 1;
  const partner = pairStart === pageIndex ? pairStart + 1 : pairStart;
  return partner < pageCount ? partner : null;
}

function buildSpreadRows(pageCount: number, mode: SpreadMode): number[][] {
  if (pageCount <= 0) return [];
  if (mode === 'none') {
    return Array.from({ length: pageCount }, (_, index) => [index]);
  }

  const rows: number[][] = [];
  const visited = new Set<number>();

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
    if (visited.has(pageIndex)) continue;

    const partner = getSpreadPartnerIndex(pageIndex, mode, pageCount);
    const row = partner === null ? [pageIndex] : [pageIndex, partner].sort((a, b) => a - b);
    for (const index of row) visited.add(index);
    rows.push(row);
  }

  return rows;
}

export { buildSpreadRows, getSpreadPartnerIndex };
