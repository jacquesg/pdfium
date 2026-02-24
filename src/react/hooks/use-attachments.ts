import type { SerialisedAttachment } from '../../context/protocol.js';
import { createDocumentDataHook } from '../internal/create-data-hook.js';

export const useAttachments = createDocumentDataHook<SerialisedAttachment[]>('attachments', (doc) =>
  doc.getAttachments(),
);
