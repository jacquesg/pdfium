import { AnnotationType, type Colour } from '../../../core/types.js';

export function colourToHex(colour: Colour | undefined): string {
  if (!colour) return '#000000';
  const r = colour.r.toString(16).padStart(2, '0');
  const g = colour.g.toString(16).padStart(2, '0');
  const b = colour.b.toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

export function annotationTypeName(type: AnnotationType): string {
  const names: Partial<Record<AnnotationType, string>> = {
    [AnnotationType.Text]: 'Text Note',
    [AnnotationType.Link]: 'Link',
    [AnnotationType.FreeText]: 'Free Text',
    [AnnotationType.Line]: 'Line',
    [AnnotationType.Square]: 'Rectangle',
    [AnnotationType.Circle]: 'Circle',
    [AnnotationType.Highlight]: 'Highlight',
    [AnnotationType.Underline]: 'Underline',
    [AnnotationType.Strikeout]: 'Strikeout',
    [AnnotationType.Stamp]: 'Stamp',
    [AnnotationType.Ink]: 'Ink',
    [AnnotationType.Redact]: 'Redaction',
  };
  return names[type] ?? `Type ${String(type)}`;
}

export const labelStyle = { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 } as const;
export const columnLabelStyle = { display: 'flex', flexDirection: 'column', gap: 2, fontSize: 12 } as const;
