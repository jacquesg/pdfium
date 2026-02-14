'use client';

const FORMS_PANEL_COPY = {
  formDetectedBadge: 'Form Detected',
  noFormBadge: 'No Form',
  emptyWidgetsMessage: 'No form widgets on this page',
  widgetsListAriaLabel: 'Form widgets',
  widgetDetailHeading: 'Widget Detail',
  dismissErrorAriaLabel: 'Dismiss error',
  highlightColourAriaLabel: 'Highlight colour',
  highlightAlphaAriaLabel: 'Highlight alpha',
  showFormFieldsButton: 'Show Form Fields',
  hideFormFieldsButton: 'Hide Form Fields',
  formFieldVisibilityHeading: 'Form Field Visibility',
  interactionHeading: 'Interaction',
  killFocusButton: 'Kill Focus',
  undoButton: 'Undo',
  flattenForDisplayButton: 'Flatten for Display',
  flattenForPrintButton: 'Flatten for Print',
  flattenConfirmButton: 'Confirm flatten?',
  fieldLabel: 'Field',
  typeLabel: 'Type',
  valueLabel: 'Value',
  annotationIndexLabel: 'Annotation Index',
} as const;

function formatWidgetsSummary(count: number): string {
  return `${count} widgets`;
}

function formatHighlightAlphaPercent(alpha: number): string {
  return `${Math.round((alpha / 255) * 100)}%`;
}

function formatHighlightAlphaLabel(alpha: number): string {
  return `Alpha: ${formatHighlightAlphaPercent(alpha)}`;
}

function formatHighlightAlphaAriaValueText(alpha: number): string {
  return `Alpha ${alpha} of 255`;
}

function formatWidgetValue(value: string | number | null | undefined): string {
  return value === null || value === undefined || value === '' ? '\u2014' : String(value);
}

export {
  FORMS_PANEL_COPY,
  formatHighlightAlphaAriaValueText,
  formatHighlightAlphaLabel,
  formatHighlightAlphaPercent,
  formatWidgetValue,
  formatWidgetsSummary,
};
