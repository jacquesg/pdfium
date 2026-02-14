import { describe, expect, it } from 'vitest';
import type { DocumentInfoResponse, ExtendedDocumentInfoResponse } from '../../../../src/context/protocol.js';
import type { DocumentMetadata, ViewerPreferences } from '../../../../src/core/types.js';
import { DuplexMode, FormType, PageMode } from '../../../../src/core/types.js';
import {
  buildDocumentPropertiesRows,
  buildMetadataRows,
  buildViewerPreferencesRows,
  formatPrintRangesValue,
  toggleCollapsedSection,
} from '../../../../src/react/internal/info-panel-helpers.js';

describe('info-panel-helpers', () => {
  it('builds metadata rows with stable fallback values', () => {
    const metadata: DocumentMetadata = { title: 'Doc' };
    const extInfo: ExtendedDocumentInfoResponse = {
      fileVersion: undefined,
      rawPermissions: 0,
      securityHandlerRevision: 0,
      signatureCount: 0,
      hasValidCrossReferenceTable: true,
    };

    const rows = buildMetadataRows(metadata, extInfo);
    expect(rows.find((row) => row.label === 'Title')?.value).toBe('Doc');
    expect(rows.find((row) => row.label === 'Author')?.value).toBe('\u2014');
    expect(rows.find((row) => row.label === 'PDF Version')?.value).toBe('\u2014');
  });

  it('builds document property and viewer preference rows', () => {
    const docInfo: DocumentInfoResponse = {
      isTagged: true,
      hasForm: true,
      formType: FormType.AcroForm,
      namedDestinationCount: 7,
      pageMode: PageMode.UseOutlines,
    };
    const extInfo: ExtendedDocumentInfoResponse = {
      fileVersion: 17,
      rawPermissions: 0,
      securityHandlerRevision: 0,
      signatureCount: 0,
      hasValidCrossReferenceTable: false,
    };
    const viewerPrefs: ViewerPreferences = {
      printScaling: false,
      numCopies: 2,
      duplexMode: DuplexMode.Simplex,
    };

    const propsRows = buildDocumentPropertiesRows(12, docInfo, extInfo);
    expect(propsRows.find((row) => row.label === 'Pages')?.value).toBe(12);
    expect(propsRows.find((row) => row.label === 'Valid XRef')?.value).toBe(false);

    const prefRows = buildViewerPreferencesRows(viewerPrefs);
    expect(prefRows.find((row) => row.label === 'Num Copies')?.value).toBe(2);
    expect(prefRows.find((row) => row.label === 'Duplex Mode')?.value).toBe(DuplexMode.Simplex);
  });

  it('formats print-range labels and toggles collapsed sections immutably', () => {
    expect(formatPrintRangesValue([1, 3, 5])).toBe('1, 3, 5');
    expect(formatPrintRangesValue(undefined)).toBe('Not set');

    const initial = new Set<string>(['metadata']);
    const collapsed = toggleCollapsedSection(initial, 'metadata');
    expect(collapsed.has('metadata')).toBe(false);
    expect(initial.has('metadata')).toBe(true);
    const expanded = toggleCollapsedSection(collapsed, 'permissions');
    expect(expanded.has('permissions')).toBe(true);
  });
});
