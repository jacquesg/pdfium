import type { DocumentInfoResponse, ExtendedDocumentInfoResponse } from '../../context/protocol.js';
import type { DocumentMetadata, ViewerPreferences } from '../../core/types.js';
import { INFO_PANEL_COPY } from './info-panel-copy.js';
import type { PropertyRow } from './property-table.js';

function buildMetadataRows(metadata: DocumentMetadata, extInfo: ExtendedDocumentInfoResponse): PropertyRow[] {
  return [
    { label: 'Title', value: metadata.title || '\u2014' },
    { label: 'Author', value: metadata.author || '\u2014' },
    { label: 'Subject', value: metadata.subject || '\u2014' },
    { label: 'Creator', value: metadata.creator || '\u2014' },
    { label: 'Producer', value: metadata.producer || '\u2014' },
    { label: 'Created', value: metadata.creationDate || '\u2014' },
    { label: 'Modified', value: metadata.modificationDate || '\u2014' },
    { label: 'PDF Version', value: extInfo.fileVersion || '\u2014' },
  ];
}

function buildDocumentPropertiesRows(
  pageCount: number,
  docInfo: DocumentInfoResponse,
  extInfo: ExtendedDocumentInfoResponse,
): PropertyRow[] {
  return [
    { label: 'Pages', value: pageCount },
    { label: 'Tagged', value: docInfo.isTagged },
    { label: 'Form Type', value: docInfo.formType },
    { label: 'Page Mode', value: docInfo.pageMode },
    { label: 'Valid XRef', value: extInfo.hasValidCrossReferenceTable },
    { label: 'Named Dests', value: docInfo.namedDestinationCount },
  ];
}

function buildViewerPreferencesRows(viewerPrefs: ViewerPreferences): PropertyRow[] {
  return [
    { label: 'Print Scaling', value: viewerPrefs.printScaling },
    { label: 'Num Copies', value: viewerPrefs.numCopies },
    { label: 'Duplex Mode', value: viewerPrefs.duplexMode },
  ];
}

function formatPrintRangesValue(ranges: number[] | undefined): string {
  return ranges && ranges.length > 0 ? ranges.join(', ') : INFO_PANEL_COPY.notSetLabel;
}

function toggleCollapsedSection(current: Set<string>, id: string): Set<string> {
  const next = new Set(current);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

export {
  buildDocumentPropertiesRows,
  buildMetadataRows,
  buildViewerPreferencesRows,
  formatPrintRangesValue,
  toggleCollapsedSection,
};
