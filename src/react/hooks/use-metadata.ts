'use client';

import type { DocumentMetadata } from '../../core/types.js';
import { createDocumentDataHook } from '../internal/create-data-hook.js';

export const useMetadata = createDocumentDataHook<DocumentMetadata>('metadata', (doc) => doc.getMetadata());
