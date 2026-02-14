'use client';

import { useAttachments } from '../../hooks/use-attachments.js';
import { ATTACHMENTS_PANEL_COPY, formatAttachmentSize } from '../../internal/attachments-panel-copy.js';
import { EmptyPanelState } from '../../internal/empty-panel-state.js';
import { triggerObjectUrlDownload } from '../../internal/object-url-download.js';
import { PanelButton } from '../../internal/panel-button.js';
import { MONO_STYLE, TABLE_STYLE, TD_STYLE, TH_STYLE } from '../../internal/panel-table-styles.js';
import { sanitiseFilename } from '../../internal/sanitise-filename.js';
import { usePDFViewer } from '../pdf-viewer.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function downloadAttachment(name: string, data: ArrayBuffer) {
  const blob = new Blob([data], { type: 'application/octet-stream' });
  triggerObjectUrlDownload({ blob, filename: sanitiseFilename(name) });
}

// ---------------------------------------------------------------------------
// AttachmentsPanel
// ---------------------------------------------------------------------------

function AttachmentsPanel() {
  const { viewer } = usePDFViewer();
  const { data: attachments } = useAttachments(viewer.document);
  const items = attachments ?? [];

  if (items.length === 0) {
    return <EmptyPanelState message={ATTACHMENTS_PANEL_COPY.emptyStateMessage} />;
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ ...TABLE_STYLE, minWidth: 400 }}>
        <thead>
          <tr>
            <th style={TH_STYLE}>{ATTACHMENTS_PANEL_COPY.nameColumnHeader}</th>
            <th style={TH_STYLE}>{ATTACHMENTS_PANEL_COPY.sizeColumnHeader}</th>
            <th style={TH_STYLE}>{ATTACHMENTS_PANEL_COPY.actionColumnHeader}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((att) => (
            <tr key={att.index}>
              <td style={TD_STYLE}>{att.name}</td>
              <td style={MONO_STYLE}>{formatAttachmentSize(att.data.byteLength)}</td>
              <td style={TD_STYLE}>
                <PanelButton variant="secondary" onClick={() => downloadAttachment(att.name, att.data)}>
                  {ATTACHMENTS_PANEL_COPY.downloadButtonLabel}
                </PanelButton>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export { AttachmentsPanel };
