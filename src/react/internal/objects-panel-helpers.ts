import type { SerialisedPageObject } from '../../context/protocol.js';
import type { Rect } from '../../core/types.js';
import { PageObjectType } from '../../core/types.js';

interface IndexedPageObject extends SerialisedPageObject {
  index: number;
}

function decodeFontFlags(flags: number): string[] {
  const names: string[] = [];
  if (flags & (1 << 0)) names.push('FixedPitch');
  if (flags & (1 << 1)) names.push('Serif');
  if (flags & (1 << 2)) names.push('Symbolic');
  if (flags & (1 << 3)) names.push('Script');
  if (flags & (1 << 5)) names.push('NonSymbolic');
  if (flags & (1 << 6)) names.push('Italic');
  if (flags & (1 << 16)) names.push('AllCap');
  if (flags & (1 << 17)) names.push('SmallCap');
  if (flags & (1 << 18)) names.push('ForceBold');
  return names;
}

function indexPageObjects(rawObjects: SerialisedPageObject[]): IndexedPageObject[] {
  return rawObjects.map((obj, index) => ({ ...obj, index }));
}

function getVisiblePageObjects(objects: IndexedPageObject[], showAll: boolean, maxVisible: number) {
  const isTruncated = !showAll && objects.length > maxVisible;
  const visibleObjects = isTruncated ? objects.slice(0, maxVisible) : objects;
  return { isTruncated, visibleObjects };
}

function formatObjectListBounds(bounds: Rect): string {
  return `[${bounds.left.toFixed(0)}, ${bounds.bottom.toFixed(0)}, ${bounds.right.toFixed(0)}, ${bounds.top.toFixed(0)}]`;
}

const TYPE_BADGE_COLOURS: Record<PageObjectType, { bg: string; colour: string }> = {
  [PageObjectType.Text]: {
    bg: 'var(--pdfium-badge-text-bg, #dbeafe)',
    colour: 'var(--pdfium-badge-text-colour, #1d4ed8)',
  },
  [PageObjectType.Image]: {
    bg: 'var(--pdfium-badge-image-bg, #dcfce7)',
    colour: 'var(--pdfium-badge-image-colour, #15803d)',
  },
  [PageObjectType.Path]: {
    bg: 'var(--pdfium-badge-path-bg, #fef9c3)',
    colour: 'var(--pdfium-badge-path-colour, #a16207)',
  },
  [PageObjectType.Form]: {
    bg: 'var(--pdfium-badge-form-bg, #f3e8ff)',
    colour: 'var(--pdfium-badge-form-colour, #7e22ce)',
  },
  [PageObjectType.Shading]: {
    bg: 'var(--pdfium-badge-shading-bg, #ffe4e6)',
    colour: 'var(--pdfium-badge-shading-colour, #be123c)',
  },
  [PageObjectType.Unknown]: {
    bg: 'var(--pdfium-panel-badge-bg, #f3f4f6)',
    colour: 'var(--pdfium-panel-badge-colour, #6b7280)',
  },
};

function getObjectTypeBadgeColours(type: PageObjectType): { bg: string; colour: string } {
  return TYPE_BADGE_COLOURS[type] ?? TYPE_BADGE_COLOURS[PageObjectType.Unknown];
}

export { decodeFontFlags, formatObjectListBounds, getObjectTypeBadgeColours, getVisiblePageObjects, indexPageObjects };
export type { IndexedPageObject };
