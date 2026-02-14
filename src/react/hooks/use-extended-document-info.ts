'use client';

import type { ExtendedDocumentInfoResponse } from '../../context/protocol.js';
import { createDocumentDataHook } from '../internal/create-data-hook.js';

export const useExtendedDocumentInfo = createDocumentDataHook<ExtendedDocumentInfoResponse>('extendedDocInfo', (doc) =>
  doc.getExtendedDocumentInfo(),
);
