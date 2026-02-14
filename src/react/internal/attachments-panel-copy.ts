'use client';

const ATTACHMENTS_PANEL_COPY = {
  emptyStateMessage: 'No attachments found.',
  nameColumnHeader: 'Name',
  sizeColumnHeader: 'Size',
  actionColumnHeader: 'Action',
  downloadButtonLabel: 'Download',
} as const;

function formatAttachmentSize(byteLength: number): string {
  return `${byteLength} bytes`;
}

export { ATTACHMENTS_PANEL_COPY, formatAttachmentSize };
