export interface MarkupCase {
  readonly toolLabel: 'Highlight' | 'Underline' | 'Strikeout';
  readonly expectedTypeLabel: 'Highlight' | 'Underline' | 'Strikeout';
  readonly expectedOpacityPercent: number;
}

export const MARKUP_CASES: readonly MarkupCase[] = [
  { toolLabel: 'Highlight', expectedTypeLabel: 'Highlight', expectedOpacityPercent: 50 },
  { toolLabel: 'Underline', expectedTypeLabel: 'Underline', expectedOpacityPercent: 100 },
  { toolLabel: 'Strikeout', expectedTypeLabel: 'Strikeout', expectedOpacityPercent: 100 },
];
