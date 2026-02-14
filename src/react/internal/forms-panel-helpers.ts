'use client';

import type { SerialisedFormWidget } from '../../context/protocol.js';
import type { FlattenResult } from '../../core/types.js';
import { FORMS_PANEL_COPY } from './forms-panel-copy.js';

interface FormWidgetDetailRow {
  readonly label: string;
  readonly value: string | number;
}

function parseHexColour(hex: string): { r: number; g: number; b: number } {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

function flattenResultStyle(result: FlattenResult): Record<string, string> {
  switch (result) {
    case 'Success':
      return {
        backgroundColor: 'var(--pdfium-panel-badge-success-bg, #dcfce7)',
        borderColor: 'var(--pdfium-panel-badge-success-border, #86efac)',
        color: 'var(--pdfium-panel-badge-success-colour, #166534)',
      };
    case 'NothingToDo':
      return {
        backgroundColor: 'var(--pdfium-panel-badge-warning-bg, #fef9c3)',
        borderColor: 'var(--pdfium-panel-badge-warning-border, #fde047)',
        color: 'var(--pdfium-panel-badge-warning-colour, #854d0e)',
      };
    default:
      return {
        backgroundColor: 'var(--pdfium-panel-badge-error-bg, #fef2f2)',
        borderColor: 'var(--pdfium-panel-badge-error-border, #fca5a5)',
        color: 'var(--pdfium-panel-badge-error-colour, #991b1b)',
      };
  }
}

function buildWidgetDetailRows(widget: SerialisedFormWidget): readonly FormWidgetDetailRow[] {
  return [
    { label: FORMS_PANEL_COPY.fieldLabel, value: widget.fieldName },
    { label: FORMS_PANEL_COPY.typeLabel, value: widget.fieldType },
    { label: FORMS_PANEL_COPY.valueLabel, value: widget.fieldValue },
    { label: FORMS_PANEL_COPY.annotationIndexLabel, value: widget.annotationIndex },
  ] as const;
}

export { buildWidgetDetailRows, flattenResultStyle, parseHexColour };
export type { FormWidgetDetailRow };
