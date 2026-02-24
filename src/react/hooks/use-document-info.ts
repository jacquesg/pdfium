import type { DocumentInfoResponse } from '../../context/protocol.js';
import { createDocumentDataHook } from '../internal/create-data-hook.js';

export const useDocumentInfo = createDocumentDataHook<DocumentInfoResponse>('documentInfo', (doc) =>
  doc.getDocumentInfo(),
);
