import type { SerialisedAnnotation } from '../../context/protocol.js';

function decodeAnnotationFlags(flags: number): string[] {
  const names: string[] = [];
  if (flags & (1 << 0)) names.push('Invisible');
  if (flags & (1 << 1)) names.push('Hidden');
  if (flags & (1 << 2)) names.push('Print');
  if (flags & (1 << 3)) names.push('NoZoom');
  if (flags & (1 << 4)) names.push('NoRotate');
  if (flags & (1 << 5)) names.push('NoView');
  if (flags & (1 << 6)) names.push('ReadOnly');
  if (flags & (1 << 7)) names.push('Locked');
  if (flags & (1 << 8)) names.push('ToggleNoView');
  if (flags & (1 << 9)) names.push('LockedContents');
  return names;
}

function decodeFormFieldFlags(flags: number): string[] {
  const names: string[] = [];
  if (flags & (1 << 0)) names.push('ReadOnly');
  if (flags & (1 << 1)) names.push('Required');
  if (flags & (1 << 2)) names.push('NoExport');
  if (flags & (1 << 12)) names.push('Multiline');
  if (flags & (1 << 13)) names.push('Password');
  if (flags & (1 << 17)) names.push('Combo');
  if (flags & (1 << 18)) names.push('Edit');
  if (flags & (1 << 19)) names.push('Sort');
  if (flags & (1 << 21)) names.push('MultiSelect');
  if (flags & (1 << 25)) names.push('RichText');
  if (flags & (1 << 26)) names.push('CommitOnSelChange');
  return names;
}

function formatAnnotationBounds(bounds: SerialisedAnnotation['bounds']): string {
  return `[${bounds.left.toFixed(1)}, ${bounds.top.toFixed(1)}, ${bounds.right.toFixed(1)}, ${bounds.bottom.toFixed(1)}]`;
}

function formatAnnotationListBounds(bounds: SerialisedAnnotation['bounds']): string {
  return `[${bounds.left.toFixed(0)}, ${bounds.bottom.toFixed(0)}, ${bounds.right.toFixed(0)}, ${bounds.top.toFixed(0)}]`;
}

function groupAnnotationsByType(annotations: readonly SerialisedAnnotation[]): Map<string, SerialisedAnnotation[]> {
  const groups = new Map<string, SerialisedAnnotation[]>();
  for (const annotation of annotations) {
    const existing = groups.get(annotation.type) ?? [];
    existing.push(annotation);
    groups.set(annotation.type, existing);
  }
  return groups;
}

function findAnnotationByIndex(
  annotations: readonly SerialisedAnnotation[],
  selectedIndex: number | null,
): SerialisedAnnotation | null {
  if (selectedIndex === null) return null;
  return annotations.find((annotation) => annotation.index === selectedIndex) ?? null;
}

export {
  decodeAnnotationFlags,
  decodeFormFieldFlags,
  findAnnotationByIndex,
  formatAnnotationBounds,
  formatAnnotationListBounds,
  groupAnnotationsByType,
};
