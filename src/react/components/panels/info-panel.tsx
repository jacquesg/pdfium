'use client';

import { useCallback, useState } from 'react';
import { useDocumentInfo } from '../../hooks/use-document-info.js';
import { useExtendedDocumentInfo } from '../../hooks/use-extended-document-info.js';
import { useJavaScriptActions } from '../../hooks/use-javascript-actions.js';
import { useMetadata } from '../../hooks/use-metadata.js';
import { usePermissions } from '../../hooks/use-permissions.js';
import { usePrintPageRanges } from '../../hooks/use-print-page-ranges.js';
import { useSignatures } from '../../hooks/use-signatures.js';
import { useViewerPreferences } from '../../hooks/use-viewer-preferences.js';
import { EmptyPanelState } from '../../internal/empty-panel-state.js';
import { INFO_PANEL_COPY } from '../../internal/info-panel-copy.js';
import { toggleCollapsedSection } from '../../internal/info-panel-helpers.js';
import { InfoPanelView } from '../../internal/info-panel-view.js';
import { usePDFViewer } from '../pdf-viewer.js';

function InfoPanel() {
  const { viewer } = usePDFViewer();
  const doc = viewer.document;

  const { data: metadata } = useMetadata(doc);
  const { data: permissions } = usePermissions(doc);
  const { data: viewerPrefs } = useViewerPreferences(doc);
  const { data: jsActions } = useJavaScriptActions(doc);
  const { data: signatures } = useSignatures(doc);
  const { data: extInfo } = useExtendedDocumentInfo(doc);
  const { data: docInfo } = useDocumentInfo(doc);
  const { data: printRanges } = usePrintPageRanges(doc);

  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  const handleToggleSection = useCallback((id: string) => {
    setCollapsedSections((previous) => toggleCollapsedSection(previous, id));
  }, []);

  if (!doc) {
    return <EmptyPanelState message={INFO_PANEL_COPY.emptyStateMessage} />;
  }

  return (
    <InfoPanelView
      pageCount={doc.pageCount}
      metadata={metadata ?? undefined}
      permissions={permissions ?? undefined}
      viewerPrefs={viewerPrefs ?? undefined}
      jsActions={jsActions ?? undefined}
      signatures={signatures ?? undefined}
      extInfo={extInfo ?? undefined}
      docInfo={docInfo ?? undefined}
      printRanges={printRanges ?? undefined}
      collapsedSections={collapsedSections}
      onToggleSection={handleToggleSection}
    />
  );
}

export { InfoPanel };
