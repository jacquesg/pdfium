'use client';

const TEXT_PANEL_COPY = {
  charactersTabLabel: 'Characters',
  extractionTabLabel: 'Extraction',
  noDocumentMessage: 'Load a document to inspect text.',
  hoverInstruction: 'Hover over a character in the page view to inspect its properties. Click to pin.',
  pinnedBadge: 'Pinned',
  fullPageTextHeading: 'Full Page Text',
  fullPageTextAriaLabel: 'Full page text content',
  extractByRectHeading: 'Extract Text by Rectangle',
  extractByRectHelp: 'Enter PDF coordinates in points (1/72 inch). Origin is at the bottom-left corner.',
  extractButtonLabel: 'Extract',
  emptyExtractionResultLabel: '(empty result)',
} as const;

function formatCharacterCount(count: number): string {
  return `${count} character${count !== 1 ? 's' : ''}`;
}

function formatPageSummary(pageIndex: number, width: number, height: number, scale: number): string {
  return `Page ${pageIndex + 1}: ${width.toFixed(0)} x ${height.toFixed(0)} pt @ ${scale.toFixed(2)}x`;
}

function formatUnicodeLabel(unicode: number): string {
  return `U+${unicode.toString(16).toUpperCase().padStart(4, '0')}`;
}

function formatFontSizeLabel(fontSize: number): string {
  return `${fontSize.toFixed(1)}pt`;
}

function formatAngleDegreesLabel(angleRadians: number): string {
  return `${((angleRadians * 180) / Math.PI).toFixed(1)}\u00B0`;
}

function formatExtractionCall(left: number, top: number, right: number, bottom: number): string {
  return `getTextInRect(${left}, ${top}, ${right}, ${bottom})`;
}

export {
  TEXT_PANEL_COPY,
  formatAngleDegreesLabel,
  formatCharacterCount,
  formatExtractionCall,
  formatFontSizeLabel,
  formatPageSummary,
  formatUnicodeLabel,
};
