import { describe, expect, it } from 'vitest';
import { ATTACHMENTS_PANEL_COPY, formatAttachmentSize } from '../../../../src/react/internal/attachments-panel-copy.js';

describe('attachments-panel copy', () => {
  it('exposes stable user-facing copy strings', () => {
    expect(ATTACHMENTS_PANEL_COPY.emptyStateMessage).toBe('No attachments found.');
    expect(ATTACHMENTS_PANEL_COPY.nameColumnHeader).toBe('Name');
    expect(ATTACHMENTS_PANEL_COPY.sizeColumnHeader).toBe('Size');
    expect(ATTACHMENTS_PANEL_COPY.actionColumnHeader).toBe('Action');
    expect(ATTACHMENTS_PANEL_COPY.downloadButtonLabel).toBe('Download');
  });

  it('formats attachment byte size labels', () => {
    expect(formatAttachmentSize(0)).toBe('0 bytes');
    expect(formatAttachmentSize(128)).toBe('128 bytes');
  });
});
