'use client';

import type { SerialisedSignature } from '../../context/protocol.js';
import { createDocumentDataHook } from '../internal/create-data-hook.js';

export const useSignatures = createDocumentDataHook<SerialisedSignature[]>('signatures', (doc) => doc.getSignatures());
